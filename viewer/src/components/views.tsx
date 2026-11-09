// <data> (entity model) and <state> (state machine with an optional narrated walk).
import { useMemo, useState } from 'react';
import type { DataBlock, StateBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { dataView, stateView, transitionId } from '../layout/levels';
import { Diagram } from './Diagram';
import { LayoutState, SceneFrame, useLayout, type DrillHandler } from './scenes';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function DataScene({ block, onDrill }: { block: DataBlock; onDrill?: DrillHandler | undefined }) {
  const level = useMemo(() => dataView(block), [block]);
  const layout = useLayout(level.nodes, level.edges);
  const [replay, setReplay] = useState(0);
  return (
    <SceneFrame
      kind="Data"
      title={block.title}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)} aria-label="Replay animation">
          ↻ Replay
        </Button>
      }
    >
      <div className="p-4">
        {layout && !(layout instanceof Error) ? (
          <Diagram
            layout={layout}
            revealKey={replay}
            arrows={false}
            ariaLabel={`Data model: ${block.title}`}
            {...(onDrill ? { onNodeClick: (id: string, element: Element) => onDrill(block.id, id, element) } : {})}
          />
        ) : (
          <LayoutState layout={layout} />
        )}
      </div>
    </SceneFrame>
  );
}

/** The state diagram, optionally at a walk step (the transition taken is highlighted). */
export function StateDiagram(props: {
  block: StateBlock;
  step?: number | undefined;
  revealKey?: number;
  onDrill?: DrillHandler | undefined;
}) {
  const { block, step, onDrill } = props;
  const level = useMemo(() => stateView(block), [block]);
  const layout = useLayout(level.nodes, level.edges);
  const reducedMotion = useReducedMotion();
  const current = step === undefined ? undefined : block.walk[step];
  const activeNodes = useMemo(() => new Set(current ? [current.from, current.to] : []), [current]);
  if (!layout || layout instanceof Error) return <LayoutState layout={layout} />;
  return (
    <Diagram
      layout={layout}
      {...(props.revealKey !== undefined ? { revealKey: props.revealKey } : {})}
      {...(current ? { activeNodes, activeEdge: transitionId(current.transition), pulseNode: current.to } : {})}
      tokenKey={step ?? 0}
      reducedMotion={reducedMotion}
      ariaLabel={`State machine: ${block.title}`}
      {...(onDrill ? { onNodeClick: (id: string, element: Element) => onDrill(block.id, id, element) } : {})}
    />
  );
}

export function walkRoute(block: StateBlock, index: number): string {
  const step = block.walk[index];
  if (!step) return '';
  const label = (id: string): string => block.states.find((s) => s.id === id)?.label ?? id;
  return `${label(step.from)} → ${label(step.to)} · on “${step.event}”`;
}

export function StateScene({ block, onDrill }: { block: StateBlock; onDrill?: DrillHandler | undefined }) {
  const [replay, setReplay] = useState(0);
  if (block.walk.length === 0) {
    return (
      <SceneFrame
        kind="States"
        title={block.title}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)} aria-label="Replay animation">
            ↻ Replay
          </Button>
        }
      >
        <div className="p-4">
          <StateDiagram block={block} revealKey={replay} onDrill={onDrill} />
        </div>
      </SceneFrame>
    );
  }
  return <StateWalk block={block} onDrill={onDrill} />;
}

function StateWalk({ block, onDrill }: { block: StateBlock; onDrill?: DrillHandler | undefined }) {
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.walk.map((s) => stepDuration(s.narration)), [block]);
  const playback = usePlayback(durations, !reducedMotion);
  const step = block.walk[playback.index];
  const ref = step ? block.transitions[step.transition]?.ref : undefined;
  return (
    <SceneFrame
      kind="States"
      title={block.title}
      actions={
        <>
          <Button variant="ghost" size="icon" onClick={playback.prev} disabled={playback.index === 0} aria-label="Previous step">
            ⏮
          </Button>
          <Button variant="outline" size="sm" onClick={playback.toggle} aria-label={playback.playing ? 'Pause' : 'Play'}>
            {playback.playing ? '⏸ Pause' : playback.atEnd ? '↻ Replay' : '▶ Play'}
          </Button>
          <Button variant="ghost" size="icon" onClick={playback.next} disabled={playback.atEnd} aria-label="Next step">
            ⏭
          </Button>
        </>
      }
    >
      <div className="p-4">
        <StateDiagram block={block} step={playback.index} onDrill={onDrill} />
      </div>
      {step && (
        <div className="border-t border-border px-4 py-3" aria-live="polite">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-active">
              Step {playback.index + 1} of {block.walk.length}
            </span>
            <span>{walkRoute(block, playback.index)}</span>
            {ref && (
              <code className="rounded bg-muted px-1.5 py-0.5">
                {ref.path}
                {ref.start ? `:${ref.start}${ref.end ? `-${ref.end}` : ''}` : ''}
              </code>
            )}
          </div>
          <p className="text-[15px] leading-relaxed">{step.narration}</p>
        </div>
      )}
      <ol className="flex gap-1 border-t border-border px-4 py-3" aria-label="Steps">
        {block.walk.map((s, i) => (
          <li key={i} className="flex-1">
            <button
              type="button"
              onClick={() => playback.goTo(i)}
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                i === playback.index ? 'bg-active' : i < playback.index ? 'bg-primary/50' : 'bg-muted',
              )}
              aria-label={`Step ${i + 1}: ${s.event}`}
              aria-current={i === playback.index ? 'step' : undefined}
            />
          </li>
        ))}
      </ol>
    </SceneFrame>
  );
}
