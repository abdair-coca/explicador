import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ScatterBlock } from '../../server/src/scene.ts';
import { PLOT } from '../src/lesson/plotGeometry.ts';
import { markPath, scatterModel, scatterParts } from '../src/lesson/scatterGeometry.ts';
import { buildSlides } from '../src/presentation/slides.ts';

const block: ScatterBlock = {
  type: 'scatter',
  id: 's',
  title: 'S',
  classes: ['negative', 'positive'],
  dots: [
    { x: '0', y: '0', class: 'negative' },
    { x: '10', y: '10', class: 'positive' },
    { x: '2', y: '8', class: 'negative', label: 'odd one' },
    { x: '8', y: '1', class: 'positive' },
  ],
  // y = x: the positive class is above it.
  boundary: { slope: 1, intercept: 0, above: 'positive' },
};

describe('scatterModel', () => {
  const model = scatterModel(block);

  it('places the dots inside the plot, with their class', () => {
    assert.deepEqual([model.dots[0]?.px, model.dots[0]?.py], [PLOT.left, PLOT.height - PLOT.bottom]);
    assert.deepEqual([model.dots[1]?.px, model.dots[1]?.py], [PLOT.width - PLOT.right, PLOT.top]);
    assert.deepEqual(
      model.dots.map((dot) => dot.group),
      [0, 1, 0, 1],
    );
  });

  it('finds the dots on the wrong side of a straight boundary', () => {
    // (10, 10) sits on the line, which counts as below it; (2, 8) is a negative above it and (8, 1) a positive below.
    assert.deepEqual(
      model.dots.map((dot) => dot.wrong),
      [false, true, true, true],
    );
    assert.equal(model.wrong, 3);
  });

  it('clips the boundary to the plot and splits it in two sides', () => {
    assert.equal(model.boundary, `M${PLOT.left} ${PLOT.height - PLOT.bottom} L${PLOT.width - PLOT.right} ${PLOT.top}`);
    assert.deepEqual(
      model.sides.map((side) => [side.group, side.points.split(' ').length]),
      [
        [1, 3],
        [0, 3],
      ],
    );
  });

  it('draws a boundary of points as given, without sides or a count', () => {
    const curved = scatterModel({ ...block, boundary: { points: [[0, 10], [5, 5], [10, 0]] } });
    assert.equal(curved.boundary?.split('L').length, 3);
    assert.deepEqual(curved.sides, []);
    assert.equal(curved.wrong, 0);
    assert.equal(scatterModel({ ...block, boundary: undefined }).boundary, undefined);
  });

  it('counts the parts: axes, each class, the boundary, the wrong side', () => {
    assert.equal(scatterParts(block), 5);
    assert.equal(scatterParts({ ...block, boundary: { points: [[0, 0], [1, 1]] } }), 4);
    assert.equal(scatterParts({ ...block, boundary: undefined }), 3);
    assert.equal(buildSlides([block])[0]?.parts, 5);
  });

  it('gives each class its own mark', () => {
    assert.equal(new Set([0, 1, 2, 3].map((group) => markPath(group, 6))).size, 4);
  });
});
