// Presentation order: one slide per Markdown block, one per <arch>, one per <flow> step.
import type { Block } from '../../../server/src/scene.ts';

export type Slide =
  | { kind: 'markdown'; block: number }
  | { kind: 'arch'; block: number }
  | { kind: 'step'; block: number; step: number; of: number };

export function buildSlides(blocks: Block[]): Slide[] {
  const slides: Slide[] = [];
  blocks.forEach((block, i) => {
    if (block.type === 'markdown') slides.push({ kind: 'markdown', block: i });
    else if (block.type === 'arch') slides.push({ kind: 'arch', block: i });
    else block.steps.forEach((_, step) => slides.push({ kind: 'step', block: i, step, of: block.steps.length }));
  });
  return slides;
}

export type Key = 'next' | 'prev' | 'first' | 'last' | 'exit' | 'fullscreen';

/** Keyboard map of the presenter; anything else is ignored. */
export function keyAction(key: string): Key | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
    case 'Enter':
      return 'next';
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'Backspace':
      return 'prev';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'Escape':
      return 'exit';
    case 'f':
    case 'F':
      return 'fullscreen';
    default:
      return undefined;
  }
}
