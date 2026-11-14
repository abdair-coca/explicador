// A figure (F31): a drawing of a physical thing, a raindrop and its rays, a crossing and its lights, made of the
// closed shapes of <figure>. The setting is there from the start; each <show> adds its shapes in a later part: an
// arrow or an angle draws itself, a circle, box or zone grows in. Since F32 a show also changes what is drawn, as it
// changes in reality: a shape travels along its path, takes another color, fades away or pulses, and a dot travels along
// an arrow; a show with `ask` is predicted first. The shapes a part touches stand out. In Present (`shown` is the current
// part) the narration of the part is its subtitle; on the page the parts play with step controls.
import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FigureBlock, FigureShape, Point } from '../../../server/src/scene.ts';
import { anchorOf } from '../../../server/src/parser/figureAnchor.ts';
import { gsap, tokens } from '../animation/motion';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { DiagramFitContext } from '../components/Diagram';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame, StepControls } from '../components/scenes';
import { subtitleOf } from '../presentation/subtitles';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { ASK_MS, AskCard } from './AskCard';
import { figurePartsOf, labelSize, placeFigure, touchedBy, type Placed } from './figureGeometry';
import { iconPaths, litLamp, signalLamps } from './figureIcons';

/** How much wider than its grid a figure may be drawn, in pixels per unit. */
const MAX_PX_PER_UNIT = 12;
const COLORS: FigureShape['color'][] = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray'];
const translate = ([x, y]: Point): string => `translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100})`;

function ShapeView({ placed, marker, color }: { placed: Placed; marker: string; color: FigureShape['color'] }) {
  const { shape, path } = placed;
  const className = cn('fig-shape', `fig-${shape.kind}`, `fig-${color}`);
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
          markerEnd={shape.head === 'none' ? undefined : `url(#${marker}-${color})`}
          markerStart={shape.head === 'both' ? `url(#${marker}-${color})` : undefined}
        />
      );
    case 'angle':
    case 'normal':
    case 'measure':
      return <path className={className} d={path} />;
    case 'arc':
      return (
        <path
          className={className}
          d={path}
          markerEnd={shape.head === 'none' ? undefined : `url(#${marker}-${color})`}
          markerStart={shape.head === 'both' ? `url(#${marker}-${color})` : undefined}
        />
      );
    case 'icon': {
      // Line art in its 24 × 24 box, scaled to `size` and centered on the shape's point.
      const scale = shape.size / 24;
      const lit = shape.icon === 'signal' ? litLamp(color) : undefined;
      return (
        <g className={cn(className, 'fig-icon-art', shape.icon === 'signal' && 'signal')} transform={`translate(${shape.x - shape.size / 2} ${shape.y - shape.size / 2}) scale(${scale})`}>
          <rect className="fig-icon-back" x="1" y="1" width="22" height="22" rx="6" />
          {iconPaths[shape.icon].map((d, i) => (
            <path key={i} d={d} />
          ))}
          {shape.icon === 'signal' &&
            signalLamps.map((lamp, i) => <circle key={i} className={cn('fig-lamp', i === lit && `lit fig-${lamp.color}`)} cx="12" cy={lamp.cy} r="2.4" />)}
        </g>
      );
    }
    case 'label':
      return null;
  }
}

function LabelView({ placed, size, color }: { placed: Placed; size: number; color: FigureShape['color'] }) {
  const { shape, labelAt, lines, leader } = placed;
  if (!labelAt || lines.length === 0) return null;
  return (
    <>
    {leader && (
      // A label that had to sit away from its shape (F35): a straight leader ending in a dot on the shape.
      <g className="fig-leader" aria-hidden="true">
        <line x1={leader[0][0]} y1={leader[0][1]} x2={leader[1][0]} y2={leader[1][1]} />
        <circle cx={leader[1][0]} cy={leader[1][1]} r={0.5} />
      </g>
    )}
    <text
      className={cn('fig-label', shape.kind === 'label' && 'free', `fig-${color}`)}
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
    </>
  );
}

