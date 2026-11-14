// The point a figure's shape moves by (F32), shared by the parser and the viewer; only a type import, so the viewer can load it.
import type { FigureShape, Point } from './types.ts';

/** The point a shape moves by: a circle's center, a box's or label's corner point, an arrow's or zone's first point, an angle's corner. */
export function anchorOf(shape: FigureShape): Point {
  switch (shape.kind) {
    case 'circle':
    case 'box':
    case 'label':
      return [shape.x, shape.y];
    case 'arrow':
    case 'zone':
    case 'measure':
      return shape.points[0] ?? [0, 0];
    case 'angle':
    case 'normal':
      return shape.at;
    case 'icon':
    case 'arc':
      return [shape.x, shape.y];
  }
}

/** Places a point can name on a shape (F33), by kind. */
export const anchorSides: Record<FigureShape['kind'], readonly string[]> = {
  circle: ['center', 'left', 'right', 'top', 'bottom'],
  box: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
  arrow: ['start', 'middle', 'end'],
  normal: ['start', 'middle', 'end'],
  zone: ['center'],
  label: ['center'],
  angle: ['center'],
  icon: ['center', 'left', 'right', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
  arc: ['center', 'start', 'middle', 'end'],
  measure: ['start', 'middle', 'end'],
};

/** `drop.left`, `drop@200`, `ray.end`: the shape's id, then a side or an angle in degrees. */
export const ANCHOR = /^([A-Za-z][\w-]*?)(?:\.([a-z-]+)|@(-?\d+(?:\.\d+)?))$/;

const half = (points: readonly Point[]): Point => {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - (points[i]?.[0] ?? 0), p[1] - (points[i]?.[1] ?? 0)));
  let left = lengths.reduce((sum, l) => sum + l, 0) / 2;
  for (let i = 0; i < lengths.length; i += 1) {
    const l = lengths[i] ?? 0;
    const p = points[i] ?? [0, 0];
    const q = points[i + 1] ?? p;
    if (left <= l && l > 0) return [p[0] + ((q[0] - p[0]) * left) / l, p[1] + ((q[1] - p[1]) * left) / l];
    left -= l;
  }
  return points[0] ?? [0, 0];
};

/**
 * The point a shape names (F33): a side or the center, or for a circle the point of its edge at `degrees` (0 to the right,
 * 90 down: clockwise on screen). Undefined when the shape has no such place.
 */
export function pointOn(shape: FigureShape, side: string | undefined, degrees?: number): Point | undefined {
  if (degrees !== undefined) {
    if (shape.kind !== 'circle' && shape.kind !== 'arc') return undefined;
    const a = (degrees * Math.PI) / 180;
    return [shape.x + shape.r * Math.cos(a), shape.y + shape.r * Math.sin(a)];
  }
  if (!side || !anchorSides[shape.kind].includes(side)) return undefined;
  switch (shape.kind) {
    case 'circle': {
      const { x, y, r } = shape;
      return ({ center: [x, y], left: [x - r, y], right: [x + r, y], top: [x, y - r], bottom: [x, y + r] } as Record<string, Point>)[side];
    }
    case 'box': {
      const { x, y, w, h } = shape;
      const at: Record<string, Point> = {
        center: [x + w / 2, y + h / 2],
        left: [x, y + h / 2],
        right: [x + w, y + h / 2],
        top: [x + w / 2, y],
        bottom: [x + w / 2, y + h],
        'top-left': [x, y],
        'top-right': [x + w, y],
        'bottom-left': [x, y + h],
        'bottom-right': [x + w, y + h],
      };
      return at[side];
    }
    case 'arrow':
    case 'normal':
      return side === 'start' ? shape.points[0] : side === 'end' ? shape.points[shape.points.length - 1] : half(shape.points);
    case 'zone': {
      const n = shape.points.length || 1;
      return [shape.points.reduce((sum, p) => sum + p[0], 0) / n, shape.points.reduce((sum, p) => sum + p[1], 0) / n];
    }
    case 'label':
      return [shape.x, shape.y];
    case 'angle':
      return shape.at;
    case 'icon': {
      const h = shape.size / 2;
      return pointOn({ kind: 'box', x: shape.x - h, y: shape.y - h, w: shape.size, h: shape.size, color: shape.color, appear: 0 }, side);
    }
    case 'arc': {
      if (side === 'center') return [shape.x, shape.y];
      const span = arcSpan(shape.from, shape.to);
      const degrees = side === 'start' ? shape.from : side === 'end' ? shape.from + span : shape.from + span / 2;
      return pointOn(shape, undefined, degrees);
    }
    case 'measure':
      return side === 'start' ? shape.points[0] : side === 'end' ? shape.points[1] : half(shape.points);
  }
}

/** How many degrees an arc turns, clockwise on screen, from `from` to `to` (a full turn when they are equal). */
export function arcSpan(from: number, to: number): number {
  const span = (((to - from) % 360) + 360) % 360;
  return span === 0 ? 360 : span;
}

/** The outward direction of a surface at a named point: a circle's radius, a box side's perpendicular (F33). */
export function surfaceNormal(shape: FigureShape, side: string | undefined, degrees?: number): Point | undefined {
  if (shape.kind === 'circle' || shape.kind === 'arc') {
    if (shape.kind === 'arc' && degrees === undefined) return undefined;
    const p = pointOn(shape, side, degrees);
    if (!p || side === 'center') return undefined;
    const l = Math.hypot(p[0] - shape.x, p[1] - shape.y);
    return l === 0 ? undefined : [(p[0] - shape.x) / l, (p[1] - shape.y) / l];
  }
  if (shape.kind === 'box' && degrees === undefined) return ({ left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] } as Record<string, Point>)[side ?? ''];
  return undefined;
}
