// Lesson blocks: chapters, headline numbers, the data's journey, traces, charts, matrices and checks.
// They explain notebooks and data code with their real values; the viewer animates them.
import type { Element } from './reader.ts';
import {
  blockHead,
  bodyText,
  catalog,
  checkId,
  checkMath,
  checkText,
  childElements,
  limits,
  narrationOf,
  optionalText,
  readAbout,
  readAttrs,
  texProblem,
  readCode,
  readDrill,
  readEnum,
  readRef,
  withCodes,
  type Report,
} from './common.ts';
import {
  accentNames,
  themeNames,
  type ThemeBlock,
  type ThemeName,
  calcKinds,
  chartTypes,
  confusionMetrics,
  stageKinds,
  type CalcBlock,
  type ThresholdBlock,
  type ThresholdPoint,
  type CalcPart,
  type CellPick,
  type ChapterBlock,
  type ChartBlock,
  type CodeSnippet,
  type ConceptBlock,
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
  traceKinds,
  type TraceBlock,
  type TraceItem,
  type TraceKind,
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
  const theme = a.theme === undefined ? undefined : readEnum<ThemeName>(a.theme, themeNames, 'plain', 'theme', element, report);
  return { type: 'chapter', id: a.id ?? `chapter-${ordinal}`, title, ...(goal ? { goal } : {}), ...(ref ? { ref } : {}), ...(theme ? { theme } : {}) };
}

