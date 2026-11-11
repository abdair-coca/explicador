// Lesson blocks: chapters, headline numbers, the data's journey, traces, charts, matrices and checks.
// They explain notebooks and data code with their real values; the viewer animates them.
import type { Element } from './reader.ts';
import {
  blockHead,
  bodyText,
  catalog,
  checkId,
  checkText,
  childElements,
  limits,
  narrationOf,
  optionalText,
  readAbout,
  readAttrs,
  readCode,
  readDrill,
  readEnum,
  readRef,
  withCodes,
  type Report,
} from './common.ts';
import {
  chartTypes,
  confusionMetrics,
  stageKinds,
  type CellPick,
  type ChapterBlock,
  type ChartBlock,
  type CodeSnippet,
  type ConfusionMetric,
  type DataRow,
  type Drill,
  type JourneyBlock,
  type JourneyStage,
  type MatrixBlock,
  type MatrixFocus,
  type QuizBlock,
  type QuizOption,
  type Stat,
  type StatsBlock,
  type TraceBlock,
  type TraceValue,
} from './types.ts';

const NUMBER = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
const COUNT = /^\d+$/;

const spec = (name: string) => catalog[name] ?? { attrs: {} };

/** `a | b | c` → ["a", "b", "c"]. */
function splitList(value: string): string[] {
  return value.split('|').map((part) => part.trim());
}

function requireSelfClosing(element: Element, example: string, report: Report): void {
  if (!element.selfClosing) report(element.offset, `<${element.name}> must be self-closing: ${example}`);
}

/** Children named `name`, in order. */
function named(children: Element[], name: string): Element[] {
  return children.filter((child) => child.name === name);
}

export function buildChapter(element: Element, ordinal: number, report: Report): ChapterBlock {
  const a = readAttrs(element, spec('chapter'), report);
  if (!element.selfClosing) {
    report(element.offset, '<chapter> is self-closing: <chapter title="..." />; the chapter runs until the next one');
  }
  if (a.id !== undefined) checkId(a.id, element, report);
  const title = a.title === undefined ? '' : checkText(a.title, 'title', limits.titleLength, element, report);
  const goal = optionalText(a.goal, 'goal', limits.goalLength, element, report);
  const { ref } = readRef(a.ref, element, report);
  const refOffset = element.attrs.get('ref')?.offset ?? element.offset;
  if (ref && ref.start === undefined) {
    report(refOffset, 'A chapter\'s ref is a range: the cells (or lines) it explains, e.g. "analysis.ipynb:4-9"');
  } else if (ref?.start !== undefined && (ref.end ?? ref.start) - ref.start + 1 > limits.chapterSpan) {
    report(refOffset, `A chapter covers at most ${limits.chapterSpan} cells or lines; split it`);
  }
  return { type: 'chapter', id: a.id ?? `chapter-${ordinal}`, title, ...(goal ? { goal } : {}), ...(ref ? { ref } : {}) };
}

export function buildStats(element: Element, ordinal: number, report: Report): StatsBlock {
  const a = readAttrs(element, spec('stats'), report);
  if (element.selfClosing) report(element.offset, '<stats> must have children');
  if (a.id !== undefined) checkId(a.id, element, report);
  const title = optionalText(a.title, 'title', limits.titleLength, element, report);
  const stats: Stat[] = [];
  for (const child of childElements(element, spec('stats'), report)) {
    const s = readAttrs(child, spec('stat'), report);
    requireSelfClosing(child, '<stat value="84.6 %" label="accuracy on the test set" />', report);
    const value = optionalText(s.value, 'value', limits.statValueLength, child, report);
    const label = optionalText(s.label, 'label', limits.labelLength, child, report);
    if (value && label) stats.push({ value, label, ...readRef(s.ref, child, report) });
  }
  if (stats.length === 0) report(element.offset, '<stats> needs at least one <stat>');
  if (stats.length > limits.stats) report(element.offset, `<stats> has more than ${limits.stats} numbers; keep the headline ones`);
  return { type: 'stats', id: a.id ?? `stats-${ordinal}`, ...(title ? { title } : {}), stats };
}

