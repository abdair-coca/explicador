// A theme's decoration: its drawings as faint flat line art that draws itself in. `slide` and `night` sit behind a
// slide, a large drawing and a small one in two corners that change with every slide (`compose.ts`); `page` sits at
// the top right of the page; `band` is a small emblem beside a chapter's header. `index` is the slide or the chapter,
// and picks the drawing. Purely decorative: hidden from assistive technology and from the pointer.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { gsap, reducedMotion, staggerOf, tokens } from '../animation/motion';
import { cn } from '@/lib/utils';
import { compose, type Placement } from './compose';
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

export function Backdrop({ theme, seed, variant, index = 0, className }: { theme: Theme; seed: string; variant: Variant; index?: number; className?: string }) {
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
