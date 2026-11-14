// Where a figure's pieces go (F31): the path of each arrow and angle, and where each label sits so it reads beside
// its shape, inside the figure. Pure, so it is tested without a browser.
import type { FigureBlock, FigureShape, Point } from '../../../server/src/scene.ts';
import { arcSpan, pointOn } from '../../../server/src/parser/figureAnchor.ts';

/** Size of a label's text, in grid units: about 30 px on a slide 100 units wide. */
export const LABEL_SIZE = 2.6;
/** Labels are never drawn smaller than this many pixels: on a phone they grow, in grid units, to stay readable. */
export const MIN_LABEL_PX = 12;

/** The label size for a figure `width` units wide drawn `pixels` wide. */
export function labelSize(width: number, pixels: number): number {
  if (!(pixels > 0)) return LABEL_SIZE;
  return Math.min(LABEL_SIZE * 2, Math.max(LABEL_SIZE, (MIN_LABEL_PX * width) / pixels));
}

export interface Placed {
  shape: FigureShape;
  /** The SVG path of an arrow, an angle's arc or a zone; absent for circles, boxes and labels. */
  path?: string;
  /** Where the label's text is centered, if the shape has one. */
  labelAt?: Point;
  /** Lines of the label, wrapped to fit. */
  lines: string[];
}

const length = (x: number, y: number): number => Math.hypot(x, y);
const unit = (x: number, y: number): Point => {
  const l = length(x, y);
  return l === 0 ? [0, 0] : [x / l, y / l];
};
const round = (n: number): number => Math.round(n * 100) / 100;
const pathOf = (points: Point[], close = false): string => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join(' ') + (close ? ' Z' : '');

/** Words in lines of at most `max` characters, at most two lines. */
export function wrapLabel(text: string, max = 22): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  if (lines.length <= 2) return lines;
  return [lines[0] ?? '', lines.slice(1).join(' ')];
}

/** The arc that marks an angle: its radius and the direction halfway between its two sides. */
export function angleArc(at: Point, from: Point, to: Point): { path: string; radius: number; bisector: Point } {
  const a = unit(from[0] - at[0], from[1] - at[1]);
  const b = unit(to[0] - at[0], to[1] - at[1]);
  const radius = Math.max(2.5, Math.min(8, 0.4 * Math.min(length(from[0] - at[0], from[1] - at[1]), length(to[0] - at[0], to[1] - at[1]))));
  const start: Point = [at[0] + a[0] * radius, at[1] + a[1] * radius];
  const end: Point = [at[0] + b[0] * radius, at[1] + b[1] * radius];
  // The short way round: clockwise on screen when the turn from `a` to `b` is clockwise (y grows downwards).
  const sweep = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0;
  const sum = unit(a[0] + b[0], a[1] + b[1]);
  const bisector: Point = sum[0] === 0 && sum[1] === 0 ? [-a[1], a[0]] : sum;
  return { path: `M${round(start[0])} ${round(start[1])} A${round(radius)} ${round(radius)} 0 0 ${sweep} ${round(end[0])} ${round(end[1])}`, radius, bisector };
}

/** The box a label's text covers around its center, in grid units (a character is about 0.56 of the size wide). */
export function labelBox(at: Point, lines: string[], size = LABEL_SIZE): { x0: number; y0: number; x1: number; y1: number } {
  const w = Math.max(...lines.map((line) => line.length), 1) * size * 0.56;
  const h = lines.length * size * 1.15;
  return { x0: at[0] - w / 2, y0: at[1] - h / 2, x1: at[0] + w / 2, y1: at[1] + h / 2 };
}

type Box = ReturnType<typeof labelBox>;
const overlap = (a: Box, b: Box): number => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Places a label `gap` beyond a line, on the side of `normal`, far enough that its box clears the line. */
function besideLine(p: Point, q: Point, along: number, side: 1 | -1, lines: string[], size: number): Point {
  const [dx, dy] = unit(q[0] - p[0], q[1] - p[1]);
  const normal: Point = [-dy * side, dx * side];
  const box = labelBox([0, 0], lines, size);
  const clear = Math.abs(normal[0]) * (box.x1 - box.x0) / 2 + Math.abs(normal[1]) * (box.y1 - box.y0) / 2 + size * 0.35;
  const at: Point = [p[0] + (q[0] - p[0]) * along, p[1] + (q[1] - p[1]) * along];
  return [at[0] + normal[0] * clear, at[1] + normal[1] * clear];
}

