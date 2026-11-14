// Geometry of the lesson charts in real pixels: the SVG is drawn at the container's width (no viewBox scaling),
// so text stays crisp. Pure, so it is tested without a browser; Chart.tsx only draws what this returns.
import type { ChartBlock } from '../../../server/src/scene.ts';
import { language, type Language } from '../i18n.ts';
import { barTicks, formatTick, lineTicks, linear, type Ticks } from './scale.ts';

/** Approximate width of one character of the 12 px chart text. */
export const CHAR_PX = 7;
export const PLOT_HEIGHT = 240;
const BAR_MAX = 24;
/** Height of one line of value labels. */
const LINE_PX = 14;
const BAR_GAP = 2;
const RADIUS = 4;
const ROW_HEIGHT = 34;
/** End labels of a line chart need this much room between them, or none is drawn. */
export const END_LABEL_GAP = 14;

export type Emphasis = 'normal' | 'muted' | 'dim';

export interface Mark {
  row: number;
  series: number;
  value: number;
  /** The value as written, with the unit. */
  text: string;
  /** SVG path of the bar, or the dot's centre for lines. */
  d: string;
  x: number;
  y: number;
  /** Where the value label sits, and its anchor. */
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
  showValue: boolean;
  grow: 'grow-up' | 'grow-down' | 'grow-right' | 'grow-left';
  color: string;
  emphasis: Emphasis;
}

export interface Tick {
  value: number;
  text: string;
  /** Pixel position along the value axis. */
  at: number;
}

