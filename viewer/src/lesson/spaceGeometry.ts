// Geometry and arithmetic of a <space>: both axes on the same scale (so an angle on screen is the real angle between
// the two vectors), the cosine of the query with each item, which cluster the index sends the query to, the items it
// then compares, the ranking, and the parts Present reveals one by one. Pure, so the agent never computes.
import type { SpaceBlock } from '../../../server/src/scene.ts';

export const SPACE = { width: 720, height: 460, pad: 64 } as const;

/** At most this many items are compared one per part; the rest are compared together in one last part. */
export const COMPARE_ONE_BY_ONE = 7;

export type SpacePart =
  | { kind: 'points' }
  | { kind: 'query' }
  | { kind: 'index' }
  /** Items compared in this part, by index into `block.items`. */
  | { kind: 'compare'; items: number[] }
  | { kind: 'rank' };

export interface SpaceItemPlace {
  px: number;
  py: number;
  /** Index of its cluster, or -1. */
  group: number;
  score: number;
  scoreText: string;
  /** Compared with the query (in the cluster the query is sent to, or every item without an index). */
  candidate: boolean;
  /** 1-based place among the k results, or 0. */
  rank: number;
}

export interface SpaceModel {
  origin: { px: number; py: number };
  query: { px: number; py: number };
  clusters: { px: number; py: number; r: number }[];
  items: SpaceItemPlace[];
  /** Index of the cluster the query is sent to, or -1 without an index. */
  probed: number;
  candidates: number;
  /** Item indexes of the k results, best first. */
  ranking: number[];
  /** True when the scores are the system's own and not computed from the coordinates. */
  realScores: boolean;
  parts: SpacePart[];
}

type XY = [number, number];

const round = (value: number): number => Math.round(value * 100) / 100;

export function cosine([ax, ay]: XY, [bx, by]: XY): number {
  const norms = Math.hypot(ax, ay) * Math.hypot(bx, by);
  return norms === 0 ? 0 : (ax * bx + ay * by) / norms;
}

const xyOf = (point: { x: string; y: string }): XY => [Number(point.x), Number(point.y)];

/** The parts of a space's slide: the items, the query, the index's choice, the comparisons and the ranking. */
export function spaceParts(block: SpaceBlock, candidates: number[]): SpacePart[] {
  const parts: SpacePart[] = [{ kind: 'points' }, { kind: 'query' }];
  if (block.clusters.length > 0) parts.push({ kind: 'index' });
  const single = candidates.length > COMPARE_ONE_BY_ONE + 1 ? candidates.slice(0, COMPARE_ONE_BY_ONE) : candidates;
  for (const item of single) parts.push({ kind: 'compare', items: [item] });
  if (single.length < candidates.length) parts.push({ kind: 'compare', items: candidates.slice(single.length) });
  parts.push({ kind: 'rank' });
  return parts;
}

export function spaceModel(block: SpaceBlock): SpaceModel {
  const query = xyOf(block.query);
  const items = block.items.map(xyOf);
  const centroids = block.clusters.map(xyOf);
  const all: XY[] = [[0, 0], query, ...items, ...centroids];
  const xs = all.map(([x]) => x);
  const ys = all.map(([, y]) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // One scale for both axes: a 45° angle looks like one.
  const scale = Math.min((SPACE.width - 2 * SPACE.pad) / Math.max(maxX - minX, 1e-9), (SPACE.height - 2 * SPACE.pad) / Math.max(maxY - minY, 1e-9));
  const left = (SPACE.width - (maxX - minX) * scale) / 2;
  const top = (SPACE.height - (maxY - minY) * scale) / 2;
  const at = ([x, y]: XY): { px: number; py: number } => ({ px: round(left + (x - minX) * scale), py: round(top + (maxY - y) * scale) });

  const realScores = block.items.length > 0 && block.items.every((item) => item.score !== undefined);
  const scores = block.items.map((item, i) => (realScores ? Number(item.score) : cosine(query, items[i] ?? [0, 0])));
  const named = block.query.cluster === undefined ? -1 : block.clusters.findIndex((cluster) => cluster.id === block.query.cluster);
  // Without a cluster named by the system, the index sends the query to the centroid closest in direction.
  const probed =
    block.clusters.length === 0
      ? -1
      : named >= 0
        ? named
        : centroids.reduce((best, centroid, i) => (cosine(query, centroid) > cosine(query, centroids[best] ?? [0, 0]) ? i : best), 0);
  const groupOf = (i: number): number => block.clusters.findIndex((cluster) => cluster.id === block.items[i]?.cluster);
  const candidateIndexes = block.items.map((_, i) => i).filter((i) => probed < 0 || groupOf(i) === probed);
  const ranking = [...candidateIndexes].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0) || a - b).slice(0, block.k);

  const placed = items.map(at);
  const clusters = centroids.map((centroid, c) => {
    const center = at(centroid);
    const members = placed.filter((_, i) => groupOf(i) === c);
    const r = Math.max(34, ...members.map((point) => Math.hypot(point.px - center.px, point.py - center.py) + 22));
    return { ...center, r: round(r) };
  });

  return {
    origin: at([0, 0]),
    query: at(query),
    clusters,
    items: block.items.map((item, i) => ({
      ...(placed[i] ?? { px: 0, py: 0 }),
      group: groupOf(i),
      score: scores[i] ?? 0,
      scoreText: realScores ? (item.score ?? '') : (scores[i] ?? 0).toFixed(3),
      candidate: candidateIndexes.includes(i),
      rank: ranking.indexOf(i) + 1,
    })),
    probed,
    candidates: candidateIndexes.length,
    ranking,
    realScores,
    parts: spaceParts(block, candidateIndexes),
  };
}

/** Angle on screen, in radians, of the arrow from the origin to a point (screen y grows downwards). */
const screenAngle = (origin: { px: number; py: number }, point: { px: number; py: number }): number => Math.atan2(point.py - origin.py, point.px - origin.px);

/** The arc between the query's arrow and an item's arrow, at radius `r` from the origin, and where its label goes. */
export function angleArc(
  origin: { px: number; py: number },
  query: { px: number; py: number },
  item: { px: number; py: number },
  r: number,
): { path: string; label: { x: number; y: number }; degrees: number } {
  const a = screenAngle(origin, query);
  let b = screenAngle(origin, item);
  // The short way round.
  while (b - a > Math.PI) b -= 2 * Math.PI;
  while (a - b > Math.PI) b += 2 * Math.PI;
  const point = (angle: number, radius: number): [number, number] => [round(origin.px + radius * Math.cos(angle)), round(origin.py + radius * Math.sin(angle))];
  const [x1, y1] = point(a, r);
  const [x2, y2] = point(b, r);
  const sweep = b > a ? 1 : 0;
  // A wide angle has room for its label inside; a narrow one gets it just past the item's arrow, clear of both lines.
  const wide = Math.abs(b - a) > (32 * Math.PI) / 180;
  const radius = wide ? r * 0.62 : r + 12;
  const angle = wide ? (a + b) / 2 : b + Math.sign(b - a || 1) * Math.asin(Math.min(1, 30 / radius));
  const [lx, ly] = point(angle, radius);
  return { path: `M${x1} ${y1} A${r} ${r} 0 0 ${sweep} ${x2} ${y2}`, label: { x: lx, y: ly }, degrees: Math.round((Math.abs(b - a) * 180) / Math.PI) };
}
