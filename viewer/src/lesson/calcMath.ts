// The arithmetic of a <calc>: running totals, the score, and for a logistic model the sigmoid, the probability
// and the decision. Done here so the agent never computes; plus the waterfall's geometry in real pixels.
import type { CalcBlock } from '../../../server/src/scene.ts';
import { CHAR_PX, fit } from './chartGeometry.ts';
import { barTicks, formatTick, linear } from './scale.ts';

export interface CalcRow {
  label: string;
  /** As written, with a sign: "+0.310", "-0.332". */
  text: string;
  value: number;
  before: number;
  after: number;
  note?: string;
}

export interface CalcModel {
  rows: CalcRow[];
  decimals: number;
  /** The sum of the parts, at their precision. */
  sum: number;
  /** The score shown: the notebook's total when given, else the sum. */
  total: number;
  totalText: string;
  /** Set when the rounded parts do not add up exactly to the printed total. */
  roundingNote?: string;
  logistic?: { probability: number; probabilityText: string; threshold: number; decided: number; classes: [string, string] };
  /** Playback steps: one per part, the total, then for logistic the probability and the decision. */
  steps: number;
}

function decimalsIn(value: string): number {
  const mantissa = value.split(/[eE]/)[0] ?? '';
  return mantissa.includes('.') ? (mantissa.split('.')[1]?.length ?? 0) : 0;
}

export const signed = (text: string): string => (text.startsWith('-') || text.startsWith('+') ? text : `+${text}`);

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function calcModel(block: CalcBlock): CalcModel {
  const decimals = Math.max(0, ...block.parts.map((part) => decimalsIn(part.value)));
  let running = 0;
  const rows = block.parts.map((part) => {
    const value = Number(part.value);
    const before = running;
    running += value;
    return { label: part.label, text: signed(part.value), value, before, after: running, ...(part.note ? { note: part.note } : {}) };
  });
  const sum = Number(running.toFixed(decimals));
  const totalText = block.total ?? sum.toFixed(decimals);
  const total = Number(totalText);
  const model: CalcModel = { rows, decimals, sum, total, totalText, steps: rows.length + 1 };
  if (block.total !== undefined && Math.abs(sum - total) > 1e-9) {
    model.roundingNote = `The parts are rounded, so they add up to ${sum.toFixed(decimals)}; the notebook's exact score is ${totalText}.`;
  }
  if (block.kind === 'logistic') {
    const probability = sigmoid(total);
    const threshold = block.threshold ?? 0.5;
    model.logistic = {
      probability,
      probabilityText: probability.toFixed(3),
      threshold,
      decided: probability >= threshold ? 1 : 0,
      classes: block.classes ?? ['0', '1'],
    };
    model.steps += 2;
  }
  return model;
}

/** What step `index` says: the part it adds, the score, the probability or the decision. */
export function calcNarration(block: CalcBlock, model: CalcModel, index: number): { title: string; text?: string | undefined } {
  const parts = model.rows.length;
  const row = model.rows[index];
  if (row) {
    return {
      title: `${row.label}: ${row.text} → ${row.after.toFixed(model.decimals)}`,
      text: row.note ?? (index === 0 ? 'The calculation starts here.' : row.value >= 0 ? 'It pushes the score up.' : 'It pushes the score down.'),
    };
  }
  const logistic = model.logistic;
  if (index === parts) return { title: `Score = ${model.totalText}`, text: model.roundingNote ?? 'The sum of every part.' };
  if (!logistic) return { title: '' };
  if (index === parts + 1) {
    return {
      title: `sigmoid(${model.totalText}) = ${logistic.probabilityText}`,
      text: `The sigmoid squeezes any score into a probability between 0 and 1: here, a ${logistic.probabilityText} chance of "${logistic.classes[1]}".`,
    };
  }
  const name = logistic.classes[logistic.decided];
  return {
    title: `${logistic.probabilityText} ${logistic.decided === 1 ? '≥' : '<'} ${logistic.threshold} → ${name}`,
    text: `The model answers "${name}" because the probability is ${logistic.decided === 1 ? 'at or above' : 'below'} the threshold ${logistic.threshold}.`,
  };
}

export interface WaterfallBar {
  label: string;
  full: string;
  text: string;
  /** Pixel x of the bar's ends and its row's y. */
  x0: number;
  x1: number;
  y: number;
  up: boolean;
  /** Running total after this bar, for the label at its end. */
  runningText: string;
  total: boolean;
}

export interface Waterfall {
  width: number;
  height: number;
  left: number;
  right: number;
  rowHeight: number;
  bar: number;
  zero: number;
  ticks: { at: number; text: string }[];
  bars: WaterfallBar[];
}

const ROW = 30;

/** One row per part, from the running total before it to after it, then the total from zero. */
export function waterfall(model: CalcModel, width: number, totalLabel = 'score'): Waterfall {
  const ends = [0, ...model.rows.flatMap((row) => [row.before, row.after]), model.total];
  const ticks = barTicks(ends, Math.max(3, Math.min(6, Math.floor(width / 110))));
  const labels = [...model.rows.map((row) => row.label), totalLabel];
  const left = Math.min(Math.max(...labels.map((label) => label.length)) * CHAR_PX + 12, Math.round(width * 0.35));
  const valueRoom = (Math.max(...model.rows.map((row) => row.text.length), model.totalText.length) + 1) * CHAR_PX + 8;
  const right = Math.max(left + 60, width - valueRoom);
  const x = linear([ticks.min, ticks.max], [left + valueRoom, right]);
  const bars: WaterfallBar[] = model.rows.map((row, i) => ({
    label: fit(row.label, left - 12),
    full: row.label,
    text: row.text,
    x0: x(row.before),
    x1: x(row.after),
    y: 8 + i * ROW,
    up: row.value >= 0,
    runningText: row.after.toFixed(model.decimals),
    total: false,
  }));
  bars.push({
    label: totalLabel,
    full: totalLabel,
    text: model.totalText,
    x0: x(0),
    x1: x(model.total),
    y: 8 + model.rows.length * ROW + 6,
    up: model.total >= 0,
    runningText: model.totalText,
    total: true,
  });
  return {
    width,
    height: 8 + (model.rows.length + 1) * ROW + 6 + 26,
    left,
    right,
    rowHeight: ROW,
    bar: 18,
    zero: x(0),
    ticks: ticks.values.map((value) => ({ at: x(value), text: formatTick(value, ticks.step) })),
    bars,
  };
}

/** The sigmoid from -range to range as an SVG path in a `w` × `h` box, and where a score sits on it. */
export function sigmoidCurve(score: number, w: number, h: number): { d: string; range: number; point: { x: number; y: number }; at: (p: number) => number } {
  const range = Math.max(6, Math.ceil(Math.abs(score) + 1));
  const x = linear([-range, range], [0, w]);
  const y = linear([0, 1], [h, 0]);
  const points: string[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const s = -range + (2 * range * i) / 60;
    points.push(`${x(s).toFixed(1)},${y(sigmoid(s)).toFixed(1)}`);
  }
  return { d: `M${points.join('L')}`, range, point: { x: x(score), y: y(sigmoid(score)) }, at: y };
}