export interface AxisLabel {
  text: string;
  full: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface ChartGeometry {
  width: number;
  height: number;
  /** Plot area. */
  left: number;
  right: number;
  top: number;
  bottom: number;
  ticks: Tick[];
  /** A long unit ("€ al mes", "entradas") said once above the value axis instead of on every tick (F36). */
  unitCaption?: string;
  /** Pixel position of zero on the value axis (bars). */
  zero?: number;
  marks: Mark[];
  labels: AxisLabel[];
  /** Line charts: one path per series, its end label (when there is room) and the x of each row. */
  lines?: { series: number; d: string; color: string; emphasis: Emphasis; end?: { x: number; y: number; text: string } }[];
  xs?: number[];
}

/** Series names; a chart with one unnamed series has one empty name. */
export function seriesOf(block: ChartBlock): string[] {
  return block.series.length > 0 ? block.series : [''];
}

export function numbersOf(block: ChartBlock): number[][] {
  return block.rows.map((row) => row.values.map(Number));
}

/**
 * A value as written, with the unit ("84.6 %" stays "84.6%" for a symbol, "12 ms" for a word). A Spanish scene writes
 * its numbers the Spanish way (F36): a decimal comma and a space before every unit ("10,5 €", "84,6 %").
 */
/** The unit a tick carries: a short one ("%", "€", "ms") on every tick; a longer one is said once, as a caption. */
export const tickUnit = (unit: string | undefined): string | undefined => (unit && [...unit.trim()].length <= 2 ? unit : undefined);

export function withUnit(text: string, unit: string | undefined, lang: Language = language()): string {
  // Spanish groups numbers of five digits or more in threes ("12 000"), and four-digit ones not.
  const shown = lang === 'es' ? text.replace(/(\d)\.(\d)/g, '$1,$2').replace(/(?<![\d,])\d{5,}/g, (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')) : text;
  if (!unit) return shown;
  return lang === 'es' || /^[\p{L}]/u.test(unit) ? `${shown} ${unit}` : `${shown}${unit}`;
}

/** A highlighted series grays the others; a highlighted row dims the other rows. */
export function emphasisOf(block: ChartBlock, row: number, series: number): Emphasis {
  const highlight = block.highlight;
  if (!highlight) return 'normal';
  const names = seriesOf(block);
  if (block.series.includes(highlight)) return names[series] === highlight ? 'normal' : 'muted';
  return block.rows[row]?.label === highlight ? 'normal' : 'dim';
}

export function seriesColor(series: number): string {
  return `var(--series-${(series % 4) + 1})`;
}

/** A single series with a negative value diverges around zero: blue above, red below. */
export function isDiverging(block: ChartBlock): boolean {
  return seriesOf(block).length === 1 && numbersOf(block).some((row) => (row[0] ?? 0) < 0);
}

function colorFor(block: ChartBlock, row: number, series: number, value: number, diverging: boolean): string {
  if (emphasisOf(block, row, series) === 'muted') return 'var(--series-muted)';
  if (diverging) return value < 0 ? 'var(--diverge-neg)' : 'var(--diverge-pos)';
  return seriesColor(series);
}

/** Cuts `text` to `px` pixels of chart text, with an ellipsis. */
export function fit(text: string, px: number): string {
  const max = Math.max(1, Math.floor(px / CHAR_PX));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** A vertical bar from `base` to `end` (pixels), rounded at the data end only. */
export function columnPath(x: number, w: number, base: number, end: number): string {
  const h = Math.abs(base - end);
  const r = Math.min(RADIUS, w / 2, h);
  if (end <= base) {
    return `M${r2(x)},${r2(base)}V${r2(end + r)}Q${r2(x)},${r2(end)} ${r2(x + r)},${r2(end)}H${r2(x + w - r)}Q${r2(x + w)},${r2(end)} ${r2(x + w)},${r2(end + r)}V${r2(base)}Z`;
  }
  return `M${r2(x)},${r2(base)}V${r2(end - r)}Q${r2(x)},${r2(end)} ${r2(x + r)},${r2(end)}H${r2(x + w - r)}Q${r2(x + w)},${r2(end)} ${r2(x + w)},${r2(end - r)}V${r2(base)}Z`;
}

/** A horizontal bar from `base` to `end` (pixels), rounded at the data end only. */
export function rowPath(y: number, h: number, base: number, end: number): string {
  const w = Math.abs(end - base);
  const r = Math.min(RADIUS, h / 2, w);
  if (end >= base) {
    return `M${r2(base)},${r2(y)}H${r2(end - r)}Q${r2(end)},${r2(y)} ${r2(end)},${r2(y + r)}V${r2(y + h - r)}Q${r2(end)},${r2(y + h)} ${r2(end - r)},${r2(y + h)}H${r2(base)}Z`;
  }
  return `M${r2(base)},${r2(y)}H${r2(end + r)}Q${r2(end)},${r2(y)} ${r2(end)},${r2(y + r)}V${r2(y + h - r)}Q${r2(end)},${r2(y + h)} ${r2(end + r)},${r2(y + h)}H${r2(base)}Z`;
}

function tickList(ticks: Ticks, scale: (v: number) => number, unit: string | undefined): Tick[] {
  return ticks.values.map((value) => ({ value, text: withUnit(formatTick(value, ticks.step), unit), at: scale(value) }));
}

function allValues(block: ChartBlock): number[] {
  return numbersOf(block).flat();
}

/** Values are labelled on every bar when there are few, else only on the highlighted series. */
function labelsAll(block: ChartBlock): boolean {
  return block.rows.length * seriesOf(block).length <= 8;
}

function showsValue(block: ChartBlock, row: number, series: number): boolean {
  if (labelsAll(block)) return true;
  return block.highlight !== undefined && emphasisOf(block, row, series) === 'normal';
}

export function barsGeometry(block: ChartBlock, width: number): ChartGeometry {
  const names = seriesOf(block);
  const numbers = numbersOf(block);
  const ticks = barTicks(allValues(block));
  const unit = tickUnit(block.unit);
  const caption = block.unit && !unit ? block.unit : undefined;
  const tickTexts = ticks.values.map((v) => withUnit(formatTick(v, ticks.step), unit));
  const left = Math.max(...tickTexts.map((t) => t.length)) * CHAR_PX + 12;
  const top = (names.length > 1 ? 22 + LINE_PX * (names.length - 1) : 22) + (caption ? 8 : 0);
  const bottom = top + PLOT_HEIGHT;
  const right = Math.max(left + 40, width - 8);
  const y = linear([ticks.min, ticks.max], [bottom, top]);
  const zero = y(0);
  const band = (right - left) / Math.max(block.rows.length, 1);
  const barW = Math.max(2, Math.min(BAR_MAX, (band * 0.8 - BAR_GAP * (names.length - 1)) / names.length));
  const groupW = barW * names.length + BAR_GAP * (names.length - 1);
  // Neighbouring value labels wider than a bar would overlap: keep only the highlighted series' labels, or,
  // without a highlighted series, lift every other series' label by one line.
  const labelW = Math.max(...block.rows.flatMap((row) => row.values.map((v) => withUnit(v, block.unit).length))) * CHAR_PX;
  const crowded = names.length > 1 && labelW > barW + BAR_GAP;
  const seriesHighlight = block.highlight !== undefined && block.series.includes(block.highlight);
  const marks: Mark[] = [];
  const labels: AxisLabel[] = [];
  block.rows.forEach((row, r) => {
    const center = left + band * (r + 0.5);
    labels.push({ text: fit(row.label, band - 4), full: row.label, x: center, y: bottom + 18, anchor: 'middle' });
    names.forEach((_, s) => {
      const value = numbers[r]?.[s] ?? 0;
      const x = center - groupW / 2 + s * (barW + BAR_GAP);
      const end = y(value);
      const up = value >= 0;
      marks.push({
        row: r,
        series: s,
        value,
        text: withUnit(row.values[s] ?? '', block.unit),
        d: columnPath(x, barW, zero, end),
        x: x + barW / 2,
        y: end,
        labelX: x + barW / 2,
        labelY: up ? end - 6 : end + 15,
        anchor: 'middle',
        showValue: showsValue(block, r, s) && (!crowded || !seriesHighlight || emphasisOf(block, r, s) === 'normal'),
        grow: up ? 'grow-up' : 'grow-down',
        color: colorFor(block, r, s, value, false),
        emphasis: emphasisOf(block, r, s),
      });
    });
  });
  if (crowded && !seriesHighlight) {
    // Each label sits at least one line away from its left neighbour's, above it for bars going up.
    marks.forEach((mark, i) => {
      const before = marks[i - 1];
      if (!before || before.row !== mark.row || Math.abs(mark.labelY - before.labelY) >= LINE_PX) return;
      mark.labelY = mark.value >= 0 ? before.labelY - LINE_PX : before.labelY + LINE_PX;
    });
  }
  return { width, height: bottom + 30, left, right, top, bottom, ticks: tickList(ticks, y, unit), ...(caption ? { unitCaption: caption } : {}), zero, marks, labels };
}

export function hbarsGeometry(block: ChartBlock, width: number): ChartGeometry {
  const names = seriesOf(block);
  const numbers = numbersOf(block);
  const diverging = isDiverging(block);
  // About one tick per 70 px of plot, so tick labels never touch on a phone.
  const ticks = barTicks(allValues(block), Math.max(3, Math.min(5, Math.floor((width * 0.5) / 70))));
  const valueTexts = block.rows.flatMap((row) => row.values.map((v) => withUnit(v, block.unit)));
  const valueRoom = Math.max(...valueTexts.map((t) => t.length)) * CHAR_PX + 8;
  const labelRoom = Math.min(Math.max(...block.rows.map((row) => row.label.length)) * CHAR_PX + 10, Math.round(width * 0.4));
  const negatives = numbers.some((row) => row.some((v) => v < 0));
  const left = labelRoom + (negatives ? valueRoom : 0);
  const right = Math.max(left + 40, width - valueRoom);
  const top = 8;
  const thickness = Math.max(4, Math.min(BAR_MAX, (ROW_HEIGHT - 8 - BAR_GAP * (names.length - 1)) / names.length));
  const rowH = Math.max(ROW_HEIGHT, thickness * names.length + BAR_GAP * (names.length - 1) + 10);
  const bottom = top + rowH * block.rows.length;
  const x = linear([ticks.min, ticks.max], [left, right]);
  const zero = x(0);
  const marks: Mark[] = [];
  const labels: AxisLabel[] = [];
  const groupH = thickness * names.length + BAR_GAP * (names.length - 1);
  block.rows.forEach((row, r) => {
    const middle = top + rowH * (r + 0.5);
    labels.push({ text: fit(row.label, labelRoom - 10), full: row.label, x: labelRoom - 10, y: middle + 4, anchor: 'end' });
    names.forEach((_, s) => {
      const value = numbers[r]?.[s] ?? 0;
      const y = middle - groupH / 2 + s * (thickness + BAR_GAP);
      const end = x(value);
      const positive = value >= 0;
      marks.push({
        row: r,
        series: s,
        value,
        text: withUnit(row.values[s] ?? '', block.unit),
        d: rowPath(y, thickness, zero, end),
        x: end,
        y: y + thickness / 2,
        labelX: positive ? end + 6 : end - 6,
        labelY: y + thickness / 2 + 4,
        anchor: positive ? 'start' : 'end',
        showValue: true,
        grow: positive ? 'grow-right' : 'grow-left',
        color: colorFor(block, r, s, value, diverging),
        emphasis: emphasisOf(block, r, s),
      });
    });
  });
  return { width, height: bottom + 26, left, right, top, bottom, ticks: tickList(ticks, x, block.unit), zero, marks, labels };
}

export function lineGeometry(block: ChartBlock, width: number): ChartGeometry {
  const names = seriesOf(block);
  const numbers = numbersOf(block);
  const ticks = lineTicks(allValues(block));
  const unit = tickUnit(block.unit);
  const caption = block.unit && !unit ? block.unit : undefined;
  const tickTexts = ticks.values.map((v) => withUnit(formatTick(v, ticks.step), unit));
  const left = Math.max(...tickTexts.map((t) => t.length)) * CHAR_PX + 12;
  const endRoom = names.length > 1 ? Math.min(Math.max(...names.map((n) => n.length)) * CHAR_PX + 14, Math.round(width * 0.25)) : 0;
  const top = caption ? 30 : 14;
  const bottom = top + PLOT_HEIGHT;
  const right = Math.max(left + 40, width - 12 - endRoom);
  const y = linear([ticks.min, ticks.max], [bottom, top]);
  const count = block.rows.length;
  const xs = block.rows.map((_, i) => (count === 1 ? (left + right) / 2 : left + ((right - left) * i) / (count - 1)));
  const labelW = Math.max(...block.rows.map((row) => row.label.length)) * CHAR_PX + 10;
  const every = Math.max(1, Math.ceil((labelW * count) / Math.max(right - left, 1)));
  const labels: AxisLabel[] = [];
  block.rows.forEach((row, i) => {
    if (i % every !== 0) return;
    labels.push({ text: fit(row.label, labelW * every), full: row.label, x: xs[i] ?? 0, y: bottom + 18, anchor: 'middle' });
  });
  const marks: Mark[] = [];
  const lines: NonNullable<ChartGeometry['lines']> = names.map((name, s) => {
    const points = block.rows.map((row, r) => {
      const value = numbers[r]?.[s] ?? 0;
      const px = xs[r] ?? 0;
      const py = y(value);
      marks.push({
        row: r,
        series: s,
        value,
        text: withUnit(row.values[s] ?? '', block.unit),
        d: '',
        x: px,
        y: py,
        labelX: px,
        labelY: py - 9,
        anchor: 'middle',
        showValue: false,
        grow: 'grow-up',
        color: colorFor(block, r, s, value, false),
        emphasis: emphasisOf(block, r, s),
      });
      return `${r2(px)},${r2(py)}`;
    });
    const last = points.length - 1;
    const muted = emphasisOf(block, 0, s) === 'muted';
    return {
      series: s,
      d: `M${points.join('L')}`,
      color: muted ? 'var(--series-muted)' : seriesColor(s),
      emphasis: muted ? 'muted' : 'normal',
      ...(names.length > 1 ? { end: { x: (xs[last] ?? 0) + 8, y: y(numbers[last]?.[s] ?? 0) + 4, text: fit(name, endRoom - 8) } } : {}),
    };
  });
  // End labels go only when none of them would overlap another.
  const ends = lines.flatMap((line) => (line.end ? [line.end.y] : [])).sort((a, b) => a - b);
  if (ends.some((value, i) => i > 0 && value - (ends[i - 1] ?? 0) < END_LABEL_GAP)) for (const line of lines) delete line.end;
  return { width, height: bottom + 30, left, right, top, bottom, ticks: tickList(ticks, y, unit), ...(caption ? { unitCaption: caption } : {}), marks, labels, lines, xs };
}

export function chartGeometry(block: ChartBlock, width: number): ChartGeometry {
  if (block.chartType === 'hbars') return hbarsGeometry(block, width);
  if (block.chartType === 'line') return lineGeometry(block, width);
  return barsGeometry(block, width);
}

/** Index of the x position nearest to `px` (line crosshair). */
export function nearestIndex(xs: number[], px: number): number {
  let best = 0;
  xs.forEach((x, i) => {
    if (Math.abs(x - px) < Math.abs((xs[best] ?? 0) - px)) best = i;
  });
  return best;
}

/** Entrance delay of the nth mark: staggered, never more than 600 ms. */
export function entranceDelay(index: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(Math.min(600, (600 / (count - 1)) * index));
}
