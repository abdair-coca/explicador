// The animated visuals of F16: a function drawn on its axes, a formula derived line by line, points with a
// decision boundary, a comparison of two things and a timeline. Like every lesson block, they hold the notebook's numbers
// as printed; the viewer does the geometry.
import type { Element } from './reader.ts';
import { blockHead, bodyText, catalog, checkMath, checkText, childElements, limits, narrationOf, optionalText, readAttrs, readEnum, readRef, texProblem, type Report } from './common.ts';
import { curveParams, curveValue, plotDomain } from './plotMath.ts';
import { curveFns, type CurveFn, type DeriveBlock, type PlotBlock, type PlotCurve, type PlotMark, type ScatterBlock, type ScatterDot, type SpaceBlock, type SpaceCluster, type SpaceItem, type CosineBlock, type CosineDim, compareWinners, type CompareBlock, type TimelineBlock } from './types.ts';

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

/** The optional narration in a tag's body, checked like any narration. */
function optionalNarration(child: Element, report: Report): { narration?: string } {
  const narration = child.selfClosing ? '' : bodyText(child, report);
  if (narration.length > limits.narrationLength) report(child.offset, `<${child.name}> narration is longer than ${limits.narrationLength} characters`);
  checkMath(narration, child.offset, report);
  return narration ? { narration } : {};
}

/** Both coordinates of a point as written, or undefined (reported) when one is not a number. */
function readXY(a: Record<string, string | undefined>, element: Element, report: Report): { x: string; y: string } | undefined {
  const x = readNumber(a.x, 'x', element, report);
  const y = readNumber(a.y, 'y', element, report);
  if (x === undefined || y === undefined || a.x === undefined || a.y === undefined) return undefined;
  return { x: a.x.trim(), y: a.y.trim() };
}

const atOrigin = (point: { x: string; y: string }): boolean => Number(point.x) === 0 && Number(point.y) === 0;

