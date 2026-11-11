// The data's path through a notebook: stage tiles in reading order, played one by one like a flow. The active
// stage's size counts up, a dot runs along the arrow that reaches it, and the narration says why it matters.
import { Fragment, useMemo, useRef } from 'react';
import type { JourneyBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { tourFromJourney } from '../code/tourFrom';
import { ArrowRightIcon, kindIcon } from '../components/icons';
import { formatRef, neighbour, SceneFrame, StepControls, StepNarration, StepProgress, TourButton, useBoxSelection } from '../components/scenes';
import { cn } from '@/lib/utils';
import { codeBreaks } from './breaks';
import { CountUp } from './CountUp';
import { useFirstVisible, useFollowCode } from './hooks';

export function stageRoute(block: JourneyBlock, index: number): string {
  const stage = block.stages[index];
  return stage ? [stage.label, stage.value].filter(Boolean).join(' · ') : '';
}

/** The stage tiles with stage `index` active; clicking one picks it and opens its details. */
export function JourneyTrack(props: { block: JourneyBlock; index: number; onPick?: (index: number) => void }) {
  const { block, index } = props;
  const boxes = useBoxSelection(block.id);
  return (
    <ol className="flex flex-wrap items-stretch gap-y-4" aria-label={`Stages: ${block.title}`}>
      {block.stages.map((stage, i) => {
        const asked = boxes.asked?.get(stage.id);
        return (
          <li key={stage.id} className="flex min-w-[10.5rem] max-w-[22rem] flex-1 basis-[11.5rem] items-stretch">
            {i > 0 && (
              <span className={cn('journey-link', i <= index && 'done')} aria-hidden="true">
                <ArrowRightIcon size={20} />
                {i === index && <span key={index} className="travel" />}
              </span>
            )}
            <button
              type="button"
              data-node-id={stage.id}
              aria-current={i === index ? 'step' : undefined}
              aria-label={`Stage ${i + 1}: ${stage.label}${stage.value ? `, ${stage.value}` : ''}`}
              onClick={(event) => {
                props.onPick?.(i);
                boxes.onNodeClick?.(stage.id, event.currentTarget);
              }}
              className={cn(
                'journey-stage relative flex min-w-0 flex-1 flex-col items-start gap-1.5 rounded-2xl px-4 py-3 text-left',
                i < index ? 'done' : i === index ? 'active' : 'upcoming',
                boxes.selected === stage.id && 'selected',
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-white', `kind-${stage.kind}`)} style={{ background: 'var(--kind)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {kindIcon[stage.kind].map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{i + 1}</span>
                {asked !== undefined && (
                  <span className={cn('ml-auto grid h-5 w-5 place-items-center rounded-full border-2 border-foreground bg-primary text-[11px] font-black', asked && 'animate-pulse')}>
                    ?
                  </span>
                )}
              </span>
              {stage.op && (
                <code className="op-pill">
                  →{'\u00a0'}
                  {codeBreaks(stage.op).map((part, k) => (
                    <Fragment key={k}>
                      {k > 0 && <wbr />}
                      {part}
                    </Fragment>
                  ))}
                </code>
              )}
              {stage.value && (
                <span className="text-2xl font-black leading-tight tracking-tight">
                  {i === index ? <CountUp key={index} text={stage.value} /> : stage.value}
                </span>
              )}
              <span className="text-sm font-bold leading-snug">{stage.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function JourneyScene({ block }: { block: JourneyBlock }) {
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.stages.map((stage) => stepDuration(stage.narration) + 600), [block]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  // It starts playing the first time the reader reaches it, not while it is still off screen.
  useFirstVisible(frame, () => {
    if (!reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const stage = block.stages[playback.index];
  useFollowCode(stage?.ref);
  const tour = useMemo(() => tourFromJourney(block), [block]);
  const count = block.stages.length;
  return (
    <div ref={frame}>
      <SceneFrame
        kind="Journey"
        title={block.title}
        actions={
          <>
            <TourButton tour={tour} />
            <StepControls playback={playback} />
          </>
        }
      >
        <div className="p-4 sm:p-5">
          <JourneyTrack block={block} index={playback.index} onPick={playback.goTo} />
        </div>
        {stage && (
          <StepNarration
            index={playback.index}
            total={count}
            route={stageRoute(block, playback.index)}
            refText={stage.ref ? formatRef(stage.ref) : undefined}
            narration={stage.narration}
            before={neighbour(playback, playback.index - 1, count, (i) => stageRoute(block, i))}
            after={neighbour(playback, playback.index + 1, count, (i) => stageRoute(block, i))}
          />
        )}
        <StepProgress index={playback.index} labels={block.stages.map((s) => s.label)} onPick={playback.goTo} />
      </SceneFrame>
    </div>
  );
}
