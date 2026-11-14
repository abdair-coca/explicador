// Decoration as flat line art. Every drawing sits on a 12 × 8 grid (the canvas is 360 × 240): positions and sizes
// are whole or half cells, so shapes line up with each other. Each theme has three drawings, in two tones (the
// theme's accent, and a second tone for the one thing each drawing points at) with flat fills. A seeded random source
// varies the details, so every slide gets its own version and the same slide always looks the same. Pure: no DOM.
import type { ThemeName } from '../../../server/src/scene.ts';

/** Columns, rows and the size of a cell. */
export const GRID = { cols: 12, rows: 8, unit: 30 } as const;
export const CANVAS = { width: GRID.cols * GRID.unit, height: GRID.rows * GRID.unit } as const;
/** Drawings per theme. */
export const VARIANTS = 3;

interface Look {
  /** The second tone. */
  tone?: 'b';
  /** `soft` keeps the outline and adds a faint fill; `solid` is a filled shape without an outline. */
  fill?: 'soft' | 'solid';
}

export type Shape = ({ kind: 'path'; d: string } | { kind: 'dot'; x: number; y: number; r: number } | { kind: 'box'; x: number; y: number; w: number; h: number; r: number }) & Look;

export type Random = () => number;

/** A small deterministic generator (mulberry32) seeded from any text. */
export function seeded(text: string): Random {
  let state = 2166136261;
  for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const U = GRID.unit;
/** Grid units to canvas units. */
const g = (cells: number): number => Math.round(cells * U * 10) / 10;
/** A whole number from `low` to `high`, both included. */
const int = (random: Random, low: number, high: number): number => low + Math.floor(random() * (high - low + 1));
const pick = <T,>(random: Random, items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
const B: Look = { tone: 'b' };
const SOFT: Look = { fill: 'soft' };
const SOLID: Look = { fill: 'solid' };

type Cell = [number, number];

/** A polyline through grid points; `close` joins the last to the first. */
const line = (points: Cell[], look: Look = {}, close = false): Shape => ({
  kind: 'path',
  d: points.map(([c, r], i) => `${i === 0 ? 'M' : 'L'}${g(c)} ${g(r)}`).join(' ') + (close ? ' Z' : ''),
  ...look,
});
const box = (c: number, r: number, w: number, h: number, look: Look = {}, radius = 0.2): Shape => ({ kind: 'box', x: g(c), y: g(r), w: g(w), h: g(h), r: g(radius), ...look });
const dot = (c: number, r: number, radius: number, look: Look = {}): Shape => ({ kind: 'dot', x: g(c), y: g(r), r: g(radius), ...look });
/** An arc of a circle centered on a grid point, between two angles in degrees (0° points right, clockwise). */
const arc = (c: number, r: number, radius: number, from: number, to: number, look: Look = {}): Shape => {
  const at = (angle: number): string => `${g(c + radius * Math.cos((angle * Math.PI) / 180))} ${g(r + radius * Math.sin((angle * Math.PI) / 180))}`;
  return { kind: 'path', d: `M${at(from)} A${g(radius)} ${g(radius)} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 1 : 0} ${at(to)}`, ...look };
};
const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

type Motif = (random: Random) => Shape[];

// ── data ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const dataBars: Motif = (random) => {
  const tallest = int(random, 0, 5);
  return [
    ...[1, 3, 5].map((r) => line([[1, r], [11, r]])),
    line([[1, 7], [11, 7]]),
    ...range(6).map((i) => {
      const height = i === tallest ? 6 : int(random, 1, 5);
      return box(1.5 + i * 1.5, 7 - height, 1, height, i === tallest ? { ...B, ...SOFT } : SOFT, 0.15);
    }),
  ];
};
const dataTable: Motif = (random) => [
  box(1, 1, 10, 6, {}, 0.3),
  box(1, 1, 10, 1.2, SOLID, 0.3),
  ...range(3).map((i) => line([[1, 3.4 + i * 1.2], [11, 3.4 + i * 1.2]])),
  line([[1, 2.2], [11, 2.2]]),
  line([[4, 1], [4, 7]]),
  line([[7.5, 1], [7.5, 7]]),
  ...range(3).map((i) => box(pick(random, [1.3, 4.3, 7.8]), 2.5 + i * 1.2 + (i === 2 ? 1.2 : 0), 2.4, 0.6, i === 1 ? { ...B, ...SOLID } : SOLID, 0.3)),
];
const dataArea: Motif = (random) => {
  let level = int(random, 4, 6);
  const points: Cell[] = range(7).map((i) => {
    level = Math.min(6.5, Math.max(1.5, level + pick(random, [-1.5, -1, -0.5, 0.5])));
    return [1.5 + i * 1.5, level];
  });
  const peak = points.reduce((best, point) => (point[1] < best[1] ? point : best), points[0] as Cell);
  return [
    line([[1, 0.5], [1, 7], [11.5, 7]]),
    line([[1.5, 7], ...points, [10.5, 7]], SOLID, true),
    line(points),
    ...points.map(([c, r]) => dot(c, r, 0.18, SOLID)),
    dot(peak[0], peak[1], 0.35, { ...B, ...SOFT }),
  ];
};

// ── ml ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const mlNetwork: Motif = (random) => {
  const counts = [3, int(random, 3, 4), 4, 2];
  const layers = counts.map((count, layer) => range(count).map((i): Cell => [1.5 + layer * 3, 4 + (i - (count - 1) / 2) * 1.6]));
  return [
    ...layers.slice(0, -1).flatMap((layer, i) => layer.flatMap((from) => (layers[i + 1] ?? []).filter(() => random() < 0.75).map((to) => line([from, to])))),
    ...layers.flatMap((layer, i) => layer.map(([c, r]) => dot(c, r, 0.4, i === layers.length - 1 ? { ...B, ...SOFT } : SOFT))),
  ];
};
const mlTree: Motif = (random) => {
  const levels: Cell[][] = [[[6, 1]], [[3, 3.6], [9, 3.6]], [[1.5, 6.4], [4.5, 6.4], [7.5, 6.4], [10.5, 6.4]]];
  const chosen = int(random, 0, 3);
  return [
    ...(levels[1] ?? []).map((child) => line([levels[0]?.[0] as Cell, child])),
    ...(levels[2] ?? []).map(([c, r], i) => line([levels[1]?.[Math.floor(i / 2)] as Cell, [c, r - 0.5]])),
    ...[...(levels[0] ?? []), ...(levels[1] ?? [])].map(([c, r]) => dot(c, r, 0.5, SOFT)),
    ...(levels[2] ?? []).map(([c, r], i) => box(c - 0.9, r - 0.5, 1.8, 1, i === chosen ? { ...B, ...SOFT } : {}, 0.25)),
  ];
};
const mlSeparate: Motif = (random) => {
  const cluster = (c: number, r: number): Cell[] => range(6).map((): Cell => [c + int(random, -3, 3) * 0.5, r + int(random, -2, 2) * 0.5]);
  return [
    line([[1, 0.5], [1, 7], [11.5, 7]]),
    ...cluster(3.8, 5).map(([c, r]) => dot(c, r, 0.22, SOLID)),
    ...cluster(8.6, 2.4).map(([c, r]) => box(c - 0.2, r - 0.2, 0.4, 0.4, { ...B, ...SOLID }, 0.05)),
    line([[3.5, 1], [9.5, 6.5]]),
  ];
};

