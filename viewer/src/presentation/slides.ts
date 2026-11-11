// Presentation order: one slide per Markdown block, <arch> and <data>, one per <flow> step,
// and one per <walk> step of a <state> (or one slide for a <state> without a walk).
// Lessons add a title slide per chapter, one slide per journey stage and trace value, one per chart, quiz and
// stats block, one per matrix followed by one per highlight it offers, and one per step of a calculation, and one per threshold (interactive).
import type { Block } from '../../../server/src/scene.ts';
import { calcModel } from '../lesson/calcMath.ts';
import { matrixFocuses } from '../lesson/focuses.ts';

export type Slide =
  | { kind: 'markdown'; block: number }
  | { kind: 'arch'; block: number }
  | { kind: 'step'; block: number; step: number; of: number }
  | { kind: 'data'; block: number }
  | { kind: 'state'; block: number }
  | { kind: 'walk'; block: number; step: number; of: number }
  | { kind: 'chapter'; block: number; number: number; of: number }
  | { kind: 'stats'; block: number }
  | { kind: 'stage'; block: number; step: number; of: number }
  | { kind: 'trace'; block: number; step: number; of: number }
  | { kind: 'chart'; block: number }
  | { kind: 'matrix'; block: number; focus?: number }
  | { kind: 'quiz'; block: number }
  | { kind: 'threshold'; block: number }
  | { kind: 'calc'; block: number; step: number; of: number };

/** One slide per item, numbered `step` of `of`. */
function steps<K extends 'step' | 'walk' | 'stage' | 'trace' | 'calc'>(kind: K, block: number, count: number): { kind: K; block: number; step: number; of: number }[] {
  return Array.from({ length: count }, (_, step) => ({ kind, block, step, of: count }));
}

export function buildSlides(blocks: Block[]): Slide[] {
  const slides: Slide[] = [];
  const chapters = blocks.filter((block) => block.type === 'chapter').length;
  let chapter = 0;
  blocks.forEach((block, i) => {
    switch (block.type) {
      case 'markdown':
      case 'arch':
      case 'data':
      case 'stats':
      case 'chart':
      case 'quiz':
      case 'threshold':
        slides.push({ kind: block.type, block: i });
        break;
      case 'flow':
        slides.push(...steps('step', i, block.steps.length));
        break;
      case 'state':
        if (block.walk.length === 0) slides.push({ kind: 'state', block: i });
        else slides.push(...steps('walk', i, block.walk.length));
        break;
      case 'chapter':
        chapter += 1;
        slides.push({ kind: 'chapter', block: i, number: chapter, of: chapters });
        break;
      case 'journey':
        slides.push(...steps('stage', i, block.stages.length));
        break;
      case 'trace':
        slides.push(...steps('trace', i, block.values.length));
        break;
      case 'calc':
        slides.push(...steps('calc', i, calcModel(block).steps));
        break;
      case 'matrix':
        slides.push({ kind: 'matrix', block: i });
        matrixFocuses(block).forEach((_, focus) => slides.push({ kind: 'matrix', block: i, focus }));
        break;
    }
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
