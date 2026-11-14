// A structure drawn as itself, state by state (F25): a tree growing value by value, an organization moving a team.
// Between two states nothing is redrawn from scratch: each member glides from its old place to its new one, a new
// member grows out of its parent, a removed one fades where it was, and the members the step points at light up. A step
// taken back plays the same way backwards. In Present mode (`shown` is the current part) each state is a part; on the
// page the states play with step controls and the narration of the step shows under the picture.
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { StructureBlock } from '../../../server/src/scene.ts';
import { gsap, tokens } from '../animation/motion';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame, StepControls } from '../components/scenes';
import { subtitleOf } from '../presentation/subtitles';
import { cn } from '@/lib/utils';
import { useFirstVisible } from './hooks';
import { ASK_MS, AskCard } from './AskCard';
import { structureParts } from './askParts';
import { layoutStructure, spotOf, type Spot } from './structureLayout';

const pct = (n: number): string => `${(n * 100).toFixed(3)}%`;
const LINK_SCALE = 100;

export function StructureView({ block, shown }: { block: StructureBlock; shown?: number }) {
  const layout = useMemo(() => layoutStructure(block), [block]);
  const parts = useMemo(() => structureParts(block), [block]);
  const part = parts[Math.max(0, Math.min(parts.length - 1, shown ?? parts.length - 1))];
  const ask = part?.ask;
  // A question shows the state before its change (-1: nothing yet), without that state's marks.
  const index = part?.state ?? 0;
  const state = block.states[index] ?? { members: [], mark: [], added: [] };
  const places = new Map(state.members.map((place) => [place.id, place]));
  const marked = new Set(ask ? [] : state.mark);
  const added = new Set(ask ? [] : state.added);
  const upcoming = ask ? block.states[index + 1]?.change : state.change;
  const change = upcoming === undefined ? undefined : block.changes[upcoming];
  const reduced = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const previous = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const root = frame.current;
    const before = previous.current;
    previous.current = index;
    if (!root || before === undefined || before === index || reduced) return;
    const was = new Map((block.states[before]?.members ?? []).map((place) => [place.id, place]));
    const spotThen = (id: string): Spot | undefined => layout.states[before]?.get(id);
    /** Where a member starts its move: its old place, or, when it is new, its parent's old place. */
    const startOf = (id: string): Spot | undefined => {
      if (was.has(id)) return spotThen(id);
      const parent = places.get(id)?.parent;
      return (parent !== undefined ? spotThen(parent) : undefined) ?? spotOf(layout, id, index);
    };
    const { dur, ease } = tokens;
    const tweens: gsap.core.Tween[] = [];
    for (const element of root.querySelectorAll<HTMLElement>('.structure-member')) {
      const id = element.dataset.id ?? '';
      const start = startOf(id);
      const there = was.has(id);
      const here = places.has(id);
      if (!start || (!there && !here)) continue;
      tweens.push(
        gsap.from(element, {
          left: pct(start.x),
          top: pct(start.y),
          autoAlpha: there ? 1 : 0,
          scale: there || !here ? 1 : 0.3,
          duration: there && here ? dur.slow : dur.base,
          ease: there && here ? ease.move : here ? ease.pop : ease.out,
          delay: !there && here ? dur.fast : 0,
        }),
      );
    }
    for (const element of root.querySelectorAll<SVGLineElement>('.structure-link')) {
      const id = element.dataset.id ?? '';
      const parentThen = was.get(id)?.parent;
      const end = startOf(id);
      const from = parentThen !== undefined ? spotThen(parentThen) : startOf(places.get(id)?.parent ?? id);
      if (!end || !from) continue;
      tweens.push(
        gsap.from(element, {
          attr: { x1: from.x * LINK_SCALE, y1: from.y * LINK_SCALE, x2: end.x * LINK_SCALE, y2: end.y * LINK_SCALE },
          autoAlpha: parentThen !== undefined ? 1 : 0,
          duration: dur.slow,
          ease: ease.move,
        }),
      );
    }
    return () => {
      for (const tween of tweens) tween.progress(1).kill();
    };
  }, [index, block, layout, reduced]);

  return (
    <div className="structure-wrap">
      {change && (
        <p key={index} className="structure-step animate-fade-up">
          {change.label}
        </p>
      )}
      {ask && <AskCard key={`ask-${index}`} question={ask} />}
      <div className="structure-scroll">
        <div
          ref={frame}
          className={cn('structure', block.direction === 'right' ? 'structure-right' : 'structure-down')}
          style={{ '--slots': layout.slots, '--levels': layout.levels } as React.CSSProperties}
        >
          <svg className="structure-links" viewBox={`0 0 ${LINK_SCALE} ${LINK_SCALE}`} preserveAspectRatio="none" aria-hidden="true">
            {block.members.map((member) => {
              const place = places.get(member.id);
              const spot = spotOf(layout, member.id, index);
              const parent = place?.parent === undefined ? undefined : layout.states[index]?.get(place.parent);
              if (!spot) return null;
              const from = parent ?? spot;
              return (
                <line
                  key={member.id}
                  data-id={member.id}
                  className={cn('structure-link', place?.parent !== undefined && marked.has(place.parent) && (marked.has(member.id) || added.has(member.id)) && 'marked')}
                  x1={from.x * LINK_SCALE}
                  y1={from.y * LINK_SCALE}
                  x2={spot.x * LINK_SCALE}
                  y2={spot.y * LINK_SCALE}
                  style={{ opacity: parent ? 1 : 0 }}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {block.members.map((member) => {
            const spot = spotOf(layout, member.id, index);
            const here = places.has(member.id);
            if (!spot) return null;
            return (
              <div
                key={member.id}
                data-id={member.id}
                className={cn('structure-member', marked.has(member.id) && 'marked', added.has(member.id) && 'fresh', here && places.get(member.id)?.parent === undefined && 'root')}
                style={{ left: pct(spot.x), top: pct(spot.y), opacity: here ? 1 : 0, visibility: here ? 'visible' : 'hidden' }}
                aria-hidden={here ? undefined : true}
              >
                <span className="structure-label">{member.label}</span>
                {member.desc && <span className="structure-desc">{member.desc}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function StructureScene({ block }: { block: StructureBlock }) {
  const reducedMotion = useReducedMotion();
  const parts = useMemo(() => structureParts(block), [block]);
  const steps = parts.length > 1;
  const durations = useMemo(() => parts.map((part, i) => (part.ask ? ASK_MS : stepDuration(subtitleOf(block, i) ?? '') + 600)), [block, parts]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (steps && !reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const said = subtitleOf(block, playback.index);
  return (
    <div ref={frame}>
      <SceneFrame kind="Structure" title={block.title} actions={steps ? <StepControls playback={playback} /> : undefined}>
        <div className="p-5">
          <StructureView block={block} shown={playback.index} />
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