export function buildTheme(element: Element, _ordinal: number, report: Report): ThemeBlock {
  const a = readAttrs(element, spec('theme'), report);
  requireSelfClosing(element, '<theme name="ml" />', report);
  const name = readEnum<ThemeName>(a.name, themeNames, 'plain', 'name', element, report);
  const accent = a.accent === undefined ? undefined : readEnum(a.accent, accentNames, 'blue', 'accent', element, report);
  return { type: 'theme', id: 'theme', name, ...(accent ? { accent } : {}) };
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

const TRACE_EXAMPLES: Record<Exclude<TraceKind, 'text'>, string> = {
  list: '<value kind="list" label="Tokens">not|good|hated</value>',
  table: '<value kind="table" label="Counts">not=1|good=1|hated=1</value>',
  bars: '<value kind="bars" label="Weights">not=-0.41|good=0.52|hated=-0.73</value>',
  number: '<value kind="number" label="Score">-0.62</value>',
};

/** The items of a `list`, `table` or `bars` value (`a|b` or `name=value|…`); a `number` is one short value. */
function traceItems(kind: TraceKind, text: string, child: Element, report: Report): TraceItem[] | undefined {
  if (kind === 'text') return undefined;
  if (kind === 'number') {
    if (text.length > limits.traceNumberLength) report(child.offset, `A number value is at most ${limits.traceNumberLength} characters, e.g. ${TRACE_EXAMPLES.number}`);
    return undefined;
  }
  const items: TraceItem[] = [];
  for (const raw of text.split('|').map((piece) => piece.trim())) {
    const equals = raw.indexOf('=');
    const name = (kind === 'list' || equals < 0 ? raw : raw.slice(0, equals)).trim();
    const value = kind === 'list' || equals < 0 ? undefined : raw.slice(equals + 1).trim();
    if (!name || (kind !== 'list' && !value)) {
      report(child.offset, `Each ${kind} item needs ${kind === 'list' ? 'text' : 'name=value'}, separated by "|", e.g. ${TRACE_EXAMPLES[kind]}`);
      return undefined;
    }
    if (name.length > limits.traceItemLength) report(child.offset, `Item "${name.slice(0, 20)}…" is longer than ${limits.traceItemLength} characters`);
    if (value !== undefined && value.length > limits.traceItemValueLength) report(child.offset, `The value of "${name}" is longer than ${limits.traceItemValueLength} characters`);
    if (kind === 'bars' && value !== undefined && !NUMBER.test(value)) report(child.offset, `Bars need numbers: "${name}=${value}" is not one`);
    items.push(value === undefined ? { name } : { name, value });
  }
  if (items.length > limits.traceItems) report(child.offset, `A ${kind} value has more than ${limits.traceItems} items`);
  return items;
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
    const kind = readEnum(a.kind, traceKinds, 'text', 'kind', child, report);
    const items = text ? traceItems(kind, text, child, report) : undefined;
    if (a.label === undefined) continue;
    values.push({
      label: checkText(a.label, 'label', limits.labelLength, child, report),
      text,
      ...(kind !== 'text' ? { kind } : {}),
      ...(items ? { items } : {}),
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
  checkMath(question, element.attrs.get('question')?.offset ?? element.offset, report);
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
    checkMath(text, child.offset, report);
    if (why) checkMath(why, child.attrs.get('why')?.offset ?? child.offset, report);
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

/** Digits after the decimal point, as written ("-0.332" → 3, "2" → 0, "1.5e-3" → 1). */
function decimalsIn(value: string): number {
  const mantissa = value.split(/[eE]/)[0] ?? '';
  return mantissa.includes('.') ? (mantissa.split('.')[1]?.length ?? 0) : 0;
}

export function buildCalc(element: Element, ordinal: number, report: Report): CalcBlock {
  const { id, title, attrs: a } = blockHead(element, spec('calc'), ordinal, report);
  const kind = readEnum(a.kind, calcKinds, 'sum', 'kind', element, report);
  const parts: CalcPart[] = [];
  for (const child of childElements(element, spec('calc'), report)) {
    const p = readAttrs(child, spec('part'), report);
    requireSelfClosing(child, '<part label="film" value="+0.011" />', report);
    if (p.label === undefined || p.value === undefined) continue;
    const label = checkText(p.label, 'label', limits.rowLabelLength, child, report);
    const value = p.value.trim();
    if (!NUMBER.test(value)) {
      report(child.attrs.get('value')?.offset ?? child.offset, `"${value}" is not a number; write it as the notebook prints it (-0.332)`);
      continue;
    }
    const note = optionalText(p.note, 'note', limits.noteLength, child, report);
    parts.push({ label, value, ...(note ? { note } : {}), ...readRef(p.ref, child, report) });
  }
  if (parts.length < 2) report(element.offset, '<calc> needs at least two <part>s, e.g. the intercept and one weight');
  if (parts.length > limits.calcParts) report(element.offset, `<calc> has more than ${limits.calcParts} parts; keep the ones that matter and say so in the prose`);

  let total: string | undefined;
  if (a.total !== undefined) {
    total = a.total.trim();
    const offset = element.attrs.get('total')?.offset ?? element.offset;
    if (!NUMBER.test(total)) {
      report(offset, `"total" must be a number as the notebook prints it, e.g. total="0.438"`);
      total = undefined;
    } else if (parts.length > 0) {
      // Every part and the total may be rounded by half a unit of their last decimal.
      const sum = parts.reduce((acc, part) => acc + Number(part.value), 0);
      const slack = parts.reduce((acc, part) => acc + 0.5 * 10 ** -decimalsIn(part.value), 0) + 0.5 * 10 ** -decimalsIn(total) + 1e-9;
      if (Math.abs(sum - Number(total)) > slack) {
        const shown = sum.toFixed(Math.max(...parts.map((part) => decimalsIn(part.value))));
        report(offset, `The parts add up to ${shown}, not ${total}: copy every part and the total from the same output`);
      }
    }
  }

  let classes: [string, string] | undefined;
  let threshold: number | undefined;
  const logisticOnly = (name: string): void => report(element.attrs.get(name)?.offset ?? element.offset, `"${name}" works only in a <calc kind="logistic">`);
  if (a.classes !== undefined) {
    if (kind !== 'logistic') logisticOnly('classes');
    const names = splitList(a.classes);
    if (names.length !== 2 || names.some((name) => !name || name.length > limits.rowLabelLength)) {
      report(element.attrs.get('classes')?.offset ?? element.offset, '"classes" names the two classes, below and above the threshold: classes="negative|positive"');
    } else classes = [names[0] ?? '', names[1] ?? ''];
  }
  if (a.threshold !== undefined) {
    if (kind !== 'logistic') logisticOnly('threshold');
    const value = Number(a.threshold);
    if (!NUMBER.test(a.threshold.trim()) || !(value > 0 && value < 1)) {
      report(element.attrs.get('threshold')?.offset ?? element.offset, '"threshold" is a probability between 0 and 1, e.g. threshold="0.5"');
    } else threshold = value;
  }
  return {
    type: 'calc',
    id,
    title,
    kind,
    parts,
    ...(total !== undefined ? { total } : {}),
    ...(classes && kind === 'logistic' ? { classes } : {}),
    ...(threshold !== undefined && kind === 'logistic' ? { threshold } : {}),
    ...readRef(a.ref, element, report),
  };
}

/** A probability strictly inside (0, 1), or undefined. */
function probability(value: string | undefined): number | undefined {
  if (value === undefined || !NUMBER.test(value.trim())) return undefined;
  const n = Number(value);
  return n > 0 && n < 1 ? n : undefined;
}

export function buildThreshold(element: Element, ordinal: number, report: Report): ThresholdBlock {
  const { id, title, attrs: a } = blockHead(element, spec('threshold'), ordinal, report);
  let classes: [string, string] = ['0', '1'];
  if (a.classes !== undefined) {
    const names = splitList(a.classes);
    if (names.length !== 2 || names.some((name) => !name || name.length > limits.rowLabelLength) || names[0] === names[1]) {
      report(element.attrs.get('classes')?.offset ?? element.offset, '"classes" names two different classes, the one below the threshold first: classes="negative|positive"');
    } else classes = [names[0] ?? '', names[1] ?? ''];
  }
  let at = 0.5;
  if (a.at !== undefined) {
    const value = probability(a.at);
    if (value === undefined) report(element.attrs.get('at')?.offset ?? element.offset, '"at" is the starting threshold, between 0 and 1: at="0.5"');
    else at = value;
  }
  const points: ThresholdPoint[] = [];
  for (const child of childElements(element, spec('threshold'), report)) {
    const p = readAttrs(child, spec('point'), report);
    requireSelfClosing(child, '<point score="0.608" actual="negative" label="worst film year really bad" />', report);
    if (p.score === undefined || p.actual === undefined) continue;
    const score = p.score.trim();
    const n = Number(score);
    if (!NUMBER.test(score) || n < 0 || n > 1) {
      report(child.attrs.get('score')?.offset ?? child.offset, `"${score}" is not a probability; score is the model's probability of "${classes[1]}", from 0 to 1, as printed`);
      continue;
    }
    const actual = p.actual.trim();
    if (!classes.includes(actual)) {
      report(child.attrs.get('actual')?.offset ?? child.offset, `"actual" must name one of the classes: ${classes.join(', ')} (got "${actual}")`);
      continue;
    }
    const label = optionalText(p.label, 'label', limits.labelLength, child, report);
    points.push({ score, actual, ...(label ? { label } : {}) });
  }
  if (points.length < 2) report(element.offset, '<threshold> needs at least two <point>s: the test inputs with their probability and real class');
  if (points.length > limits.thresholdPoints) report(element.offset, `<threshold> has more than ${limits.thresholdPoints} points`);
  return { type: 'threshold', id, title, classes, at, points, ...readRef(a.ref, element, report) };
}

/** A tag's body as Markdown: line breaks kept, the common indentation removed. Child tags are reported. */
function markdownBody(element: Element, report: Report): string {
  const lines = element.children
    .map((c) => {
      if (c.kind === 'element') report(c.offset, `<${c.name}> is not allowed inside <${element.name}>`);
      return c.kind === 'text' ? c.text : '';
    })
    .join('')
    .replace(/[ \t]+$/gm, '')
    .split('\n');
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length));
  return lines
    .map((line) => line.slice(Number.isFinite(indent) ? indent : 0))
    .join('\n')
    .trim();
}

const conceptPieces = ['define', 'analogy', 'formula', 'example'] as const;
const conceptLimits = { define: limits.defineLength, analogy: limits.analogyLength, formula: limits.formulaLength, example: limits.exampleLength };

export function buildConcept(element: Element, ordinal: number, report: Report): ConceptBlock {
  const a = readAttrs(element, spec('concept'), report);
  if (element.selfClosing) report(element.offset, '<concept> needs a <define>: <concept term="TF-IDF"><define>What it is, in one sentence.</define></concept>');
  if (a.id !== undefined) checkId(a.id, element, report);
  const term = a.term === undefined ? '' : checkText(a.term, 'term', limits.termLength, element, report);
  const pieces: Partial<Record<(typeof conceptPieces)[number], string>> = {};
  for (const child of childElements(element, spec('concept'), report)) {
    const name = child.name as (typeof conceptPieces)[number];
    if (child.attrs.size > 0) readAttrs(child, spec(name), report);
    if (name in pieces) {
      report(child.offset, `Only one <${name}> per <concept>`);
      continue;
    }
    const text = name === 'example' ? markdownBody(child, report) : bodyText(child, report);
    if (!text) report(child.offset, `<${name}> needs its text`);
    else if (text.length > conceptLimits[name]) report(child.offset, `<${name}> is longer than ${conceptLimits[name]} characters`);
    if (name === 'formula') {
      const problem = text ? texProblem(text) : undefined;
      if (/^\$|\$$/.test(text)) report(child.offset, '<formula> holds the LaTeX alone, without "$": <formula>\\sigma(z) = \\frac{1}{1+e^{-z}}</formula>');
      else if (problem) report(child.offset, `<formula> is not valid LaTeX: ${problem}`);
    } else checkMath(text, child.offset, report);
    pieces[name] = text;
  }
  if (!element.selfClosing && pieces.define === undefined) report(element.offset, '<concept> needs a <define>: what the concept is, in one or two sentences');
  return {
    type: 'concept',
    id: a.id ?? `concept-${ordinal}`,
    term,
    define: pieces.define ?? '',
    ...(pieces.analogy ? { analogy: pieces.analogy } : {}),
    ...(pieces.formula ? { formula: pieces.formula } : {}),
    ...(pieces.example ? { example: pieces.example } : {}),
    ...readRef(a.ref, element, report),
  };
}