/** Where a shape's label may go, best first. */
function candidates(shape: FigureShape, lines: string[], size: number): Point[] {
  switch (shape.kind) {
    case 'circle': {
      const below: Point = [shape.x, shape.y + shape.r + size * 1.1];
      const above: Point = [shape.x, shape.y - shape.r - size * 0.9];
      const side = (labelBox([0, 0], lines, size).x1 + shape.r + 1) * 1;
      const around: Point[] = [below, above, [shape.x + side, shape.y], [shape.x - side, shape.y]];
      // Inside a circle big enough to hold it, around a small one.
      return shape.r >= 7 ? [[shape.x, shape.y], ...around] : around;
    }
    case 'box':
      return [[shape.x + shape.w / 2, shape.y + shape.h / 2], [shape.x + shape.w / 2, shape.y + shape.h + size * 1.1], [shape.x + shape.w / 2, shape.y - size * 0.9]];
    case 'zone': {
      const n = shape.points.length;
      return [[shape.points.reduce((sum, p) => sum + p[0], 0) / n, shape.points.reduce((sum, p) => sum + p[1], 0) / n]];
    }
    case 'icon': {
      const r = shape.size / 2;
      const side = labelBox([0, 0], lines, size).x1 + r + 1;
      return [[shape.x, shape.y + r + size * 1.1], [shape.x, shape.y - r - size * 0.9], [shape.x + side, shape.y], [shape.x - side, shape.y]];
    }
    case 'arc': {
      const middle = shape.from + arcSpan(shape.from, shape.to) / 2;
      const box = labelBox([0, 0], lines, size);
      const reach = Math.max(box.x1, box.y1) + 0.6;
      return [shape.r + reach, shape.r - reach].map((d): Point => {
        const a = (middle * Math.PI) / 180;
        return [shape.x + d * Math.cos(a), shape.y + d * Math.sin(a)];
      });
    }
    case 'measure':
    case 'normal':
    case 'arrow': {
      // Beside its longest segments: the middle first, then nearer the ends, on the upper side first.
      const segments = shape.points.slice(1).map((q, i): [Point, Point] => [shape.points[i] ?? q, q]);
      segments.sort((a, b) => length(b[1][0] - b[0][0], b[1][1] - b[0][1]) - length(a[1][0] - a[0][0], a[1][1] - a[0][1]));
      const out: Point[] = [];
      for (const [p, q] of segments.slice(0, 2)) {
        const [dx, dy] = unit(q[0] - p[0], q[1] - p[1]);
        // The side whose normal points up (or left on a vertical line) comes first.
        // The normal of side 1 is (-dy, dx): below a line drawn to the right, so the upper side is -1 there.
        const up: 1 | -1 = dx > 0 || (dx === 0 && dy < 0) ? -1 : 1;
        for (const along of [0.5, 0.7, 0.3]) for (const side of [up, (-up) as 1 | -1]) out.push(besideLine(p, q, along, side, lines, size));
      }
      return out;
    }
    case 'angle': {
      const arc = angleArc(shape.at, shape.from, shape.to);
      const box = labelBox([0, 0], lines, size);
      const reach = Math.abs(arc.bisector[0]) * (box.x1 - box.x0) / 2 + Math.abs(arc.bisector[1]) * (box.y1 - box.y0) / 2;
      return [1, 1.6, 2.3].map((k): Point => [shape.at[0] + arc.bisector[0] * (arc.radius * k + reach + 0.6), shape.at[1] + arc.bisector[1] * (arc.radius * k + reach + 0.6)]);
    }
    case 'label':
      return [[shape.x, shape.y]];
  }
}

/** The path of an arc (F34): clockwise on screen from `from`, a full circle in two halves. */
export function arcPath(shape: Extract<FigureShape, { kind: 'arc' }>): string {
  const span = arcSpan(shape.from, shape.to);
  const at = (degrees: number): Point => pointOn(shape, undefined, degrees) ?? [shape.x, shape.y];
  const [sx, sy] = at(shape.from);
  const r = round(shape.r);
  if (span >= 360) {
    const [hx, hy] = at(shape.from + 180);
    return `M${round(sx)} ${round(sy)} A${r} ${r} 0 1 1 ${round(hx)} ${round(hy)} A${r} ${r} 0 1 1 ${round(sx)} ${round(sy)}`;
  }
  const [ex, ey] = at(shape.from + span);
  return `M${round(sx)} ${round(sy)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${round(ex)} ${round(ey)}`;
}

