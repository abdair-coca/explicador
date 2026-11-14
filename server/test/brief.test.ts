import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { formatErrors, isConcrete, parseExl, type Scene } from '../src/parser/index.ts';
import { briefWarnings, keyWords, sceneWarnings, takesUp } from '../src/rules.ts';
import { tempProject } from './helpers.ts';

const fields = {
  audience: 'Second-year engineering students; they know what a linked list is',
  question: 'How does a binary search tree decide where each value goes?',
  example: 'Insert 50, 30, 70, 20 in that order',
  misconception: 'Believing the tree always stays balanced',
  check: 'Predict where 40 goes and whether the tree becomes full',
  terms: 'node, child, height (in levels), full tree, degenerate tree',
};
type Field = keyof typeof fields;

const brief = (form = 'structure', values: Partial<Record<Field, string | null>> = {}): string => {
  const lines = (Object.keys(fields) as Field[]).flatMap((name) => {
    const value = name in values ? values[name] : fields[name];
    return value === null || value === undefined ? [] : [`<${name}>${value}</${name}>`];
  });
  return [`<brief form="${form}">`, ...lines, '</brief>'].join('\n');
};

const tree = [
  '<arch title="Each value goes left or right of 50">',
  '<node id="root" label="50" desc="The first value inserted" />',
  '<node id="left" label="30" desc="Smaller, so it goes left" />',
  '<edge from="root" to="left" />',
  '</arch>',
].join('\n');

const errorsOf = (source: string): string => {
  const parsed = parseExl(source);
  assert.equal(parsed.ok, false, 'expected errors');
  return parsed.ok ? '' : formatErrors(parsed.errors);
};
const sceneOf = (source: string): Scene => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene;
};