export function buildSpace(element: Element, ordinal: number, report: Report): SpaceBlock {
  const { id, title, attrs: a } = blockHead(element, spec('space'), ordinal, report);
  const x = optionalText(a.x, 'x', limits.axisLength, element, report);
  const y = optionalText(a.y, 'y', limits.axisLength, element, report);
  const children = childElements(element, spec('space'), report);

  const clusters: SpaceCluster[] = [];
  for (const child of children.filter((item) => item.name === 'cluster')) {
    const c = readAttrs(child, spec('cluster'), report);
    const xy = readXY(c, child, report);
    if (c.id === undefined || c.label === undefined || !xy) continue;
    const clusterId = c.id.trim();
    if (clusters.some((cluster) => cluster.id === clusterId)) report(child.offset, `Duplicate cluster id "${clusterId}"`);
    clusters.push({ id: clusterId, label: checkText(c.label, 'label', limits.rowLabelLength, child, report), ...xy, ...optionalNarration(child, report) });
  }
  if (clusters.length === 1) report(element.offset, 'An index splits the space into at least two <cluster>s; leave them out for a search that compares every item');
  if (clusters.length > limits.spaceClusters) report(element.offset, `<space> has more than ${limits.spaceClusters} clusters`);
  const clusterIds = new Set(clusters.map((cluster) => cluster.id));
  const checkCluster = (value: string | undefined, child: Element): { cluster?: string } => {
    if (value === undefined) {
      if (clusters.length > 0 && child.name === 'item') report(child.offset, `With <cluster>s, every <item> names its cluster: cluster="${clusters[0]?.id}"`);
      return {};
    }
    const name = value.trim();
    if (!clusterIds.has(name)) {
      report(offsetOf(child, 'cluster'), clusters.length === 0 ? `"cluster" needs <cluster>s in the <space>` : `Unknown cluster "${name}"; the clusters are ${[...clusterIds].join(', ')}`);
      return {};
    }
    return { cluster: name };
  };

  const items: SpaceItem[] = [];
  for (const child of children.filter((item) => item.name === 'item')) {
    const p = readAttrs(child, spec('item'), report);
    const xy = readXY(p, child, report);
    const score = readNumber(p.score, 'score', child, report);
    if (p.id === undefined || p.label === undefined || !xy) continue;
    const itemId = p.id.trim();
    if (items.some((item) => item.id === itemId)) report(child.offset, `Duplicate item id "${itemId}"`);
    items.push({
      id: itemId,
      label: checkText(p.label, 'label', limits.rowLabelLength, child, report),
      ...xy,
      ...checkCluster(p.cluster, child),
      ...(score !== undefined && p.score !== undefined ? { score: p.score.trim() } : {}),
      ...optionalNarration(child, report),
    });
  }
  if (items.length < 2) report(element.offset, '<space> needs at least two <item>s');
  if (items.length > limits.spaceItems) report(element.offset, `<space> has more than ${limits.spaceItems} items; show a sample and say so in the prose`);
  const scored = items.filter((item) => item.score !== undefined).length;
  if (scored === 0) {
    for (const item of items) if (atOrigin(item)) report(element.offset, `Item "${item.id}" is at 0,0: it has no direction, so it has no cosine`);
  }

  const queries = children.filter((item) => item.name === 'query');
  if (queries.length > 1) report(queries[1]?.offset ?? element.offset, '<space> takes at most one <query>: <query label="your question" x="0.7" y="0.4" />');
  if (queries.length === 0 && clusters.length === 0) report(element.offset, '<space> without a <query> shows the index: give it its <cluster>s, or add the <query> to search');
  if (queries.length === 0 && scored > 0) report(element.offset, 'Scores measure the similarity to a <query>: add it, or leave the scores out');
  let query: SpaceBlock['query'];
  const first = queries[0];
  if (first) {
    const q = readAttrs(first, spec('query'), report);
    const xy = readXY(q, first, report);
    if (q.label !== undefined && xy) {
      query = { label: checkText(q.label, 'label', limits.rowLabelLength, first, report), ...xy, ...checkCluster(q.cluster, first), ...optionalNarration(first, report) };
      if (scored === 0 && atOrigin(xy)) report(first.offset, 'The query is at 0,0: it has no direction, so it has no cosine');
    }
  }
  // Real scores: the system scores the rows it compares, so those need one: the items of the query's cluster, or all.
  if (scored > 0 && query) {
    if (clusters.length > 0 && query.cluster === undefined) {
      report(first?.offset ?? element.offset, 'With real scores and <cluster>s, name the cluster the system sent the query to: <query … cluster="…">');
    } else {
      const compared = items.filter((item) => clusters.length === 0 || item.cluster === query?.cluster);
      const missing = compared.filter((item) => item.score === undefined).map((item) => item.id);
      if (missing.length > 0) {
        report(element.offset, `Give every compared <item> its real "score" (missing: ${missing.join(', ')}), or none (the viewer then computes the cosine from x and y)`);
      }
    }
  }

  let k = 3;
  if (a.k !== undefined) {
    k = Number(a.k);
    if (!Number.isInteger(k) || k < 1 || k > limits.spaceK) report(offsetOf(element, 'k'), `"k" is how many nearest items the search returns, a whole number from 1 to ${limits.spaceK}`);
  }
  if (query && Number.isInteger(k) && k >= 1 && items.length >= 2 && k > items.length) report(offsetOf(element, 'k'), `"k" is ${k} but the space holds ${items.length} items`);
  let dims: number | undefined;
  if (a.dims !== undefined) {
    dims = Number(a.dims);
    if (!Number.isInteger(dims) || dims < 2 || dims > limits.vectorDims) report(offsetOf(element, 'dims'), `"dims" is the real number of dimensions, a whole number from 2 to ${limits.vectorDims}`);
  }
  return {
    type: 'space',
    id,
    title,
    ...(x ? { x } : {}),
    ...(y ? { y } : {}),
    k,
    ...(dims !== undefined && dims > 2 ? { dims } : {}),
    clusters,
    items,
    ...(query ? { query } : {}),
    ...readRef(a.ref, element, report),
  };
}

