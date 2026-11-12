import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block } from '../../server/src/scene.ts';
import { buildSlides, keyAction, move, segmentFill, segmentsOf, type Position, type Slide } from '../src/presentation/slides.ts';

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
  it('makes one slide per component, in document order, with each <flow> step as a part, and the title as the cover', () => {
    assert.deepEqual(buildSlides(blocks), [
      { kind: 'markdown', block: 0, parts: 1, chapter: 0, cover: 'Intro' },
      { kind: 'arch', block: 1, parts: 1, chapter: 0 },
      { kind: 'flow', block: 2, parts: 2, chapter: 0 },
    ]);
  });

  it('leaves prose to the speaker: no cover without a leading # title, none after a chapter, all prose when there is nothing else', () => {
    const arch = blocks[1] as Block;
    const chapter: Block = { type: 'chapter', id: 'c', title: 'C' };
    assert.deepEqual(
      buildSlides([{ type: 'markdown', text: 'Plain intro.\n\n# Late title' }, arch]).map((slide) => slide.kind),
      ['arch'],
    );
    assert.deepEqual(
      buildSlides([chapter, { type: 'markdown', text: '# Inside' }, arch]).map((slide) => slide.kind),
      ['chapter', 'arch'],
    );
    assert.deepEqual(
      buildSlides([{ type: 'markdown', text: '# Only' }, chapter, { type: 'markdown', text: 'Words.' }]).map((slide) => [slide.kind, slide.cover]),
      [
        ['markdown', undefined],
        ['chapter', undefined],
        ['markdown', undefined],
      ],
    );
  });
});

describe('buildSlides with <data> and <state>', () => {
  it('gives <data> one part and a <state> one part per walk step, or one without a walk', () => {
    const views: Block[] = [
      { type: 'data', id: 'd', title: 'D', entities: [{ id: 'e', label: 'E', fields: [] }], relations: [], drills: [] },
      {
        type: 'state',
        id: 's',
        title: 'S',
        states: [{ id: 'a', label: 'A', role: 'initial' }],
        transitions: [{ from: 'a', to: 'a', event: 'tick' }],
        walk: [
          { transition: 0, from: 'a', to: 'a', event: 'tick', narration: 'one' },
          { transition: 0, from: 'a', to: 'a', event: 'tick', narration: 'two' },
        ],
        drills: [],
      },
      { type: 'state', id: 't', title: 'T', states: [{ id: 'a', label: 'A', role: 'initial' }], transitions: [], walk: [], drills: [] },
    ];
    assert.deepEqual(buildSlides(views), [
      { kind: 'data', block: 0, parts: 1, chapter: 0 },
      { kind: 'state', block: 1, parts: 2, chapter: 0 },
      { kind: 'state', block: 2, parts: 1, chapter: 0 },
    ]);
  });
});

describe('buildSlides with <concept>', () => {
  it('shows the term alone, then one part per piece the concept has', () => {
    const concepts: Block[] = [
      { type: 'concept', id: 'c1', term: 'TF-IDF', define: 'A weight.' },
      { type: 'concept', id: 'c2', term: 'Sigmoid', define: 'A squash.', analogy: 'A dimmer.', formula: '\\sigma(z)', example: 'z = 0 gives 0.5' },
    ];
    assert.deepEqual(
      buildSlides(concepts).map((slide) => slide.parts),
      [2, 5],
    );
  });
});

describe('buildSlides parts that build up', () => {
  it('shows the cover at once, stats card by card, then a chart highlight and a quiz answer', () => {
    const lesson: Block[] = [
      { type: 'markdown', text: '# Title\n\nOne.\n\nTwo.' },
      { type: 'stats', id: 's', stats: [{ value: '1', label: 'a' }, { value: '2', label: 'b' }, { value: '3', label: 'c' }] },
      { type: 'chart', id: 'k', title: 'K', chartType: 'bars', series: [], rows: [{ label: 'a', values: ['1'] }], highlight: 'a' },
      { type: 'chart', id: 'l', title: 'L', chartType: 'bars', series: [], rows: [{ label: 'a', values: ['1'] }] },
      { type: 'quiz', id: 'q', question: 'Q?', options: [], answer: 'A.' },
    ];
    assert.deepEqual(
      buildSlides(lesson).map((slide) => slide.parts),
      [1, 3, 2, 1, 2],
    );
  });
});