export function FigureView({ block, shown, picked, onPick }: { block: FigureBlock; shown?: number; picked?: number | undefined; onPick?: (shape: number) => void }) {
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
  const parts = useMemo(() => figurePartsOf(block), [block]);
  const index = Math.max(0, Math.min(parts.length - 1, shown ?? parts.length - 1));
  const part = parts[index] ?? { shown: 0 };
  // The last part is the whole figure, complete and readable as a static diagram: nothing is dimmed there.
  const settled = index === parts.length - 1;
  const played = part.shown;
  const states = block.states[played] ?? block.states[0] ?? [];
  // The shapes this part touches stand out; a question shows the figure as it is before the show it asks about.
  const show = !part.ask && played > 0 ? block.shows[played - 1] : undefined;
  const touched = useMemo(() => touchedBy(show), [show]);
  const marker = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const fit = useContext(DiagramFitContext);
  const previous = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const root = svg.current;
    const before = previous.current;
    previous.current = played;
    if (!root || before === undefined || played !== before + 1 || !show || reduced) return;
    const { dur, ease } = tokens;
    const tweens: gsap.core.Tween[] = [];
    const group = (index: number): SVGGElement | null => root.querySelector(`[data-shape="${index}"]`);
    const was = block.states[before] ?? [];
    // What appears: lines draw themselves, areas grow in, labels rise.
    const fresh = show.items.map(group).filter((g): g is SVGGElement => g !== null);
    const lines = fresh.flatMap((g) => [...g.querySelectorAll('.fig-arrow, .fig-angle, .fig-normal, .fig-arc, .fig-measure')]);
    const solids = fresh.flatMap((g) => [...g.querySelectorAll('.fig-circle, .fig-box, .fig-zone, .fig-icon')]);
    const labels = fresh.flatMap((g) => [...g.querySelectorAll('.fig-label')]);
    if (solids.length > 0) tweens.push(gsap.from(solids, { scale: 0.4, autoAlpha: 0, transformOrigin: '50% 50%', duration: dur.base, ease: ease.pop, stagger: 0.08 }));
    if (lines.length > 0) tweens.push(gsap.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur.slow, ease: ease.draw, stagger: 0.15 }));
    if (labels.length > 0) tweens.push(gsap.from(labels, { autoAlpha: 0, y: 1.5, duration: dur.base, ease: ease.out, delay: dur.base, stagger: 0.08 }));
    // What moves travels along its path, from where it was.
    for (const move of show.moves) {
      const g = group(move.shape);
      const shape = block.shapes[move.shape];
      if (!g || !shape) continue;
      const [ax, ay] = anchorOf(shape);
      const from = was[move.shape]?.offset ?? [0, 0];
      const stops = move.path.map(([x, y]): Point => [x - ax, y - ay]);
      const leg = (dur.slow * 2) / stops.length;
      tweens.push(
        gsap.fromTo(
          g,
          { attr: { transform: translate(from) } },
          { keyframes: stops.map((stop) => ({ attr: { transform: translate(stop) }, duration: leg, ease: 'none' })), ease: ease.move },
        ),
      );
    }
    // What pulses swells a few times; a dot travels along each flowing arrow.
    for (const index of show.pulses) {
      const body = group(index)?.querySelector('.fig-body');
      if (body) tweens.push(gsap.fromTo(body, { scale: 1 }, { scale: 1.18, transformOrigin: '50% 50%', duration: dur.base, ease: ease.out, yoyo: true, repeat: 3 }));
    }
    for (const index of show.flows) {
      const g = group(index);
      const path = g?.querySelector<SVGPathElement>('.fig-arrow, .fig-arc');
      const dot = g?.querySelector('.fig-dot');
      if (!path || !dot) continue;
      tweens.push(
        gsap.fromTo(
          dot,
          { autoAlpha: 1 },
          { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, duration: dur.slow * 2, ease: 'power1.inOut', repeat: 2, delay: show.items.includes(index) ? dur.slow : 0 },
        ),
      );
    }
    return () => {
      for (const tween of tweens) tween.progress(1).kill();
    };
  }, [played, show, block, reduced]);

  const visible = placed.map((item, i) => ({ item, i })).filter(({ item }) => item.shape.appear <= played);
  const width = block.width * MAX_PX_PER_UNIT;
  const layer = (kinds: (kind: FigureShape['kind']) => boolean) =>
    visible
      .filter(({ item }) => kinds(item.shape.kind))
      .map(({ item, i }) => {
        const state = states[i];
        const color = state?.color ?? item.shape.color;
        const flowing = show?.flows.includes(i) && !reduced;
        // On the page a shape with a description opens it when clicked (F35).
        const pickable = onPick !== undefined && item.shape.desc !== undefined && !state?.hidden;
        const name = item.shape.kind === 'label' ? item.shape.text : (item.shape.label ?? item.shape.id ?? '');
        return (
          <g
            key={i}
            data-shape={i}
            transform={translate(state?.offset ?? [0, 0])}
            className={cn('fig-item', touched.has(i) && 'now', show !== undefined && !settled && !touched.has(i) && 'rest', state?.hidden && 'gone', pickable && 'pickable', picked === i && 'picked')}
            {...(pickable
              ? {
                  role: 'button',
                  tabIndex: 0,
                  'aria-pressed': picked === i,
                  'aria-label': `${name}: ${item.shape.desc ?? ''}`,
                  onClick: () => onPick(i),
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onPick(i);
                  },
                }
              : {})}
          >
            <g className="fig-body">
              <ShapeView placed={item} marker={marker} color={color} />
              {flowing && <circle className={cn('fig-dot', `fig-${color}`)} r={1.2} />}
            </g>
            <LabelView placed={item} size={size} color={color} />
          </g>
        );
      });
  return (
    <div className="overflow-x-auto">
      {part.ask && <AskCard key={`ask-${played}`} question={part.ask} />}
      <svg
        ref={svg}
        viewBox={`0 0 ${block.width} ${block.height}`}
        className="figure mx-auto block h-auto"
        style={fit ? { width: '100%', maxWidth: width, maxHeight: 'var(--fit-h, none)' } : { width: '100%', maxWidth: width }}
        role="group"
        aria-label={[block.title, ...visible.filter(({ i }) => !states[i]?.hidden).flatMap(({ item }) => item.lines.join(' ') || [])].join('. ')}
      >
        <defs>
          {COLORS.map((color) => (
            <marker key={color} id={`${marker}-${color}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={`fig-head fig-${color}`} />
            </marker>
          ))}
        </defs>
        {/* Areas under everything, then the other shapes; free labels last, on top. */}
        {layer((kind) => kind === 'zone')}
        {layer((kind) => kind !== 'zone' && kind !== 'label')}
        {layer((kind) => kind === 'label')}
      </svg>
    </div>
  );
}

export function FigureScene({ block }: { block: FigureBlock }) {
  const reducedMotion = useReducedMotion();
  const parts = useMemo(() => figurePartsOf(block), [block]);
  const steps = parts.length > 1;
  const durations = useMemo(() => parts.map((part, i) => (i === 0 ? 1800 : part.ask ? ASK_MS : stepDuration(subtitleOf(block, i) ?? '') + 900)), [block, parts]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (steps && !reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const said = subtitleOf(block, playback.index);
  const [picked, setPicked] = useState<number>();
  const shape = picked === undefined ? undefined : block.shapes[picked];
  return (
    <div ref={frame}>
      <SceneFrame kind="Figure" title={block.title} actions={steps ? <StepControls playback={playback} /> : undefined}>
        <div className="p-5">
          <FigureView block={block} shown={playback.index} picked={picked} onPick={(i) => setPicked((now) => (now === i ? undefined : i))} />
          {shape?.desc && (
            <p className="fig-desc animate-fade-up" role="status" onKeyDown={(event) => event.key === 'Escape' && setPicked(undefined)}>
              <strong>{shape.kind === 'label' ? shape.text : (shape.label ?? shape.id)}</strong> {shape.desc}
            </p>
          )}
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
