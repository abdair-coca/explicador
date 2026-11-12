// The pieces of a concept card in the order they show, and its parts in Present mode.
import type { ConceptBlock } from '../../../server/src/scene.ts';

export type ConceptPiece = 'define' | 'analogy' | 'formula' | 'example';

const ORDER: readonly ConceptPiece[] = ['define', 'analogy', 'formula', 'example'];

/** The pieces the concept has. */
export function conceptPieces(block: ConceptBlock): ConceptPiece[] {
  return ORDER.filter((piece) => Boolean(block[piece]));
}

/** Parts of the concept's slide: the term alone, then one per piece. */
export function conceptParts(block: ConceptBlock): number {
  return 1 + conceptPieces(block).length;
}
