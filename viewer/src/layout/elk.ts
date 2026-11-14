// Scene layout with ELK (layered, left to right). Boxes are sized from their measured text, and
// edge labels get their own room in the layout so they never sit on a box.
import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LinkKind } from '../../../server/src/scene.ts';
import type { ViewNode } from './levels';
import { t } from '../i18n';

export interface Point {
  x: number;
  y: number;
}

export interface LaidNode {
  node: ViewNode;
  x: number;
  y: number;
  /** Size of the box itself; the hard shadow sits below it. */
  width: number;
  height: number;
  lines: string[];
  descLines: string[];
}

export interface LaidEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Absent for a call. */
  kind?: LinkKind;
  path: string;
  length: number;
  mid: Point;
  /** Center of the room ELK kept for the label, when the edge has one. */
  labelAt?: Point;
}

export interface Layout {
  width: number;
  height: number;
  nodes: LaidNode[];
  edges: LaidEdge[];
}

export interface EdgeInput {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: LinkKind;
  /** Label text to keep room for without drawing it (flow steps show their label only when active). */
  reserve?: string;
}

/** Fonts of the diagram, as canvas font strings; the CSS in index.css draws with the same ones. */
export const fonts = {
  label: '800 15px Nunito',
  desc: '600 13px Nunito',
  caption: '800 12px Nunito',
  edge: '800 13px Nunito',
  field: '700 13px Nunito',
  type: '400 12px ui-monospace, monospace',
} as const;

/** Box geometry shared with the renderer (Diagram.tsx). */
export const BOX = {
  padX: 16,
  padY: 14,
  chip: 26,
  gap: 8,
  labelLine: 20,
  descGap: 4,
  descLine: 18,
  hint: 22,
  shadow: 4,
  stack: 6,
  maxText: 200,
  minText: 128,
} as const;
export const ENTITY = { row: 24 } as const;
export const STATE = { padX: 22, padY: 12 } as const;
export const EDGE_LABEL = { padX: 9, height: 24 } as const;

const elk = new ELK();
let context: CanvasRenderingContext2D | null | undefined;

/** Width of `text` drawn in `font`; estimated from the font size where there is no canvas (tests). */
export function textWidth(text: string, font: string): number {
  if (context === undefined) context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!context) return text.length * Number(/(\d+)px/.exec(font)?.[1] ?? 14) * 0.56;
  context.font = font;
  return context.measureText(text).width;
}

/** Splits text into lines no wider than `max`, at most `maxLines`; the last one ends in "…" if text was cut. */
export function wrapText(text: string, font: string, max: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || textWidth(next, font) <= max) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? '';
  while (last.length > 1 && textWidth(`${last}…`, font) > max) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

/** The small uppercase line next to the kind chip. */
export function caption(node: ViewNode): string {
  return (node.role === 'group' ? `${t(node.kind)} · ${t('group')}` : t(node.kind)).toUpperCase();
}

export function boxHeight(labelLines: number, descLines: number, group: boolean): number {
  return (
    BOX.padY * 2 +
    BOX.chip +
    BOX.gap +
    labelLines * BOX.labelLine +
    (descLines > 0 ? BOX.descGap + descLines * BOX.descLine : 0) +
    (group ? BOX.hint : 0)
  );
}

/** Height of an entity's header: title row, then its description lines. */
export function entityHeader(descLines: number): number {
  return descLines > 0 ? 48 + descLines * BOX.descLine : 44;
}

export function edgeLabelWidth(label: string): number {
  return Math.ceil(textWidth(label, fonts.edge) + EDGE_LABEL.padX * 2);
}

interface Sized {
  node: ViewNode;
  lines: string[];
  descLines: string[];
  width: number;
  height: number;
}

function widest(lines: string[], font: string): number {
  return Math.max(0, ...lines.map((line) => textWidth(line, font)));
}

function size(node: ViewNode): Sized {
  if (node.shape === 'start') return { node, lines: [], descLines: [], width: 20, height: 20 };
  const desc = node.desc && node.role !== 'context' ? node.desc : undefined;
  if (node.shape === 'entity') {
    const descLines = desc ? wrapText(desc, fonts.desc, BOX.maxText + 40, 2) : [];
    const fields = node.fields ?? [];
    const rows = fields.map(
      (f) => (f.key ? 34 : 0) + textWidth(f.name, fonts.field) + (f.type ? 16 + textWidth(f.type, fonts.type) : 0),
    );
    const content = Math.max(BOX.chip + 10 + textWidth(node.label, fonts.label), widest(descLines, fonts.desc), ...rows);
    return {
      node,
      lines: [node.label],
      descLines,
      width: Math.ceil(Math.max(180, content + BOX.padX * 2)),
      height: entityHeader(descLines.length) + fields.length * ENTITY.row + 8,
    };
  }
  if (node.shape === 'state') {
    const lines = wrapText(node.label, fonts.label, BOX.maxText, 2);
    const descLines = desc ? wrapText(desc, fonts.desc, BOX.maxText, 2) : [];
    const content = Math.max(widest(lines, fonts.label), widest(descLines, fonts.desc));
    const text = lines.length * BOX.labelLine + (descLines.length > 0 ? BOX.descGap + descLines.length * BOX.descLine : 0);
    return {
      node,
      lines,
      descLines,
      width: Math.ceil(Math.max(120, content + STATE.padX * 2)),
      height: Math.max(48, text + STATE.padY * 2),
    };
  }
  const lines = wrapText(node.label, fonts.label, BOX.maxText, 3);
  const descLines = desc ? wrapText(desc, fonts.desc, BOX.maxText, 3) : [];
  const head = BOX.chip + 8 + textWidth(caption(node), fonts.caption) + caption(node).length * 0.8 + (node.drill ? 22 : 0);
  const content = Math.max(BOX.minText, head, widest(lines, fonts.label), widest(descLines, fonts.desc));
  return {
    node,
    lines,
    descLines,
    width: Math.ceil(content + BOX.padX * 2),
    height: boxHeight(lines.length, descLines.length, node.role === 'group'),
  };
}

