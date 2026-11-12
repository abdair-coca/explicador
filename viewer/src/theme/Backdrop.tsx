// A theme's decoration: its motif as faint flat line art that draws itself in. `slide` and `night` sit behind a slide
// in two corners of the presenter (the middle stays clear for the content); `page` sits at the top right of the page;
// `band` is a small strip beside a chapter's header. Purely decorative: hidden from assistive technology and from the pointer.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { gsap, reducedMotion, staggerOf, tokens } from '../animation/motion';
import { cn } from '@/lib/utils';
import { motif, type Box, type Shape } from './motifs';
import type { Theme } from './themes';
import { themes } from './themes';

type Variant = 'slide' | 'night' | 'page' | 'band';

/** The boxes each variant draws a motif in; each becomes its own drawing, anchored to a corner by the stylesheet. */
const layouts: Record<Variant, Box[]> = {
  slide: [{ x: 0, y: 0, w: 420, h: 260 }, { x: 0, y: 0, w: 320, h: 190 }],
  night: [{ x: 0, y: 0, w: 520, h: 360 }, { x: 0, y: 0, w: 300, h: 160 }],
  page: [{ x: 0, y: 0, w: 440, h: 240 }],
  band: [{ x: 0, y: 0, w: 244, h: 94 }],
};

/** Room around a box for strokes and shapes that reach its edge. */
const PAD = 14;

function ShapeView({ shape }: { shape: Shape }) {
  switch (shape.kind) {
    case 'path':
      return <path d={shape.d} className="motif-line" />;
    case 'dot':
      return <circle cx={shape.x} cy={shape.y} r={shape.r} className={shape.solid ? 'motif-solid' : 'motif-line'} />;
    case 'box':
      return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} className={shape.solid ? 'motif-solid' : 'motif-line'} />;
  }
}

export function Backdrop({ theme, seed, variant, className }: { theme: Theme; seed: string; variant: Variant; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const boxes = layouts[variant];
  const groups = useMemo(() => boxes.map((box, i) => motif(theme.name, `${seed}:${i}`, box)), [theme.name, seed, boxes]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || reducedMotion()) return;
    const lines = element.querySelectorAll('.motif-line');
    const solids = element.querySelectorAll('.motif-solid');
    const timeline = gsap.timeline({ delay: 0.25 });
    if (lines.length > 0) timeline.from(lines, { drawSVG: 0, duration: tokens.dur.draw, ease: tokens.ease.draw, stagger: staggerOf(lines.length, tokens.stagger.tight) }, 0);
    if (solids.length > 0) timeline.from(solids, { scale: 0, transformOrigin: '50% 50%', duration: tokens.dur.base, ease: tokens.ease.pop, stagger: staggerOf(solids.length, tokens.stagger.tight) }, 0.2);
    return () => {
      timeline.kill();
    };
  }, [groups]);
  if (theme.name === 'plain') return null;
  return (
    <div ref={root} aria-hidden="true" className={cn('motif pointer-events-none', `motif-${variant}`, className)} style={{ '--accent': theme.accent } as React.CSSProperties}>
      {groups.map((shapes, g) => {
        const box = boxes[g];
        if (!box) return null;
        return (
          <svg key={g} focusable="false" viewBox={`${-PAD} ${-PAD} ${box.w + 2 * PAD} ${box.h + 2 * PAD}`} className={`motif-part motif-part-${g}`}>
            {shapes.map((shape, i) => (
              <ShapeView key={i} shape={shape} />
            ))}
          </svg>
        );
      })}
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
