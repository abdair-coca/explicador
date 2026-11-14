// The EXL catalog, its limits and the helpers every block builder shares: attributes, ids, text, refs,
// child tags, narration, drills and key code.
import katex from 'katex';
import { findMath } from './math.ts';
import type { Element } from './reader.ts';
import type { CodeSnippet, Drill, Ref } from './types.ts';

export interface TagSpec {
  attrs: Record<string, 'required' | 'optional'>;
  children?: readonly string[];
  /** Whether the tag holds text (narration) instead of being self-closing. */
  text?: boolean;
}

export const catalog: Record<string, TagSpec> = {
  arch: { attrs: { id: 'optional', title: 'required' }, children: ['node', 'group', 'edge', 'drill', 'code'] },
  flow: { attrs: { id: 'optional', title: 'required' }, children: ['node', 'step', 'drill', 'code'] },
  code: { attrs: { node: 'required', ref: 'required' }, text: true },
  group: { attrs: { id: 'required', label: 'required', desc: 'optional', kind: 'optional' }, children: ['node', 'group'] },
  drill: { attrs: { node: 'required', topic: 'required' } },
  data: { attrs: { id: 'optional', title: 'required' }, children: ['entity', 'relation', 'drill', 'code'] },
  entity: { attrs: { id: 'required', label: 'required', desc: 'optional', ref: 'optional' }, children: ['field'] },
  field: { attrs: { name: 'required', type: 'optional', key: 'optional' } },
  relation: { attrs: { from: 'required', to: 'required', card: 'required', label: 'optional' } },
  state: { attrs: { id: 'optional', title: 'required' }, children: ['status', 'transition', 'walk', 'drill', 'code'] },
  status: { attrs: { id: 'required', label: 'required', desc: 'optional', role: 'optional', ref: 'optional' } },
  transition: { attrs: { from: 'required', to: 'required', event: 'required', ref: 'optional' } },
  walk: { attrs: {}, children: ['go'] },
  go: { attrs: { event: 'required' }, text: true },
  node: { attrs: { id: 'required', label: 'required', desc: 'optional', kind: 'optional', ref: 'optional' } },
  edge: { attrs: { from: 'required', to: 'required', label: 'optional', kind: 'optional' } },
  step: { attrs: { from: 'required', to: 'optional', label: 'optional', kind: 'optional', ref: 'optional' }, text: true },
  // Lessons.
  theme: { attrs: { name: 'required', accent: 'optional' } },
  chapter: { attrs: { id: 'optional', title: 'required', goal: 'optional', ref: 'optional', theme: 'optional', stage: 'optional' } },
  stats: { attrs: { id: 'optional', title: 'optional' }, children: ['stat'] },
  stat: { attrs: { value: 'required', label: 'required', ref: 'optional' } },
  journey: { attrs: { id: 'optional', title: 'required' }, children: ['stage', 'drill', 'code'] },
  stage: {
    attrs: { id: 'required', label: 'required', value: 'optional', kind: 'optional', op: 'optional', ref: 'optional' },
    text: true,
  },
  trace: { attrs: { id: 'optional', title: 'required', ref: 'optional' }, children: ['value'] },
  value: { attrs: { label: 'required', kind: 'optional', code: 'optional', note: 'optional', dims: 'optional', ref: 'optional' }, text: true },
  chart: {
    attrs: { id: 'optional', title: 'required', type: 'required', series: 'optional', unit: 'optional', highlight: 'optional', ref: 'optional' },
    children: ['row'],
  },
  row: { attrs: { label: 'required', values: 'required' } },
  matrix: {
    attrs: { id: 'optional', title: 'required', cols: 'required', kind: 'optional', corner: 'optional', positive: 'optional', ref: 'optional' },
    children: ['row', 'focus'],
  },
  focus: { attrs: { label: 'optional', cells: 'optional', metric: 'optional' }, text: true },
  quiz: { attrs: { id: 'optional', question: 'required' }, children: ['option', 'answer'] },
  option: { attrs: { correct: 'optional', why: 'optional' }, text: true },
  answer: { attrs: {}, text: true },
  calc: {
    attrs: { id: 'optional', title: 'required', kind: 'optional', total: 'optional', classes: 'optional', threshold: 'optional', ref: 'optional' },
    children: ['part'],
  },
  part: { attrs: { label: 'required', value: 'required', note: 'optional', ref: 'optional' } },
  threshold: { attrs: { id: 'optional', title: 'required', classes: 'optional', at: 'optional', ref: 'optional' }, children: ['point'] },
  point: { attrs: { score: 'required', actual: 'required', label: 'optional' } },
  plot: { attrs: { id: 'optional', title: 'required', x: 'optional', y: 'optional', from: 'optional', to: 'optional', ref: 'optional' }, children: ['curve', 'mark'] },
  curve: {
    attrs: { fn: 'optional', label: 'optional', points: 'optional', slope: 'optional', intercept: 'optional', a: 'optional', b: 'optional', c: 'optional', rate: 'optional', mean: 'optional', std: 'optional' },
  },
  mark: { attrs: { x: 'required', label: 'required', curve: 'optional' }, text: true },
  scatter: { attrs: { id: 'optional', title: 'required', x: 'optional', y: 'optional', classes: 'required', ref: 'optional' }, children: ['dot', 'boundary'] },
  dot: { attrs: { x: 'required', y: 'required', class: 'required', label: 'optional' } },
  boundary: { attrs: { slope: 'optional', intercept: 'optional', above: 'optional', points: 'optional' } },
  compare: { attrs: { id: 'optional', title: 'required', a: 'required', b: 'required', ref: 'optional' }, children: ['pair'] },
  pair: { attrs: { label: 'required', a: 'required', b: 'required', winner: 'optional' } },
  timeline: { attrs: { id: 'optional', title: 'required', ref: 'optional' }, children: ['event'] },
  space: { attrs: { id: 'optional', title: 'required', x: 'optional', y: 'optional', k: 'optional', dims: 'optional', ref: 'optional' }, children: ['item', 'query', 'cluster'] },
  item: { attrs: { id: 'required', label: 'required', x: 'required', y: 'required', cluster: 'optional', score: 'optional' }, text: true },
  query: { attrs: { label: 'required', x: 'required', y: 'required', cluster: 'optional' }, text: true },
  cluster: { attrs: { id: 'required', label: 'required', x: 'required', y: 'required' }, text: true },
  cosine: { attrs: { id: 'optional', title: 'required', a: 'required', b: 'required', dims: 'optional', score: 'optional', ref: 'optional' }, children: ['dim'] },
  dim: { attrs: { a: 'required', b: 'required', label: 'optional' } },
  event: { attrs: { label: 'required', when: 'optional', ref: 'optional' }, text: true },
  derive: { attrs: { id: 'optional', title: 'required', ref: 'optional' }, children: ['line'] },
  line: { attrs: { note: 'optional' }, text: true },
  concept: { attrs: { id: 'optional', term: 'required', ref: 'optional' }, children: ['define', 'analogy', 'formula', 'example'] },
  define: { attrs: {}, text: true },
  analogy: { attrs: {}, text: true },
  formula: { attrs: {}, text: true },
  example: { attrs: {}, text: true },
  // The pedagogical brief (F23): read by the server, never shown.
  brief: { attrs: { form: 'required' }, children: ['audience', 'question', 'example', 'misconception', 'check', 'terms'] },
  audience: { attrs: {}, text: true },
  question: { attrs: {}, text: true },
  misconception: { attrs: {}, text: true },
  check: { attrs: {}, text: true },
  terms: { attrs: {}, text: true },
};