// ── math ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const mathCurve: Motif = (random) => {
  const shift = pick(random, [5, 6, 7]);
  const steep = pick(random, [0.9, 1.2, 1.6]);
  const y = (c: number): number => 7 - 5.5 / (1 + Math.exp(-steep * (c - shift)));
  return [
    line([[1, 0.5], [1, 7], [11.5, 7]]),
    ...range(5).map((i) => line([[3 + i * 2, 6.8], [3 + i * 2, 7.2]])),
    ...range(3).map((i) => line([[0.8, 1.5 + i * 2], [1.2, 1.5 + i * 2]])),
    line(range(41).map((i): Cell => [1 + i * 0.25, y(1 + i * 0.25)])),
    line([[shift, 7], [shift, y(shift)], [1, y(shift)]]),
    dot(shift, y(shift), 0.3, { ...B, ...SOFT }),
  ];
};
const mathCircle: Motif = (random) => {
  const angle = -pick(random, [30, 45, 60]);
  const x = 6 + 3 * Math.cos((angle * Math.PI) / 180);
  const y = 4 + 3 * Math.sin((angle * Math.PI) / 180);
  return [
    line([[2, 4], [10, 4]]),
    line([[6, 0.5], [6, 7.5]]),
    arc(6, 4, 3, 0, 359.9),
    line([[6, 4], [x, y], [x, 4]], SOLID, true),
    line([[6, 4], [x, y], [x, 4]]),
    arc(6, 4, 0.9, 0, angle),
    dot(x, y, 0.28, { ...B, ...SOLID }),
  ];
};
const mathBell: Motif = (random) => {
  const mean = pick(random, [5, 6, 7]);
  const y = (c: number): number => 7 - 5.6 * Math.exp(-0.5 * ((c - mean) / 1.5) ** 2);
  const curve = (from: number, to: number): Cell[] => range(Math.round((to - from) * 4) + 1).map((i): Cell => [from + i * 0.25, y(from + i * 0.25)]);
  return [
    line([[0.5, 7], [11.5, 7]]),
    line([[mean - 1.5, 7], ...curve(mean - 1.5, mean + 1.5), [mean + 1.5, 7]], SOLID, true),
    line(curve(0.5, 11.5)),
    ...[-3, -1.5, 1.5, 3].map((offset) => line([[mean + offset, 6.8], [mean + offset, 7.3]])),
    line([[mean, 7], [mean, y(mean)]], B),
    dot(mean, y(mean), 0.25, { ...B, ...SOLID }),
  ];
};

// ── text ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const textTokens: Motif = (random) => {
  const shapes: Shape[] = [];
  const marked = int(random, 0, 4);
  range(5).forEach((row) => {
    let cursor = 1 + (row % 2) * 0.5;
    let first = true;
    while (cursor < 9.5) {
      const width = int(random, 2, 5) * 0.5;
      shapes.push(box(cursor, 1 + row * 1.3, width, 0.7, first && row === marked ? { ...B, ...SOFT } : random() < 0.3 ? SOFT : {}, 0.35));
      cursor += width + 0.5;
      first = false;
    }
  });
  return shapes;
};
const textPage: Motif = (random) => {
  const marked = int(random, 1, 4);
  return [
    line([[3, 0.5], [8, 0.5], [9, 1.5], [9, 7.5], [3, 7.5]], SOFT, true),
    line([[8, 0.5], [8, 1.5], [9, 1.5]]),
    box(3.6, 1.3 + marked - 0.25, pick(random, [3, 3.5, 4]), 0.5, { ...B, ...SOLID }, 0.1),
    ...range(6).map((i) => line([[3.8, 1.3 + i], [i === 5 ? 6 : pick(random, [7, 7.5, 8.2]), 1.3 + i]])),
  ];
};
const textBubbles: Motif = (random) => {
  const widths = (): number[] => [pick(random, [3.5, 4.5, 5]), pick(random, [2.5, 3, 4])];
  const [a1 = 4, a2 = 3] = widths();
  const [b1 = 4, b2 = 3] = widths();
  return [
    box(1, 0.8, 6.5, 2.6, SOFT, 0.5),
    line([[2, 3.4], [2, 4.2], [3, 3.4]]),
    line([[1.8, 1.7], [1.8 + a1, 1.7]]),
    line([[1.8, 2.5], [1.8 + a2, 2.5]]),
    box(4.5, 4.4, 6.5, 2.6, { ...B, ...SOFT }, 0.5),
    line([[10, 7], [10, 7.7], [9, 7]], B),
    line([[5.3, 5.3], [5.3 + b1, 5.3]], B),
    line([[5.3, 6.1], [5.3 + b2, 6.1]], B),
  ];
};

