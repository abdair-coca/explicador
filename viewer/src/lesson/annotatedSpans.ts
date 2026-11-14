// A passage cut at the quotes of its notes (F27): plain stretches and marked ones, in reading order, each marked one
// saying which note it belongs to.
import type { AnnotatedBlock } from '../../../server/src/scene.ts';

export interface Span {
  text: string;
  /** Index of the note that quotes these words, in the order the notes were written. */
  note?: number;
}

export function passageSpans(block: Pick<AnnotatedBlock, 'passage' | 'notes'>): Span[] {
  const marks = block.notes.map((note, index) => ({ ...note, index })).sort((a, b) => a.start - b.start);
  const spans: Span[] = [];
  let at = 0;
  for (const mark of marks) {
    if (mark.start > at) spans.push({ text: block.passage.slice(at, mark.start) });
    spans.push({ text: block.passage.slice(mark.start, mark.end), note: mark.index });
    at = mark.end;
  }
  if (at < block.passage.length) spans.push({ text: block.passage.slice(at) });
  return spans;
}
