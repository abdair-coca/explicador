// The animated visuals of F16: a function drawn on its axes and a formula derived line by line. Like every lesson block, they hold the notebook's numbers
// as printed; the viewer does the geometry.
import type { Element } from './reader.ts';
import { blockHead, bodyText, catalog, checkMath, childElements, limits, optionalText, readAttrs, readEnum, readRef, texProblem, type Report } from './common.ts';
import { curveParams, curveValue, plotDomain } from './plotMath.ts';
import { curveFns, type CurveFn, type DeriveBlock, type PlotBlock, type PlotCurve, type PlotMark } from './types.ts';

const NUMBER = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;

const spec = (name: string) => catalog[name] ?? { attrs: {} };
const offsetOf = (element: Element, attr: string): number => element.attrs.get(attr)?.offset ?? element.offset;

/** A number attribute as written, or undefined (reported) when it is not one. */
function readNumber(value: string | undefined, attr: string, element: Element, report: Report): number | undefined {
  if (value === undefined) return undefined;
  if (NUMBER.test(value.trim())) return Number(value);
  report(offsetOf(element, attr), `"${attr}" must be a number, written as the notebook prints it (got "${value}")`);
  return undefined;
}

/** `0,0.69 1,0.52 2,0.41` → points with x growing; a problem as a string. */
function parsePoints(value: string, least: number): [number, number][] | string {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  const points: [number, number][] = [];
  for (const token of tokens) {
    const [x, y, extra] = token.split(',');
    if (x === undefined || y === undefined || extra !== undefined || !NUMBER.test(x) || !NUMBER.test(y)) return `"${token}" is not an "x,y" pair of numbers (separate pairs with spaces: "0,0.69 1,0.52")`;
    points.push([Number(x), Number(y)]);
  }
  if (points.length < least) return `give at least ${least} "x,y" pairs`;
  if (points.length > limits.plotPoints) return `at most ${limits.plotPoints} points`;
  return points;
}

function readCurve(child: Element, report: Report): PlotCurve | undefined {
  const a = readAttrs(child, spec('curve'), report);
  if (!child.selfClosing) report(child.offset, '<curve> must be self-closing: <curve fn="sigmoid" /> or <curve points="0,0.69 1,0.52" />');
  const label = optionalText(a.label, 'label', limits.rowLabelLength, child, report);
  const paramNames = Object.keys(a).filter((name) => !['fn', 'label', 'points'].includes(name) && a[name] !== undefined);
  if ((a.fn === undefined) === (a.points === undefined)) {
    report(child.offset, `<curve> takes either "fn" (${curveFns.join(', ')}) or "points" (values the notebook printed), not both`);
    return undefined;
  }
  if (a.points !== undefined) {
    for (const name of paramNames) report(offsetOf(child, name), `"${name}" works only with "fn"`);
    const points = parsePoints(a.points, 2);
    if (typeof points === 'string') {
      report(offsetOf(child, 'points'), `Invalid points: ${points}`);
      return undefined;
    }
    if (points.some(([x], i) => i > 0 && x <= (points[i - 1]?.[0] ?? x))) {
      report(offsetOf(child, 'points'), 'The points of a curve go from left to right: each x is larger than the one before');
      return undefined;
    }
    return { ...(label ? { label } : {}), points };
  }
  const fn = readEnum<CurveFn>(a.fn, curveFns, 'sigmoid', 'fn', child, report);
  const allowed = Object.keys(curveParams[fn]);
  const params: Record<string, number> = {};
  for (const name of paramNames) {
    if (!allowed.includes(name)) {
      report(offsetOf(child, name), allowed.length > 0 ? `fn="${fn}" takes ${allowed.join(', ')}, not "${name}"` : `fn="${fn}" takes no parameters`);
      continue;
    }
    const value = readNumber(a[name], name, child, report);
    if (value !== undefined) params[name] = value;
  }
  if (fn === 'gaussian' && params.std !== undefined && params.std <= 0) report(offsetOf(child, 'std'), '"std" must be greater than 0');
  return { ...(label ? { label } : {}), fn, ...(Object.keys(params).length > 0 ? { params } : {}) };
}

