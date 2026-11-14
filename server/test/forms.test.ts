import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type Scene } from '../src/parser/index.ts';
import { formWarnings, subtitleWarnings, termWarnings } from '../src/rules.ts';

const sceneOf = (source: string): Scene => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene;
};
const errorsOf = (source: string): string => {
  const parsed = parseExl(source);
  assert.equal(parsed.ok, false, 'expected errors');
  return parsed.ok ? '' : formatErrors(parsed.errors);
};

const passage = ['<passage>', '4. The rent is 900 euros a month,', '   paid by the 5th day of each month.', '10. At renewal the rent may rise by', '    at most 5 %.', '</passage>'].join('\n');
const annotated = (notes: string): string => `<annotated title="Two clauses decide what the tenant pays" arc="example">\n${passage}\n${notes}\n</annotated>`;

describe('<annotated>', () => {
  it('keeps the passage as written and finds each quote, across line breaks', () => {
    const scene = sceneOf(annotated('<note quote="paid by the 5th day" label="Clause 4">The due date.</note>\n<note quote="rise by at most 5 %">The cap at renewal.</note>'));
    const block = scene.blocks[0];
    assert.ok(block?.type === 'annotated');
    assert.equal(block.passage, '4. The rent is 900 euros a month,\n   paid by the 5th day of each month.\n10. At renewal the rent may rise by\n    at most 5 %.');
    assert.equal(block.passage.slice(block.notes[0]?.start, block.notes[0]?.end), 'paid by the 5th day');
    assert.equal(block.passage.slice(block.notes[1]?.start, block.notes[1]?.end), 'rise by\n    at most 5 %');
    assert.equal(block.notes[0]?.label, 'Clause 4');
  });

  it('refuses a quote that is not there, one that overlaps another, and a missing passage', () => {
    assert.match(errorsOf(annotated('<note quote="paid weekly">No.</note>')), /"paid weekly" is not in the <passage>/);
    assert.match(errorsOf(annotated('<note quote="900 euros a month">Rent.</note>\n<note quote="a month, paid">Overlaps.</note>')), /overlaps the words of another note \("900 euros a month"\)/);
    assert.match(errorsOf('<annotated title="No text at all here">\n<note quote="x">X.</note>\n</annotated>'), /<annotated> needs exactly one <passage>/);
    assert.match(errorsOf(annotated('')), /<annotated> needs at least one <note quote="…">/);
    assert.match(errorsOf(annotated('<note quote="900 euros"></note>')), /<note> needs narration text/);
  });
});

const argument = (body: string): string => `<argument title="Signing as is costs little and risks little" arc="answer">\n${body}\n</argument>`;

describe('<argument>', () => {
  it('reads the claim, the points in order with their replies, and the verdict', () => {
    const scene = sceneOf(
      argument(
        [
          '<claim>The tenant can sign the lease as it is</claim>',
          '<support label="The rent is capped">At renewal it rises at most 5 %.</support>',
          '<objection label="The deposit is high" reply="It is the legal maximum, and it comes back in 30 days.">Two months is a lot to pay up front.</objection>',
          '<verdict>Sign, and keep proof of the flat\'s state on day one</verdict>',
        ].join('\n'),
      ),
    );
    const block = scene.blocks[0];
    assert.ok(block?.type === 'argument');
    assert.equal(block.claim, 'The tenant can sign the lease as it is');
    assert.deepEqual(block.points.map((point) => [point.side, point.label, point.reply]), [
      ['support', 'The rent is capped', undefined],
      ['objection', 'The deposit is high', 'It is the legal maximum, and it comes back in 30 days.'],
    ]);
    assert.equal(block.verdict, "Sign, and keep proof of the flat's state on day one");
  });

  it('refuses an argument without one claim first, without points, or with the verdict before the end', () => {
    assert.match(errorsOf(argument('<support label="A">Because.</support>')), /needs exactly one <claim>/);
    assert.match(errorsOf(argument('<claim>X</claim>')), /needs at least one <support> or <objection>/);
    assert.match(errorsOf(argument('<support label="A">Because.</support>\n<claim>X</claim>')), /Put <claim> first/);
    assert.match(errorsOf(argument('<claim>X</claim>\n<verdict>Yes</verdict>\n<support label="A">Because.</support>')), /Put <verdict> last/);
    assert.match(errorsOf(argument('<claim>X</claim>\n<support label="A" reply="no">Because.</support>')), /Unknown attribute "reply" on <support>/);
  });

  it('warns about long narrations like any subtitle', () => {
    const long = 'word '.repeat(30).trim();
    const block = sceneOf(argument(`<claim>X</claim>\n<support label="A">${long}</support>`)).blocks[0];
    assert.ok(block);
    assert.match(subtitleWarnings([block])[0] ?? '', /point "A" \(30 words\)/);
  });
});

describe('formWarnings', () => {
  const brief = (form: string): string =>
    `<brief form="${form}">\n<audience>Tenants</audience>\n<question>What does the lease make me pay?</question>\n<example>The rent of 900 euros</example>\n<misconception>Believing the rent can rise freely</misconception>\n<check>Predict the rent after renewal</check>\n<terms>deposit</terms>\n</brief>`;
  const body = annotated('<note quote="900 euros a month">Rent.</note>');

  it('wants a component of the brief\'s form', () => {
    assert.deepEqual(formWarnings(sceneOf(`${brief('annotated')}\n${body}`)), []);
    assert.match(formWarnings(sceneOf(`${brief('system')}\n${body}`))[0] ?? '', /^The brief's form is "system", but no component draws it: use <system>/);
    assert.deepEqual(formWarnings(sceneOf(body)), [], 'no brief, no form');
  });
});

describe('terms in a passage', () => {
  it('do not count as the scene using them: the passage quotes its source', () => {
    const brief = '<brief form="annotated">\n<audience>Tenants</audience>\n<question>What does the lease make me pay?</question>\n<example>The rent of 900 euros</example>\n<misconception>Believing the rent can rise freely</misconception>\n<check>Predict the rent</check>\n<terms>rent</terms>\n</brief>';
    const card = '<concept term="Rent">\n<define>What the tenant pays each month.</define>\n</concept>';
    assert.deepEqual(termWarnings(sceneOf(`${brief}\n${annotated('<note quote="900 euros a month">How much, each month.</note>')}\n${card}`)), []);
    assert.match(termWarnings(sceneOf(`${brief}\n${annotated('<note quote="900 euros a month">The rent.</note>')}\n${card}`))[0] ?? '', /"rent" \(in <annotated>/, 'a note is the scene\'s own words');
  });
});
