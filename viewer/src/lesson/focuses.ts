// The highlights a matrix offers. A confusion matrix always offers its four metrics, computed from the counts,
// with the agent's label and narration when it wrote a focus for them; other focuses follow as written.
import type { CellPick, MatrixBlock } from '../../../server/src/scene.ts';
import { computeMetric, counts, metricNames, metricOrder, type MetricResult } from './confusion.ts';

export interface ViewFocus {
  label: string;
  cells: CellPick[];
  narration?: string;
  metric?: MetricResult;
}

/** Index of the positive class: the one named in the scene, else the last (sklearn's 1). */
export function positiveOf(block: MatrixBlock): number {
  return block.positive ?? Math.max(block.cols.length - 1, 0);
}

export function matrixFocuses(block: MatrixBlock): ViewFocus[] {
  const own = block.focuses.filter((focus) => !focus.metric).map((focus) => ({
    label: focus.label ?? '',
    cells: focus.cells,
    ...(focus.narration ? { narration: focus.narration } : {}),
  }));
  if (block.kind !== 'confusion') return own;
  const matrix = counts(block.rows);
  const positive = positiveOf(block);
  const metrics = metricOrder.map((metric) => {
    const written = block.focuses.find((focus) => focus.metric === metric);
    const result = computeMetric(matrix, metric, positive);
    return {
      label: written?.label ?? metricNames[metric],
      cells: result.cells,
      ...(written?.narration ? { narration: written.narration } : {}),
      metric: result,
    };
  });
  return [...metrics, ...own];
}