/** Tags that open a block at the top level of a scene; every other tag lives inside one of them. */
export const topLevelTags: readonly string[] = [
  'brief', 'arch', 'flow', 'data', 'state', 'journey', 'trace', 'chart', 'matrix', 'quiz', 'stats', 'chapter', 'calc', 'threshold',
  'concept', 'theme', 'plot', 'derive', 'scatter', 'compare', 'timeline', 'space', 'cosine',
];

export const limits = {
  idLength: 40,
  labelLength: 80,
  descLength: 80,
  titleLength: 120,
  topicLength: 80,
  fieldLength: 60,
  fields: 40,
  narrationLength: 600,
  aboutLength: 1200,
  noteLength: 300,
  codeLines: 40,
  codesPerNode: 3,
  nodes: 60,
  edges: 120,
  steps: 100,
  // Lessons.
  chapters: 20,
  goalLength: 160,
  /** Cells (or lines) one chapter may cover. */
  chapterSpan: 120,
  stats: 6,
  statValueLength: 24,
  stages: 12,
  stageValueLength: 40,
  opLength: 60,
  traceValues: 12,
  traceTextLength: 1500,
  traceCodeLength: 160,
  traceItems: 40,
  traceItemLength: 40,
  traceItemValueLength: 24,
  traceNumberLength: 24,
  /** Numbers of a vector shown at once; the rest are counted by `dims`. */
  vectorShown: 16,
  vectorDims: 100000,
  series: 4,
  chartRows: 40,
  rowLabelLength: 60,
  unitLength: 12,
  matrixSize: 12,
  cellLength: 16,
  focuses: 8,
  questionLength: 300,
  options: 5,
  optionLength: 200,
  calcParts: 24,
  thresholdPoints: 200,
  termLength: 60,
  axisLength: 40,
  deriveLines: 8,
  comparePairs: 8,
  compareCellLength: 140,
  timelineEvents: 12,
  whenLength: 24,
  scatterDots: 300,
  scatterClasses: 4,
  spaceItems: 40,
  spaceClusters: 8,
  spaceK: 10,
  cosineDims: 12,
  plotCurves: 4,
  plotMarks: 8,
  plotPoints: 200,
  defineLength: 300,
  analogyLength: 300,
  formulaLength: 500,
  exampleLength: 1200,
  // The brief.
  briefFieldLength: 300,
  briefTerms: 12,
} as const;

