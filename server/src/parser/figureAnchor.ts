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
      return shape.points[0] ?? [0, 0];
    case 'angle':
      return shape.at;
  }
}
