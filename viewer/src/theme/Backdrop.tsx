// A theme's decoration: its drawings as faint flat line art that draws itself in. `slide` and `night` sit behind a
// slide, a large drawing and a small one in two corners that change with every slide (`compose.ts`); `page` sits at
// the top right of the page; `band` is a small emblem beside a chapter's header. `index` is the slide or the chapter,
// and picks the drawing. Purely decorative: hidden from assistive technology and from the pointer.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { gsap, reducedMotion, staggerOf, tokens } from '../animation/motion';
import { cn } from '@/lib/utils';
import { compose, type Corner, type Placement } from './compose';
import { CANVAS, motif, type Shape } from './motifs';
import type { Theme } from './themes';
import { themes } from './themes';

type Variant = 'slide' | 'night' | 'page' | 'band';

/** Room around the canvas for strokes and shapes that reach its edge. */
const PAD = 14;

function ShapeView({ shape }: { shape: Shape }) {
  const className = cn(shape.fill === 'solid' ? 'motif-solid' : 'motif-line', shape.fill === 'soft' && 'motif-soft', shape.tone === 'b' && 'motif-b');
  switch (shape.kind) {
    case 'path':
      return <path d={shape.d} className={className} />;
    case 'dot':
      return <circle cx={shape.x} cy={shape.y} r={shape.r} className={className} />;
    case 'box':
      return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} className={className} />;
  }
}

const CORNERS: readonly Corner[] = ['tr', 'br', 'bl', 'tl'];
/** How much of a drawing may lie on the slide's content before it moves or hides: a sliver at its edge. */
const MAX_COVER = 0.03;

/**
 * Where the slide's content is: the tight boxes of its text, and the boxes of its cards, pictures and drawings. A
 * paragraph's own box spans the column; its text may not, so text is measured by its line boxes.
 */
export function contentBoxes(root: HTMLElement): DOMRect[] {
  const boxes: DOMRect[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || node.parentElement?.closest('svg')) continue;
    range.selectNodeContents(node);
    boxes.push(...Array.from(range.getClientRects()));
  }
  for (const element of Array.from(root.querySelectorAll<HTMLElement | SVGElement>('svg, img, canvas, table, button, [class*="bg-"], [class*="border"]'))) {
    if (element instanceof SVGElement && element.parentElement?.closest('svg')) continue;
    if (element.closest('[aria-hidden="true"]') && !(element instanceof SVGSVGElement)) continue;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const painted = element instanceof SVGSVGElement || element.tagName === 'IMG' || element.tagName === 'CANVAS' || element.tagName === 'TABLE' || !transparent(style.backgroundColor) || parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderLeftWidth) > 0;
    if (painted) boxes.push(element.getBoundingClientRect());
  }
  return boxes.filter((box) => box.width > 0 && box.height > 0);
}

/** Whether a computed color paints nothing: `transparent`, or an alpha of 0 in any notation (rgba, oklch, color-mix). */
const transparent = (color: string): boolean => color === 'transparent' || /(?:,|\/)\s*0(?:\.0*)?\s*\)$/.test(color);

/** The share of `part` that the boxes cover (overlaps between boxes counted twice: an upper bound is enough here). */
function covered(part: DOMRect, boxes: readonly DOMRect[]): number {
  const area = part.width * part.height;
  if (area === 0) return 0;
  let sum = 0;
  for (const box of boxes) {
    const w = Math.min(part.right, box.right) - Math.max(part.left, box.left);
    const h = Math.min(part.bottom, box.bottom) - Math.max(part.top, box.top);
    if (w > 0 && h > 0) sum += w * h;
  }
  return sum / area;
}

/**
 * Moves each drawing of a slide to a corner the content leaves free, the large one first and its own corner first,
 * and hides a drawing that every free corner would put on the content (F36: decoration never competes with it).
 */