describe('<brief>', () => {
  it('parses a valid brief after the title, outside the blocks', () => {
    const scene = sceneOf(`# Where does each value go?\n\n${brief()}\n\n<theme name="code" />\n\n${tree}`);
    assert.deepEqual(scene.brief, { form: 'structure', ...fields, terms: ['node', 'child', 'height (in levels)', 'full tree', 'degenerate tree'] });
    assert.deepEqual(
      scene.blocks.map((block) => block.type),
      ['markdown', 'theme', 'arch'],
      'the brief is not a block: nothing shows it',
    );
  });

  it('is optional for the parser: an older scene still parses', () => {
    assert.equal(sceneOf(tree).brief, undefined);
  });

  for (const name of Object.keys(fields) as Field[]) {
    it(`refuses a brief whose <${name}> is missing, repeated, empty or too long`, () => {
      assert.match(errorsOf(`${brief('structure', { [name]: null })}\n${tree}`), new RegExp(`<brief> is missing <${name}>`));
      const twice = brief().replace('</brief>', `<${name}>${fields[name]}</${name}>\n</brief>`);
      assert.match(errorsOf(`${twice}\n${tree}`), new RegExp(`Only one <${name}> per <brief>`));
      assert.match(errorsOf(`${brief('structure', { [name]: ' ' })}\n${tree}`), new RegExp(`<${name}> needs its text`));
      assert.match(errorsOf(`${brief('structure', { [name]: `${fields[name]} 1 ${'x'.repeat(300)}` })}\n${tree}`), new RegExp(`<${name}> is longer than 300 characters`));
      assert.match(errorsOf(`${brief('structure', { [name]: `${fields[name]}\n4 more` })}\n${tree}`), new RegExp(`<${name}> must be one line`));
    });
  }

  it('refuses an example with no concrete data', () => {
    assert.match(errorsOf(`${brief('structure', { example: 'Inserting some values into the tree' })}\n${tree}`), /<example> "Inserting some values into the tree" has no concrete data/);
    for (const example of ['Insert 50, 30 and 70', 'The tenant "Ana" pays late', 'Gutenberg prints a Bible', 'Una masa de pan con levadura de Ana', "The word 'bread' in a sentence"]) {
      assert.ok(isConcrete(example), example);
    }
    for (const example of ['Some values', 'Insertion of values. Then a search', "The tree doesn't change"]) assert.ok(!isConcrete(example), example);
  });

  it('refuses an unknown form, a missing form and a brief with no fields', () => {
    assert.match(errorsOf(`${brief('lesson')}\n${tree}`), /Unknown form "lesson"; use structure, process, quantity, system, annotated, argument, timeline/);
    assert.match(errorsOf(`${brief().replace(' form="structure"', '')}\n${tree}`), /<brief> is missing the "form" attribute/);
    assert.match(errorsOf(`<brief form="process" />\n${tree}`), /<brief> needs its fields/);
  });

  it('checks the terms: 1 to 12, each at most 60 characters', () => {
    assert.match(errorsOf(`${brief('structure', { terms: ' , ' })}\n${tree}`), /<terms> needs at least one term/);
    const many = Array.from({ length: 13 }, (_, i) => `term ${i}`).join(', ');
    assert.match(errorsOf(`${brief('structure', { terms: many })}\n${tree}`), /<terms> lists 13 terms/);
    assert.match(errorsOf(`${brief('structure', { terms: `node, ${'y'.repeat(61)}` })}\n${tree}`), /longer than 60 characters/);
  });

  it('accepts the example briefs of the presenting guide', () => {
    const guide = readFileSync(new URL('../../skills/explicador/presenting.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const briefs = [...guide.matchAll(/^```xml\n(<brief[\s\S]*?)^```/gm)].map((match) => match[1] ?? '');
    assert.equal(briefs.length, 2, 'a technical brief and a non-technical one');
    for (const example of briefs) assert.ok(sceneOf(`${example}\n${tree}`).brief, example);
  });

  it('refuses a brief after another tag, two briefs, and a field outside the brief', () => {
    assert.match(errorsOf(`<theme name="code" />\n${brief()}\n${tree}`), /Put <brief> before every other tag, right after the # title/);
    assert.match(errorsOf(`${brief()}\n${brief()}\n${tree}`), /Only one <brief> per scene/);
    assert.match(errorsOf(`<misconception>No</misconception>\n${tree}`), /<misconception> must be inside <brief>/);
    assert.match(errorsOf(`${brief().replace('<audience>', '<audience kind="x">')}\n${tree}`), /Unknown attribute "kind" on <audience>/);
  });
});

describe('the brief\'s warnings', () => {
  const quiz = (option: string, why: string): string =>
    `<quiz question="Where does 40 go?">\n<option correct="true" why="Smaller than 50, larger than 30.">Right of 30</option>\n<option why="${why}">${option}</option>\n</quiz>`;

  it('finds the misconception taken up, with other word forms, and not when only a word or two match', () => {
    assert.deepEqual(keyWords('Believing the tree always stays balanced'), ['tree', 'alway', 'stays', 'balan']);
    const fixed = quiz('The tree balances itself', 'Nothing rebalances it: values inserted in order make a tree that always leans one way.');
    assert.ok(takesUp(fields.misconception, sceneOf(`${brief()}\n${tree}\n${fixed}`).blocks));
    assert.ok(!takesUp(fields.misconception, sceneOf(`${brief()}\n${tree}\n${quiz('Left of 50', 'The tree is in order.')}`).blocks));
    assert.ok(takesUp('Creer que el árbol siempre queda equilibrado', sceneOf(`<compare title="Equilibrado o no" a="Orden aleatorio" b="Orden creciente">\n<pair label="Árbol" a="queda casi equilibrado" b="siempre se inclina" />\n<pair label="Altura" a="3" b="7" />\n</compare>`).blocks));
  });

  it('does not count the words the misconception shares with the question: every block names the topic', () => {
    const blocks = sceneOf(`${brief()}\n<arch title="A model reads reviews">\n<node id="m" label="Model" desc="Reads each review" />\n</arch>`).blocks;
    assert.ok(takesUp('Believing the model understands the review', blocks));
    assert.ok(!takesUp('Believing the model understands the review', blocks, 'How does the model classify a review?'));
  });

  it('warns when the misconception is not taken up and when no quiz asks the check', () => {
    const warnings = briefWarnings(sceneOf(`${brief()}\n${tree}`));
    assert.equal(warnings.length, 2);
    assert.match(warnings[0] ?? '', /No component takes up the misconception of the brief \("Believing the tree always stays balanced"\)/);
    assert.match(warnings[1] ?? '', /No <quiz> with options: the reader never predicts the check of the brief/);
    const flashcard = '<quiz question="Does the tree stay balanced?">\n<answer>No: values in order make it always lean one way, so it is not balanced.</answer>\n</quiz>';
    const onlyCards = briefWarnings(sceneOf(`${brief()}\n${tree}\n${flashcard}`));
    assert.deepEqual(onlyCards.length, 1, 'a flashcard takes up the misconception but is no prediction');
    assert.match(onlyCards[0] ?? '', /No <quiz> with options/);
    const good = quiz('The tree balances itself', 'Nothing rebalances it: in order, the tree always leans and is not balanced.');
    assert.deepEqual(briefWarnings(sceneOf(`${brief()}\n${tree}\n${good}`)), []);
  });

  it('asks a scene cached without a brief to be rebuilt with one, through sceneWarnings', () => {
    const warnings = sceneWarnings(tempProject(), sceneOf(`# Trees\n\n<theme name="code" />\n\n${tree}`), []);
    assert.match(warnings[0] ?? '', /^No <brief>: this scene was made before every scene opened with one\. Rebuild it under the same topic/);
  });
});
