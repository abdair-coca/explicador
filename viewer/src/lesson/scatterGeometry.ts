// Geometry of a <scatter>: scales, each dot's place and mark, the boundary clipped to the plot, the two sides it
// makes and which dots fall on the wrong one. Pure.
import type { ScatterBlock } from '../../../server/src/scene.ts';
import { PLOT } from './plotGeometry.ts';
import { decimalsOf, niceTicks } from './scale.ts';

export interface ScatterDotPlace {
  px: number;
  py: number;
  /** Index of its class. */
  group: number;
  label: string | undefined;
  /** True when a straight boundary puts it on the other class's side. */
  wrong: boolean;
}

export interface ScatterModel {
  xTicks: { value: number; at: number; text: string }[];
  yTicks: { value: number; at: number; text: string }[];
  dots: ScatterDotPlace[];
  /** The boundary as a path inside the plot, when there is one. */
  boundary: string | undefined;
  /** For a straight boundary: the region of each class as a polygon's points, by class index. */
  sides: { group: number; points: string }[];
  wrong: number;
}

type Point = [number, number];

const round = (value: number): number => Math.round(value * 100) / 100;

/** The part of a convex polygon where `keep` holds, cutting its edges where `cut` says the line crosses them. */
function clip(polygon: Point[], keep: (point: Point) => boolean, cut: (a: Point, b: Point) => Point): Point[] {
  const out: Point[] = [];
  polygon.forEach((point, i) => {
    const previous = polygon[(i + polygon.length - 1) % polygon.length] ?? point;
    if (keep(point) !== keep(previous)) out.push(cut(previous, point));
    if (keep(point)) out.push(point);
  });
  return out;
}

/** How many parts a scatter has in Present mode: the axes, each class, the boundary, and the dots on the wrong side. */
export function scatterParts(block: ScatterBlock): number {
  const straight = block.boundary?.slope !== undefined;
  return 1 + block.classes.length + (block.boundary ? 1 : 0) + (straight ? 1 : 0);
}

export function scatterModel(block: ScatterBlock): ScatterModel {
  const xs = block.dots.map((dot) => Number(dot.x));
  const ys = block.dots.map((dot) => Number(dot.y));
  const x = niceTicks(Math.min(...xs), Math.max(...xs), 7);
  const y = niceTicks(Math.min(...ys), Math.max(...ys), 6);
  const sx = (value: number): number => round(PLOT.left + ((value - x.min) / (x.max - x.min)) * (PLOT.width - PLOT.left - PLOT.right));
  const sy = (value: number): number => round(PLOT.height - PLOT.bottom - ((value - y.min) / (y.max - y.min)) * (PLOT.height - PLOT.top - PLOT.bottom));
  const line = block.boundary?.slope !== undefined ? { slope: block.boundary.slope, intercept: block.boundary.intercept ?? 0 } : undefined;
  const above = line ? block.classes.indexOf(block.boundary?.above ?? '') : -1;
  const below = above === 0 ? 1 : 0;
  const over = ([px, py]: Point): boolean => (line ? py > line.slope * px + line.intercept : false);

  const dots = block.dots.map((dot, i): ScatterDotPlace => {
    const group = block.classes.indexOf(dot.class);
    const side = over([xs[i] ?? 0, ys[i] ?? 0]) ? above : below;
    return { px: sx(xs[i] ?? 0), py: sy(ys[i] ?? 0), group, label: dot.label, wrong: line !== undefined && side !== group };
  });

  let boundary: string | undefined;
  const sides: ScatterModel['sides'] = [];
  if (line) {
    const frame: Point[] = [[x.min, y.min], [x.max, y.min], [x.max, y.max], [x.min, y.max]];
    const cut = (a: Point, b: Point): Point => {
      // Where the segment a–b meets y = slope·x + intercept.
      const da = a[1] - (line.slope * a[0] + line.intercept);
      const db = b[1] - (line.slope * b[0] + line.intercept);
      const t = da / (da - db);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    // A line through a corner cuts there twice: the repeated point is dropped.
    const region = (keep: (point: Point) => boolean): Point[] =>
      clip(frame, keep, cut).filter((point, i, all) => {
        const previous = all[(i + all.length - 1) % all.length];
        return !previous || all.length === 1 || previous[0] !== point[0] || previous[1] !== point[1];
      });
    const upper = region(over);
    const lower = region((point) => !over(point));
    const text = (polygon: Point[]): string => polygon.map(([px, py]) => `${sx(px)},${sy(py)}`).join(' ');
    if (upper.length >= 3) sides.push({ group: above, points: text(upper) });
    if (lower.length >= 3) sides.push({ group: below, points: text(lower) });
    // The boundary is the edge the two regions share: the cut points of the frame.
    const ends = frame
      .flatMap((point, i) => {
        const next = frame[(i + 1) % frame.length] ?? point;
        return over(point) !== over(next) ? [cut(point, next)] : [];
      })
      // Left to right, the way it is traced.
      .sort((a, b) => a[0] - b[0]);
    if (ends.length === 2) boundary = `M${sx(ends[0]?.[0] ?? 0)} ${sy(ends[0]?.[1] ?? 0)} L${sx(ends[1]?.[0] ?? 0)} ${sy(ends[1]?.[1] ?? 0)}`;
  } else if (block.boundary?.points) {
    boundary = block.boundary.points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${sx(px)} ${sy(py)}`).join(' ');
  }

  return {
    xTicks: x.values.map((value) => ({ value, at: sx(value), text: value.toFixed(decimalsOf(x.step)) })),
    yTicks: y.values.map((value) => ({ value, at: sy(value), text: value.toFixed(decimalsOf(y.step)) })),
    dots,
    boundary,
    sides,
    wrong: dots.filter((dot) => dot.wrong).length,
  };
}

/** A class's mark, so classes differ by shape as well as color: circle, diamond, triangle, square. */
export function markPath(group: number, r: number): string {
  switch (group % 4) {
    case 0:
      return `M${-r} 0 A${r} ${r} 0 1 0 ${r} 0 A${r} ${r} 0 1 0 ${-r} 0 Z`;
    case 1:
      return `M0 ${-r * 1.25} L${r * 1.25} 0 L0 ${r * 1.25} L${-r * 1.25} 0 Z`;
    case 2:
      return `M0 ${-r * 1.2} L${r * 1.15} ${r * 0.9} L${-r * 1.15} ${r * 0.9} Z`;
    default:
      return `M${-r} ${-r} H${r} V${r} H${-r} Z`;
  }
}
