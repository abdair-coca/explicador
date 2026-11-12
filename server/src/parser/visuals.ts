// The animated visuals of F16: a function drawn on its axes, a formula derived line by line, points with a
// decision boundary, a comparison of two things and a timeline. Like every lesson block, they hold the notebook's numbers
// as printed; the viewer does the geometry.
import type { Element } from './reader.ts';
import { blockHead, bodyText, catalog, checkMath, checkText, childElements, limits, narrationOf, optionalText, readAttrs, readEnum, readRef, texProblem, type Report } from './common.ts';
import { curveParams, curveValue, plotDomain } from './plotMath.ts';
import { curveFns, type CurveFn, type DeriveBlock, type PlotBlock, type PlotCurve, type PlotMark, type ScatterBlock, type ScatterDot, compareWinners, type CompareBlock, type TimelineBlock } from './types.ts';

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

export function buildScatter(element: Element, ordinal: number, report: Report): ScatterBlock {
  const { id, title, attrs: a } = blockHead(element, spec('scatter'), ordinal, report);
  const x = optionalText(a.x, 'x', limits.axisLength, element, report);
  const y = optionalText(a.y, 'y', limits.axisLength, element, report);
  const classes = (a.classes ?? '').split('|').map((name) => name.trim());
  const classesOffset = offsetOf(element, 'classes');
  if (a.classes !== undefined && (classes.length < 2 || classes.length > limits.scatterClasses || classes.some((name) => !name || name.length > limits.rowLabelLength) || new Set(classes).size !== classes.length)) {
    report(classesOffset, `"classes" names 2 to ${limits.scatterClasses} different classes: classes="negative|positive"`);
  }
  const children = childElements(element, spec('scatter'), report);
  const dots: ScatterDot[] = [];
  for (const child of children.filter((item) => item.name === 'dot')) {
    const d = readAttrs(child, spec('dot'), report);
    if (!child.selfClosing) report(child.offset, '<dot> must be self-closing: <dot x="0.42" y="-1.3" class="positive" />');
    const px = readNumber(d.x, 'x', child, report);
    const py = readNumber(d.y, 'y', child, report);
    if (d.x === undefined || d.y === undefined || d.class === undefined || px === undefined || py === undefined) continue;
    const name = d.class.trim();
    if (!classes.includes(name)) {
      report(offsetOf(child, 'class'), `"class" must name one of the classes: ${classes.join(', ')} (got "${name}")`);
      continue;
    }
    const label = optionalText(d.label, 'label', limits.labelLength, child, report);
    dots.push({ x: d.x.trim(), y: d.y.trim(), class: name, ...(label ? { label } : {}) });
  }
  if (dots.length < 2) report(element.offset, '<scatter> needs at least two <dot>s');
  if (dots.length > limits.scatterDots) report(element.offset, `<scatter> has more than ${limits.scatterDots} dots; show a sample and say so in the prose`);

  const boundaries = children.filter((item) => item.name === 'boundary');
  if (boundaries.length > 1) report(boundaries[1]?.offset ?? element.offset, 'Only one <boundary> per <scatter>');
  let boundary: ScatterBlock['boundary'];
  const first = boundaries[0];
  if (first) {
    const b = readAttrs(first, spec('boundary'), report);
    if (!first.selfClosing) report(first.offset, '<boundary> must be self-closing: <boundary slope="-1.2" intercept="0.4" above="positive" />');
    if (b.points !== undefined) {
      for (const name of ['slope', 'intercept', 'above']) if (b[name] !== undefined) report(offsetOf(first, name), `"${name}" describes a straight boundary; leave it out with "points"`);
      const points = parsePoints(b.points, 2);
      if (typeof points === 'string') report(offsetOf(first, 'points'), `Invalid points: ${points}`);
      else boundary = { points };
    } else {
      const slope = readNumber(b.slope, 'slope', first, report);
      const intercept = readNumber(b.intercept, 'intercept', first, report);
      if (b.slope === undefined || b.intercept === undefined || b.above === undefined) {
        report(first.offset, '<boundary> takes "slope", "intercept" and "above" (the class above the line y = slope·x + intercept), or "points"');
      } else if (classes.length !== 2) {
        report(first.offset, 'A straight boundary separates two classes; with more, give it as "points"');
      } else if (!classes.includes(b.above.trim())) {
        report(offsetOf(first, 'above'), `"above" must name one of the classes: ${classes.join(', ')}`);
      } else if (slope !== undefined && intercept !== undefined) {
        boundary = { slope, intercept, above: b.above.trim() };
      }
    }
  }
  return { type: 'scatter', id, title, ...(x ? { x } : {}), ...(y ? { y } : {}), classes, dots, ...(boundary ? { boundary } : {}), ...readRef(a.ref, element, report) };
}

export function buildCompare(element: Element, ordinal: number, report: Report): CompareBlock {
  const { id, title, attrs: h } = blockHead(element, spec('compare'), ordinal, report);
  const a = h.a === undefined ? '' : checkText(h.a, 'a', limits.rowLabelLength, element, report);
  const b = h.b === undefined ? '' : checkText(h.b, 'b', limits.rowLabelLength, element, report);
  if (a && a === b) report(offsetOf(element, 'b'), 'The two sides of a <compare> need different names');
  const rows: CompareBlock['rows'] = [];
  for (const child of childElements(element, spec('compare'), report)) {
    const p = readAttrs(child, spec('pair'), report);
    if (!child.selfClosing) report(child.offset, '<pair> must be self-closing: <pair label="Rare words" a="count like any other" b="weigh more" winner="b" />');
    if (p.label === undefined || p.a === undefined || p.b === undefined) continue;
    const label = checkText(p.label, 'label', limits.rowLabelLength, child, report);
    const left = checkText(p.a, 'a', limits.compareCellLength, child, report);
    const right = checkText(p.b, 'b', limits.compareCellLength, child, report);
    checkMath(left, offsetOf(child, 'a'), report);
    checkMath(right, offsetOf(child, 'b'), report);
    const winner = p.winner === undefined ? undefined : readEnum(p.winner, compareWinners, 'tie', 'winner', child, report);
    rows.push({ label, a: left, b: right, ...(winner ? { winner } : {}) });
  }
  if (rows.length < 2) report(element.offset, '<compare> needs at least two <pair>s');
  if (rows.length > limits.comparePairs) report(element.offset, `<compare> has more than ${limits.comparePairs} pairs; keep the ones that decide`);
  return { type: 'compare', id, title, a, b, rows, ...readRef(h.ref, element, report) };
}

export function buildTimeline(element: Element, ordinal: number, report: Report): TimelineBlock {
  const { id, title, attrs: a } = blockHead(element, spec('timeline'), ordinal, report);
  const events: TimelineBlock['events'] = [];
  for (const child of childElements(element, spec('timeline'), report)) {
    const e = readAttrs(child, spec('event'), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    if (e.label === undefined) continue;
    const when = optionalText(e.when, 'when', limits.whenLength, child, report);
    events.push({ label: checkText(e.label, 'label', limits.rowLabelLength, child, report), ...(when ? { when } : {}), narration, ...readRef(e.ref, child, report) });
  }
  if (events.length < 2) report(element.offset, '<timeline> needs at least two <event>s');
  if (events.length > limits.timelineEvents) report(element.offset, `<timeline> has more than ${limits.timelineEvents} events`);
  return { type: 'timeline', id, title, events, ...readRef(a.ref, element, report) };
}
