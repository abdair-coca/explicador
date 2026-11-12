import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SpaceBlock } from '../../server/src/scene.ts';
import { subtitleOf } from '../src/presentation/subtitles.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { angleArc, cosine, COMPARE_ONE_BY_ONE, SPACE, spaceModel } from '../src/lesson/spaceGeometry.ts';

const base: SpaceBlock = {
  type: 'space',
  id: 's',
  title: 'S',
  k: 2,
  clusters: [],
  items: [
    { id: 'a', label: 'A', x: '1', y: '0', narration: 'Same direction.' },
    { id: 'b', label: 'B', x: '0', y: '2' },
    { id: 'c', label: 'C', x: '1', y: '1' },
  ],
  query: { label: 'Q', x: '2', y: '0', narration: 'The query lands.' },
};

describe('cosine', () => {
  it('is 1 for the same direction, 0 for a right angle and ignores length', () => {
    assert.equal(cosine([1, 0], [5, 0]), 1);
    assert.equal(cosine([1, 0], [0, 3]), 0);
    assert.ok(Math.abs(cosine([1, 0], [1, 1]) - Math.SQRT1_2) < 1e-12);
    assert.equal(cosine([0, 0], [1, 1]), 0);
  });
});

describe('spaceModel', () => {
  it('computes each cosine, ranks the k nearest and plays points, query, each comparison and the ranking', () => {
    const model = spaceModel(base);
    assert.deepEqual(
      model.items.map((item) => item.scoreText),
      ['1.000', '0.000', '0.707'],
    );
    assert.deepEqual(model.ranking, [0, 2]);
    assert.deepEqual(
      model.items.map((item) => item.rank),
      [1, 0, 2],
    );
    assert.equal(model.realScores, false);
    assert.deepEqual(
      model.parts.map((part) => part.kind),
      ['points', 'query', 'compare', 'compare', 'compare', 'rank'],
    );
  });

  it('keeps one scale for both axes, so a 45° vector stays at 45° on screen', () => {
    const model = spaceModel(base);
    const c = model.items[2];
    assert.ok(c);
    assert.ok(Math.abs(c.px - model.origin.px - (model.origin.py - c.py)) < 0.02);
    for (const item of model.items) {
      assert.ok(item.px >= 0 && item.px <= SPACE.width && item.py >= 0 && item.py <= SPACE.height);
    }
  });

  it('uses the real scores when the items carry them', () => {
    const model = spaceModel({ ...base, items: base.items.map((item, i) => ({ ...item, score: ['0.2', '0.9', '0.5'][i] ?? '0' })) });
    assert.equal(model.realScores, true);
    assert.deepEqual(model.ranking, [1, 2]);
    assert.equal(model.items[1]?.scoreText, '0.9');
  });

  it('sends the query to its cluster and compares only the items there', () => {
    const clustered: SpaceBlock = {
      ...base,
      k: 1,
      clusters: [
        { id: 'east', label: 'East', x: '1', y: '0.2', narration: 'Only the east is searched.' },
        { id: 'north', label: 'North', x: '0', y: '1' },
      ],
      items: base.items.map((item, i) => ({ ...item, cluster: i === 1 ? 'north' : 'east' })),
    };
    const model = spaceModel(clustered);
    assert.equal(model.probed, 0);
    assert.equal(model.candidates, 2);
    assert.deepEqual(
      model.items.map((item) => item.candidate),
      [true, false, true],
    );
    assert.deepEqual(
      model.parts.map((part) => part.kind),
      ['points', 'query', 'index', 'compare', 'compare', 'rank'],
    );
    assert.equal(subtitleOf(clustered, 2), 'Only the east is searched.');
    assert.equal(spaceModel({ ...clustered, query: { ...clustered.query, cluster: 'north' } }).probed, 1);
  });

  it('compares the items past the first ones together, so a big cluster does not make a long slide', () => {
    const many = Array.from({ length: COMPARE_ONE_BY_ONE + 4 }, (_, i) => ({ id: `i${i}`, label: `I${i}`, x: String(i + 1), y: '1' }));
    const model = spaceModel({ ...base, items: many });
    const compares = model.parts.filter((part) => part.kind === 'compare');
    assert.equal(compares.length, COMPARE_ONE_BY_ONE + 1);
    assert.equal(compares.at(-1)?.kind === 'compare' ? compares.at(-1)?.items.length : 0, 4);
  });

  it('is one slide with one part per step, and says the narration of the query and of each item compared', () => {
    assert.deepEqual(buildSlides([base]), [{ kind: 'space', block: 0, parts: 6, chapter: 0 }]);
    assert.equal(subtitleOf(base, 0), undefined);
    assert.equal(subtitleOf(base, 1), 'The query lands.');
    assert.equal(subtitleOf(base, 2), 'Same direction.');
    assert.equal(subtitleOf(base, 5), undefined);
  });
});

describe('angleArc', () => {
  it('opens the short way between the two arrows and measures the angle', () => {
    const arc = angleArc({ px: 0, py: 100 }, { px: 100, py: 100 }, { px: 0, py: 0 }, 40);
    assert.equal(arc.degrees, 90);
    assert.match(arc.path, /^M40 100 A40 40 0 0 0 0 60$/);
  });
});
