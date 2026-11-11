import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ThresholdBlock } from '../../server/src/scene.ts';
import { changedFrom, confusionAt, dotsOf, matrixAt, metricsAt } from '../src/lesson/threshold.ts';

// The test probabilities printed by cell 21 of examples/notebook/reviews.ipynb.
const block: ThresholdBlock = {
  type: 'threshold',
  id: 't',
  title: 'Moving the threshold',
  classes: ['negative', 'positive'],
  at: 0.5,
  points: [
    { score: '0.156', actual: 'negative' },
    { score: '0.292', actual: 'negative' },
    { score: '0.608', actual: 'negative' },
    { score: '0.652', actual: 'positive' },
    { score: '0.748', actual: 'positive' },
    { score: '0.815', actual: 'positive' },
  ],
};

describe('threshold', () => {
  it('gives the notebook\'s confusion matrix at 0.5 and fixes the mistake at 0.62', () => {
    assert.deepEqual(confusionAt(block, 0.5), [
      [2, 1],
      [0, 3],
    ]);
    assert.deepEqual(confusionAt(block, 0.62), [
      [3, 0],
      [0, 3],
    ]);
    assert.equal(changedFrom(block, 0.62), 1);
    assert.equal(changedFrom(block, 0.5), 0);
  });

  it('computes accuracy, precision and recall for the second class', () => {
    assert.deepEqual(
      metricsAt(block, 0.5).map((m) => [m.metric, Number(m.value.toFixed(4))]),
      [
        ['accuracy', 0.8333],
        ['precision', 0.75],
        ['recall', 1],
      ],
    );
    assert.equal(metricsAt(block, 0.7).find((m) => m.metric === 'recall')?.value, 2 / 3);
  });

  it('builds a confusion matrix block the grid can draw', () => {
    const matrix = matrixAt(block, 0.5);
    assert.equal(matrix.kind, 'confusion');
    assert.deepEqual(matrix.rows.map((row) => row.values), [['2', '1'], ['0', '3']]);
    assert.equal(matrix.positive, 1);
  });

  it('puts dots in their class lane and stacks close ones', () => {
    const dots = dotsOf({ ...block, points: [{ score: '0.5', actual: 'negative' }, { score: '0.501', actual: 'negative' }, { score: '0.5', actual: 'positive' }] }, 0, 100);
    assert.deepEqual(dots.map((d) => [d.lane, d.stack]), [[0, 0], [0, 1], [1, 0]]);
    assert.equal(dots[0]?.x, 50);
  });
});