// ── web ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const webBrowser: Motif = (random) => {
  const split = pick(random, [3.5, 4, 4.5]);
  const hero = int(random, 0, 2);
  return [
    box(1, 0.8, 10, 6.4, {}, 0.4),
    line([[1, 2], [11, 2]]),
    ...range(3).map((i) => dot(1.7 + i * 0.6, 1.4, 0.15, i === 0 ? { ...B, ...SOLID } : SOLID)),
    box(3.8, 1.15, 5, 0.5, {}, 0.25),
    box(1.5, 2.5, split - 2, 4.2, SOFT),
    ...range(3).map((i) => box(split, 2.5 + i * 1.45, pick(random, [4.5, 5.5, 6.5]) - (split - 3.5), 1.2, i === hero ? { ...B, ...SOFT } : {})),
  ];
};
const webDevices: Motif = (random) => [
  box(1, 1, 7, 4.5, {}, 0.3),
  line([[3.5, 5.5], [3, 7], [6, 7], [5.5, 5.5]]),
  box(1.5, 1.5, 6, 1, SOFT, 0.15),
  ...range(2).map((i) => box(1.5 + i * 3.1, 2.9, 2.9, 2.1, {}, 0.15)),
  box(8.8, 2.4, 2.2, 4.6, { ...B, ...SOFT }, 0.4),
  line([[9.5, 6.5], [10.3, 6.5]], B),
  ...range(3).map((i) => line([[9.2, 3.2 + i * 0.8], [pick(random, [10, 10.3, 10.6]), 3.2 + i * 0.8]], B)),
];
const webWireframe: Motif = (random) => {
  const chosen = int(random, 0, 3);
  return [
    box(1, 1, 10, 1, SOLID),
    box(1, 2.4, 2.5, 4.6, SOFT),
    ...range(3).map((i) => line([[1.4, 3.2 + i * 0.9], [3, 3.2 + i * 0.9]])),
    ...range(4).map((i) => box(4 + (i % 2) * 3.6, 2.4 + Math.floor(i / 2) * 2.4, 3.4, 2.2, i === chosen ? { ...B, ...SOFT } : {})),
  ];
};

// ── network ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const networkMesh: Motif = (random) => {
  const spots = range(40).map((i): Cell => [1.5 + (i % 8) * 1.3, 1 + Math.floor(i / 8) * 1.5]);
  const nodes: Cell[] = [];
  while (nodes.length < 10) {
    const spot = pick(random, spots);
    if (!nodes.includes(spot)) nodes.push(spot);
  }
  const shapes: Shape[] = [];
  const linked = new Set<string>();
  nodes.forEach((node, i) => {
    const nearest = nodes
      .map((other, j): [number, number] => [j, Math.hypot(other[0] - node[0], other[1] - node[1])])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2);
    for (const [j] of nearest) {
      // Each link is drawn once, whichever end finds it.
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (linked.has(key)) continue;
      linked.add(key);
      shapes.push(line([node, nodes[j] as Cell]));
    }
  });
  return [...shapes, ...nodes.map(([c, r], i) => dot(c, r, i === 0 ? 0.45 : 0.25, i === 0 ? { ...B, ...SOFT } : i % 3 === 0 ? SOFT : SOLID))];
};
const networkHub: Motif = (random) => {
  const spokes = pick(random, [6, 8]);
  const chosen = int(random, 0, spokes - 1);
  const end = (i: number, radius: number): Cell => [6 + radius * Math.cos((i * 2 * Math.PI) / spokes), 4 + radius * Math.sin((i * 2 * Math.PI) / spokes)];
  return [
    arc(6, 4, 3, 0, 359.9),
    arc(6, 4, 1.7, 0, 359.9),
    ...range(spokes).map((i) => line([end(i, 0.7), end(i, 3)])),
    ...range(spokes).map((i) => dot(end(i, 3)[0], end(i, 3)[1], 0.3, i === chosen ? { ...B, ...SOLID } : SOFT)),
    dot(6, 4, 0.7, SOFT),
  ];
};
const networkServers: Motif = (random) => {
  const busy = int(random, 0, 2);
  return [
    box(1, 2.8, 2.6, 2.4, SOFT, 0.3),
    line([[1.6, 3.6], [3, 3.6]]),
    line([[1.6, 4.4], [2.6, 4.4]]),
    ...range(3).flatMap((i) => [
      box(8.4, 1 + i * 2.2, 2.6, 1.6, i === busy ? { ...B, ...SOFT } : {}, 0.25),
      dot(9, 1.8 + i * 2.2, 0.15, i === busy ? { ...B, ...SOLID } : SOLID),
      line([[9.5, 1.8 + i * 2.2], [10.5, 1.8 + i * 2.2]], i === busy ? B : {}),
      line([[3.6, 4], [6, 4], [6, 1.8 + i * 2.2], [8.4, 1.8 + i * 2.2]]),
    ]),
    box(4.5, 3.8, 0.4, 0.4, { ...B, ...SOLID }, 0.05),
    box(6.9, 1.6 + busy * 2.2, 0.4, 0.4, { ...B, ...SOLID }, 0.05),
  ];
};

// ── database ────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A cylinder standing on a grid row. */
const cylinder = (c: number, top: number, w: number, bottom: number, look: Look = {}): Shape[] => {
  const ry = 0.4;
  const tone: Look = look.tone ? { tone: look.tone } : {};
  const ellipse = (r: number, sweep: number): string => `A${g(w / 2)} ${g(ry)} 0 0 ${sweep} ${g(c + w)} ${g(r)}`;
  return [
    { kind: 'path', d: `M${g(c)} ${g(top)} ${ellipse(top, 1)} L${g(c + w)} ${g(bottom)} A${g(w / 2)} ${g(ry)} 0 0 1 ${g(c)} ${g(bottom)} Z`, ...look },
    // Only the body is filled; the near rim and the bands are lines.
    { kind: 'path', d: `M${g(c)} ${g(top)} ${ellipse(top, 0)}`, ...tone },
    ...range(2).map((i): Shape => ({ kind: 'path', d: `M${g(c)} ${g(top + ((bottom - top) * (i + 1)) / 3)} ${ellipse(top + ((bottom - top) * (i + 1)) / 3, 0)}`, ...tone })),
  ];
};
const databaseStores: Motif = (random) => {
  const main = int(random, 0, 1);
  return [
    ...cylinder(1, pick(random, [1.5, 2, 2.5]), 2.6, 6.8, main === 0 ? { ...B, ...SOFT } : SOFT),
    ...cylinder(4.2, pick(random, [3, 3.5]), 2.6, 6.8, main === 1 ? { ...B, ...SOFT } : SOFT),
    box(7.8, 1.5, 3.4, 0.8, SOLID, 0.15),
    ...range(4).map((i) => box(7.8, 2.6 + i * 1.05, 3.4, 0.8, {}, 0.15)),
  ];
};
const databaseRelation: Motif = (random) => {
  const row = int(random, 0, 2);
  return [
    box(1, 1, 4, 5.2, {}, 0.3),
    box(1, 1, 4, 1.1, SOLID, 0.3),
    ...range(3).map((i) => line([[1.5, 2.9 + i * 1.1], [pick(random, [3.5, 4, 4.5]), 2.9 + i * 1.1]])),
    box(7, 2.6, 4, 4.4, {}, 0.3),
    box(7, 2.6, 4, 1.1, SOLID, 0.3),
    ...range(2).map((i) => line([[7.5, 4.5 + i * 1.1], [pick(random, [9.5, 10, 10.5]), 4.5 + i * 1.1]])),
    line([[5, 2.9 + row * 1.1], [6, 2.9 + row * 1.1], [6, 4.5], [7, 4.5]], B),
    dot(5, 2.9 + row * 1.1, 0.2, { ...B, ...SOLID }),
    dot(7, 4.5, 0.2, { ...B, ...SOLID }),
  ];
};
const databaseIndex: Motif = (random) => {
  const leaf = int(random, 0, 2);
  const cell = int(random, 0, 2);
  return [
    box(4.5, 0.8, 3, 1.2, SOFT, 0.2),
    line([[5.5, 0.8], [5.5, 2]]),
    line([[6.5, 0.8], [6.5, 2]]),
    ...range(3).flatMap((i) => [
      line([[5 + i, 2], [2.3 + i * 3.7, 4.6]]),
      box(0.8 + i * 3.7, 4.6, 3, 1.2, {}, 0.2),
      line([[1.8 + i * 3.7, 4.6], [1.8 + i * 3.7, 5.8]]),
      line([[2.8 + i * 3.7, 4.6], [2.8 + i * 3.7, 5.8]]),
    ]),
    box(0.8 + leaf * 3.7 + cell, 4.6, 1, 1.2, { ...B, ...SOLID }, 0.1),
    line([[2.3, 5.8], [2.3, 6.8], [9.7, 6.8], [9.7, 5.8]]),
  ];
};

