// Where the decoration goes on each slide: which corners, how large, and which of the theme's drawings. Every slide
// gets its own composition and two slides in a row never share one. Pure.
import { seeded, VARIANTS } from './motifs.ts';

export type Corner = 'tr' | 'tl' | 'br' | 'bl';

export interface Placement {
  corner: Corner;
  size: 'lg' | 'sm';
  /** Which of the theme's drawings. */
  variant: number;
  /** Sets the drawing's details. */
  seed: string;
}

/** The corner of the large drawing, then of the small one. The large one never sits top left, where titles start. */
const LAYOUTS: readonly (readonly [Corner, Corner])[] = [
  ['tr', 'bl'],
  ['br', 'tl'],
  ['bl', 'tr'],
  ['tr', 'br'],
  ['br', 'bl'],
  ['bl', 'tl'],
];
/** On a chapter card the text is on the left, so the large drawing stays on the right. */
const CARD_LAYOUTS = LAYOUTS.filter(([large]) => large !== 'bl');

/** The layouts in an order of the scene's own. */
function shuffled<T>(items: readonly T[], seed: string): T[] {
  const random = seeded(seed);
  const order = [...items];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j] as T, order[i] as T];
  }
  return order;
}

/**
 * The composition of slide `index` of the scene `seed`: a large drawing and a small one, in corners and with drawings
 * that differ from the slides before and after it.
 */
export function compose(seed: string, index: number, card = false): Placement[] {
  const layouts = shuffled(card ? CARD_LAYOUTS : LAYOUTS, seed);
  const [large, small] = layouts[index % layouts.length] ?? LAYOUTS[0] ?? ['tr', 'bl'];
  const first = Math.floor(seeded(`${seed}:variant`)() * VARIANTS);
  return [
    { corner: large, size: 'lg', variant: (first + index) % VARIANTS, seed: `${seed}:${index}:lg` },
    { corner: small, size: 'sm', variant: (first + index + 1) % VARIANTS, seed: `${seed}:${index}:sm` },
  ];
}