/** Room a node takes in the layout: the box plus its shadow (and the stacked card behind a group). */
function footprint(s: Sized): { width: number; height: number } {
  if (s.node.shape === 'start') return { width: s.width, height: s.height };
  const stack = s.node.role === 'group' ? BOX.stack : 0;
  return { width: s.width + stack, height: s.height + BOX.shadow + stack };
}

async function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.load(fonts.label);
  } catch {
    // Fall back to whatever font is available; sizes are then approximate.
  }
}

/** Widest layout that fits the viewer's content column (about 1200 px) at the minimum scale; wider ones wrap into rows. */
const WRAP_ABOVE = 1400;

export async function layoutGraph(nodes: ViewNode[], edges: EdgeInput[]): Promise<Layout> {
  await fontsReady();
  const sized = nodes.map(size);
  const graph = elkGraph(sized, edges);
  let result = await elk.layout(graph);
  // A long chain gets too wide to read without scrolling: cut it into rows, if that really is narrower.
  if ((result.width ?? 0) > WRAP_ABOVE) {
    try {
      const wrapped = await elk.layout({
        ...graph,
        layoutOptions: { ...graph.layoutOptions, 'elk.layered.wrapping.strategy': 'MULTI_EDGE', 'elk.aspectRatio': '2' },
      });
      if ((wrapped.width ?? Infinity) < (result.width ?? 0)) result = wrapped;
    } catch {
      // Keep the unwrapped layout; the diagram scrolls sideways instead.
    }
  }
  return toLayout(result, sized, edges);
}

/** Whether ELK lays an edge out reversed: an answer back. */
const backward = (e: EdgeInput): boolean => e.kind === 'return';

function elkGraph(sized: Sized[], edges: EdgeInput[]): ElkNode {
  const nodes = sized.map((s) => s.node);
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '64',
      'elk.spacing.edgeNode': '24',
      'elk.spacing.edgeLabel': '6',
      'elk.layered.spacing.edgeNodeBetweenLayers': '24',
      'elk.edgeLabels.placement': 'CENTER',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.padding': '[top=24,left=24,bottom=28,right=24]',
      // State machines are full of cycles: break them by declaration order so the start dot and the
      // initial state stay on the left. Other views keep ELK's default, which draws them better.
      ...(nodes.some((n) => n.shape === 'start') ? { 'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER' } : {}),
    },
    children: sized.map((s) => ({
      id: s.node.id,
      ...footprint(s),
      // The start dot of a state machine always sits in the first layer.
      ...(s.node.shape === 'start' ? { layoutOptions: { 'elk.layered.layering.layerConstraint': 'FIRST' } } : {}),
    })),
    edges: edges.map((e): ElkExtendedEdge => {
      const text = e.label ?? e.reserve;
      return {
        id: e.id,
        // An answer goes back the way the call came: laid out as the call's direction, it closes no cycle, so the
        // one who calls stays on the left (F36: the phone that sends a photo, not the router that answers).
        sources: [backward(e) ? e.to : e.from],
        targets: [backward(e) ? e.from : e.to],
        ...(text ? { labels: [{ id: `${e.id}:label`, text, width: edgeLabelWidth(text), height: EDGE_LABEL.height }] } : {}),
      };
    }),
  };
}

function toLayout(result: ElkNode, sized: Sized[], edges: EdgeInput[]): Layout {
  const laidNodes = sized.map((s): LaidNode => {
    const child = result.children?.find((c) => c.id === s.node.id);
    return { ...s, x: child?.x ?? 0, y: child?.y ?? 0 };
  });
  const laidEdges = edges.map((e): LaidEdge => {
    const laid = result.edges?.find((r) => r.id === e.id);
    const section = laid?.sections?.[0];
    const routed: Point[] | undefined = section ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint] : undefined;
    const points: Point[] = routed ? (backward(e) ? routed.reverse() : routed) : straight(laidNodes, e.from, e.to);
    const label = laid?.labels?.[0];
    const length = polylineLength(points);
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      ...(e.label ? { label: e.label } : {}),
      ...(e.kind && e.kind !== 'call' ? { kind: e.kind } : {}),
      path: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
      length,
      mid: pointAt(points, length / 2),
      ...(label?.x !== undefined && label.y !== undefined
        ? { labelAt: { x: label.x + (label.width ?? 0) / 2, y: label.y + (label.height ?? 0) / 2 } }
        : {}),
    };
  });
  return { width: result.width ?? 0, height: result.height ?? 0, nodes: laidNodes, edges: laidEdges };
}

function straight(nodes: LaidNode[], from: string, to: string): Point[] {
  const center = (id: string): Point => {
    const n = nodes.find((node) => node.node.id === id);
    return n ? { x: n.x + n.width / 2, y: n.y + n.height / 2 } : { x: 0, y: 0 };
  };
  return [center(from), center(to)];
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

function pointAt(points: Point[], distance: number): Point {
  let left = distance;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= segment && segment > 0) {
      const t = left / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= segment;
  }
  return points.at(-1) ?? { x: 0, y: 0 };
}