// ── security ────────────────────────────────────────────────────────────────────────────────────────────────────────
const securityShield: Motif = (random) => {
  const start = pick(random, [20, 110, 200, 290]);
  const outline = `M${g(6)} ${g(1)} L${g(8.4)} ${g(1.9)} L${g(8.4)} ${g(4.2)} Q${g(8.2)} ${g(6.2)} ${g(6)} ${g(7)} Q${g(3.8)} ${g(6.2)} ${g(3.6)} ${g(4.2)} L${g(3.6)} ${g(1.9)} Z`;
  return [
    arc(6, 4, 3.8, start, start + 110),
    arc(6, 4, 3.8, start + 180, start + 250),
    { kind: 'path', d: outline, ...SOFT },
    line([[4.9, 4], [5.7, 4.9], [7.2, 3.1]], B),
  ];
};
const securityLock: Motif = (random) => {
  const corners: [number, number, number, number][] = [[1.5, 1, 1, 1], [10.5, 1, -1, 1], [1.5, 7, 1, -1], [10.5, 7, -1, -1]];
  const lit = int(random, 0, 3);
  return [
    box(4, 3.4, 4, 3.6, SOFT, 0.5),
    { kind: 'path', d: `M${g(4.8)} ${g(3.4)} L${g(4.8)} ${g(2.4)} A${g(1.2)} ${g(1.2)} 0 0 1 ${g(7.2)} ${g(2.4)} L${g(7.2)} ${g(3.4)}` },
    dot(6, 4.8, 0.4, { ...B, ...SOLID }),
    line([[6, 5], [6, 6]], B),
    ...corners.map(([c, r, dx, dy], i) => line([[c, r + dy], [c, r], [c + dx, r]], i === lit ? B : {})),
  ];
};
const securityCells: Motif = (random) => {
  const hex = (c: number, r: number, look: Look): Shape => line(range(6).map((i): Cell => [c + 1.1 * Math.cos((i * Math.PI) / 3), r + 1.1 * Math.sin((i * Math.PI) / 3)]), look, true);
  const around: Cell[] = range(6).map((i): Cell => [6 + 1.95 * Math.cos(((i + 0.5) * Math.PI) / 3), 4 + 1.95 * Math.sin(((i + 0.5) * Math.PI) / 3)]);
  const soft = int(random, 0, 5);
  return [...around.map(([c, r], i) => hex(c, r, i === soft || i === (soft + 3) % 6 ? SOFT : {})), hex(6, 4, { ...B, ...SOFT }), line([[5.4, 4], [5.85, 4.5], [6.65, 3.5]], B)];
};

// ── code ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const codeLines: Motif = (random) => {
  const shapes: Shape[] = [];
  const marked = int(random, 1, 5);
  let indent = 0;
  range(7).forEach((row) => {
    indent = Math.max(0, Math.min(3, indent + pick(random, [-1, 0, 1, 1])));
    let cursor = 1 + indent;
    range(int(random, 1, 3)).forEach((token) => {
      if (cursor > 9) return;
      const width = int(random, 2, 5) * 0.5;
      shapes.push(box(cursor, 0.8 + row, width, 0.4, row === marked && token === 0 ? { ...B, ...SOLID } : token === 0 ? SOLID : {}, 0.2));
      cursor += width + 0.4;
    });
  });
  return [line([[0.6, 0.6], [0.6, 7.6]]), ...shapes];
};
const codeBranches: Motif = (random) => {
  const leave = pick(random, [2.5, 3.5]);
  const join = pick(random, [8, 9]);
  const commits = [1.5, 5, 6.5, 10.5];
  return [
    line([[1, 5.5], [11, 5.5]]),
    line([[leave, 5.5], [leave + 1.5, 2.5], [join - 1.5, 2.5], [join, 5.5]], B),
    ...commits.map((c) => dot(c, 5.5, 0.3, SOFT)),
    dot(leave, 5.5, 0.3, SOFT),
    dot(join, 5.5, 0.4, SOLID),
    ...range(2).map((i) => dot(leave + 2.2 + i * ((join - leave - 4.4) || 1), 2.5, 0.3, { ...B, ...SOFT })),
  ];
};
const codeTerminal: Motif = (random) => {
  const widths = range(4).map(() => pick(random, [2, 3, 4, 5]));
  return [
    box(1, 0.8, 10, 6.4, SOFT, 0.4),
    line([[1, 2], [11, 2]]),
    ...range(3).map((i) => dot(1.7 + i * 0.6, 1.4, 0.15, SOLID)),
    ...widths.flatMap((width, i) => [line([[1.7, 2.6 + i * 1.05], [2.1, 2.9 + i * 1.05], [1.7, 3.2 + i * 1.05]]), line([[2.7, 2.9 + i * 1.05], [2.7 + width, 2.9 + i * 1.05]])]),
    box(2.7 + (widths[3] ?? 2) + 0.3, 5.75, 0.45, 0.65, { ...B, ...SOLID }, 0.05),
  ];
};

