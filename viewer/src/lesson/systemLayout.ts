// Where the parts of a <system> sit (F26): the factors on a ring, each link a curved arrow between their boxes (two
// links between the same factors bend to opposite sides), its sign at its middle, and each loop's badge inside the
// loop, pulled toward the ring's center, at the place nearby its badge and sentence cross the fewest links, signs,
// factors and other badges. Coordinates are the SVG's own.
import type { SystemBlock } from '../../../server/src/scene.ts';

export const FACTOR = { w: 156, h: 62 } as const;
const GAP = 7;
const BADGE = 22;

export interface Point {
  x: number;
  y: number;
}

export interface SystemGeometry {
  width: number;
  height: number;
  factors: Map<string, Point>;
  links: { path: string; mid: Point }[];
  loops: Point[];
}

/** Where a ray from `center` toward `toward` leaves a box of the factor's size, a little outside it. */
function boxExit(center: Point, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = Math.min((FACTOR.w / 2 + GAP) / Math.max(Math.abs(dx), 1e-6), (FACTOR.h / 2 + GAP) / Math.max(Math.abs(dy), 1e-6));
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/**
 * The order of the factors round the ring: the longest loop in its own order, so its links run between neighbours, then
 * every other factor next to the one it shares most links with (in declaration order when it shares none).
 */
export function ringOrder(block: Pick<SystemBlock, 'factors' | 'links' | 'loops'>): string[] {
  const longest = [...block.loops].sort((a, b) => b.through.length - a.through.length)[0];
  const order = [...(longest?.through ?? [])];
  const rest = block.factors.map((factor) => factor.id).filter((id) => !order.includes(id));
  const shared = (a: string, b: string): number => block.links.filter((link) => (link.from === a && link.to === b) || (link.from === b && link.to === a)).length;
  for (const id of rest) {
    let best = -1;
    let most = 0;
    order.forEach((other, i) => {
      const count = shared(id, other);
      if (count > most) {
        most = count;
        best = i;
      }
    });
    if (best < 0) order.push(id);
    else order.splice(best + 1, 0, id);
  }
  return order;
}

export function systemGeometry(block: Pick<SystemBlock, 'factors' | 'links' | 'loops'>): SystemGeometry {
  const count = block.factors.length;
  const width = 780;
  const height = count <= 4 ? 420 : count <= 8 ? 500 : 580;
  const center = { x: width / 2, y: height / 2 };
  const rx = width / 2 - FACTOR.w / 2 - 24;
  const ry = height / 2 - FACTOR.h / 2 - 20;
  // Two factors face each other left and right; more go round from the top, clockwise.
  const start = count === 2 ? Math.PI : -Math.PI / 2;
  const factors = new Map<string, Point>();
  ringOrder(block).forEach((id, i) => {
    const angle = start + (2 * Math.PI * i) / Math.max(count, 1);
    factors.set(id, { x: Math.round(center.x + rx * Math.cos(angle)), y: Math.round(center.y + ry * Math.sin(angle)) });
  });

  const links = block.links.map((link) => {
    const a = factors.get(link.from) ?? center;
    const b = factors.get(link.to) ?? center;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // A quarter turn of the direction: a link and its reverse bend to opposite sides.
    const bend = 0.16 * length;
    const control = { x: (a.x + b.x) / 2 - ((b.y - a.y) / length) * bend, y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * bend };
    const from = boxExit(a, control);
    const to = boxExit(b, control);
    const mid = { x: 0.25 * from.x + 0.5 * control.x + 0.25 * to.x, y: 0.25 * from.y + 0.5 * control.y + 0.25 * to.y };
    const f = (n: number): string => n.toFixed(1);
    return { path: `M${f(from.x)} ${f(from.y)} Q${f(control.x)} ${f(control.y)} ${f(to.x)} ${f(to.y)}`, mid };
  });

  // Every link as points along its curve, to keep the loops' badges and sentences off them (F36).
  const curves = block.links.map((link) => {
    const [, ax, ay, cx, cy, bx, by] = (/M([-\d.]+) ([-\d.]+) Q([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)/.exec(links[block.links.indexOf(link)]?.path ?? '') ?? []).map(Number);
    return Array.from({ length: 21 }, (_, i): Point => {
      const t = i / 20;
      const u = 1 - t;
      return { x: u * u * (ax ?? 0) + 2 * u * t * (cx ?? 0) + t * t * (bx ?? 0), y: u * u * (ay ?? 0) + 2 * u * t * (cy ?? 0) + t * t * (by ?? 0) };
    });
  });
  /** The badge and the sentence under it, centered on `p`. */
  const area = (p: Point, label: boolean): { x0: number; y0: number; x1: number; y1: number } => ({ x0: p.x - 78, y0: p.y - BADGE, x1: p.x + 78, y1: p.y + (label ? 70 : BADGE) });
  const inside = (q: Point, a: { x0: number; y0: number; x1: number; y1: number }): boolean => q.x > a.x0 && q.x < a.x1 && q.y > a.y0 && q.y < a.y1;
  const loops: Point[] = [];
  const taken: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const loop of block.loops) {
    const members = loop.through.map((id) => factors.get(id) ?? center);
    const centroid = { x: members.reduce((sum, p) => sum + p.x, 0) / members.length, y: members.reduce((sum, p) => sum + p.y, 0) / members.length };
    // A loop of two lies on the chord between its factors, under its own links: pull it further in.
    const pull = members.length <= 2 ? 0.55 : 0.3;
    const preferred = { x: centroid.x + (center.x - centroid.x) * pull, y: centroid.y + (center.y - centroid.y) * pull };
    const label = Boolean(loop.label);
    let best = preferred;
    let least = Infinity;
    for (const dy of [0, -0.5, 0.5, -1, 1, -1.5, 1.5]) {
      for (const dx of [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2]) {
        const spot = {
          x: Math.min(width - 80, Math.max(80, preferred.x + dx * 90)),
          y: Math.min(height - (label ? 72 : BADGE * 2), Math.max(BADGE, preferred.y + dy * 60)),
        };
        const box = area(spot, label);
        const cost =
          curves.reduce((sum, points) => sum + points.filter((q) => inside(q, box)).length, 0) +
          links.filter((link) => inside(link.mid, { x0: box.x0 - 12, y0: box.y0 - 12, x1: box.x1 + 12, y1: box.y1 + 12 })).length * 8 +
          [...factors.values()].filter((f) => f.x + FACTOR.w / 2 > box.x0 && f.x - FACTOR.w / 2 < box.x1 && f.y + FACTOR.h / 2 > box.y0 && f.y - FACTOR.h / 2 < box.y1).length * 20 +
          taken.filter((t) => t.x1 > box.x0 && t.x0 < box.x1 && t.y1 > box.y0 && t.y0 < box.y1).length * 20 +
          Math.hypot(spot.x - preferred.x, spot.y - preferred.y) / 25;
        if (cost < least) [best, least] = [spot, cost];
      }
    }
    loops.push(best);
    taken.push(area(best, label));
  }
  return { width, height, factors, links, loops };
}
