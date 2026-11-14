import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type StructureBlock, type WithArc } from '../src/parser/index.ts';
import { subtitleWarnings } from '../src/rules.ts';

const tree = (changes: string, members = ''): string =>
  [
    '<structure title="Five values in, a tree three levels deep" arc="example">',
    '<member id="n50" label="50" />',
    '<member id="n30" label="30" parent="n50" side="left" />',
    '<member id="n70" label="70" parent="n50" side="right" />',
    '<member id="n20" label="20" parent="n30" side="left" />',
    members,
    changes,
    '</structure>',
  ]
    .filter(Boolean)
    .join('\n');

const inserts = [
  '<change label="Insert 50" add="n50">50 is the first value, so it becomes the root.</change>',
  '<change label="Insert 30" add="n30" mark="n50">30 is smaller than 50, so it goes left.</change>',
  '<change label="Insert 70" add="n70" mark="n50">70 is larger than 50, so it goes right.</change>',
  '<change label="Insert 20" add="n20" mark="n50 n30">20 is smaller than 50 and than 30.</change>',
].join('\n');

const blockOf = (source: string): StructureBlock & WithArc => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  const block = parsed.scene.blocks.find((item) => item.type === 'structure');
  assert.ok(block && block.type === 'structure');
  return block;
};
const errorsOf = (source: string): string => {
  const parsed = parseExl(source);
  assert.equal(parsed.ok, false, 'expected errors');
  return parsed.ok ? '' : formatErrors(parsed.errors);
};

