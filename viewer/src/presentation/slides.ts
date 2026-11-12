// Presentation order: one slide per block, in document order. A block's steps are the parts of its slide: the parts
// of a prose block (`prose.ts`), <flow> steps, <walk> steps of a <state>, stats cards, journey stages, trace values,
// calc steps, a chart then its highlight, the whole matrix then each of its highlights, a quiz then its answer, a concept's
// term then each of its pieces, a plot's curves then each of its marks, and
// each line of a derivation. A scatter shows its axes, each class, its boundary and the points on the wrong side;
// a comparison its two names, each row and the tally; a timeline each event.
// Each → reveals the next part; with none left, → opens the next slide.
// The slides back a speaker, who does the explaining: prose is not a slide, except the scene's `#` title as its cover,
// unless the scene has nothing but prose (then each Markdown block is a slide, so Present is never empty).
import type { Block } from '../../../server/src/scene.ts';
import { calcModel } from '../lesson/calcMath.ts';
import { compareParts } from '../lesson/compareTally.ts';
import { conceptParts } from '../lesson/conceptParts.ts';
import { matrixFocuses } from '../lesson/focuses.ts';
import { scatterParts } from '../lesson/scatterGeometry.ts';
import { proseSlide } from './prose.ts';

export interface Slide {
  kind: Block['type'];
  block: number;
  /** Parts revealed one per →, at least 1. */
  parts: number;
  /** 0 before the first <chapter>, then the number of the chapter the slide belongs to. */
  chapter: number;
  /** On the cover slide (a Markdown block), the scene's title alone. */
  cover?: string;
}

/** Blocks that frame the components; a scene with nothing else keeps its prose slides. */
const FRAMING = new Set<Block['type']>(['markdown', 'theme', 'chapter']);

/** The text of a `#` heading that opens a Markdown block, if it does. */
export function coverTitle(markdown: string): string | undefined {
  const first = markdown.split(/\r?\n/).find((line) => line.trim() !== '');
  return /^#\s+(.+)$/.exec(first?.trim() ?? '')?.[1]?.trim();
}

function partsOf(block: Block): number {
  switch (block.type) {
    case 'markdown':
      return proseSlide(block.text).parts;
    case 'stats':
      return block.stats.length;
    case 'chart':
      return block.highlight === undefined ? 1 : 2;
    case 'quiz':
      return 2;
    case 'flow':
      return block.steps.length;
    case 'state':
      return block.walk.length;
    case 'journey':
      return block.stages.length;
    case 'trace':
      return block.values.length;
    case 'calc':
      return calcModel(block).steps;
    case 'matrix':
      return 1 + matrixFocuses(block).length;
    case 'concept':
      return conceptParts(block);
    case 'plot':
      return 1 + block.marks.length;
    case 'derive':
      return block.lines.length;
    case 'scatter':
      return scatterParts(block);
    case 'compare':
      return compareParts(block);
    case 'timeline':
      return block.events.length;
    default:
      return 1;
  }
}

export function buildSlides(blocks: Block[]): Slide[] {
  const onlyProse = blocks.every((block) => FRAMING.has(block.type));
  let chapter = 0;
  let prose = 0;
  return blocks.flatMap((block, i): Slide[] => {
    // The theme decorates the slides; it is not one.
    if (block.type === 'theme') return [];
    if (block.type === 'chapter') chapter += 1;
    if (block.type === 'markdown' && !onlyProse) {
      const title = prose++ === 0 && chapter === 0 ? coverTitle(block.text) : undefined;
      return title === undefined ? [] : [{ kind: 'markdown', block: i, parts: 1, chapter, cover: title }];
    }
    return [{ kind: block.type, block: i, parts: Math.max(1, partsOf(block)), chapter }];
  });
}

export interface Position {
  slide: number;
  part: number;
}

export type Move = 'next' | 'prev' | 'skip' | 'first' | 'last';

/**
 * Where a move leads. Next reveals the next part or opens the next slide at its first part; prev hides the last part
 * or goes back to the previous slide fully built; skip opens the next slide; first and last go to the ends.
 */
export function move(slides: readonly Slide[], at: Position, how: Move): Position {
  const last = Math.max(0, slides.length - 1);
  const lastPart = (slide: number): number => (slides[slide]?.parts ?? 1) - 1;
  switch (how) {
    case 'next':
      if (at.part < lastPart(at.slide)) return { slide: at.slide, part: at.part + 1 };
      return at.slide < last ? { slide: at.slide + 1, part: 0 } : at;
    case 'skip':
      return at.slide < last ? { slide: at.slide + 1, part: 0 } : { slide: at.slide, part: lastPart(at.slide) };
    case 'prev':
      if (at.part > 0) return { slide: at.slide, part: at.part - 1 };
      return at.slide > 0 ? { slide: at.slide - 1, part: lastPart(at.slide - 1) } : at;
    case 'first':
      return { slide: 0, part: 0 };
    case 'last':
      return { slide: last, part: lastPart(last) };
  }
}

/** A stretch of the progress bar: the slides of one chapter, or one slide when the scene has no chapters. */
export interface Segment {
  first: number;
  count: number;
  /** The chapter number, 0 for the slides before the first chapter (and for every slide without chapters). */
  chapter: number;
}

export function segmentsOf(slides: readonly Slide[]): Segment[] {
  if (!slides.some((slide) => slide.kind === 'chapter')) return slides.map((_, i) => ({ first: i, count: 1, chapter: 0 }));
  const segments: Segment[] = [];
  slides.forEach((slide, i) => {
    const current = segments.at(-1);
    if (current && current.chapter === slide.chapter) current.count += 1;
    else segments.push({ first: i, count: 1, chapter: slide.chapter });
  });
  return segments;
}

/** How much of a segment has been shown, from 0 to 1, counting the revealed parts of the current slide. */
export function segmentFill(segment: Segment, slides: readonly Slide[], at: Position): number {
  if (at.slide >= segment.first + segment.count) return 1;
  if (at.slide < segment.first) return 0;
  const parts = slides[at.slide]?.parts ?? 1;
  return (at.slide - segment.first + (at.part + 1) / parts) / segment.count;
}

export type Key = 'next' | 'prev' | 'skip' | 'first' | 'last' | 'exit' | 'fullscreen' | 'sound' | 'subtitles';

/** Keyboard map of the presenter; anything else is ignored. Shift with a forward key skips the remaining parts. */
export function keyAction(key: string, shift = false): Key | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
      return shift ? 'skip' : 'next';
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
    case 'm':
    case 'M':
      return 'sound';
    case 's':
    case 'S':
      return 'subtitles';
    default:
      return undefined;
  }
}