const decimalsIn = (value: string): number => {
  const mantissa = value.split(/[eE]/)[0] ?? '';
  return mantissa.includes('.') ? (mantissa.split('.')[1]?.length ?? 0) : 0;
};

export function buildCosine(element: Element, ordinal: number, report: Report): CosineBlock {
  const { id, title, attrs: h } = blockHead(element, spec('cosine'), ordinal, report);
  const a = h.a === undefined ? '' : checkText(h.a, 'a', limits.rowLabelLength, element, report);
  const b = h.b === undefined ? '' : checkText(h.b, 'b', limits.rowLabelLength, element, report);
  const dims: CosineDim[] = [];
  for (const child of childElements(element, spec('cosine'), report)) {
    const d = readAttrs(child, spec('dim'), report);
    if (!child.selfClosing) report(child.offset, '<dim> must be self-closing: <dim a="0.12" b="0.10" />');
    const left = readNumber(d.a, 'a', child, report);
    const right = readNumber(d.b, 'b', child, report);
    if (left === undefined || right === undefined || d.a === undefined || d.b === undefined) continue;
    const label = optionalText(d.label, 'label', limits.rowLabelLength, child, report);
    dims.push({ a: d.a.trim(), b: d.b.trim(), ...(label ? { label } : {}) });
  }
  if (dims.length < 2) report(element.offset, '<cosine> needs at least two <dim>s: <dim a="0.12" b="0.10" />');
  if (dims.length > limits.cosineDims) report(element.offset, `<cosine> shows at most ${limits.cosineDims} <dim>s; show the first ones and give the real size with dims="384" and the real score`);
  const score = readNumber(h.score, 'score', element, report);
  if (score !== undefined && (score < -1 || score > 1)) report(offsetOf(element, 'score'), `A cosine is between -1 and 1 (got ${h.score})`);
  let size: number | undefined;
  if (h.dims !== undefined) {
    size = Number(h.dims);
    if (!Number.isInteger(size) || size < dims.length || size > limits.vectorDims) {
      report(offsetOf(element, 'dims'), `"dims" is the vectors' real size, a whole number from the count of <dim>s shown (${dims.length}) to ${limits.vectorDims}`);
      size = undefined;
    }
  }
  const hidden = size !== undefined && size > dims.length;
  if (hidden && score === undefined) report(element.offset, `Only ${dims.length} of ${size} dimensions are shown, so the viewer cannot compute the cosine: give the real one with score="0.83"`);
  if (!hidden && score !== undefined && h.score !== undefined && dims.length >= 2) {
    // The numbers shown are rounded, so the check allows a little more than the score's own rounding.
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const dim of dims) {
      dot += Number(dim.a) * Number(dim.b);
      na += Number(dim.a) ** 2;
      nb += Number(dim.b) ** 2;
    }
    const exact = na === 0 || nb === 0 ? undefined : dot / Math.sqrt(na * nb);
    if (exact === undefined) report(element.offset, 'One of the vectors is all zeros: it has no direction, so it has no cosine');
    else if (Math.abs(exact - score) > Math.max(0.02, 0.5 * 10 ** -decimalsIn(h.score))) {
      report(offsetOf(element, 'score'), `score="${h.score}" is not the cosine of these numbers (${exact.toFixed(3)}); leave score out and the viewer computes it, or show the real numbers`);
    }
  }
  return {
    type: 'cosine',
    id,
    title,
    a,
    b,
    dims,
    ...(hidden ? { size } : {}),
    ...(score !== undefined && h.score !== undefined ? { score: h.score.trim() } : {}),
    ...readRef(h.ref, element, report),
  };
}
