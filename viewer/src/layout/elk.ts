// Scene layout with ELK (layered, left to right). Returns absolute coordinates for SVG.
import ELK, { type ElkExtendedEdge, type ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { ViewNode } from './levels';

export interface Point {
  x: number;
  y: number;
}

export interface LaidNode {
  node: ViewNode;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
}

export interface LaidEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  path: string;
  length: number;
  mid: Point;
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
}

const elk = new ELK();
const CHAR_WIDTH = 7.2;
const MAX_LINE = 26;
const PADDING = 20;

/** Splits a label into at most two lines at word boundaries. */
export function wrapLabel(label: string): string[] {
  if (label.length <= MAX_LINE) return [label];
  const words = label.split(' ');
  let first = '';
  while (words.length > 0 && (first + ' ' + words[0]).trim().length <= MAX_LINE) first = `${first} ${words.shift()}`.trim();
  if (!first) return [label.slice(0, MAX_LINE), label.slice(MAX_LINE)];
  return [first, words.join(' ')];
}

export async function layoutGraph(nodes: ViewNode[], edges: EdgeInput[]): Promise<Layout> {
  const sized = nodes.map((node) => {
    const lines = wrapLabel(node.label);
    const longest = Math.max(...lines.map((line) => line.length), node.kind.length + 2);
    const extra = node.role === 'group' ? 16 : 0;
    return { node, lines, width: Math.max(130, Math.round(longest * CHAR_WIDTH + PADDING * 2)), height: 34 + lines.length * 17 + extra };
  });
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '36',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.edgeNode': '24',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: sized.map((s) => ({ id: s.node.id, width: s.width, height: s.height })),
    edges: edges.map((e): ElkExtendedEdge => ({ id: e.id, sources: [e.from], targets: [e.to] })),
  };
  const result = await elk.layout(graph);

  const laidNodes = sized.map((s): LaidNode => {
    const child = result.children?.find((c) => c.id === s.node.id);
    return { node: s.node, lines: s.lines, x: child?.x ?? 0, y: child?.y ?? 0, width: s.width, height: s.height };
  });
  const laidEdges = edges.map((e): LaidEdge => {
    const section = result.edges?.find((r) => r.id === e.id)?.sections?.[0];
    const points: Point[] = section
      ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
      : straight(laidNodes, e.from, e.to);
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      ...(e.label ? { label: e.label } : {}),
      path: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
      length: polylineLength(points),
      mid: pointAt(points, polylineLength(points) / 2),
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