export type Report = (offset: number, message: string) => void;

const ID = new RegExp(`^[A-Za-z][A-Za-z0-9_-]{0,${limits.idLength - 1}}$`);
/** A path (spaces allowed inside file names, not line breaks or tabs), then an optional line or line range. */
const REF = /^([^:\r\n\t]+?)(?::(\d+)(?:-(\d+))?)?$/;

export function readAttrs(element: Element, spec: TagSpec, report: Report): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  for (const [name, attr] of element.attrs) {
    if (!(name in spec.attrs)) {
      const allowed = Object.keys(spec.attrs).join(', ');
      report(attr.offset, `Unknown attribute "${name}" on <${element.name}>; allowed: ${allowed}`);
      continue;
    }
    values[name] = attr.value;
  }
  for (const [name, need] of Object.entries(spec.attrs)) {
    if (need === 'required' && values[name] === undefined) {
      report(element.offset, `<${element.name}> is missing the "${name}" attribute`);
    }
  }
  return values;
}

/** Child elements a tag allows; stray text and other tags are reported. */
export function childElements(element: Element, spec: TagSpec, report: Report): Element[] {
  const children: Element[] = [];
  for (const child of element.children) {
    if (child.kind === 'text') {
      if (child.text.trim()) report(child.offset, `Text is not allowed directly inside <${element.name}>`);
      continue;
    }
    if (!spec.children?.includes(child.name)) {
      const allowed = (spec.children ?? []).map((name) => `<${name}>`).join(', ');
      report(child.offset, `<${child.name}> is not allowed inside <${element.name}>; use ${allowed}`);
      continue;
    }
    children.push(child);
  }
  return children;
}

export function checkId(id: string, element: Element, report: Report): void {
  if (!ID.test(id)) {
    report(
      element.attrs.get('id')?.offset ?? element.offset,
      `Invalid id "${id}": start with a letter, then letters, digits, "-" or "_" (max ${limits.idLength})`,
    );
  }
}

export function checkText(value: string, attr: string, max: number, element: Element, report: Report): string {
  const offset = element.attrs.get(attr)?.offset ?? element.offset;
  const text = value.trim();
  if (/[\r\n]/.test(text)) report(offset, `"${attr}" must be a single line`);
  else if (!text) report(offset, `"${attr}" must not be empty`);
  else if (text.length > max) report(offset, `"${attr}" is longer than ${max} characters`);
  return text;
}