describe('<structure>', () => {
  it('plays the changes into one state per change, each with its members in order and its marks', () => {
    const block = blockOf(tree(inserts));
    assert.equal(block.direction, 'down');
    assert.equal(block.arc, 'example');
    assert.deepEqual(block.members.map((member) => member.label), ['50', '30', '70', '20']);
    assert.equal(block.states.length, 4, 'every member is added by a change, so there is no start state');
    assert.deepEqual(block.states[0], { members: [{ id: 'n50' }], mark: [], added: ['n50'], change: 0 });
    assert.deepEqual(block.states[3]?.members, [
      { id: 'n50' },
      { id: 'n30', parent: 'n50', side: 'left' },
      { id: 'n70', parent: 'n50', side: 'right' },
      { id: 'n20', parent: 'n30', side: 'left' },
    ]);
    assert.deepEqual(block.states[3]?.mark, ['n50', 'n30']);
    assert.deepEqual(block.changes[3], { label: 'Insert 20', narration: '20 is smaller than 50 and than 30.', add: ['n20'], remove: [], move: [], mark: ['n50', 'n30'] });
  });

  it('starts from the members no change adds, and moves and removes them', () => {
    const org = [
      '<structure title="Sales moves under the new operations lead" direction="right">',
      '<member id="ceo" label="Ana, CEO" desc="Runs the company" />',
      '<member id="ops" label="Luis, operations" parent="ceo" />',
      '<member id="sales" label="Sales" parent="ceo" />',
      '<member id="temp" label="Temporary desk" parent="sales" />',
      '<change label="Sales joins operations" move="sales>ops" mark="sales">Sales now reports to Luis.</change>',
      '<change label="The desk closes" remove="temp">The temporary desk is gone.</change>',
      '<change label="Sales reports to the CEO again" move="sales>ceo">Back where it was.</change>',
      '</structure>',
    ].join('\n');
    const block = blockOf(org);
    assert.equal(block.direction, 'right');
    assert.equal(block.states.length, 4, 'the start, then one state per change');
    assert.equal(block.states[0]?.change, undefined);
    assert.deepEqual(block.states[1]?.members.find((place) => place.id === 'sales'), { id: 'sales', parent: 'ops' });
    assert.deepEqual(block.states[2]?.members.map((place) => place.id), ['ceo', 'ops', 'sales']);
    assert.deepEqual(block.changes[0]?.move, [{ id: 'sales', parent: 'ops' }]);
    assert.equal(block.members[0]?.desc, 'Runs the company');
  });

  it('draws a structure with no changes as one state, and a move to the top as a new root', () => {
    assert.equal(blockOf(tree('')).states.length, 1);
    const block = blockOf(tree('<change label="Split" move="n30>">30 stands alone.</change>'));
    assert.deepEqual(block.states[1]?.members.find((place) => place.id === 'n30'), { id: 'n30' });
    const sided = blockOf(tree('<change label="Swap" remove="n70" move="n30>n50:right">30 moves right.</change>'));
    assert.deepEqual(sided.states[1]?.members.find((place) => place.id === 'n30'), { id: 'n30', parent: 'n50', side: 'right' });
  });

  it('refuses changes that would break the structure', () => {
    assert.match(errorsOf(tree(`${inserts}\n<change label="Again" add="n50">Twice.</change>`)), /<change> "Again" adds "n50", which is already there/);
    assert.match(errorsOf(tree(`${inserts}\n<change label="Gone" remove="n70 n70">Twice.</change>`)), /<change> "Gone" removes "n70", which is not there/);
    const early = inserts.replace('<change label="Insert 30"', '<change label="Orphan" add="n20">Too early.</change>\n<change label="Insert 30"').replace(/\n<change label="Insert 20"[^\n]*/, '');
    assert.match(errorsOf(tree(early)), /After change 2 "Orphan", "n20" is there but its parent "n30" is not/);
    assert.match(errorsOf(tree('<change label="Loop" move="n50>n20">Under its grandchild.</change>')), /moves "n50" under "n20", which is "n50" itself or below it/);
    assert.match(errorsOf(tree('<change label="Lost" mark="n99">Nobody.</change>')), /"mark" refers to unknown member "n99"/);
    assert.match(errorsOf(tree(`${inserts}\n<change label="Gone" remove="n30">The parent goes.</change>`)), /After change 5 "Gone", "n20" is there but its parent "n30" is not/);
    assert.match(errorsOf(tree('<change label="Crowd" move="n70>n50:left">Two on the left.</change>')), /"n50" has two children on its left/);
    assert.match(errorsOf(tree('<change label="Idle">Nothing.</change>')), /<change> "Idle" changes nothing/);
    assert.match(errorsOf(tree('<change label="Bad" move="n30-n50">Wrong arrow.</change>')), /"n30-n50" is not a move/);
    assert.match(errorsOf(tree('<change label="Mark" mark="n20" remove="n20">Marks what it removes.</change>')), /marks "n20", which is not there/);
  });

  it('refuses bad members', () => {
    assert.match(errorsOf(tree('', '<member id="n50" label="again" />')), /Duplicate member id "n50"/);
    assert.match(errorsOf(tree('', '<member id="x" label="X" parent="ghost" />')), /"parent" refers to unknown member "ghost"/);
    assert.match(errorsOf(tree('', '<member id="x" label="X" parent="x" />')), /"x" cannot be its own parent/);
    assert.match(errorsOf(tree('', '<member id="x" label="X" side="left" />')), /"side" places a child left or right of its parent/);
    assert.match(errorsOf(tree('', '<member id="x" label="X" parent="n70" side="up" />')), /Unknown side "up"; use left, right/);
    assert.match(errorsOf('<structure title="Empty tree with nothing">\n</structure>'), /<structure> needs at least one <member>/);
    assert.match(errorsOf(tree('').replace('<structure ', '<structure direction="up" ')), /Unknown direction "up"; use down, right/);
    const many = Array.from({ length: 41 }, (_, i) => `<member id="m${i}" label="${i}" />`).join('\n');
    assert.match(errorsOf(`<structure title="Too many members in one picture">\n${many}\n</structure>`), /<structure> has more than 40 members/);
  });

  it('warns about long change narrations like any subtitle', () => {
    const long = 'word '.repeat(30).trim();
    const block = blockOf(tree(inserts.replace('50 is the first value, so it becomes the root.', long)));
    assert.match(subtitleWarnings([block])[0] ?? '', /change "Insert 50" \(30 words\)/);
  });
});

describe('ask', () => {
  it('keeps the question a change asks before it shows, and checks its length', () => {
    const asked = inserts.replace('<change label="Insert 20"', '<change label="Insert 20" ask="Where does 20 go?"');
    assert.equal(blockOf(tree(asked)).changes[3]?.ask, 'Where does 20 go?');
    assert.match(errorsOf(tree(inserts.replace('<change label="Insert 20"', `<change label="Insert 20" ask="${'x'.repeat(301)}"`))), /"ask" is longer than 300 characters/);
  });
});
