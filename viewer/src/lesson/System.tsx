// A causal system (F26): factors on a ring, signed links as curved arrows, and the loops they close with their kind
// (R reinforces, B balances). A push plays step by step: the link it follows draws, the factor it reaches lights up
// with an arrow up or down, and a factor pushed back the other way says so. In Present mode (`shown` is the current part)
// the first part is the system at rest and each step a part; on the page the same steps play with step controls.
import { useContext, useId, useLayoutEffect, useMemo, useRef } from 'react';
import type { Direction, SystemBlock } from '../../../server/src/scene.ts';
import { gsap, tokens } from '../animation/motion';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { DiagramFitContext } from '../components/Diagram';
import { Particles } from '../components/Particles';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame, StepControls } from '../components/scenes';
import { fonts, wrapText } from '../layout/elk';
import { subtitleOf } from '../presentation/subtitles';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { ASK_MS, AskCard } from './AskCard';
import { systemParts } from './askParts';
import { FACTOR, systemGeometry } from './systemLayout';

const ARROW: Record<Direction, string> = { up: '↑', down: '↓' };

export function SystemView({ block, shown }: { block: SystemBlock; shown?: number }) {
  const geometry = useMemo(() => systemGeometry(block), [block]);
  const parts = useMemo(() => systemParts(block), [block]);
  const part = parts[Math.max(0, Math.min(parts.length - 1, shown ?? parts.length - 1))];
  const ask = part?.ask;
  // How many steps have played: a question shows the system before its step.
  const index = part?.played ?? 0;
  const step = !ask && index > 0 ? block.steps[index - 1] : undefined;
  const moved = index > 0 ? (block.moved[index - 1] ?? {}) : {};
  const marker = useId().replace(/:/g, '');
  const reduced = useReducedMotion();
  const fit = useContext(DiagramFitContext);
  const svg = useRef<SVGSVGElement>(null);
  const previous = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const root = svg.current;
    const before = previous.current;
    previous.current = index;
    if (!root || before === undefined || before === index || reduced) return;
    const { dur, ease } = tokens;
    const tweens: gsap.core.Tween[] = [];
    // A solid copy of the active link draws itself, then fades into the link's own style (dashed when opposite).
    const trace = root.querySelector('.system-link.active .trace');
    if (trace && index > before) {
      tweens.push(gsap.fromTo(trace, { drawSVG: '0%', autoAlpha: 1 }, { drawSVG: '100%', duration: dur.slow, ease: ease.draw }));
      tweens.push(gsap.to(trace, { autoAlpha: 0, duration: dur.base, delay: dur.slow + dur.fast, ease: ease.out }));
    }
    const was = before > 0 ? (block.moved[before - 1] ?? {}) : {};
    for (const badge of root.querySelectorAll<SVGGElement>('.system-change')) {
      const factor = badge.dataset.factor ?? '';
      if (was[factor] === moved[factor]) continue;
      tweens.push(gsap.from(badge, { scale: 0, transformOrigin: '50% 50%', duration: dur.base, ease: ease.pop, delay: index > before ? dur.slow * 0.8 : 0 }));
    }
    return () => {
      for (const tween of tweens) tween.progress(1).kill();
    };
  }, [index, block, reduced, moved]);

  const label = new Map(block.factors.map((factor) => [factor.id, factor.label]));
  const loopName = (i: number): string => {
    const loop = block.loops[i];
    if (!loop) return '';
    const letter = loop.kind === 'reinforcing' ? 'R' : 'B';
    const same = block.loops.slice(0, i + 1).filter((other) => other.kind === loop.kind).length;
    return `${letter}${same}`;
  };

  return (
    <div className="overflow-x-auto">
      {ask && <AskCard key={`ask-${index}`} question={ask} />}
      <svg
        ref={svg}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="system mx-auto block h-auto"
        style={fit ? { width: '100%', maxWidth: geometry.width * 1.15, maxHeight: 'var(--fit-h, none)' } : { width: '100%', minWidth: geometry.width * 0.7, maxWidth: geometry.width * 1.15 }}
        role="group"
        aria-label={block.title}
      >
        <defs>
          {(['rest', 'active'] as const).map((kind) => (
            <marker key={kind} id={`${marker}-${kind}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className={`system-head ${kind}`} />
            </marker>
          ))}
        </defs>
        {block.loops.map((loop, i) => {
          const spot = geometry.loops[i];
          if (!spot) return null;
          const lines = loop.label ? wrapText(loop.label, fonts.caption, 120, 2) : [];
          return (
            <g key={i} className={cn('system-loop', loop.kind)} transform={`translate(${spot.x} ${spot.y})`}>
              <title>{`${loop.kind === 'reinforcing' ? 'Reinforcing' : 'Balancing'} loop: ${loop.through.map((id) => label.get(id) ?? id).join(' → ')}`}</title>
              <path className="system-loop-arc" d="M -15 -12 A 19 19 0 1 1 -18 6" />
              <text className="system-loop-letter" textAnchor="middle" dy="0.35em">
                {loopName(i)}
              </text>
              {lines.map((line, j) => (
                <text key={j} className="system-loop-label" textAnchor="middle" y={36 + j * 15}>
                  {line}
                </text>
              ))}
            </g>
          );
        })}
        {block.links.map((link, i) => {
          const shape = geometry.links[i];
          if (!shape) return null;
          const active = step?.link === i;
          return (
            <g key={i} className={cn('system-link', link.sign, active && 'active', step !== undefined && !active && 'dimmed')}>
              <path className="line" d={shape.path} markerEnd={`url(#${marker}-${active ? 'active' : 'rest'})`} />
              {active && <path className="trace" d={shape.path} />}
              {active && !reduced && <Particles path={shape.path} />}
              <g transform={`translate(${shape.mid.x} ${shape.mid.y})`}>
                <circle className="system-sign" r="11" />
                <text className="system-sign-text" textAnchor="middle" dy="0.36em">
                  {link.sign === 'same' ? '+' : '−'}
                </text>
                {link.label && (
                  <text className="system-link-label" textAnchor="middle" y="26">
                    {link.label}
                  </text>
                )}
              </g>
            </g>
          );
        })}
        {block.factors.map((factor) => {
          const spot = geometry.factors.get(factor.id);
          if (!spot) return null;
          const lines = wrapText(factor.label, fonts.label, FACTOR.w - 26, 2);
          const change = moved[factor.id];
          const now = step?.factor === factor.id;
          return (
            <g key={factor.id} className={cn('scene-node system-factor', now && 'current', change)} data-node-id={factor.id} transform={`translate(${spot.x - FACTOR.w / 2} ${spot.y - FACTOR.h / 2})`}>
              <rect className="shadow" x="0" y="4" width={FACTOR.w} height={FACTOR.h} rx="14" />
              <rect className="face" width={FACTOR.w} height={FACTOR.h} rx="14" />
              {lines.map((line, j) => (
                <text key={j} className="system-factor-label" x={FACTOR.w / 2} y={FACTOR.h / 2 + (j - (lines.length - 1) / 2) * 18} textAnchor="middle" dy="0.35em">
                  {line}
                </text>
              ))}
              {change && (
                <g className={cn('system-change', change, now && step?.reversed && 'reversed')} data-factor={factor.id} transform={`translate(${FACTOR.w - 6} 4)`}>
                  <title>{`${factor.label} goes ${change}${now && step?.reversed ? ', pushed back' : ''}`}</title>
                  <circle r="15" />
                  <text textAnchor="middle" dy="0.36em">
                    {ARROW[change]}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SystemScene({ block }: { block: SystemBlock }) {
  const reducedMotion = useReducedMotion();
  const parts = useMemo(() => systemParts(block), [block]);
  const steps = parts.length > 1;
  const durations = useMemo(() => parts.map((part, i) => (i === 0 ? 1800 : part.ask ? ASK_MS : stepDuration(subtitleOf(block, i) ?? '') + 400)), [block, parts]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (steps && !reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const said = subtitleOf(block, playback.index);
  return (
    <div ref={frame}>
      <SceneFrame kind="System" title={block.title} actions={steps ? <StepControls playback={playback} /> : undefined}>
        <div className="p-5">
          <SystemView block={block} shown={playback.index} />
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