/** A measure's line with a short tick across each end (F34). */
export function measurePath([a, b]: [Point, Point]): string {
  const [dx, dy] = unit(b[0] - a[0], b[1] - a[1]);
  const tick = 1.2;
  const across = ([x, y]: Point): string => `M${round(x - dy * tick)} ${round(y + dx * tick)} L${round(x + dy * tick)} ${round(y - dx * tick)}`;
  return `${pathOf([a, b])} ${across(a)} ${across(b)}`;
}

/** Each shape with its path and its label's place: inside the figure, and clear of the labels placed before it. */
/** `size` is the labels' text size in grid units: larger when the figure is drawn small (a phone), so they stay readable. */
export function placeFigure(block: Pick<FigureBlock, 'shapes' | 'width' | 'height'>, size = LABEL_SIZE): Placed[] {
  const { width, height } = block;
  const taken: Box[] = [];
  const fit = (at: Point, lines: string[]): Point => {
    const box = labelBox(at, lines, size);
    const dx = box.x0 < 0.5 ? 0.5 - box.x0 : box.x1 > width - 0.5 ? width - 0.5 - box.x1 : 0;
    const dy = box.y0 < 0.5 ? 0.5 - box.y0 : box.y1 > height - 0.5 ? height - 0.5 - box.y1 : 0;
    return [at[0] + dx, at[1] + dy];
  };
  // Free labels are where the scene put them; they are placed first, so the others keep clear of them.
  const order = block.shapes.map((_, i) => i).sort((a, b) => Number(block.shapes[b]?.kind === 'label') - Number(block.shapes[a]?.kind === 'label'));
  const placed: Placed[] = block.shapes.map((shape) => {
    const path =
      shape.kind === 'zone'
        ? pathOf(shape.points, true)
        : shape.kind === 'arrow' || shape.kind === 'normal'
          ? pathOf(shape.points)
          : shape.kind === 'angle'
            ? angleArc(shape.at, shape.from, shape.to).path
            : shape.kind === 'arc'
              ? arcPath(shape)
              : shape.kind === 'measure'
                ? measurePath(shape.points)
                : undefined;
    const text = shape.kind === 'label' ? shape.text : shape.label;
    const lines = text ? (shape.kind === 'label' ? [text] : wrapLabel(text)) : [];
    return { shape, lines, ...(path ? { path } : {}) };
  });
  for (const i of order) {
    const item = placed[i];
    if (!item || item.lines.length === 0) continue;
    let best: Point | undefined;
    let least = Infinity;
    for (const candidate of candidates(item.shape, item.lines, size)) {
      const at = fit(candidate, item.lines);
      const box = labelBox(at, item.lines, size);
      const covered = taken.reduce((sum, other) => sum + overlap(box, other), 0);
      if (covered < least) [best, least] = [at, covered];
      if (covered === 0) break;
    }
    if (!best) continue;
    item.labelAt = best;
    taken.push(labelBox(best, item.lines, size));
  }
  return placed;
}

/** A part of a figure's slide: how many shows have played and, for a question, what it asks before the next one (F32). */
export interface FigurePart {
  shown: number;
  ask?: string;
}

/** The parts of a figure's slide: the setting, then one per <show>, with a question part before a show that asks. */
export function figurePartsOf(block: Pick<FigureBlock, 'shows'>): FigurePart[] {
  return [{ shown: 0 }, ...block.shows.flatMap((show, i): FigurePart[] => (show.ask ? [{ shown: i, ask: show.ask }, { shown: i + 1 }] : [{ shown: i + 1 }]))];
}

export function figureParts(block: Pick<FigureBlock, 'shows'>): number {
  return figurePartsOf(block).length;
}

/** The shapes a show touches: those it draws, moves, recolors, pulses or sends a dot along. */
export function touchedBy(show: FigureBlock['shows'][number] | undefined): Set<number> {
  if (!show) return new Set();
  return new Set([...show.items, ...show.moves.map((move) => move.shape), ...show.sets.map((set) => set.shape), ...show.pulses, ...show.flows]);
}
