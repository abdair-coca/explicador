import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { arcParts, formatErrors, parseExl, type Scene } from '../src/parser/index.ts';
import { acronymWarnings, arcOf, arcWarnings, exampleData, termWarnings, titleWarnings, uses } from '../src/rules.ts';

const brief = (terms = 'search tree, height', audience = 'Students who know what a list is'): string =>
  [
    '<brief form="structure">',
    `<audience>${audience}</audience>`,
    '<question>Where does each value go in a search tree?</question>',
    '<example>Insert 50, 30 and 70 in that order</example>',
    '<misconception>Believing the tree always stays balanced</misconception>',
    '<check>Predict where 40 goes</check>',
    `<terms>${terms}</terms>`,
    '</brief>',
  ].join('\n');

const arch = (arc: string, title = 'Each value goes left or right of 50'): string =>
  `<arch title="${title}"${arc ? ` arc="${arc}"` : ''}>\n<node id="a" label="50" desc="The first value" />\n<node id="b" label="30" desc="Smaller, so left" />\n<edge from="a" to="b" />\n</arch>`;
const compare =
  '<compare title="Values in order make a tree that leans" a="Shuffled" b="In order" arc="contrast">\n<pair label="Height" a="2" b="3" />\n<pair label="Shape" a="balanced" b="a line" />\n</compare>';
const answer = '<stats title="Smaller goes left, larger goes right" arc="answer">\n<stat value="3" label="levels for 50, 30, 70" />\n</stats>';
const quiz = '<quiz question="Where does 40 go?">\n<option correct="true" why="Smaller than 50, larger than 30.">Right of 30</option>\n<option why="40 is smaller than 50.">Right of 50</option>\n</quiz>';
const concept = (term: string): string => `<concept term="${term}">\n<define>A tree where each value has a place.</define>\n</concept>`;

const sceneOf = (...parts: string[]): Scene => {
  const parsed = parseExl(parts.join('\n\n'));
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene;
};

describe('arc', () => {
  it('accepts every part on a component and keeps it on the block', () => {
    for (const part of arcParts) {
      const scene = sceneOf(arch(part));
      const block = scene.blocks[0];
      assert.ok(block && block.type === 'arch');
      assert.equal(block.arc, part);
    }
  });

  it('refuses an unknown part, and an arc on a chapter, the theme or the brief', () => {
    const errorsOf = (source: string): string => {
      const parsed = parseExl(source);
      return parsed.ok ? '' : formatErrors(parsed.errors);
    };
    assert.match(errorsOf(arch('intro')), /Unknown arc "intro"; use question, example, idea, contrast, apply, answer, check, recap/);
    assert.match(errorsOf(`<chapter title="One" arc="idea" />\n${arch('idea')}`), /Unknown attribute "arc" on <chapter>/);
    assert.match(errorsOf(`<theme name="code" arc="idea" />\n${arch('idea')}`), /Unknown attribute "arc" on <theme>/);
    assert.match(errorsOf(`${brief().replace('<brief form="structure">', '<brief form="structure" arc="idea">')}\n${arch('idea')}`), /Unknown attribute "arc" on <brief>/);
  });

  it('gives a concept, a quiz and a flashcard their part when none is declared', () => {
    const scene = sceneOf(concept('Search tree'), quiz, '<quiz question="Why?">\n<answer>Because.</answer>\n</quiz>', arch(''), concept('Height').replace('<concept', '<concept arc="contrast"'));
    assert.deepEqual(scene.blocks.map(arcOf), ['idea', 'check', 'recap', undefined, 'contrast']);
  });
});

