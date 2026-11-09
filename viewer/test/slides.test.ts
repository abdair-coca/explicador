import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block } from '../../server/src/scene.ts';
import { buildSlides, keyAction } from '../src/presentation/slides.ts';

const blocks: Block[] = [
  { type: 'markdown', text: '# Intro' },
  { type: 'arch', id: 'a', title: 'A', nodes: [{ id: 'x', label: 'X', kind: 'module' }], groups: [], edges: [], drills: [] },
  {
    type: 'flow',
    id: 'f',
    title: 'F',
    nodes: [{ id: 'x', label: 'X', kind: 'module' }],
    steps: [
      { from: 'x', narration: 'one' },
      { from: 'x', narration: 'two' },
    ],
    drills: [],
  },
  { type: 'markdown', text: 'Outro' },
];

describe('buildSlides', () => {
  it('makes one slide per prose block, per <arch> and per <flow> step, in document order', () => {
    assert.deepEqual(buildSlides(blocks), [
      { kind: 'markdown', block: 0 },
      { kind: 'arch', block: 1 },
      { kind: 'step', block: 2, step: 0, of: 2 },
      { kind: 'step', block: 2, step: 1, of: 2 },
      { kind: 'markdown', block: 3 },
    ]);
  });
});

describe('keyAction', () => {
  it('advances only on explicit keys', () => {
    assert.equal(keyAction('ArrowRight'), 'next');
    assert.equal(keyAction(' '), 'next');
    assert.equal(keyAction('PageUp'), 'prev');
    assert.equal(keyAction('Home'), 'first');
    assert.equal(keyAction('End'), 'last');
    assert.equal(keyAction('Escape'), 'exit');
    assert.equal(keyAction('f'), 'fullscreen');
    assert.equal(keyAction('a'), undefined);
  });
});