export function buildJourney(element: Element, ordinal: number, report: Report): JourneyBlock {
  const { id, title } = blockHead(element, spec('journey'), ordinal, report);
  const children = childElements(element, spec('journey'), report);
  const stages: JourneyStage[] = [];
  const ids = new Set<string>();
  for (const child of named(children, 'stage')) {
    const a = readAttrs(child, spec('stage'), report);
    const narration = narrationOf(child, report);
    if (a.id === undefined || a.label === undefined) continue;
    checkId(a.id, child, report);
    if (ids.has(a.id)) report(child.offset, `Duplicate stage id "${a.id}"`);
    ids.add(a.id);
    const value = optionalText(a.value, 'value', limits.stageValueLength, child, report);
    const op = optionalText(a.op, 'op', limits.opLength, child, report);
    stages.push({
      id: a.id,
      label: checkText(a.label, 'label', limits.labelLength, child, report),
      ...(value ? { value } : {}),
      kind: readEnum(a.kind, stageKinds, 'table', 'kind', child, report),
      ...(op ? { op } : {}),
      ...readRef(a.ref, child, report),
      narration,
    });
  }
  const drills: Drill[] = [];
  for (const child of named(children, 'drill')) readDrill(child, ids, drills, report);
  const codes: CodeSnippet[] = [];
  for (const child of named(children, 'code')) readCode(child, ids, codes, report);
  if (stages.length < 2) report(element.offset, '<journey> needs at least two <stage>s: where the data starts and where it ends up');
  if (stages.length > limits.stages) report(element.offset, `<journey> has more than ${limits.stages} stages`);
  return { type: 'journey', id, title, stages, drills, ...withCodes(codes) };
}

export function buildTrace(element: Element, ordinal: number, report: Report): TraceBlock {
  const { id, title, attrs } = blockHead(element, spec('trace'), ordinal, report);
  const values: TraceValue[] = [];
  for (const child of childElements(element, spec('trace'), report)) {
    const a = readAttrs(child, spec('value'), report);
    const text = bodyText(child, report);
    if (!text) report(child.offset, '<value> needs the value as text: <value label="lowercase">this was not good</value>');
    else if (text.length > limits.traceTextLength) {
      report(child.offset, `<value> is longer than ${limits.traceTextLength} characters; cut the example (end it with "…")`);
    }
    const code = optionalText(a.code, 'code', limits.traceCodeLength, child, report);
    const note = optionalText(a.note, 'note', limits.noteLength, child, report);
    if (a.label === undefined) continue;
    values.push({
      label: checkText(a.label, 'label', limits.labelLength, child, report),
      text,
      ...(code ? { code } : {}),
      ...(note ? { note } : {}),
      ...readRef(a.ref, child, report),
    });
  }
  if (values.length < 2) report(element.offset, '<trace> needs at least two <value>s: the input and the result of one operation');
  if (values.length > limits.traceValues) report(element.offset, `<trace> has more than ${limits.traceValues} values`);
  return { type: 'trace', id, title, ...readRef(attrs.ref, element, report), values };
}

/** <row label values /> rows of a chart or a matrix; `check` validates each value. */
function readRows(children: Element[], width: number, what: string, check: (value: string) => string | undefined, report: Report): DataRow[] {
  const rows: DataRow[] = [];
  for (const child of named(children, 'row')) {
    const a = readAttrs(child, spec('row'), report);
    requireSelfClosing(child, '<row label="F1" values="0.84 | 0.85" />', report);
    if (a.label === undefined || a.values === undefined) continue;
    const label = checkText(a.label, 'label', limits.rowLabelLength, child, report);
    const values = splitList(a.values);
    const offset = child.attrs.get('values')?.offset ?? child.offset;
    if (values.length !== width) {
      report(offset, `Row "${label}" has ${values.length} values; ${what} needs ${width} (separate them with "|")`);
      continue;
    }
    const problem = values.map(check).find((message) => message !== undefined);
    if (problem) report(offset, `Row "${label}": ${problem}`);
    rows.push({ label, values });
  }
  return rows;
}