/** Reports every `$…$` or `$$…$$` formula in `text` that KaTeX cannot parse. `offset` is where the text starts, when known. */
export function checkMath(text: string, offset: number, report: Report, exact = false): void {
  for (const span of findMath(text)) {
    const problem = texProblem(span.tex);
    if (problem) report(exact ? offset + span.start : offset, `Formula "${shorten(span.tex)}" is not valid LaTeX: ${problem}`);
  }
}

/** Why KaTeX refuses the formula, or undefined when it parses. */
export function texProblem(tex: string): string | undefined {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: false, output: 'mathml' });
    return undefined;
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).replace(/^KaTeX parse error:\s*/, '');
  }
}

function shorten(tex: string): string {
  const line = tex.replace(/\s+/g, ' ');
  return line.length > 60 ? `${line.slice(0, 57)}…` : line;
}

/** An optional one-line attribute, checked only when present. */
export function optionalText(value: string | undefined, attr: string, max: number, element: Element, report: Report): string | undefined {
  if (value === undefined) return undefined;
  return checkText(value, attr, max, element, report) || undefined;
}

/** The optional one-line `desc`, as a spreadable object. */
export function readDesc(value: string | undefined, element: Element, report: Report): { desc?: string } {
  const desc = optionalText(value, 'desc', limits.descLength, element, report);
  return desc ? { desc } : {};
}

export function parseRefString(value: string): Ref | string {
  const m = REF.exec(value.trim());
  if (!m?.[1]) return 'expected "path", "path:line" or "path:start-end"';
  const path = m[1].replace(/^\.\//, '');
  if (path.includes('\\')) return 'use forward slashes in paths';
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'use a path relative to the project root';
  if (path.split('/').some((part) => part === '..' || part === '')) return 'the path must stay inside the project';
  const start = m[2] === undefined ? undefined : Number(m[2]);
  const end = m[3] === undefined ? undefined : Number(m[3]);
  if (start !== undefined && start < 1) return 'line numbers start at 1';
  if (start !== undefined && end !== undefined && end < start) return 'the end line is before the start line';
  return { path, ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}) };
}

export function parseRef(value: string, element: Element, report: Report): Ref | undefined {
  const ref = parseRefString(value);
  if (typeof ref === 'string') {
    report(element.attrs.get('ref')?.offset ?? element.offset, `Invalid ref "${value}": ${ref}`);
    return undefined;
  }
  return ref;
}

/** The optional `ref` attribute, as a spreadable object. */
export function readRef(value: string | undefined, element: Element, report: Report): { ref?: Ref } {
  const ref = value === undefined ? undefined : parseRef(value, element, report);
  return ref ? { ref } : {};
}

/** id, title and the other attributes of a scene block. */
export function blockHead(
  element: Element,
  spec: TagSpec,
  ordinal: number,
  report: Report,
): { id: string; title: string; attrs: Record<string, string | undefined> } {
  const attrs = readAttrs(element, spec, report);
  if (element.selfClosing) report(element.offset, `<${element.name}> must have children`);
  if (attrs.id !== undefined) checkId(attrs.id, element, report);
  return {
    id: attrs.id ?? `${element.name}-${ordinal}`,
    title: checkText(attrs.title ?? '', 'title', limits.titleLength, element, report),
    attrs,
  };
}