describe('move', () => {
  const deck: Slide[] = [
    { kind: 'markdown', block: 0, parts: 1, chapter: 0 },
    { kind: 'flow', block: 1, parts: 3, chapter: 0 },
    { kind: 'markdown', block: 2, parts: 2, chapter: 0 },
  ];

  it('reveals each part before opening the next slide, and stops at the end', () => {
    const seen: Position[] = [];
    let at: Position = { slide: 0, part: 0 };
    for (let i = 0; i < 6; i++) {
      at = move(deck, at, 'next');
      seen.push(at);
    }
    assert.deepEqual(seen, [
      { slide: 1, part: 0 },
      { slide: 1, part: 1 },
      { slide: 1, part: 2 },
      { slide: 2, part: 0 },
      { slide: 2, part: 1 },
      { slide: 2, part: 1 },
    ]);
  });

  it('goes back part by part, then to the previous slide fully built, and stops at the start', () => {
    assert.deepEqual(move(deck, { slide: 2, part: 1 }, 'prev'), { slide: 2, part: 0 });
    assert.deepEqual(move(deck, { slide: 2, part: 0 }, 'prev'), { slide: 1, part: 2 });
    assert.deepEqual(move(deck, { slide: 0, part: 0 }, 'prev'), { slide: 0, part: 0 });
  });

  it('skips the remaining parts and jumps to either end', () => {
    assert.deepEqual(move(deck, { slide: 1, part: 0 }, 'skip'), { slide: 2, part: 0 });
    assert.deepEqual(move(deck, { slide: 2, part: 0 }, 'skip'), { slide: 2, part: 1 });
    assert.deepEqual(move(deck, { slide: 1, part: 1 }, 'first'), { slide: 0, part: 0 });
    assert.deepEqual(move(deck, { slide: 0, part: 0 }, 'last'), { slide: 2, part: 1 });
  });
});

describe('segmentsOf and segmentFill', () => {
  it('gives each chapter a segment, and the slides before the first chapter their own, filled part by part', () => {
    const lesson: Slide[] = [
      { kind: 'markdown', block: 0, parts: 1, chapter: 0 },
      { kind: 'chapter', block: 1, parts: 1, chapter: 1 },
      { kind: 'journey', block: 2, parts: 4, chapter: 1 },
      { kind: 'chapter', block: 3, parts: 1, chapter: 2 },
    ];
    const segments = segmentsOf(lesson);
    assert.deepEqual(segments, [
      { first: 0, count: 1, chapter: 0 },
      { first: 1, count: 2, chapter: 1 },
      { first: 3, count: 1, chapter: 2 },
    ]);
    const one = segments[1]!;
    assert.equal(segmentFill(one, lesson, { slide: 0, part: 0 }), 0);
    assert.equal(segmentFill(one, lesson, { slide: 1, part: 0 }), 0.5);
    assert.equal(segmentFill(one, lesson, { slide: 2, part: 1 }), 0.75);
    assert.equal(segmentFill(one, lesson, { slide: 3, part: 0 }), 1);
  });

  it('gives each slide a segment when the scene has no chapters', () => {
    assert.deepEqual(
      segmentsOf(buildSlides(blocks)).map((segment) => segment.first),
      [0, 1, 2],
    );
  });
});

describe('keyAction', () => {
  it('advances only on explicit keys, and skips the remaining parts with Shift', () => {
    assert.equal(keyAction('ArrowRight'), 'next');
    assert.equal(keyAction(' '), 'next');
    assert.equal(keyAction('PageUp'), 'prev');
    assert.equal(keyAction('Home'), 'first');
    assert.equal(keyAction('End'), 'last');
    assert.equal(keyAction('Escape'), 'exit');
    assert.equal(keyAction('f'), 'fullscreen');
    assert.equal(keyAction('M'), 'sound');
    assert.equal(keyAction('a'), undefined);
    assert.equal(keyAction('ArrowRight', true), 'skip');
    assert.equal(keyAction('PageDown', true), 'skip');
    assert.equal(keyAction(' ', true), 'next');
  });
});