// ── hardware ────────────────────────────────────────────────────────────────────────────────────────────────────────
const hardwareChip: Motif = (random) => {
  const shapes: Shape[] = [box(4.5, 2.5, 3, 3, SOFT, 0.3), box(5.25, 3.25, 1.5, 1.5, { ...B, ...SOLID }, 0.15)];
  const sides: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  sides.forEach(([dx, dy]) => {
    range(3).forEach((pin) => {
      const offset = (pin - 1) * 0.9;
      const start: Cell = [6 + dx * 1.5 + (dx === 0 ? offset : 0), 4 + dy * 1.5 + (dy === 0 ? offset : 0)];
      const reach = dx === 0 ? pick(random, [0.5, 1, 1.5]) : pick(random, [1, 2, 3]);
      // The outer pins bend away from the middle one, so traces fan out and never meet.
      const bend = (pin - 1) * 0.5;
      const mid: Cell = [start[0] + dx * reach * 0.5, start[1] + dy * reach * 0.5];
      const turn: Cell = [mid[0] + (dx === 0 ? bend : 0), mid[1] + (dy === 0 ? bend : 0)];
      const end: Cell = [turn[0] + dx * reach * 0.5, turn[1] + dy * reach * 0.5];
      shapes.push(line([start, mid, turn, end]), dot(end[0], end[1], 0.15, SOLID));
    });
  });
  return shapes;
};
const hardwareSignals: Motif = (random) => {
  const square = (row: number, bits: number[], look: Look): Shape => {
    const points: Cell[] = [[1, row + (bits[0] ? 0 : 1)]];
    bits.forEach((bit, i) => {
      const level = row + (bit ? 0 : 1);
      points.push([1 + i, level], [2 + i, level]);
    });
    return line(points, look);
  };
  const period = pick(random, [6, 8, 10]);
  return [
    // The window being read, across the three signals.
    box(pick(random, [2, 4, 6, 8]), 0.6, 2, 6.8, SOFT, 0.2),
    square(1, range(10).map((i) => i % 2), {}),
    square(3.2, range(10).map(() => int(random, 0, 1)), B),
    line(range(41).map((i): Cell => [1 + i * 0.25, 6.4 + 0.7 * Math.sin((i * Math.PI) / period)])),
  ];
};
const hardwareBoard: Motif = (random) => {
  const part = int(random, 0, 2);
  return [
    box(1, 1, 10, 6, {}, 0.4),
    ...([[1.6, 1.6], [10.4, 1.6], [1.6, 6.4], [10.4, 6.4]] as Cell[]).map(([c, r]) => dot(c, r, 0.2)),
    box(4.5, 2.8, 3, 2.4, SOFT, 0.2),
    ...range(4).flatMap((i) => [line([[5 + i * 0.67, 2.8], [5 + i * 0.67, 2.2]]), line([[5 + i * 0.67, 5.2], [5 + i * 0.67, 5.8]])]),
    ...range(3).map((i) => box(2, 2.4 + i * 1.3, 1.4, 0.6, i === part ? { ...B, ...SOLID } : {}, 0.1)),
    ...range(2).map((i) => dot(9.2, 2.8 + i * 2.2, 0.55, SOFT)),
    line([[3.4, 2.7], [4, 2.7], [4, 3.4], [4.5, 3.4]]),
    line([[3.4, 5.3], [4, 5.3], [4, 4.6], [4.5, 4.6]]),
    line([[7.5, 4], [8.2, 4], [8.2, 2.8], [8.65, 2.8]]),
  ];
};

// ── business ────────────────────────────────────────────────────────────────────────────────────────────────────────
const businessGrowth: Motif = (random) => {
  let level = 1;
  const heights = range(6).map(() => (level = Math.min(5.5, level + pick(random, [0, 0.5, 1, 1]))));
  const points: Cell[] = heights.map((height, i): Cell => [1.5 + i * 1.2, 6.4 - height]);
  const last = points.at(-1) as Cell;
  return [
    line([[0.8, 7], [8.2, 7]]),
    ...heights.map((height, i) => box(1 + i * 1.2, 7 - height, 1, height, SOFT, 0.15)),
    line(points, B),
    line([[last[0] - 0.6, last[1]], last, [last[0], last[1] + 0.6]], B),
    arc(10, 2.5, 1.4, 0, 359.9),
    { kind: 'path', d: `M${g(10)} ${g(2.5)} L${g(10)} ${g(1.1)} A${g(1.4)} ${g(1.4)} 0 0 1 ${g(11.4)} ${g(2.5)} Z`, ...B, ...SOLID },
  ];
};
const businessFunnel: Motif = (random) => {
  const kept = int(random, 2, 3);
  return range(4).flatMap((i): Shape[] => {
    const top = 4.5 - i * 1;
    const bottom = 4.5 - (i + 1) * 1;
    return [
      line([[6 - top, 0.8 + i * 1.6], [6 + top, 0.8 + i * 1.6], [6 + bottom, 2.2 + i * 1.6], [6 - bottom, 2.2 + i * 1.6]], i === kept ? { ...B, ...SOFT } : i % 2 === 0 ? SOFT : {}, true),
    ];
  });
};
const businessBoard: Motif = (random) => {
  const column = int(random, 0, 2);
  return range(3).flatMap((i): Shape[] => [
    box(1 + i * 3.5, 1, 3, 6, {}, 0.3),
    box(1.4 + i * 3.5, 1.4, 1.4, 0.4, SOLID, 0.2),
    ...range(int(random, 1, 3)).map((card) => box(1.4 + i * 3.5, 2.3 + card * 1.4, 2.2, 1.1, i === column && card === 0 ? { ...B, ...SOFT } : SOFT, 0.15)),
  ]);
};

