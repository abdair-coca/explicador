// The score of a comparison and its parts in Present mode. Pure.
import type { CompareBlock } from '../../../server/src/scene.ts';

/** How many rows each side wins; ties count for neither. */
export function compareTally(block: CompareBlock): { a: number; b: number } {
  return { a: block.rows.filter((row) => row.winner === 'a').length, b: block.rows.filter((row) => row.winner === 'b').length };
}

/** Parts in Present mode: the two names, each row, and the tally when some row has a winner. */
export function compareParts(block: CompareBlock): number {
  return 1 + block.rows.length + (block.rows.some((row) => row.winner) ? 1 : 0);
}
