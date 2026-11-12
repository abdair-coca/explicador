import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block, ChapterBlock } from '../../server/src/scene.ts';
import { stageMapOf } from '../src/lesson/stageMap.ts';

const blocks: Block[] = [
  {
    type: 'journey',
    id: 'map',
    title: 'Map',
    stages: [
      { id: 'embed', label: 'Embed', kind: 'text', narration: '' },
      { id: 'store', label: 'Store', kind: 'table', narration: '' },
      { id: 'search', label: 'Search', kind: 'model', narration: '' },
    ],
    drills: [],
  },
];
const chapter = (stage?: string): ChapterBlock => ({ type: 'chapter', id: 'c', title: 'C', ...(stage ? { stage } : {}) });

describe('stageMapOf', () => {
  it('gives the whole journey with the chapter stage as the current one', () => {
    assert.deepEqual(stageMapOf(blocks, chapter('store')), {
      stages: [
        { id: 'embed', label: 'Embed', kind: 'text' },
        { id: 'store', label: 'Store', kind: 'table' },
        { id: 'search', label: 'Search', kind: 'model' },
      ],
      current: 1,
    });
  });

  it('gives nothing for a chapter without a stage or with an unknown one', () => {
    assert.equal(stageMapOf(blocks, chapter()), undefined);
    assert.equal(stageMapOf(blocks, chapter('rank')), undefined);
  });
});