// ── everyday subjects (F36) ─────────────────────────────────────────────────────────────────────────────────────────
type Command = [string, ...number[]];
/** A path from commands in grid units; an `A` keeps its rotation and flags as they are. */
const path = (commands: Command[], look: Look = {}): Shape => ({
  kind: 'path',
  d: commands
    .map(([op, ...n]) => `${op}${(op === 'A' ? [g(n[0] ?? 0), g(n[1] ?? 0), n[2], n[3], n[4], g(n[5] ?? 0), g(n[6] ?? 0)] : n.map(g)).join(' ')}`)
    .join(' '),
  ...look,
});
/** A whole ellipse around a grid point, its long axis turned by `turn` degrees. */
const ellipse = (c: number, r: number, rx: number, ry: number, turn: number, look: Look = {}): Shape => {
  const cos = Math.cos((turn * Math.PI) / 180);
  const sin = Math.sin((turn * Math.PI) / 180);
  return path([['M', c - rx * cos, r - rx * sin], ['A', rx, ry, turn, 1, 0, c + rx * cos, r + rx * sin], ['A', rx, ry, turn, 1, 0, c - rx * cos, r - rx * sin]], look);
};
/** The point at `angle` degrees on that ellipse. */
const onEllipse = (c: number, r: number, rx: number, ry: number, turn: number, angle: number): Cell => {
  const t = (angle * Math.PI) / 180;
  const a = (turn * Math.PI) / 180;
  const x = rx * Math.cos(t);
  const y = ry * Math.sin(t);
  return [c + x * Math.cos(a) - y * Math.sin(a), r + x * Math.sin(a) + y * Math.cos(a)];
};
/** A wisp of steam rising from a grid point. */
const steam = (c: number, r: number, look: Look = {}): Shape => path([['M', c, r], ['Q', c - 0.4, r - 0.5, c, r - 1], ['Q', c + 0.4, r - 1.5, c, r - 2]], look);

// ── nature ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const natureLandscape: Motif = (random) => {
  const left = 2.5 + random();
  const right = 2 + random();
  const sun = int(random, 8, 10);
  return [
    dot(sun, 1.8, 0.9, { ...B, ...SOFT }),
    line([[0.5, 7], [3.5, left], [6, 5], [8.5, right], [11.5, 7]], SOFT, true),
    line([[0.5, 7], [11.5, 7]]),
    line([[10.5, 7], [10.5, 6.2]]),
    dot(10.5, 5.7, 0.55, SOFT),
    ...range(int(random, 1, 2)).map((i) => line([[5 + i * 1.2, 1.5 + i * 0.4], [5.3 + i * 1.2, 1.8 + i * 0.4], [5.6 + i * 1.2, 1.5 + i * 0.4]])),
  ];
};
const natureLeaf: Motif = (random) => {
  const veins = int(random, 3, 5);
  return [
    path([['M', 2, 6.5], ['Q', 2, 1.5, 10.5, 1.2], ['Q', 10, 6.5, 2, 6.5], ['Z']], SOFT),
    line([[2, 6.5], [10.5, 1.2]]),
    line([[2, 6.5], [1, 7.5]]),
    ...range(veins).map((i) => {
      const t = (i + 1) / (veins + 1);
      const c = 2 + 8.5 * t;
      const r = 6.5 - 5.3 * t;
      return i % 2 === 0 ? line([[c, r], [c - 0.6, r - 1.3]]) : line([[c, r], [c + 1.2, r + 0.6]]);
    }),
    dot(4 + random() * 4, 4.6 - random(), 0.35, { ...B, ...SOFT }),
  ];
};
const natureForest: Motif = (random) => {
  const count = int(random, 4, 5);
  const chosen = int(random, 0, count - 1);
  return [
    line([[0.5, 7], [11.5, 7]]),
    ...range(count).flatMap((i): Shape[] => {
      const c = 1.5 + i * (9 / (count - 1));
      const top = 1.5 + random() * 2;
      const look = i === chosen ? { ...B, ...SOFT } : SOFT;
      return [line([[c, 7], [c, 5.5]]), i % 2 === 0 ? line([[c - 1, 5.5], [c, top], [c + 1, 5.5]], look, true) : dot(c, 4.5 - random(), 1, look)];
    }),
  ];
};

// ── space ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const spaceOrbits: Motif = (random) => {
  const chosen = int(random, 0, 2);
  return [
    dot(6, 4, 0.8, SOLID),
    ...[2, 3.5, 5].flatMap((rx, i): Shape[] => {
      const [c, r] = onEllipse(6, 4, rx, rx * 0.6, -12, int(random, 0, 359));
      return [ellipse(6, 4, rx, rx * 0.6, -12), dot(c, r, 0.35, i === chosen ? { ...B, ...SOFT } : SOLID)];
    }),
  ];
};
const spaceRinged: Motif = (random) => [
  dot(5.5, 4, 1.8, SOFT),
  ellipse(5.5, 4, 3.4, 0.9, -15),
  dot(9.8, 1.6, 0.6, { ...B, ...SOFT }),
  ...range(int(random, 5, 7)).map(() => {
    const [c, r] = pick(random, [[1, 1], [2.5, 0.8], [1, 6.5], [3, 7.2], [9, 6.5], [11, 4.5], [10.8, 7], [8, 0.8], [11.2, 2.8]] as Cell[]);
    return dot(c + random() * 0.5, r, 0.12, SOLID);
  }),
];
const spaceConstellation: Motif = (random) => {
  const places: Cell[] = [[1.5, 5], [3.5, 3], [5.5, 4], [7.5, 2], [9, 4.5], [10.5, 6.5]];
  const stars = places.map(([c, r]): Cell => [c + random() - 0.5, r + random() - 0.5]);
  const bright = int(random, 0, stars.length - 1);
  return [
    line(stars),
    ...stars.map(([c, r], i) => dot(c, r, i === bright ? 0.35 : 0.2, i === bright ? { ...B, ...SOLID } : SOLID)),
    path([['M', 10.5, 0.7], ['A', 0.9, 0.9, 0, 1, 0, 10.5, 2.5], ['A', 0.7, 0.7, 0, 1, 1, 10.5, 0.7], ['Z']], SOFT),
  ];
};

