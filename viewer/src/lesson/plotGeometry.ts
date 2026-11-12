// Geometry of a <plot>: scales, ticks, each curve as a path and each mark's place. Pure.
import { curveValue, plotDomain } from '../../../server/src/parser/plotMath.ts';
import type { PlotBlock, PlotCurve } from '../../../server/src/scene.ts';
import { decimalsOf, niceTicks } from './scale.ts';

export const PLOT = { width: 720, height: 400, left: 58, right: 24, top: 22, bottom: 50 } as const;

/** Samples per curve: enough for a smooth sigmoid at this size. */
const SAMPLES = 160;

export interface PlotMarkPlace {
  x: number;
  y: number;
  px: number;
  py: number;
  label: string;
  /** "x → y" values as shown: x as written, y rounded. */
  xText: string;
  yText: string;
  curve: number;
  narration?: string;
}

export interface PlotModel {
  domain: [number, number];
  xTicks: { value: number; at: number; text: string }[];
  yTicks: { value: number; at: number; text: string }[];
  /** Pixel x of a value of x, and pixel y of a value of y. */
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** Where y = 0 and x = 0 fall, when inside the plot: the axes are drawn there. */
  zeroX: number | undefined;
  zeroY: number | undefined;
  curves: { d: string; label: string | undefined; curve: PlotCurve }[];
  marks: PlotMarkPlace[];
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** `y` with enough decimals to tell values apart on this axis, at least three significant ones. */
export function formatY(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && magnitude < 0.001) return value.toExponential(2);
  return value.toFixed(magnitude >= 100 ? 1 : 3).replace(/\.?0+$/, (zeros) => (zeros.startsWith('.') && zeros.length > 1 ? '' : zeros.replace(/0+$/, '')));
}

export function plotModel(block: PlotBlock): PlotModel {
  const domain = plotDomain(block);
  const [low, high] = domain;
  const samples = block.curves.map((curve) =>
    Array.from({ length: SAMPLES + 1 }, (_, i): [number, number] => {
      const x = low + ((high - low) * i) / SAMPLES;
      return [x, curveValue(curve, x)];
    }).filter(([, y]) => Number.isFinite(y)),
  );
  const ys = samples.flat().map(([, y]) => y);
  const y = niceTicks(Math.min(...ys, 0), Math.max(...ys, 0));
  const x = niceTicks(low, high, 9);
  const sx = (value: number): number => round(PLOT.left + ((value - low) / (high - low)) * (PLOT.width - PLOT.left - PLOT.right));
  const sy = (value: number): number => round(PLOT.height - PLOT.bottom - ((value - y.min) / (y.max - y.min)) * (PLOT.height - PLOT.top - PLOT.bottom));
  const xDecimals = decimalsOf(x.step);
  const yDecimals = decimalsOf(y.step);
  return {
    domain,
    xTicks: x.values.filter((value) => value >= low && value <= high).map((value) => ({ value, at: sx(value), text: value.toFixed(xDecimals) })),
    yTicks: y.values.map((value) => ({ value, at: sy(value), text: value.toFixed(yDecimals) })),
    sx,
    sy,
    zeroX: low <= 0 && high >= 0 ? sx(0) : undefined,
    zeroY: y.min <= 0 && y.max >= 0 ? sy(0) : undefined,
    curves: block.curves.map((curve, i) => ({
      d: (samples[i] ?? []).map(([px, py], n) => `${n === 0 ? 'M' : 'L'}${sx(px)} ${sy(py)}`).join(' '),
      label: curve.label,
      curve,
    })),
    marks: block.marks.map((mark) => {
      const index = mark.curve ?? 0;
      const curve = block.curves[index];
      const value = Number(mark.x);
      const height = curve ? curveValue(curve, value) : Number.NaN;
      return { x: value, y: height, px: sx(value), py: sy(height), label: mark.label, xText: mark.x, yText: formatY(height), curve: index, ...(mark.narration ? { narration: mark.narration } : {}) };
    }),
  };
}