export function buildPlot(element: Element, ordinal: number, report: Report): PlotBlock {
  const { id, title, attrs: a } = blockHead(element, spec('plot'), ordinal, report);
  const x = optionalText(a.x, 'x', limits.axisLength, element, report);
  const y = optionalText(a.y, 'y', limits.axisLength, element, report);
  const from = readNumber(a.from, 'from', element, report);
  const to = readNumber(a.to, 'to', element, report);
  const children = childElements(element, spec('plot'), report);
  const curves = children.filter((child) => child.name === 'curve').flatMap((child) => readCurve(child, report) ?? []);
  if (curves.length === 0) report(element.offset, '<plot> needs at least one <curve>: <curve fn="sigmoid" />');
  if (curves.length > limits.plotCurves) report(element.offset, `<plot> draws at most ${limits.plotCurves} curves`);
  if (curves.length > 1 && curves.some((curve) => !curve.label)) report(element.offset, 'With several curves, give each a "label"');

  const block: PlotBlock = { type: 'plot', id, title, ...(x ? { x } : {}), ...(y ? { y } : {}), ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}), curves, marks: [], ...readRef(a.ref, element, report) };
  const [low, high] = curves.length > 0 ? plotDomain(block) : [0, 1];
  if (!(low < high)) report(offsetOf(element, 'from'), `"from" must be smaller than "to" (the plot would run from ${low} to ${high})`);
  if (curves.some((curve) => curve.fn === 'log') && low <= 0) report(offsetOf(element, 'from'), 'A log curve needs "from" greater than 0');

  for (const child of children.filter((item) => item.name === 'mark')) {
    const m = readAttrs(child, spec('mark'), report);
    const narration = child.selfClosing ? '' : bodyText(child, report);
    if (narration.length > limits.narrationLength) report(child.offset, `<mark> narration is longer than ${limits.narrationLength} characters`);
    checkMath(narration, child.offset, report);
    const label = optionalText(m.label, 'label', limits.rowLabelLength, child, report);
    const value = readNumber(m.x, 'x', child, report);
    if (m.x === undefined || value === undefined || !label) continue;
    let curve = 0;
    if (m.curve !== undefined) {
      curve = curves.findIndex((item) => item.label === m.curve);
      if (curve < 0) {
        report(offsetOf(child, 'curve'), `"curve" must name a curve's label: ${curves.map((item) => item.label ?? '(no label)').join(', ')}`);
        continue;
      }
    }
    const on = curves[curve];
    if (value < low || value > high || (on && !Number.isFinite(curveValue(on, value)))) {
      report(offsetOf(child, 'x'), `x="${m.x}" is outside the curve, which runs from ${low} to ${high}; widen the plot with "from" and "to"`);
      continue;
    }
    block.marks.push({ x: m.x.trim(), label, ...(curve > 0 ? { curve } : {}), ...(narration ? { narration } : {}) } satisfies PlotMark);
  }
  if (block.marks.length > limits.plotMarks) report(element.offset, `<plot> has more than ${limits.plotMarks} marks`);
  return block;
}

export function buildDerive(element: Element, ordinal: number, report: Report): DeriveBlock {
  const { id, title, attrs: a } = blockHead(element, spec('derive'), ordinal, report);
  const lines: DeriveBlock['lines'] = [];
  for (const child of childElements(element, spec('derive'), report)) {
    const l = readAttrs(child, spec('line'), report);
    const tex = child.selfClosing ? '' : bodyText(child, report);
    const note = optionalText(l.note, 'note', limits.noteLength, child, report);
    if (note) checkMath(note, offsetOf(child, 'note'), report);
    if (!tex) {
      report(child.offset, '<line> needs its formula: <line note="Replace z by the score.">\\sigma(0.438)</line>');
      continue;
    }
    if (tex.length > limits.formulaLength) report(child.offset, `<line> is longer than ${limits.formulaLength} characters`);
    const problem = texProblem(tex);
    if (/^\$|\$$/.test(tex)) report(child.offset, '<line> holds the LaTeX alone, without "$"');
    else if (problem) report(child.offset, `<line> is not valid LaTeX: ${problem}`);
    lines.push({ tex, ...(note ? { note } : {}) });
  }
  if (lines.length < 2) report(element.offset, '<derive> needs at least two <line>s: where the formula starts and what it becomes');
  if (lines.length > limits.deriveLines) report(element.offset, `<derive> has more than ${limits.deriveLines} lines; split the derivation`);
  return { type: 'derive', id, title, lines, ...readRef(a.ref, element, report) };
}