// ── science ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const scienceAtom: Motif = (random) => {
  const turn = int(random, 0, 59);
  return [
    ...[0, 60, 120].flatMap((angle): Shape[] => {
      const [c, r] = onEllipse(6, 4, 3.6, 1.2, turn + angle, int(random, 0, 359));
      return [ellipse(6, 4, 3.6, 1.2, turn + angle), dot(c, r, 0.25, SOLID)];
    }),
    dot(6, 4, 0.6, { ...B, ...SOFT }),
  ];
};
const scienceFlask: Motif = (random) => {
  const level = 5 + random();
  const width = ((level - 3.5) / 3.5) * 2.5;
  return [
    line([[5, 1], [5, 3.5], [2.5, 7], [9.5, 7], [7, 3.5], [7, 1]]),
    line([[4.5, 1], [7.5, 1]]),
    line([[5 - width, level], [7 + width, level], [9.5, 7], [2.5, 7]], SOFT, true),
    ...range(int(random, 2, 4)).map((i) => dot(4.5 + i * 1.1 + random() * 0.3, level + 0.5 + random() * 0.7, 0.18, SOLID)),
    dot(6, 2.6 - random() * 0.8, 0.3, { ...B, ...SOFT }),
  ];
};
const sciencePrism: Motif = (random) => {
  const rays = int(random, 3, 4);
  const chosen = int(random, 0, rays - 1);
  return [
    line([[0.5, 3 + random()], [5, 4.5]]),
    line([[4, 6.5], [6, 2.5], [8, 6.5]], SOFT, true),
    line([[5, 4.5], [7, 4.8]]),
    ...range(rays).map((i) => line([[7, 4.8], [11.5, 3 + i * (3.5 / (rays - 1))]], i === chosen ? B : {})),
  ];
};

// ── history ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const historyTemple: Motif = (random) => {
  const count = int(random, 4, 6);
  const chosen = int(random, 0, count - 1);
  return [
    line([[1.5, 2.5], [6, 0.8], [10.5, 2.5]], SOFT, true),
    box(1.5, 2.5, 9, 0.6, {}, 0.1),
    ...range(count).map((i) => box(2 + i * (7.5 / (count - 1)), 3.1, 0.5, 3.5, i === chosen ? { ...B, ...SOFT } : SOFT, 0.1)),
    box(1, 6.6, 10, 0.4, {}, 0.1),
    box(0.5, 7, 11, 0.5, SOLID, 0.1),
  ];
};
const historyScroll: Motif = (random) => [
  box(2.5, 1.5, 7, 5, SOFT, 0),
  box(1.8, 1, 8.4, 0.8, SOLID, 0.4),
  box(1.8, 6.2, 8.4, 0.8, SOLID, 0.4),
  ...range(int(random, 3, 5)).map((i) => line([[3.2, 2.5 + i * 0.75], [3.2 + 3 + random() * 2.5, 2.5 + i * 0.75]])),
  dot(8.3, 5.4, 0.45, { ...B, ...SOFT }),
];
const historyTimeline: Motif = (random) => {
  const chosen = int(random, 0, 4);
  return [
    line([[0.5, 4], [11.5, 4]]),
    ...range(5).flatMap((i): Shape[] => {
      const c = 1.5 + i * 2.2 + random() * 0.4;
      const up = i % 2 === 0;
      const look = i === chosen ? { ...B, ...SOFT } : SOFT;
      return [dot(c, 4, 0.25, SOLID), line([[c, 4], [c, up ? 2.6 : 5.4]]), box(c - 0.8, up ? 1.4 : 5.4, 1.6, 1.2, look, 0.2)];
    }),
  ];
};

// ── health ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const healthPulse: Motif = (random) => {
  const beat = 3.5 + random() * 2.5;
  return [
    box(1, 0.8, 10, 6, {}, 0.4),
    line([[1.5, 4.5], [beat - 1, 4.5], [beat - 0.5, 3.9], [beat, 5.1], [beat + 0.4, 1.8], [beat + 0.8, 5.5], [beat + 1.2, 4.5], [beat + 2.2, 4.5], [beat + 2.6, 3.9], [beat + 3, 4.5], [10.5, 4.5]]),
    path([['M', 9.3, 2.7], ['Q', 8.4, 2, 8.6, 1.6], ['Q', 8.9, 1.2, 9.3, 1.7], ['Q', 9.7, 1.2, 10, 1.6], ['Q', 10.2, 2, 9.3, 2.7], ['Z']], { ...B, ...SOFT }),
    box(5, 6.8, 2, 0.4, SOLID, 0.1),
    line([[4, 7.5], [8, 7.5]]),
  ];
};
const healthKit: Motif = (random) => [
  dot(3.8, 4, 2.6, SOFT),
  box(3.15, 2.3, 1.3, 3.4, SOLID, 0.15),
  box(2.1, 3.35, 3.4, 1.3, SOLID, 0.15),
  box(7.2, 3.4, 4, 1.2, {}, 0.6),
  box(9.2, 3.4, 2, 1.2, { ...B, ...SOLID }, 0.6),
  ...range(int(random, 2, 3)).map((i) => dot(7.5 + i * 1.3, 6.3 + random() * 0.6, 0.15, SOLID)),
];
const healthCell: Motif = (random) => [
  dot(6, 4, 3.4, SOFT),
  dot(6 + random() - 0.5, 4 + random() - 0.5, 1.1, { ...B, ...SOFT }),
  ...range(int(random, 3, 5)).map((i) => {
    const [c, r] = onEllipse(6, 4, 2.4, 2.4, 0, i * 80 + int(random, 0, 40));
    return i % 2 === 0 ? dot(c, r, 0.25, SOLID) : ellipse(c, r, 0.6, 0.25, int(random, 0, 179), SOLID);
  }),
];

// ── food ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const foodPot: Motif = (random) => {
  const chosen = int(random, 0, 2);
  return [
    box(3, 3.5, 6, 3.2, SOFT, 0.4),
    line([[2.6, 3.5], [9.4, 3.5]]),
    dot(6, 3.1, 0.25, SOLID),
    line([[2.2, 4.1], [3, 4.1]]),
    line([[9, 4.1], [9.8, 4.1]]),
    ...range(3).map((i) => steam(4.6 + i * 1.4, 2.5, i === chosen ? B : {})),
    box(2.5, 7, 7, 0.4, SOLID, 0.1),
  ];
};
const foodPlate: Motif = (random) => [
  dot(6.5, 4, 3, SOFT),
  dot(6.5, 4, 2),
  line([[1.5, 1.5], [1.5, 6.8]]),
  ...[1, 1.5, 2].map((c) => line([[c, 1.2], [c, 2.6]])),
  line([[11, 1.2], [11, 6.8]]),
  path([['M', 11, 1.2], ['Q', 10.2, 2.6, 11, 4]], SOLID),
  dot(6.5 + random() - 0.5, 3.6, 0.8, { ...B, ...SOFT }),
  ...range(int(random, 2, 3)).map((i) => dot(5.5 + i * 0.9, 4.9 + random() * 0.3, 0.3, SOLID)),
];
const foodCup: Motif = (random) => {
  const chosen = int(random, 0, 1);
  return [
    line([[3.5, 3], [4, 6.5], [8, 6.5], [8.5, 3]], SOFT, true),
    arc(8.5, 4.6, 0.9, -80, 80),
    box(2.5, 6.8, 7, 0.4, SOLID, 0.2),
    ...range(2).map((i) => steam(5.3 + i * 1.4 + random() * 0.3, 2.5, i === chosen ? B : {})),
    dot(10.5, 6.4, 0.3, SOLID),
  ];
};

