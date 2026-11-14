import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StructureBlock } from '../../server/src/scene.ts';
import { layoutState, layoutStructure, spotOf } from '../src/lesson/structureLayout.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { subtitleOf } from '../src/presentation/subtitles.ts';

const bst: StructureBlock = {
  type: 'structure',
  id: 's',
  title: 'A tree grows',
  direction: 'down',
  members: ['50', '30', '70', '20'].map((label) => ({ id: `n${label}`, label })),
  changes: [
    { label: 'Insert 50', narration: 'The root.', add: ['n50'], remove: [], move: [], mark: [] },
    { label: 'Insert 30', narration: 'Left of 50.', add: ['n30'], remove: [], move: [], mark: ['n50'] },
    { label: 'Insert 20', narration: 'Left of 30.', add: ['n20'], remove: [], move: [], mark: ['n50', 'n30'] },
  ],
  states: [
    { members: [{ id: 'n50' }], mark: [], added: ['n50'], change: 0 },
    { members: [{ id: 'n50' }, { id: 'n30', parent: 'n50', side: 'left' }], mark: ['n50'], added: ['n30'], change: 1 },
    {
      members: [{ id: 'n50' }, { id: 'n30', parent: 'n50', side: 'left' }, { id: 'n20', parent: 'n30', side: 'left' }],
      mark: ['n50', 'n30'],
      added: ['n20'],
      change: 2,
    },
  ],
};

describe('the layout of a structure', () => {
  it('puts a lone left child to the left of its parent, a level down', () => {
    const { spots, width, depth } = layoutState(bst.states[2] ?? { members: [] });
    assert.equal(depth, 3);
    assert.equal(width, 3, 'two empty right slots and the leaf');
    const [root, left, leaf] = ['n50', 'n30', 'n20'].map((id) => spots.get(id));
    assert.ok(root && left && leaf);
    assert.ok(left.x < root.x && leaf.x < left.x, 'each lone left child sits further left');
    assert.deepEqual([root.y, left.y, leaf.y], [0, 1, 2]);
  });

  it('centers a parent over its children, and lays roots side by side', () => {
    const { spots, width } = layoutState({
      members: [{ id: 'a' }, { id: 'b', parent: 'a' }, { id: 'c', parent: 'a' }, { id: 'd', parent: 'a' }, { id: 'e' }],
    });
    assert.equal(width, 4);
    assert.equal(spots.get('a')?.x, (0.5 + 2.5) / 2);
    assert.deepEqual([spots.get('b')?.x, spots.get('c')?.x, spots.get('d')?.x], [0.5, 1.5, 2.5]);
    assert.deepEqual(spots.get('e'), { x: 3.5, y: 0 }, 'a second root, to the right');
  });

  it('keeps every state on one frame, centered, and turns it for a tree to the right', () => {
    const layout = layoutStructure(bst);
    assert.equal(layout.slots, 3);
    assert.equal(layout.levels, 3);
    assert.deepEqual(layout.states[0]?.get('n50'), { x: 0.5, y: 0.5 / 3 }, 'the lone root sits in the middle at the top');
    for (const state of layout.states) for (const spot of state.values()) assert.ok(spot.x > 0 && spot.x < 1 && spot.y > 0 && spot.y < 1);
    const turned = layoutStructure({ ...bst, direction: 'right' });
    assert.deepEqual(turned.states[0]?.get('n50'), { x: 0.5 / 3, y: 0.5 }, 'the root on the left, in the middle');
  });

  it('places a member that is not there yet where it will first be', () => {
    const layout = layoutStructure(bst);
    assert.deepEqual(spotOf(layout, 'n20', 0), layout.states[2]?.get('n20'));
    assert.deepEqual(spotOf(layout, 'n50', 2), layout.states[2]?.get('n50'));
  });
});

describe('a structure in Present', () => {
  it('has one part per state, each with its change as the subtitle', () => {
    const slides = buildSlides([bst]);
    assert.equal(slides[0]?.parts, 3);
    assert.equal(subtitleOf(bst, 1), 'Left of 50.');
    const withStart: StructureBlock = { ...bst, states: [{ members: [{ id: 'n50' }], mark: [], added: [] }, ...bst.states.slice(1)] };
    assert.equal(subtitleOf(withStart, 0), undefined, 'the start has no change to tell');
  });
});
