// A figure (F31): a drawing of a physical thing, a raindrop and its rays, a crossing and its lights, made of the
// closed shapes of <figure>. The setting is there from the start; each <show> adds its shapes in a later part: an
// arrow or an angle draws itself, a circle, box or zone grows in, and the shapes just added stand out. In Present
// (`shown` is the current part) the narration of the part is its subtitle; on the page the parts play with step controls.
import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FigureBlock, FigureShape } from '../../../server/src/scene.ts';
import { gsap, tokens } from '../animation/motion';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { DiagramFitContext } from '../components/Diagram';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame, StepControls } from '../components/scenes';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { figureParts, labelSize, placeFigure, type Placed } from './figureGeometry';

/** How much wider than its grid a figure may be drawn, in pixels per unit. */
const MAX_PX_PER_UNIT = 12;

function ShapeView({ placed, marker, now }: { placed: Placed; marker: string; now: boolean }) {
  const { shape, path } = placed;
  const className = cn('fig-shape', `fig-${shape.kind}`, `fig-${shape.color}`, now && 'now');
  switch (shape.kind) {
    case 'circle':
      return <circle className={className} cx={shape.x} cy={shape.y} r={shape.r} />;
    case 'box':
      return <rect className={className} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={Math.min(1.5, shape.w / 4, shape.h / 4)} />;
    case 'zone':
      return <path className={className} d={path} />;
    case 'arrow':
      return (
        <path
          className={cn(className, shape.dashed && 'dashed')}
          d={path}
          markerEnd={shape.head === 'none' ? undefined : `url(#${marker}-${shape.color})`}
          markerStart={shape.head === 'both' ? `url(#${marker}-${shape.color})` : undefined}
        />
      );
    case 'angle':
      return <path className={className} d={path} />;
    case 'label':
      return null;
  }
}

function LabelView({ placed, now, size }: { placed: Placed; now: boolean; size: number }) {
  const { shape, labelAt, lines } = placed;
  if (!labelAt || lines.length === 0) return null;
  const free = shape.kind === 'label';
  return (
    <text
      className={cn('fig-label', free && 'free', `fig-${shape.color}`, now && 'now')}
      x={labelAt[0]}
      y={labelAt[1] - ((lines.length - 1) * size * 1.15) / 2}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: `${size}px` }}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={labelAt[0]} dy={i === 0 ? 0 : size * 1.15}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

const COLORS: FigureShape['color'][] = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray'];

export function FigureView({ block, shown }: { block: FigureBlock; shown?: number }) {
  const svg = useRef<SVGSVGElement>(null);
  // How wide the figure is drawn, so labels on a phone grow to stay readable (rounded, so a resize does not churn).
  const [pixels, setPixels] = useState(0);
  useEffect(() => {
    const element = svg.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => setPixels(Math.round(element.getBoundingClientRect().width / 20) * 20);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const size = labelSize(block.width, pixels);
  const placed = useMemo(() => placeFigure(block, size), [block, size]);
  const last = figureParts(block) - 1;
  const part = Math.max(0, Math.min(last, shown ?? last));
  const marker = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const fit = useContext(DiagramFitContext);
  const previous = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const root = svg.current;
    const before = previous.current;
    previous.current = part;
    if (!root || before === undefined || part <= before || reduced) return;
    const { dur, ease } = tokens;
    const tweens: gsap.core.Tween[] = [];
    const lines = root.querySelectorAll('.fig-arrow.now, .fig-angle.now');
    const solids = root.querySelectorAll('.fig-circle.now, .fig-box.now, .fig-zone.now');
    const labels = root.querySelectorAll('.fig-label.now');
    if (solids.length > 0) tweens.push(gsap.from(solids, { scale: 0.4, autoAlpha: 0, transformOrigin: '50% 50%', duration: dur.base, ease: ease.pop, stagger: 0.08 }));
    if (lines.length > 0) tweens.push(gsap.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur.slow, ease: ease.draw, stagger: 0.15 }));
    if (labels.length > 0) tweens.push(gsap.from(labels, { autoAlpha: 0, y: 1.5, duration: dur.base, ease: ease.out, delay: dur.base, stagger: 0.08 }));
    return () => {
      for (const tween of tweens) tween.progress(1).kill();
    };
  }, [part, reduced]);

  const visible = placed.filter((item) => item.shape.appear <= part);
  const isNow = (item: Placed): boolean => part > 0 && item.shape.appear === part;
  const width = block.width * MAX_PX_PER_UNIT;
  return (
    <div className="overflow-x-auto">
      <svg
        ref={svg}
        viewBox={`0 0 ${block.width} ${block.height}`}
        className="figure mx-auto block h-auto"
        style={fit ? { width: '100%', maxWidth: width, maxHeight: 'var(--fit-h, none)' } : { width: '100%', maxWidth: width }}
        role="group"
        aria-label={[block.title, ...visible.flatMap((item) => item.lines.join(' ') || [])].join('. ')}
      >
        <defs>
          {COLORS.map((color) => (
            <marker key={color} id={`${marker}-${color}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={`fig-head fig-${color}`} />
            </marker>
          ))}
        </defs>
        {/* Areas under everything, then outlines, then the labels on top. */}
        {visible
          .filter((item) => item.shape.kind === 'zone')
          .map((item) => (
            <ShapeView key={placed.indexOf(item)} placed={item} marker={marker} now={isNow(item)} />
          ))}
        {visible
          .filter((item) => item.shape.kind !== 'zone' && item.shape.kind !== 'label')
          .map((item) => (
            <ShapeView key={placed.indexOf(item)} placed={item} marker={marker} now={isNow(item)} />
          ))}
        {visible.map((item) => (
          <LabelView key={`label-${placed.indexOf(item)}`} placed={item} now={isNow(item)} size={size} />
        ))}
      </svg>
    </div>
  );
}

export function FigureScene({ block }: { block: FigureBlock }) {
  const reducedMotion = useReducedMotion();
  const parts = figureParts(block);
  const steps = parts > 1;
  const durations = useMemo(() => [1800, ...block.shows.map((show) => stepDuration(show.narration) + 600)], [block]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (steps && !reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const said = playback.index > 0 ? block.shows[playback.index - 1]?.narration : undefined;
  return (
    <div ref={frame}>
      <SceneFrame kind="Figure" title={block.title} actions={steps ? <StepControls playback={playback} /> : undefined}>
        <div className="p-5">
          <FigureView block={block} shown={playback.index} />
          {steps && (
            <p key={playback.index} className="animate-fade-up mt-3 min-h-[1.5em] max-w-3xl text-base font-semibold leading-relaxed" aria-live="polite">
              {said && <InlineMarkdown text={said} />}
            </p>
          )}
        </div>
      </SceneFrame>
    </div>
  );
}
