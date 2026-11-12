import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CompareBlock, TimelineBlock } from '../../server/src/scene.ts';
import { compareParts, compareTally } from '../src/lesson/compareTally.ts';
import { buildSlides } from '../src/presentation/slides.ts';

const compare: CompareBlock = {
  type: 'compare',
  id: 'c',
  title: 'C',
  a: 'Counts',
  b: 'TF-IDF',
  rows: [
    { label: 'one', a: 'x', b: 'y', winner: 'b' },
    { label: 'two', a: 'x', b: 'y', winner: 'tie' },
    { label: 'three', a: 'x', b: 'y', winner: 'a' },
    { label: 'four', a: 'x', b: 'y', winner: 'b' },
    { label: 'five', a: 'x', b: 'y' },
  ],
};

describe('a comparison', () => {
  it('counts the rows each side wins; ties and unjudged rows count for neither', () => {
    assert.deepEqual(compareTally(compare), { a: 1, b: 2 });
  });

  it('has a part for the names, one per row, and one for the tally when rows are judged', () => {
    assert.equal(compareParts(compare), 7);
    assert.equal(compareParts({ ...compare, rows: compare.rows.map(({ winner: _winner, ...row }) => row) }), 6);
    assert.equal(buildSlides([compare])[0]?.parts, 7);
  });
});

describe('a timeline', () => {
  it('has one part per event', () => {
    const timeline: TimelineBlock = { type: 'timeline', id: 't', title: 'T', events: [{ label: 'a', narration: 'x' }, { label: 'b', narration: 'y' }, { label: 'c', narration: 'z' }] };
    assert.equal(buildSlides([timeline])[0]?.parts, 3);
  });
});