// ── art ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const artPalette: Motif = (random) => {
  const chosen = int(random, 0, 4);
  return [
    ellipse(5.2, 4, 4, 3, -10, SOFT),
    dot(3.8, 5.3, 0.5),
    ...range(5).map((i) => {
      const [c, r] = onEllipse(5.2, 4, 2.8, 1.9, -10, 160 + i * 45);
      return dot(c, r, 0.45, i === chosen ? { ...B, ...SOLID } : SOLID);
    }),
    line([[9, 7], [11.3, 1.3 + random()]]),
  ];
};
const artMusic: Motif = (random) => {
  const notes = range(int(random, 4, 6)).map((i): Cell => [2 + i * 1.6, 2 + int(random, 0, 8) * 0.35]);
  const chosen = int(random, 0, notes.length - 1);
  return [
    ...range(5).map((i) => line([[0.8, 2 + i * 0.7], [11.2, 2 + i * 0.7]])),
    ...notes.flatMap(([c, r], i): Shape[] => [ellipse(c, r, 0.4, 0.28, -20, i === chosen ? { ...B, ...SOLID } : SOLID), line([[c + 0.38, r - 0.1], [c + 0.38, r - 1.9]])]),
  ];
};
const artFrame: Motif = (random) => [
  box(1.5, 0.6, 9, 6.4, {}, 0.1),
  box(2.2, 1.3, 7.6, 5, SOFT, 0),
  line([[2.2, 6.3], [4.5, 3.5 + random()], [6.2, 5], [7.8, 3 + random()], [9.8, 6.3]]),
  dot(4 + random() * 4, 2.4, 0.5, { ...B, ...SOFT }),
  line([[3, 7], [2.4, 7.7]]),
  line([[9, 7], [9.6, 7.7]]),
];

// ── society ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const societyScales: Motif = (random) => {
  const tilt = (random() - 0.5) * 1.2;
  const chosen = int(random, 0, 1);
  return [
    line([[6, 1.2], [6, 6.8]]),
    box(4.5, 6.8, 3, 0.5, SOLID, 0.2),
    dot(6, 1.2, 0.3, SOLID),
    line([[2.5, 2 + tilt], [9.5, 2 - tilt]]),
    ...[2.5, 9.5].flatMap((c, i): Shape[] => {
      const r = 4.2 + (i === 0 ? tilt : -tilt);
      return [line([[c - 1.2, r], [c, 2 + (i === 0 ? tilt : -tilt)], [c + 1.2, r]]), arc(c, r, 1.2, 0, 180, i === chosen ? { ...B, ...SOFT } : SOFT)];
    }),
  ];
};
const societyCity: Motif = (random) => {
  const count = int(random, 5, 6);
  const chosen = int(random, 0, count - 1);
  const width = 10 / count;
  return [
    line([[0.5, 7.2], [11.5, 7.2]]),
    ...range(count).flatMap((i): Shape[] => {
      const height = 2 + random() * 4;
      const c = 1 + i * width;
      return [
        box(c, 7.2 - height, width - 0.3, height, i === chosen ? { ...B, ...SOFT } : SOFT, 0.1),
        ...range(Math.floor(height / 1.2)).map((w) => box(c + 0.3, 7.2 - height + 0.4 + w * 1.2, width - 0.9, 0.4, SOLID, 0.05)),
      ];
    }),
  ];
};
const societyPeople: Motif = (random) => {
  const count = int(random, 4, 5);
  const chosen = int(random, 0, count - 1);
  return [
    ...range(count).flatMap((i): Shape[] => {
      const c = 1.6 + i * (8.8 / (count - 1));
      const r = 4 + (i % 2 === 0 ? 0 : 0.5);
      const look = i === chosen ? { ...B, ...SOFT } : SOFT;
      return [dot(c, r, 0.5, look), arc(c, r + 2.3, 1, 180, 360, look)];
    }),
    box(4.5, 0.6, 3, 1.4, {}, 0.4),
    line([[5.6, 2], [5.4, 2.6], [6.1, 2]]),
  ];
};

const motifs: Record<ThemeName, readonly Motif[]> = {
  plain: [],
  data: [dataBars, dataTable, dataArea],
  ml: [mlNetwork, mlTree, mlSeparate],
  math: [mathCurve, mathCircle, mathBell],
  text: [textTokens, textPage, textBubbles],
  web: [webBrowser, webDevices, webWireframe],
  network: [networkMesh, networkHub, networkServers],
  database: [databaseStores, databaseRelation, databaseIndex],
  security: [securityShield, securityLock, securityCells],
  code: [codeLines, codeBranches, codeTerminal],
  hardware: [hardwareChip, hardwareSignals, hardwareBoard],
  business: [businessGrowth, businessFunnel, businessBoard],
  nature: [natureLandscape, natureLeaf, natureForest],
  space: [spaceOrbits, spaceRinged, spaceConstellation],
  science: [scienceAtom, scienceFlask, sciencePrism],
  history: [historyTemple, historyScroll, historyTimeline],
  health: [healthPulse, healthKit, healthCell],
  food: [foodPot, foodPlate, foodCup],
  art: [artPalette, artMusic, artFrame],
  society: [societyScales, societyCity, societyPeople],
};

/** One of the theme's drawings (`variant` wraps around), with its details set by `seed`. The plain theme draws nothing. */
export function motif(theme: ThemeName, seed: string, variant = 0): Shape[] {
  const drawings = motifs[theme];
  if (drawings.length === 0) return [];
  const index = ((variant % drawings.length) + drawings.length) % drawings.length;
  return drawings[index]?.(seeded(`${theme}:${index}:${seed}`)) ?? [];
}
