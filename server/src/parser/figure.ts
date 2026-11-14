// <figure> (F31): a drawing of a physical thing, made of a closed set of shapes placed on a grid (0 to the figure's
// width and height, 100 × 60 by default): circles, boxes, arrows (a ray of light, a car's path), angles, zones and
// labels. Shapes without a <show> are there from the start; each <show> names shapes that appear together in a later
// part, with its narration. No free paths and no styles: what a figure can say is what its shapes and labels say.
import type { Element } from './reader.ts';
import { blockHead, catalog, checkId, checkMath, checkText, childElements, limits, narrationOf, readAttrs, readEnum, readRef, type Report } from './common.ts';
import { arrowHeads, figureColors, type ArrowHead, type FigureBlock, type FigureColor, type FigureShape, type FigureShow, type Point } from './types.ts';

export const shapeTags = ['circle', 'box', 'arrow', 'angle', 'zone', 'label'] as const;
const spec = (name: string) => catalog[name] ?? { attrs: {} };
const NUMBER = /^-?\d+(?:\.\d+)?$/;
const offsetOf = (element: Element, attr: string): number => element.attrs.get(attr)?.offset ?? element.offset;

export function buildFigure(element: Element, ordinal: number, report: Report): FigureBlock {
  const { id, title, attrs: a } = blockHead(element, spec('figure'), ordinal, report);
  const children = childElements(element, spec('figure'), report);
  const [width, height] = readSize(a.size, element, report);

  const inside = (point: Point, attr: string, child: Element): boolean => {
    const [x, y] = point;
    if (x >= 0 && x <= width && y >= 0 && y <= height) return true;
    report(offsetOf(child, attr), `"${attr}" ${x} ${y} is outside the figure (0–${width} across, 0–${height} down)`);
    return false;
  };
  const number = (value: string | undefined, attr: string, child: Element, min = -Infinity): number | undefined => {
    if (value === undefined) return undefined;
    if (!NUMBER.test(value.trim()) || Number(value) < min) {
      report(offsetOf(child, attr), `"${attr}" must be a number${min > -Infinity ? ` of at least ${min}` : ''}, like 12 or 7.5`);
      return undefined;
    }
    return Number(value);
  };
  const point = (value: string | undefined, attr: string, child: Element): Point | undefined => {
    const list = points(value, attr, child, 1, 1);
    return list?.[0];
  };
  const points = (value: string | undefined, attr: string, child: Element, min: number, max: number): Point[] | undefined => {
    if (value === undefined) return undefined;
    const numbers = value.trim().split(/[\s,]+/).filter(Boolean);
    if (numbers.length % 2 !== 0 || !numbers.every((n) => NUMBER.test(n))) {
      report(offsetOf(child, attr), `"${attr}" is a list of "x y" pairs, like "10 20 40 20"`);
      return undefined;
    }
    const pairs: Point[] = [];
    for (let i = 0; i < numbers.length; i += 2) pairs.push([Number(numbers[i]), Number(numbers[i + 1])]);
    if (pairs.length < min || pairs.length > max) {
      report(offsetOf(child, attr), min === max ? `"${attr}" is one "x y" pair` : `"${attr}" needs ${min}–${max} "x y" pairs`);
      return undefined;
    }
    return pairs.every((p) => inside(p, attr, child)) ? pairs : undefined;
  };

  const shapes: FigureShape[] = [];
  const ids = new Map<string, number>();
  for (const child of children.filter((c) => (shapeTags as readonly string[]).includes(c.name))) {
    const s = readAttrs(child, spec(child.name), report);
    if (child.name !== 'label' && !child.selfClosing) report(child.offset, `<${child.name}> must be self-closing: <${child.name} … />`);
    const color = readEnum<FigureColor>(s.color, figureColors, 'ink', 'color', child, report);
    const label = s.label === undefined ? undefined : checkText(s.label, 'label', limits.figureLabelLength, child, report);
    const common = { ...(label ? { label } : {}), color, appear: 0 };
    let shape: FigureShape | undefined;
    if (child.name === 'circle') {
      const x = number(s.x, 'x', child);
      const y = number(s.y, 'y', child);
      const r = number(s.r, 'r', child, 0.5);
      if (x !== undefined && y !== undefined && r !== undefined && inside([x, y], 'x', child)) shape = { kind: 'circle', x, y, r, ...common };
    } else if (child.name === 'box') {
      const x = number(s.x, 'x', child);
      const y = number(s.y, 'y', child);
      const w = number(s.w, 'w', child, 0.5);
      const h = number(s.h, 'h', child, 0.5);
      if (x !== undefined && y !== undefined && w !== undefined && h !== undefined && inside([x, y], 'x', child) && inside([x + w, y + h], 'w', child)) {
        shape = { kind: 'box', x, y, w, h, ...common };
      }
    } else if (child.name === 'arrow') {
      const list = points(s.points, 'points', child, 2, limits.figureArrowPoints);
      const head = readEnum<ArrowHead>(s.head, arrowHeads, 'end', 'head', child, report);
      const dashed = s.dashed === undefined ? false : readEnum(s.dashed, ['yes', 'no'] as const, 'no', 'dashed', child, report) === 'yes';
      if (list) shape = { kind: 'arrow', points: list, head, dashed, ...common };
    } else if (child.name === 'angle') {
      const at = point(s.at, 'at', child);
      const from = point(s.from, 'from', child);
      const to = point(s.to, 'to', child);
      if (at && from && to) {
        if ((at[0] === from[0] && at[1] === from[1]) || (at[0] === to[0] && at[1] === to[1])) report(child.offset, '<angle> needs "from" and "to" away from its corner "at"');
        else shape = { kind: 'angle', at, from, to, ...common };
      }
    } else if (child.name === 'zone') {
      const list = points(s.points, 'points', child, 3, limits.figureZonePoints);
      if (list) shape = { kind: 'zone', points: list, ...common };
    } else if (child.name === 'label') {
      const x = number(s.x, 'x', child);
      const y = number(s.y, 'y', child);
      const text = narrationOf(child, report);
      if (text.length > limits.figureLabelLength) report(child.offset, `A <label> holds up to ${limits.figureLabelLength} characters`);
      checkMath(text, child.offset, report);
      if (x !== undefined && y !== undefined && inside([x, y], 'x', child) && text) shape = { kind: 'label', x, y, text, color, appear: 0 };
    }
    if (!shape) continue;
    if (s.id !== undefined) {
      checkId(s.id, child, report);
      if (ids.has(s.id)) {
        report(child.offset, `Duplicate shape id "${s.id}"`);
        continue;
      }
      ids.set(s.id, shapes.length);
      shape.id = s.id;
    }
    shapes.push(shape);
  }

  const shows: FigureShow[] = [];
  for (const child of children.filter((c) => c.name === 'show')) {
    const s = readAttrs(child, spec('show'), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    if (s.items === undefined) continue;
    const items: number[] = [];
    for (const name of s.items.split(/\s+/).filter(Boolean)) {
      const index = ids.get(name);
      if (index === undefined) {
        report(offsetOf(child, 'items'), `"items" names unknown shape "${name}"; give the shape an id`);
        continue;
      }
      const shape = shapes[index];
      if (shape && shape.appear > 0) {
        report(offsetOf(child, 'items'), `Shape "${name}" already appears in an earlier <show>`);
        continue;
      }
      if (shape) shape.appear = shows.length + 1;
      items.push(index);
    }
    if (items.length === 0) continue;
    shows.push({ items, narration });
  }

  if (shapes.length === 0) report(element.offset, '<figure> needs at least one shape: <circle>, <box>, <arrow>, <angle>, <zone> or <label>');
  if (shapes.length > limits.figureShapes) report(element.offset, `<figure> has more than ${limits.figureShapes} shapes`);
  if (shows.length > limits.figureShows) report(element.offset, `<figure> has more than ${limits.figureShows} <show>s`);
  if (shapes.length > 0 && shapes.every((shape) => shape.appear > 0)) report(element.offset, 'Every shape waits for a <show>: leave the setting (what is there from the start) out of the <show>s');
  return { type: 'figure', id, title, width, height, shapes, shows, ...readRef(a.ref, element, report) };
}

/** `size="W H"`: the figure's grid, 100 × 60 unless it says otherwise; each side 20–200. */
function readSize(value: string | undefined, element: Element, report: Report): [number, number] {
  if (value === undefined) return [100, 60];
  const parts = value.trim().split(/\s+/);
  const [w, h] = parts.map(Number);
  if (parts.length !== 2 || !parts.every((p) => NUMBER.test(p)) || w === undefined || h === undefined || w < 20 || h < 20 || w > 200 || h > 200) {
    report(offsetOf(element, 'size'), '"size" is the grid\'s width and height, each 20–200, like "100 60"');
    return [100, 60];
  }
  return [w, h];
}