export function buildChart(element: Element, ordinal: number, report: Report): ChartBlock {
  const { id, title, attrs: a } = blockHead(element, spec('chart'), ordinal, report);
  const chartType = readEnum(a.type, chartTypes, 'bars', 'type', element, report);
  const series = a.series === undefined ? [] : splitList(a.series);
  const seriesOffset = element.attrs.get('series')?.offset ?? element.offset;
  if (series.some((name) => !name || name.length > limits.rowLabelLength)) report(seriesOffset, 'Every series needs a short name');
  if (new Set(series).size !== series.length) report(seriesOffset, 'Series names must be different');
  if (series.length > limits.series) report(seriesOffset, `A chart shows at most ${limits.series} series`);
  const unit = optionalText(a.unit, 'unit', limits.unitLength, element, report);
  const width = Math.max(series.length, 1);
  const what = series.length > 1 ? `a chart with ${series.length} series` : 'a chart with one series';
  const rows = readRows(childElements(element, spec('chart'), report), width, what, (value) =>
    NUMBER.test(value) ? undefined : `"${value}" is not a number; write it as the notebook prints it, with a dot for decimals (0.846)`,
  report);
  if (rows.length === 0) report(element.offset, '<chart> needs at least one <row>');
  if (chartType === 'line' && rows.length === 1) report(element.offset, 'A line chart needs at least two <row>s');
  if (rows.length > limits.chartRows) report(element.offset, `<chart> has more than ${limits.chartRows} rows`);
  const highlight = optionalText(a.highlight, 'highlight', limits.rowLabelLength, element, report);
  if (highlight && !series.includes(highlight) && !rows.some((row) => row.label === highlight)) {
    report(element.attrs.get('highlight')?.offset ?? element.offset, `"highlight" must name a series or a row label: "${highlight}" is neither`);
  }
  return {
    type: 'chart',
    id,
    title,
    chartType,
    series,
    rows,
    ...(unit ? { unit } : {}),
    ...(highlight ? { highlight } : {}),
    ...readRef(a.ref, element, report),
  };
}

/** `2,1 *,2 1,*` → cell picks (0-based); a problem as a string. */
function parseCells(value: string, rows: number, cols: number): CellPick[] | string {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 'give the cells as "row,col" pairs, e.g. "1,1 2,2"; "*" takes a whole row or column';
  const picks: CellPick[] = [];
  for (const token of tokens) {
    const match = /^(\d+|\*),(\d+|\*)$/.exec(token);
    if (!match || (match[1] === '*' && match[2] === '*')) return `"${token}" is not "row,col" (1-based; "*" for a whole row or column)`;
    const row = match[1] === '*' ? undefined : Number(match[1]);
    const col = match[2] === '*' ? undefined : Number(match[2]);
    if ((row !== undefined && (row < 1 || row > rows)) || (col !== undefined && (col < 1 || col > cols))) {
      return `"${token}" is outside the ${rows}×${cols} matrix`;
    }
    picks.push({ ...(row !== undefined ? { row: row - 1 } : {}), ...(col !== undefined ? { col: col - 1 } : {}) });
  }
  return picks;
}

function readFocus(child: Element, rows: number, cols: number, confusion: boolean, report: Report): MatrixFocus | undefined {
  const a = readAttrs(child, spec('focus'), report);
  const narration = narrationOf(child, report);
  const label = optionalText(a.label, 'label', limits.rowLabelLength, child, report);
  if (a.metric !== undefined) {
    if (!confusion) {
      report(child.attrs.get('metric')?.offset ?? child.offset, '"metric" works only in a <matrix kind="confusion">');
      return undefined;
    }
    if (a.cells !== undefined) report(child.attrs.get('cells')?.offset ?? child.offset, 'A metric focus takes no "cells": the viewer finds them');
    const metric = readEnum<ConfusionMetric>(a.metric, confusionMetrics, 'accuracy', 'metric', child, report);
    return { ...(label ? { label } : {}), cells: [], metric, narration };
  }
  if (!label) report(child.offset, '<focus> needs a "label" (or, in a confusion matrix, a "metric")');
  if (a.cells === undefined) {
    report(child.offset, '<focus> needs "cells": "row,col" pairs such as "1,1 2,2"');
    return undefined;
  }
  const cells = parseCells(a.cells, rows, cols);
  if (typeof cells === 'string') {
    report(child.attrs.get('cells')?.offset ?? child.offset, `Invalid cells: ${cells}`);
    return undefined;
  }
  return label ? { label, cells, narration } : undefined;
}

