// <data> (entity model) and <state> (state machine with an optional narrated walk).
import { useMemo, useState } from 'react';
import type { DataBlock, StateBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { dataView, stateView, transitionId } from '../layout/levels';
import { Diagram } from './Diagram';
import {
  formatRef,
  LayoutState,
  neighbour,
  ReplayButton,
  SceneFrame,
  StepControls,
  StepNarration,
  StepProgress,
  useBoxSelection,
  useLayout,
} from './scenes';

export function DataScene({ block }: { block: DataBlock }) {
  const level = useMemo(() => dataView(block), [block]);
  const layout = useLayout(level.nodes, level.edges);
  const [replay, setReplay] = useState(0);
  const boxes = useBoxSelection(block.id);
  return (
    <SceneFrame kind="Data" title={block.title} actions={<ReplayButton onClick={() => setReplay((r) => r + 1)} />}>
      <div className="p-4">
        {layout && !(layout instanceof Error) ? (
          <Diagram layout={layout} revealKey={replay} arrows={false} ariaLabel={`Data model: ${block.title}`} {...boxes} />
        ) : (
          <LayoutState layout={layout} />
        )}
      </div>
    </SceneFrame>
  );
}

/** The state diagram, optionally at a walk step (the transition taken is highlighted). */
export function StateDiagram(props: { block: StateBlock; step?: number | undefined; revealKey?: number }) {
  const { block, step } = props;
  const level = useMemo(() => stateView(block), [block]);
  const layout = useLayout(level.nodes, level.edges);
  const reducedMotion = useReducedMotion();
  const boxes = useBoxSelection(block.id);
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
      {...boxes}
    />
  );
}

export function walkRoute(block: StateBlock, index: number): string {
  const step = block.walk[index];
  if (!step) return '';
  const label = (id: string): string => block.states.find((s) => s.id === id)?.label ?? id;
  return `${label(step.from)} → ${label(step.to)} · on “${step.event}”`;
}

export function StateScene({ block }: { block: StateBlock }) {
  const [replay, setReplay] = useState(0);
  if (block.walk.length === 0) {
    return (
      <SceneFrame kind="States" title={block.title} actions={<ReplayButton onClick={() => setReplay((r) => r + 1)} />}>
        <div className="p-4">
          <StateDiagram block={block} revealKey={replay} />
        </div>
      </SceneFrame>
    );
  }
  return <StateWalk block={block} />;
}

function StateWalk({ block }: { block: StateBlock }) {
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.walk.map((s) => stepDuration(s.narration)), [block]);
  const playback = usePlayback(durations, !reducedMotion);
  const step = block.walk[playback.index];
  const ref = step ? block.transitions[step.transition]?.ref : undefined;
  return (
    <SceneFrame kind="States" title={block.title} actions={<StepControls playback={playback} />}>
      <div className="p-4">
        <StateDiagram block={block} step={playback.index} />
      </div>
      {step && (
        <StepNarration
          index={playback.index}
          total={block.walk.length}
          route={walkRoute(block, playback.index)}
          refText={ref ? formatRef(ref) : undefined}
          narration={step.narration}
          before={neighbour(playback, playback.index - 1, block.walk.length, (i) => walkRoute(block, i))}
          after={neighbour(playback, playback.index + 1, block.walk.length, (i) => walkRoute(block, i))}
        />
      )}
      <StepProgress index={playback.index} labels={block.walk.map((s) => s.event)} onPick={playback.goTo} />
    </SceneFrame>
  );
}