/** Plain text of a tag's body, whitespace collapsed; child tags are reported. */
export function bodyText(element: Element, report: Report): string {
  return element.children
    .map((c) => {
      if (c.kind === 'element') report(c.offset, `<${c.name}> is not allowed inside <${element.name}>`);
      return c.kind === 'text' ? c.text : '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function narrationOf(element: Element, report: Report): string {
  const narration = bodyText(element, report);
  if (!narration) report(element.offset, `<${element.name}> needs narration text`);
  else if (narration.length > limits.narrationLength) {
    report(element.offset, `Narration is longer than ${limits.narrationLength} characters`);
  }
  return narration;
}

/**
 * The tag's body as its long description (`about`): text only, paragraphs kept, spaces collapsed.
 * Child tags other than `allowed` are reported.
 */
export function readAbout(element: Element, allowed: readonly string[], report: Report): { about?: string } {
  if (element.selfClosing) return {};
  const text = element.children
    .map((c) => {
      if (c.kind === 'text') return c.text;
      if (!allowed.includes(c.name)) report(c.offset, `<${c.name}> is not allowed inside <${element.name}>`);
      return '\n\n';
    })
    .join('');
  const about = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
  if (about.length > limits.aboutLength) {
    report(element.offset, `The text inside <${element.name}> is longer than ${limits.aboutLength} characters`);
  }
  checkMath(about, element.offset, report);
  return about ? { about } : {};
}

/** A value from a closed set; `fallback` when absent, reported when unknown. */
export function readEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
  attr: string,
  element: Element,
  report: Report,
): T {
  if (value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  report(element.attrs.get(attr)?.offset ?? element.offset, `Unknown ${attr} "${value}"; use ${allowed.join(', ')}`);
  return fallback;
}

/** Reads a <drill> for a block whose clickable items have the given ids. */
export function readDrill(child: Element, ids: Set<string>, drills: Drill[], report: Report): void {
  const a = readAttrs(child, catalog.drill ?? { attrs: {} }, report);
  if (!child.selfClosing) report(child.offset, '<drill> must be self-closing: <drill node="a" topic="..." />');
  const offset = child.attrs.get('node')?.offset ?? child.offset;
  if (a.node !== undefined && !ids.has(a.node)) report(offset, `"node" refers to unknown item "${a.node}"`);
  else if (a.node !== undefined && drills.some((d) => d.node === a.node)) report(offset, `"${a.node}" already has a <drill>`);
  const topic = checkText(a.topic ?? '', 'topic', limits.topicLength, child, report);
  if (topic && !/[\p{L}\p{N}]/u.test(topic)) report(child.offset, '"topic" needs letters or digits');
  if (a.node !== undefined && a.topic !== undefined) drills.push({ node: a.node, topic });
}

/** `codes` only when a block has some, so blocks without key code keep their old shape. */
export function withCodes(codes: CodeSnippet[]): { codes?: CodeSnippet[] } {
  return codes.length > 0 ? { codes } : {};
}

/** <code ref="path:start-end" node="id">why it matters</code>: key lines the server copies from the file. */
export function readCode(child: Element, ids: Set<string>, codes: CodeSnippet[], report: Report): void {
  // Only a snippet without errors is kept, so a rejected one does not count against the per-node limit.
  let valid = true;
  const fail = (offset: number, message: string): void => {
    valid = false;
    report(offset, message);
  };
  const a = readAttrs(child, catalog.code ?? { attrs: {} }, fail);
  const nodeOffset = child.attrs.get('node')?.offset ?? child.offset;
  if (a.node !== undefined && !ids.has(a.node)) fail(nodeOffset, `"node" refers to unknown item "${a.node}"`);
  else if (a.node !== undefined && codes.filter((c) => c.node === a.node).length >= limits.codesPerNode) {
    fail(nodeOffset, `"${a.node}" already has ${limits.codesPerNode} <code> snippets`);
  }
  const ref = a.ref === undefined ? undefined : parseRef(a.ref, child, fail);
  const refOffset = child.attrs.get('ref')?.offset ?? child.offset;
  if (ref && ref.start === undefined) fail(refOffset, '<code> needs a line range: ref="path:start-end"');
  else if (ref?.start !== undefined && (ref.end ?? ref.start) - ref.start + 1 > limits.codeLines) {
    fail(refOffset, `<code> shows at most ${limits.codeLines} lines; pick the ones that matter`);
  }
  const note = child.children
    .map((c) => {
      if (c.kind === 'element') fail(c.offset, `<${c.name}> is not allowed inside <code>`);
      return c.kind === 'text' ? c.text : '';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!note) fail(child.offset, '<code> needs a note on why these lines matter: <code ref="a.js:3-9" node="x">Why.</code>');
  else if (note.length > limits.noteLength) fail(child.offset, `<code> note is longer than ${limits.noteLength} characters`);
  if (valid && a.node !== undefined && ref?.start !== undefined) codes.push({ node: a.node, ref, note });
}