export function buildMatrix(element: Element, ordinal: number, report: Report): MatrixBlock {
  const { id, title, attrs: a } = blockHead(element, spec('matrix'), ordinal, report);
  const cols = a.cols === undefined ? [] : splitList(a.cols);
  const colsOffset = element.attrs.get('cols')?.offset ?? element.offset;
  if (a.cols !== undefined && cols.some((col) => !col || col.length > limits.rowLabelLength)) report(colsOffset, 'Every column needs a short label');
  if (cols.length > limits.matrixSize) report(colsOffset, `A matrix has at most ${limits.matrixSize} columns`);
  let kind: 'confusion' | undefined;
  if (a.kind === 'confusion') kind = 'confusion';
  else if (a.kind !== undefined) report(element.attrs.get('kind')?.offset ?? element.offset, `Unknown kind "${a.kind}"; use confusion`);
  const confusion = kind === 'confusion';
  const corner = optionalText(a.corner, 'corner', limits.rowLabelLength, element, report);
  const children = childElements(element, spec('matrix'), report);
  const rows = readRows(children, Math.max(cols.length, 1), `a matrix with ${cols.length} columns`, (value) => {
    if (!value) return 'empty cell';
    if (value.length > limits.cellLength) return `"${value}" is longer than ${limits.cellLength} characters`;
    return confusion && !COUNT.test(value) ? `"${value}" is not a count; a confusion matrix holds whole numbers` : undefined;
  }, report);
  if (rows.length === 0) report(element.offset, '<matrix> needs at least one <row>');
  if (rows.length > limits.matrixSize) report(element.offset, `A matrix has at most ${limits.matrixSize} rows`);

  let positive: number | undefined;
  if (confusion) {
    const sameClasses = rows.length === cols.length && rows.every((row, i) => row.label === cols[i]);
    if (!sameClasses) {
      report(element.offset, 'In a confusion matrix the rows (actual) and the columns (predicted) name the same classes in the same order');
    }
    if (a.positive !== undefined) {
      positive = cols.indexOf(a.positive.trim());
      if (positive < 0) report(element.attrs.get('positive')?.offset ?? element.offset, `"positive" must name one of the classes: ${cols.join(', ')}`);
    }
  } else if (a.positive !== undefined) {
    report(element.attrs.get('positive')?.offset ?? element.offset, '"positive" works only in a <matrix kind="confusion">');
  }

  const focuses = named(children, 'focus').flatMap((child) => readFocus(child, rows.length, cols.length, confusion, report) ?? []);
  if (focuses.length > limits.focuses) report(element.offset, `A matrix has at most ${limits.focuses} <focus> elements`);
  return {
    type: 'matrix',
    id,
    title,
    cols,
    rows,
    ...(kind ? { kind } : {}),
    ...(corner ? { corner } : {}),
    ...(positive !== undefined && positive >= 0 ? { positive } : {}),
    focuses,
    ...readRef(a.ref, element, report),
  };
}

export function buildQuiz(element: Element, ordinal: number, report: Report): QuizBlock {
  const a = readAttrs(element, spec('quiz'), report);
  if (element.selfClosing) report(element.offset, '<quiz> needs <option>s or an <answer>');
  if (a.id !== undefined) checkId(a.id, element, report);
  const question = a.question === undefined ? '' : checkText(a.question, 'question', limits.questionLength, element, report);
  const children = childElements(element, spec('quiz'), report);
  const options: QuizOption[] = [];
  for (const child of named(children, 'option')) {
    const o = readAttrs(child, spec('option'), report);
    const text = bodyText(child, report);
    if (!text) report(child.offset, '<option> needs its text: <option>The answer</option>');
    else if (text.length > limits.optionLength) report(child.offset, `<option> is longer than ${limits.optionLength} characters`);
    if (o.correct !== undefined && o.correct !== 'true') {
      report(child.attrs.get('correct')?.offset ?? child.offset, 'Write correct="true" on the right option and leave it out on the others');
    }
    const why = optionalText(o.why, 'why', limits.noteLength, child, report);
    options.push({ text, ...(o.correct === 'true' ? { correct: true as const } : {}), ...(why ? { why } : {}) });
  }
  const answers = named(children, 'answer');
  if (options.length > 0 && answers.length > 0) {
    report(element.offset, 'A <quiz> has either <option>s (multiple choice) or one <answer> (a flashcard), not both');
  } else if (options.length === 0 && answers.length === 0) {
    report(element.offset, '<quiz> needs 2 to 5 <option>s, or one <answer>');
  }
  if (options.length === 1 || options.length > limits.options) report(element.offset, `A <quiz> has 2 to ${limits.options} options`);
  if (options.length > 1 && options.filter((o) => o.correct).length !== 1) {
    report(element.offset, 'Exactly one <option> is correct="true"');
  }
  if (answers.length > 1) report(answers[1]?.offset ?? element.offset, 'Only one <answer> per <quiz>');
  const first = answers[0];
  let answer: string | undefined;
  if (first) {
    if (first.attrs.size > 0) readAttrs(first, spec('answer'), report);
    answer = readAbout(first, [], report).about;
    if (!answer) report(first.offset, '<answer> needs the answer text');
  }
  return { type: 'quiz', id: a.id ?? `quiz-${ordinal}`, question, options, ...(answer ? { answer } : {}) };
}
