// Decoration as flat line art. Each theme draws its motif inside a box from a seeded random source, so every scene
// gets its own arrangement and the same scene always looks the same. Pure: no DOM.
import type { ThemeName } from '../../../server/src/scene.ts';

export type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'dot'; x: number; y: number; r: number; solid?: boolean }
  | { kind: 'box'; x: number; y: number; w: number; h: number; r: number; solid?: boolean };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

const n = (value: number): number => Math.round(value * 10) / 10;
const between = (random: Random, low: number, high: number): number => low + random() * (high - low);
const line = (points: [number, number][]): Shape => ({ kind: 'path', d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`).join(' ') });

type Motif = (box: Box, random: Random) => Shape[];

/** A dot grid with a few bars rising from its base. */
const data: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const cols = 9;
  const rows = 5;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) shapes.push({ kind: 'dot', x: x + (w * (c + 0.5)) / cols, y: y + (h * (r + 0.5)) / rows, r: 2.2, solid: true });
  const bars = 5;
  const start = Math.floor(random() * (cols - bars));
  for (let i = 0; i < bars; i++) {
    const height = between(random, 0.25, 0.95) * h;
    shapes.push({ kind: 'box', x: x + (w * (start + i + 0.18)) / cols, y: y + h - height, w: (w / cols) * 0.64, h: height, r: 5 });
  }
  return shapes;
};

/** Layers of nodes, each linked to the next layer. */
const ml: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const layers = [3, 4 + Math.floor(random() * 2), 4, 2].map((count, layer, all) =>
    Array.from({ length: count }, (_, i): [number, number] => [x + (w * (layer + 0.5)) / all.length, y + (h * (i + 0.5)) / count + between(random, -6, 6)]),
  );
  layers.slice(0, -1).forEach((layer, i) => {
    for (const from of layer) for (const to of layers[i + 1] ?? []) if (random() < 0.7) shapes.push(line([from, to]));
  });
  for (const [cx, cy] of layers.flat()) shapes.push({ kind: 'dot', x: cx, y: cy, r: 9 });
  return shapes;
};

/** Axes with ticks and a curve. */
const math: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [line([[x, y], [x, y + h], [x + w, y + h]])];
  for (let i = 1; i < 8; i++) shapes.push(line([[x + (w * i) / 8, y + h - 6], [x + (w * i) / 8, y + h + 6]]));
  for (let i = 1; i < 5; i++) shapes.push(line([[x - 6, y + (h * i) / 5], [x + 6, y + (h * i) / 5]]));
  const steep = between(random, 5, 11);
  const shift = between(random, 0.35, 0.65);
  const sigmoid: [number, number][] = Array.from({ length: 41 }, (_, i) => [x + (w * i) / 40, y + h - (h * 0.92) / (1 + Math.exp(-steep * (i / 40 - shift)))]);
  const wave: [number, number][] = Array.from({ length: 41 }, (_, i) => [x + (w * i) / 40, y + h * 0.5 + Math.sin((i / 40) * Math.PI * between(random, 2.9, 3.1)) * h * 0.22]);
  shapes.push(line(sigmoid), line(wave));
  shapes.push({ kind: 'dot', x: x + w * shift, y: y + h - h * 0.46, r: 7, solid: true });
  return shapes;
};

/** Rows of word-shaped pills, like tokens. */
const text: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const rows = 6;
  const height = (h / rows) * 0.52;
  for (let row = 0; row < rows; row++) {
    let cursor = x + between(random, 0, w * 0.12);
    while (cursor < x + w - 30) {
      const width = Math.min(between(random, 34, 120), x + w - cursor);
      shapes.push({ kind: 'box', x: cursor, y: y + (h * row) / rows, w: width, h: height, r: height / 2, solid: random() < 0.18 });
      cursor += width + 12;
    }
  }
  return shapes;
};

/** A browser window with its content blocks, and angle brackets. */
const web: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [{ kind: 'box', x, y, w, h, r: 16 }, line([[x, y + 34], [x + w, y + 34]])];
  for (let i = 0; i < 3; i++) shapes.push({ kind: 'dot', x: x + 22 + i * 20, y: y + 17, r: 5, solid: i === 0 });
  const split = between(random, 0.28, 0.42);
  shapes.push({ kind: 'box', x: x + 18, y: y + 52, w: w * split - 24, h: h - 70, r: 10 });
  const rows = 3;
  for (let i = 0; i < rows; i++) {
    shapes.push({ kind: 'box', x: x + w * split + 8, y: y + 52 + ((h - 70) * i) / rows, w: (w * (1 - split) - 26) * between(random, 0.55, 1), h: (h - 70) / rows - 12, r: 10, solid: i === 0 && random() < 0.5 });
  }
  return shapes;
};

/** Scattered nodes, each linked to its nearest neighbours. */
const network: Motif = ({ x, y, w, h }, random) => {
  const nodes = Array.from({ length: 11 }, (): [number, number] => [x + random() * w, y + random() * h]);
  const shapes: Shape[] = [];
  nodes.forEach((node, i) => {
    const nearest = nodes
      .map((other, j): [number, number] => [j, Math.hypot(other[0] - node[0], other[1] - node[1])])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2);
    for (const [j] of nearest) if (j > i || random() < 0.4) shapes.push(line([node, nodes[j] ?? node]));
  });
  nodes.forEach(([cx, cy], i) => shapes.push({ kind: 'dot', x: cx, y: cy, r: i % 4 === 0 ? 11 : 6, solid: i % 4 !== 0 }));
  return shapes;
};

/** Cylinders with their bands, and the rows of a table. */
const database: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const count = 2 + Math.floor(random() * 2);
  const width = (w * 0.62) / count;
  for (let i = 0; i < count; i++) {
    const left = x + i * (width + 14);
    const top = y + between(random, 0, h * 0.25);
    const ry = 13;
    const bottom = y + h - ry;
    shapes.push({ kind: 'path', d: `M${n(left)} ${n(top + ry)} A${n(width / 2)} ${ry} 0 0 1 ${n(left + width)} ${n(top + ry)} A${n(width / 2)} ${ry} 0 0 1 ${n(left)} ${n(top + ry)}` });
    shapes.push({ kind: 'path', d: `M${n(left)} ${n(top + ry)} L${n(left)} ${n(bottom)} A${n(width / 2)} ${ry} 0 0 0 ${n(left + width)} ${n(bottom)} L${n(left + width)} ${n(top + ry)}` });
    for (let band = 1; band < 3; band++) {
      const at = top + ry + ((bottom - top - ry) * band) / 3;
      shapes.push({ kind: 'path', d: `M${n(left)} ${n(at)} A${n(width / 2)} ${ry} 0 0 0 ${n(left + width)} ${n(at)}` });
    }
  }
  const tableX = x + w * 0.7;
  for (let row = 0; row < 5; row++) shapes.push({ kind: 'box', x: tableX, y: y + h * 0.2 + row * 26, w: w * 0.3, h: 18, r: 5, solid: row === 0 });
  return shapes;
};

/** A shield with a keyhole, inside rings. */
const security: Motif = ({ x, y, w, h }, random) => {
  const cx = x + w * between(random, 0.4, 0.6);
  const cy = y + h * 0.5;
  const size = Math.min(w, h) * 0.34;
  const shapes: Shape[] = [];
  for (let ring = 1; ring <= 3; ring++) {
    const r = size * (0.9 + ring * 0.42);
    const start = random() * Math.PI * 2;
    const sweep = between(random, 1.6, 4.4);
    shapes.push({ kind: 'path', d: `M${n(cx + Math.cos(start) * r)} ${n(cy + Math.sin(start) * r)} A${n(r)} ${n(r)} 0 ${sweep > Math.PI ? 1 : 0} 1 ${n(cx + Math.cos(start + sweep) * r)} ${n(cy + Math.sin(start + sweep) * r)}` });
  }
  shapes.push({ kind: 'path', d: `M${n(cx)} ${n(cy - size)} L${n(cx + size * 0.8)} ${n(cy - size * 0.62)} L${n(cx + size * 0.8)} ${n(cy + size * 0.1)} Q${n(cx + size * 0.7)} ${n(cy + size * 0.75)} ${n(cx)} ${n(cy + size)} Q${n(cx - size * 0.7)} ${n(cy + size * 0.75)} ${n(cx - size * 0.8)} ${n(cy + size * 0.1)} L${n(cx - size * 0.8)} ${n(cy - size * 0.62)} Z` });
  shapes.push({ kind: 'dot', x: cx, y: cy - size * 0.12, r: size * 0.17, solid: true });
  shapes.push(line([[cx, cy], [cx, cy + size * 0.38]]));
  return shapes;
};

/** Indented lines of code. */
const code: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const rows = 9;
  let indent = 0;
  for (let row = 0; row < rows; row++) {
    indent = Math.max(0, Math.min(3, indent + (random() < 0.45 ? 1 : random() < 0.5 ? -1 : 0)));
    let cursor = x + indent * 30;
    const top = y + (h * row) / rows;
    const tokens = 1 + Math.floor(random() * 3);
    for (let token = 0; token < tokens && cursor < x + w - 24; token++) {
      const width = Math.min(between(random, 26, 110), x + w - cursor);
      shapes.push({ kind: 'box', x: cursor, y: top, w: width, h: 10, r: 5, solid: token === 0 && random() < 0.4 });
      cursor += width + 10;
    }
  }
  return shapes;
};

/** A chip with its pins and traces that end in pads. */
const hardware: Motif = ({ x, y, w, h }, random) => {
  const size = Math.min(w, h) * 0.34;
  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const shapes: Shape[] = [{ kind: 'box', x: cx - size / 2, y: cy - size / 2, w: size, h: size, r: 10 }, { kind: 'box', x: cx - size / 4, y: cy - size / 4, w: size / 2, h: size / 2, r: 6, solid: true }];
  const pins = 4;
  for (let side = 0; side < 4; side++) {
    for (let pin = 0; pin < pins; pin++) {
      const offset = (size * (pin + 0.5)) / pins - size / 2;
      const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][side] as [number, number];
      const start: [number, number] = [cx + dx * (size / 2) + (dx === 0 ? offset : 0), cy + dy * (size / 2) + (dy === 0 ? offset : 0)];
      const reach = between(random, 0.25, 0.95) * (dx === 0 ? h / 2 - size / 2 : w / 2 - size / 2);
      const mid: [number, number] = [start[0] + dx * reach * 0.5, start[1] + dy * reach * 0.5];
      const bend = between(random, -26, 26);
      const turn: [number, number] = [mid[0] + (dx === 0 ? bend : 0), mid[1] + (dy === 0 ? bend : 0)];
      const end: [number, number] = [turn[0] + dx * reach * 0.5, turn[1] + dy * reach * 0.5];
      shapes.push(line([start, mid, turn, end]), { kind: 'dot', x: end[0], y: end[1], r: 4.5, solid: random() < 0.5 });
    }
  }
  return shapes;
};

/** A rising line over bars, and a pie. */
const business: Motif = ({ x, y, w, h }, random) => {
  const shapes: Shape[] = [];
  const count = 7;
  const points: [number, number][] = [];
  let level = 0.2;
  for (let i = 0; i < count; i++) {
    level = Math.min(0.95, Math.max(0.12, level + between(random, -0.06, 0.2)));
    const left = x + (w * 0.68 * i) / count;
    shapes.push({ kind: 'box', x: left, y: y + h - level * h * 0.7, w: (w * 0.68) / count - 10, h: level * h * 0.7, r: 5 });
    points.push([left + ((w * 0.68) / count - 10) / 2, y + h - level * h - 6]);
  }
  shapes.push(line(points));
  for (const [px, py] of points) shapes.push({ kind: 'dot', x: px, y: py, r: 5, solid: true });
  const r = Math.min(w * 0.13, h * 0.32);
  const cx = x + w - r;
  const cy = y + r + 4;
  const angle = between(random, 0.6, 2.2);
  shapes.push({ kind: 'dot', x: cx, y: cy, r });
  shapes.push({ kind: 'path', d: `M${n(cx)} ${n(cy)} L${n(cx)} ${n(cy - r)} A${n(r)} ${n(r)} 0 0 1 ${n(cx + Math.sin(angle) * r)} ${n(cy - Math.cos(angle) * r)} Z` });
  return shapes;
};

const motifs: Record<ThemeName, Motif | undefined> = { plain: undefined, data, ml, math, text, web, network, database, security, code, hardware, business };

/** The theme's motif inside `box`, arranged by `seed`. The plain theme draws nothing. */
export function motif(theme: ThemeName, seed: string, box: Box): Shape[] {
  return motifs[theme]?.(box, seeded(`${theme}:${seed}`)) ?? [];
}