function clear(element: HTMLElement, content: HTMLElement): void {
  const boxes = contentBoxes(content);
  const used = new Set<Corner>();
  for (const part of Array.from(element.querySelectorAll<SVGSVGElement>('.motif-part'))) {
    const own = CORNERS.find((corner) => part.classList.contains(`motif-${corner}`)) ?? 'tr';
    if (part.getBoundingClientRect().width === 0) continue;
    const options = [own, ...CORNERS.filter((corner) => corner !== own)].filter((corner) => !used.has(corner));
    let best: { corner: Corner; cover: number } | undefined;
    for (const corner of options) {
      for (const other of CORNERS) part.classList.toggle(`motif-${other}`, other === corner);
      const cover = covered(part.getBoundingClientRect(), boxes);
      if (!best || cover < best.cover - 0.005) best = { corner, cover };
      if (cover <= MAX_COVER) break;
    }
    const corner = best?.corner ?? own;
    for (const other of CORNERS) part.classList.toggle(`motif-${other}`, other === corner);
    const hidden = (best?.cover ?? 0) > MAX_COVER;
    part.style.visibility = hidden ? 'hidden' : '';
    if (!hidden) used.add(corner);
  }
}

export function Backdrop({
  theme,
  seed,
  variant,
  index = 0,
  className,
  avoid,
  revision,
}: {
  theme: Theme;
  seed: string;
  variant: Variant;
  index?: number;
  className?: string;
  /** The slide's content, which the drawings keep clear of (slides only). */
  avoid?: React.RefObject<HTMLElement | null>;
  /** Changes when the content may have grown, as a new part arrives. */
  revision?: unknown;
}) {
  const root = useRef<HTMLDivElement>(null);
  const placements = useMemo(
    (): Placement[] => (variant === 'slide' || variant === 'night' ? compose(seed, index, variant === 'night') : [{ corner: 'tr', size: 'lg', variant: index, seed: `${seed}:${index}` }]),
    [seed, index, variant],
  );
  const drawings = useMemo(() => placements.map((placement) => motif(theme.name, placement.seed, placement.variant)), [theme.name, placements]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || reducedMotion()) return;
    const lines = element.querySelectorAll('.motif-line');
    const solids = element.querySelectorAll('.motif-solid');
    const timeline = gsap.timeline({ delay: 0.2 });
    if (lines.length > 0) timeline.from(lines, { drawSVG: 0, fillOpacity: 0, duration: tokens.dur.draw, ease: tokens.ease.draw, stagger: staggerOf(lines.length, tokens.stagger.tight) }, 0);
    if (solids.length > 0) timeline.from(solids, { scale: 0, transformOrigin: '50% 50%', duration: tokens.dur.base, ease: tokens.ease.pop, stagger: staggerOf(solids.length, tokens.stagger.tight) }, 0.25);
    return () => {
      timeline.kill();
    };
  }, [drawings]);
  useLayoutEffect(() => {
    const element = root.current;
    const content = avoid?.current;
    if (!element || !content || (variant !== 'slide' && variant !== 'night')) return;
    const run = (): void => clear(element, content);
    run();
    // Entrances and fonts settle a moment later; a resize moves everything.
    const later = window.setTimeout(run, 450);
    const observer = new ResizeObserver(() => requestAnimationFrame(run));
    observer.observe(content);
    return () => {
      window.clearTimeout(later);
      observer.disconnect();
    };
  }, [avoid, drawings, revision, variant]);
  if (theme.name === 'plain') return null;
  return (
    <div ref={root} aria-hidden="true" className={cn('motif pointer-events-none', `motif-${variant}`, className)} style={{ '--accent': theme.accent } as React.CSSProperties}>
      {placements.map((placement, i) => (
        <svg key={i} focusable="false" viewBox={`${-PAD} ${-PAD} ${CANVAS.width + 2 * PAD} ${CANVAS.height + 2 * PAD}`} className={`motif-part motif-${placement.corner} motif-${placement.size}`}>
          {(drawings[i] ?? []).map((shape, s) => (
            <ShapeView key={s} shape={shape} />
          ))}
        </svg>
      ))}
    </div>
  );
}

/** The theme's small icon, for chips and headers. */
export function ThemeGlyph({ theme, size = 16, className }: { theme: Theme; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {themes[theme.name].glyph.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
