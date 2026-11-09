// Zoom transitions between levels: the new view grows out of the clicked box (zoom in),
// or the parent view shrinks back onto the box the user came from (zoom out).
import { motion, reducedMotion as reduced } from './reveal';

/** A rectangle as fractions (0..1) of its container. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Whole-view moves get a milder bounce than single elements (motion.md: page transitions use back.out(1.2)).
const DURATION = motion.slow;
const EASING = 'cubic-bezier(0.34, 1.25, 0.64, 1)';

export function boxWithin(element: Element, container: Element): Box | undefined {
  const outer = container.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  if (outer.width === 0 || outer.height === 0) return undefined;
  return {
    x: (inner.left - outer.left) / outer.width,
    y: (inner.top - outer.top) / outer.height,
    w: inner.width / outer.width,
    h: inner.height / outer.height,
  };
}

/** Transform that maps the whole element onto `box` (uniform scale, centered on the box). */
function ontoBox(element: HTMLElement, box: Box): string {
  const { width, height } = element.getBoundingClientRect();
  const scale = Math.max(0.05, Math.min(box.w, 1));
  const tx = (box.x + box.w / 2) * width - (scale * width) / 2;
  const ty = (box.y + box.h / 2) * height - (scale * height) / 2;
  return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/** Transform that blows `box` up to fill the element. */
function fromBox(element: HTMLElement, box: Box): string {
  const { width, height } = element.getBoundingClientRect();
  const scale = 1 / Math.max(0.05, Math.min(box.w, 1));
  const tx = width / 2 - (box.x + box.w / 2) * width * scale;
  const ty = height / 2 - (box.y + box.h / 2) * height * scale;
  return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

export function zoomIn(element: HTMLElement, from: Box | undefined): void {
  if (reduced()) return;
  const start = from ? ontoBox(element, from) : 'scale(0.85)';
  element.animate(
    [
      { transform: start, opacity: 0.15, transformOrigin: '0 0' },
      { transform: 'none', opacity: 1, transformOrigin: '0 0' },
    ],
    { duration: DURATION, easing: EASING },
  );
}

export function zoomOut(element: HTMLElement, onto: Box | undefined): void {
  if (reduced()) return;
  const start = onto ? fromBox(element, onto) : 'scale(1.25)';
  element.animate(
    [
      { transform: start, opacity: 0.15, transformOrigin: '0 0' },
      { transform: 'none', opacity: 1, transformOrigin: '0 0' },
    ],
    { duration: DURATION, easing: EASING },
  );
}