describe('arcWarnings', () => {
  it('says nothing for a scene in order: example, idea, contrast, answer, check', () => {
    assert.deepEqual(arcWarnings(sceneOf(brief(), arch('example'), concept('Search tree'), compare, answer, quiz)), []);
  });

  it('says nothing without a brief: an older scene already gets "No <brief>"', () => {
    assert.deepEqual(arcWarnings(sceneOf(arch(''))), []);
  });

  it('lists the components without a part, and asks for an example, a contrast and an answer', () => {
    const warnings = arcWarnings(sceneOf(brief(), arch(''), quiz));
    assert.match(warnings[0] ?? '', /^These components declare no part of the arc: <arch> "Each value goes left or right of 50"\./);
    assert.match(warnings[1] ?? '', /^No arc="example": no slide shows the brief's example \("Insert 50, 30 and 70 in that order"\)/);
    assert.match(warnings[2] ?? '', /^No arc="contrast"/);
    assert.match(warnings[3] ?? '', /^No arc="answer"/);
    assert.equal(warnings.length, 4);
  });

  it('wants the concrete case first: no idea and no answer before the first example', () => {
    const warnings = arcWarnings(sceneOf(brief(), answer, concept('Search tree'), arch('example'), compare, quiz));
    assert.equal(warnings.length, 2, warnings.join('\n'));
    assert.match(warnings[0] ?? '', /^<concept> "Search tree" \(arc="idea"\) comes before the first example, <arch> "Each value goes left or right of 50": concrete first\./);
    assert.match(warnings[1] ?? '', /^<stats> "Smaller goes left, larger goes right" \(arc="answer"\) comes before the first example/);
  });

  it('wants the example slide to show the brief\'s data', () => {
    const vague = arch('example', 'Each value finds its place').replace('label="50"', 'label="root"').replace('label="30"', 'label="left child"');
    const warnings = arcWarnings(sceneOf(brief(), vague, compare, answer, quiz));
    assert.deepEqual(warnings.length, 1, warnings.join('\n'));
    assert.match(warnings[0] ?? '', /^No slide with arc="example" shows the brief's example \("Insert 50, 30 and 70 in that order"\): put its real data \(50, 30, 70\)/);
  });

  it('wants the scene to end on a check or a recap', () => {
    const warnings = arcWarnings(sceneOf(brief(), arch('example'), quiz, compare, answer));
    assert.deepEqual(warnings.length, 1, warnings.join('\n'));
    assert.match(warnings[0] ?? '', /^The scene ends on <stats> "Smaller goes left, larger goes right", which is no check or recap/);
  });

  it('reads the data of an example: numbers, quoted values and names', () => {
    assert.deepEqual(exampleData('Insert 50, 30 and 70'), ['50', '30', '70']);
    assert.deepEqual(exampleData('Ada logs in as "ada@example.com" with the password "lovelace"'), ['ada@example.com', 'lovelace']);
    assert.deepEqual(exampleData('The printer Gutenberg prints a Bible. Then it spreads'), ['Gutenberg', 'Bible']);
  });
});

describe('termWarnings', () => {
  it('wants a concept card for every term, before any component shows the term', () => {
    assert.deepEqual(termWarnings(sceneOf(brief(), arch('example'), concept('Search tree'), concept('Height (in levels)'))), []);
    const missing = termWarnings(sceneOf(brief(), arch('example'), concept('Search tree')));
    assert.match(missing[0] ?? '', /^These terms of the brief have no <concept> card: "height"\./);
    const early = termWarnings(sceneOf(brief(), arch('example', 'A search tree puts each value left or right'), concept('Search tree'), concept('Height')));
    assert.match(early[0] ?? '', /^These terms appear before their <concept> card: "search tree" \(in <arch> "A search tree puts each value left or right"\)/);
  });

  it('lets a chapter card name the term its section defines', () => {
    assert.deepEqual(termWarnings(sceneOf(brief('height'), '<chapter title="The height of a tree" />', concept('Height'), arch('example'))), []);
  });

  it('matches terms as whole words, in the plural, without case or accents', () => {
    assert.ok(uses('Two search trees', 'search tree'));
    assert.ok(uses('La ALTURA del árbol', 'arbol'));
    assert.ok(uses('TF-IDF weights', 'tf-idf'));
    assert.ok(!uses('A treehouse', 'tree'));
  });
});

describe('acronymWarnings', () => {
  const stats = (label: string): string => `<stats title="What the tree holds">\n<stat value="3" label="${label}" />\n</stats>`;

  it('finds acronyms nobody spells out, also without a brief', () => {
    const warnings = acronymWarnings(sceneOf(stats('LCI of the tree'), '<chapter title="The FE of each node" />', stats('TF-IDF of a word')));
    assert.match(warnings[0] ?? '', /^These acronyms appear before anything spells them out: LCI \(in <stats> "What the tree holds"\), FE \(in <chapter> "The FE of each node"\), TF-IDF \(in <stats> "What the tree holds"\)\./);
  });

  it('accepts an acronym spelled out anywhere, named by a concept, or known to the audience', () => {
    assert.deepEqual(acronymWarnings(sceneOf('The **internal path length (LCI)** adds the depths.', stats('LCI of the tree'))), []);
    assert.deepEqual(acronymWarnings(sceneOf('**TF-IDF** (term frequency–inverse document frequency) scales counts.', stats('TF-IDF of a word'))), []);
    assert.deepEqual(acronymWarnings(sceneOf(stats('LCI (longitud de camino interno) of the tree'))), []);
    assert.deepEqual(acronymWarnings(sceneOf(concept('TF-IDF'), stats('TF-IDF of a word'))), []);
    assert.match(acronymWarnings(sceneOf(stats('TF-IDF of a word'), concept('TF-IDF')))[0] ?? '', /TF-IDF \(in <stats>/, 'the card comes too late');
    assert.match(acronymWarnings(sceneOf(stats('LCI of the tree'), 'The internal path length (LCI) adds the depths.'))[0] ?? '', /LCI \(in <stats>/, 'spelled out too late');
    assert.deepEqual(acronymWarnings(sceneOf(brief('search tree', 'Developers who know HTTP and JSON'), arch('example'), stats('JSON over HTTP'))), []);
  });

  it('does not read roman numerals, code or one capital as acronyms', () => {
    const trace = '<trace title="The body is sent as text">\n<value label="In">a</value>\n<value label="Out" code="JSON.stringify(body)">b</value>\n</trace>';
    assert.deepEqual(acronymWarnings(sceneOf(stats('printed in the XV century'), trace, stats('A tree, I think'), stats('sku BOOK-1843'))), []);
  });
});

describe('titleWarnings', () => {
  it('calls a title of one or two words a label', () => {
    assert.match(titleWarnings(sceneOf(arch('', 'Weights'), arch('', 'Data model')).blocks)[0] ?? '', /^These titles are labels, not the slide's point: <arch> "Weights", <arch> "Data model"\./);
    assert.deepEqual(titleWarnings(sceneOf(arch('', 'Only bad pulls down')).blocks), []);
  });
});
