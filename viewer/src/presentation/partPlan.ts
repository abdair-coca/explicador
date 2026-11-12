// Which parts of a slide animate after a move, and in which direction. → plays the parts that were just revealed;
// ← rewinds the ones that were just hidden; a slide opened from the back, or under reduced motion, shows as built.
import type { Position } from './slides.ts';

export interface PartPlan {
  /** Parts to play forward, in order. */
  play: number[];
  /** Parts to play backwards, the last one first. */
  rewind: number[];
}

const NONE: PartPlan = { play: [], rewind: [] };

export function planParts(previous: Position | undefined, next: Position, reduced = false): PartPlan {
  if (reduced) return NONE;
  if (!previous || previous.slide !== next.slide) {
    // A slide opened at its first part plays it; one reached with ← arrives fully built.
    return next.part === 0 ? { play: [0], rewind: [] } : NONE;
  }
  const play: number[] = [];
  const rewind: number[] = [];
  for (let part = previous.part + 1; part <= next.part; part++) play.push(part);
  for (let part = previous.part; part > next.part; part--) rewind.push(part);
  return { play, rewind };
}
