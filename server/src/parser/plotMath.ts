// The math of <plot>: the closed list of functions, their value at a point and the stretch of x a plot shows.
// Pure and shared: the parser checks marks against the domain and the viewer draws with the same numbers.
import type { CurveFn, PlotBlock, PlotCurve } from './types.ts';

/** The parameters each function takes, with their defaults. */
export const curveParams: Record<CurveFn, Record<string, number>> = {
  sigmoid: {},
  tanh: {},
  relu: {},
  linear: { slope: 1, intercept: 0 },
  quadratic: { a: 1, b: 0, c: 0 },
  exp: { rate: 1 },
  log: {},
  gaussian: { mean: 0, std: 1 },
};

const defaultDomains: Record<CurveFn, [number, number]> = {
  sigmoid: [-6, 6],
  tanh: [-4, 4],
  relu: [-3, 3],
  linear: [-5, 5],
  quadratic: [-5, 5],
  exp: [-2, 3],
  log: [0.1, 10],
  gaussian: [-4, 4],
};

function fnValue(fn: CurveFn, params: Record<string, number>, x: number): number {
  const p = { ...curveParams[fn], ...params };
  switch (fn) {
    case 'sigmoid':
      return 1 / (1 + Math.exp(-x));
    case 'tanh':
      return Math.tanh(x);
    case 'relu':
      return Math.max(0, x);
    case 'linear':
      return (p.slope ?? 1) * x + (p.intercept ?? 0);
    case 'quadratic':
      return (p.a ?? 1) * x * x + (p.b ?? 0) * x + (p.c ?? 0);
    case 'exp':
      return Math.exp((p.rate ?? 1) * x);
    case 'log':
      return x > 0 ? Math.log(x) : Number.NaN;
    case 'gaussian': {
      const std = p.std ?? 1;
      return Math.exp(-0.5 * ((x - (p.mean ?? 0)) / std) ** 2) / (std * Math.sqrt(2 * Math.PI));
    }
  }
}

/** The curve's value at `x`: the function, or a straight line between the two nearest points. NaN outside it. */
export function curveValue(curve: PlotCurve, x: number): number {
  if (curve.fn) return fnValue(curve.fn, curve.params ?? {}, x);
  const points = curve.points ?? [];
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || x < first[0] || x > last[0]) return Number.NaN;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1] ?? first;
    const [x1, y1] = points[i] ?? last;
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return last[1];
}

/** The stretch of x a curve is worth showing over. */
export function curveDomain(curve: PlotCurve): [number, number] {
  if (curve.fn === 'gaussian') {
    const { mean = 0, std = 1 } = curve.params ?? {};
    return [mean - 4 * std, mean + 4 * std];
  }
  if (curve.fn) return defaultDomains[curve.fn];
  const points = curve.points ?? [];
  return [points[0]?.[0] ?? 0, points.at(-1)?.[0] ?? 1];
}

/** The plot's stretch of x: `from` and `to` when given, else wide enough for every curve. */
export function plotDomain(block: Pick<PlotBlock, 'from' | 'to' | 'curves'>): [number, number] {
  const domains = block.curves.map(curveDomain);
  const low = block.from ?? Math.min(...domains.map(([from]) => from));
  const high = block.to ?? Math.max(...domains.map(([, to]) => to));
  return [low, high];
}
