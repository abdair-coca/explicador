// A decision threshold over real predictions: what each input is called at a threshold, the confusion matrix it
// gives (as a matrix block, so the matrix grid draws it) and the metrics, all computed here.
import type { MatrixBlock, ThresholdBlock } from '../../../server/src/scene.ts';
import { computeMetric, type MetricResult } from './confusion.ts';

/** 1 (the second class) when the score reaches the threshold. */
export function predicted(score: number, threshold: number): 0 | 1 {
  return score >= threshold ? 1 : 0;
}

/** Rows are the actual classes, columns the predicted ones: [[TN, FP], [FN, TP]] for the second class. */
export function confusionAt(block: ThresholdBlock, threshold: number): number[][] {
  const matrix = [
    [0, 0],
    [0, 0],
  ];
  for (const point of block.points) {
    const actual = point.actual === block.classes[1] ? 1 : 0;
    const row = matrix[actual];
    const col = predicted(Number(point.score), threshold);
    if (row) row[col] = (row[col] ?? 0) + 1;
  }
  return matrix;
}

export function matrixAt(block: ThresholdBlock, threshold: number): MatrixBlock {
  const counts = confusionAt(block, threshold);
  return {
    type: 'matrix',
    id: `${block.id}-matrix`,
    title: `${block.title} at ${threshold.toFixed(2)}`,
    cols: [...block.classes],
    rows: block.classes.map((label, r) => ({ label, values: (counts[r] ?? []).map(String) })),
    kind: 'confusion',
    positive: 1,
    focuses: [],
  };
}

export function metricsAt(block: ThresholdBlock, threshold: number): MetricResult[] {
  const counts = confusionAt(block, threshold);
  return (['accuracy', 'precision', 'recall'] as const).map((metric) => computeMetric(counts, metric, 1));
}

/** How many inputs are called differently than at the starting threshold. */
export function changedFrom(block: ThresholdBlock, threshold: number): number {
  return block.points.filter((point) => predicted(Number(point.score), threshold) !== predicted(Number(point.score), block.at)).length;
}

export interface Dot {
  index: number;
  x: number;
  /** 0 for the first class's lane, 1 for the second's. */
  lane: 0 | 1;
  /** Rows up from the lane's line, so close scores do not cover each other. */
  stack: number;
}

/** Dots along `[left, right]`, one lane per actual class, stacked where they would overlap. */
export function dotsOf(block: ThresholdBlock, left: number, right: number, size = 12): Dot[] {
  const placed: Dot[] = [];
  const order = block.points.map((point, index) => ({ point, index })).sort((a, b) => Number(a.point.score) - Number(b.point.score));
  for (const { point, index } of order) {
    const x = left + Number(point.score) * (right - left);
    const lane: 0 | 1 = point.actual === block.classes[1] ? 1 : 0;
    let stack = 0;
    while (placed.some((dot) => dot.lane === lane && dot.stack === stack && Math.abs(dot.x - x) < size)) stack += 1;
    placed.push({ index, x, lane, stack });
  }
  return placed.sort((a, b) => a.index - b.index);
}
