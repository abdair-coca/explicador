// Metrics of a confusion matrix, computed here from the counts so the agent never does the arithmetic:
// rows are the actual classes, columns the predicted ones, and one class is the positive one.
import type { CellPick, ConfusionMetric, DataRow } from '../../../server/src/scene.ts';

export interface MetricResult {
  metric: ConfusionMetric;
  /** NaN when the denominator is zero. */
  value: number;
  /** The formula in symbols, e.g. "TP / (TP + FP)". */
  formula: string;
  /** The same formula with the real counts, ending in the result. */
  worked: string;
  /** The cells the metric reads. */
  cells: CellPick[];
}

/** TP, FP, FN, TN of the positive class (several classes: one against the rest). */
export interface Outcomes {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  total: number;
}

/** The order the metrics are offered in: the overall one, then the positive class's. */
export const metricOrder: readonly ConfusionMetric[] = ['accuracy', 'precision', 'recall', 'f1'];

export const metricNames: Record<ConfusionMetric, string> = {
  accuracy: 'Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1: 'F1',
};

export function counts(rows: DataRow[]): number[][] {
  return rows.map((row) => row.values.map(Number));
}

/** Four decimals at most, trailing zeros dropped: 0.8209, 0.846, 1. */
export function formatRatio(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(4))) : '—';
}

export function outcomes(matrix: number[][], positive: number): Outcomes {
  const cell = (r: number, c: number): number => matrix[r]?.[c] ?? 0;
  const size = matrix.length;
  let total = 0;
  let column = 0;
  let row = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) total += cell(r, c);
    column += cell(r, positive);
    row += cell(positive, r);
  }
  const tp = cell(positive, positive);
  const fp = column - tp;
  const fn = row - tp;
  return { tp, fp, fn, tn: total - tp - fp - fn, total };
}

const ratio = (top: number, bottom: number): number => (bottom === 0 ? Number.NaN : top / bottom);

export function computeMetric(matrix: number[][], metric: ConfusionMetric, positive: number): MetricResult {
  const o = outcomes(matrix, positive);
  const size = matrix.length;
  if (metric === 'accuracy') {
    const hits = Array.from({ length: size }, (_, i) => matrix[i]?.[i] ?? 0);
    const correct = hits.reduce((sum, n) => sum + n, 0);
    const value = ratio(correct, o.total);
    return {
      metric,
      value,
      formula: 'hits / total',
      worked: `(${hits.join(' + ')}) / ${o.total} = ${formatRatio(value)}`,
      cells: hits.map((_, i) => ({ row: i, col: i })),
    };
  }
  if (metric === 'precision') {
    const value = ratio(o.tp, o.tp + o.fp);
    return { metric, value, formula: 'TP / (TP + FP)', worked: `${o.tp} / (${o.tp} + ${o.fp}) = ${formatRatio(value)}`, cells: [{ col: positive }] };
  }
  if (metric === 'recall') {
    const value = ratio(o.tp, o.tp + o.fn);
    return { metric, value, formula: 'TP / (TP + FN)', worked: `${o.tp} / (${o.tp} + ${o.fn}) = ${formatRatio(value)}`, cells: [{ row: positive }] };
  }
  const precision = ratio(o.tp, o.tp + o.fp);
  const recall = ratio(o.tp, o.tp + o.fn);
  const value = ratio(2 * precision * recall, precision + recall);
  const p = formatRatio(precision);
  const r = formatRatio(recall);
  return {
    metric,
    value,
    formula: '2 · P · R / (P + R)',
    worked: `2 · ${p} · ${r} / (${p} + ${r}) = ${formatRatio(value)}`,
    cells: [{ row: positive }, { col: positive }],
  };
}

/** True when the pick covers the cell. */
export function covers(pick: CellPick, row: number, col: number): boolean {
  return (pick.row === undefined || pick.row === row) && (pick.col === undefined || pick.col === col);
}

/** The outcome a cell holds for the positive class: TP, FP, FN or TN (two classes), hit or miss (more). */
export function cellOutcome(size: number, positive: number, row: number, col: number): 'TP' | 'FP' | 'FN' | 'TN' | 'hit' | 'miss' {
  if (size !== 2) return row === col ? 'hit' : 'miss';
  if (row === positive) return col === positive ? 'TP' : 'FN';
  return col === positive ? 'FP' : 'TN';
}
