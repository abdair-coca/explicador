// <arch> and <flow> scenes: layout, reveal animation and step playback.
import { useEffect, useMemo, useState } from 'react';
import type { ArchBlock, FlowBlock, Ref } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { layoutGraph, type EdgeInput, type Layout } from '../layout/elk';
import { Diagram } from './Diagram';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

function useLayout(block: ArchBlock | FlowBlock, edges: EdgeInput[]): Layout | Error | undefined {
  const [layout, setLayout] = useState<Layout | Error>();
  useEffect(() => {
    let live = true;
    setLayout(undefined);
    layoutGraph(block.nodes, edges).then(
      (result) => live && setLayout(result),
      (error: unknown) => live && setLayout(error instanceof Error ? error : new Error(String(error))),
    );
    return () => {
      live = false;
    };
  }, [block, edges]);
  return layout;
}

function SceneFrame(props: { kind: string; title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{props.kind}</span>
          <h2 className="text-base font-semibold">{props.title}</h2>
        </div>
        <div className="flex items-center gap-1">{props.actions}</div>
      </header>
      {props.children}
    </section>
  );
}

function LayoutState(props: { layout: Layout | Error | undefined }) {
  if (props.layout instanceof Error) {
    return <p className="p-6 text-sm text-red-600">Layout failed: {props.layout.message}</p>;
  }
  return <p className="p-6 text-sm text-muted-foreground">Laying out…</p>;
}

export function ArchScene({ block }: { block: ArchBlock }) {
  const edges = useMemo(
    () => block.edges.map((e, i) => ({ id: `e${i}`, from: e.from, to: e.to, ...(e.label ? { label: e.label } : {}) })),
    [block],
  );
  const layout = useLayout(block, edges);
  const [replay, setReplay] = useState(0);
  return (
    <SceneFrame
      kind="Architecture"
      title={block.title}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)} aria-label="Replay animation">
          ↻ Replay
        </Button>
      }
    >
      <div className="p-4">
        {layout && !(layout instanceof Error) ? (
          <Diagram layout={layout} revealKey={replay} ariaLabel={`Architecture diagram: ${block.title}`} />
        ) : (
          <LayoutState layout={layout} />
        )}
      </div>
    </SceneFrame>
  );
}

export function formatRef(ref: Ref): string {
  return `${ref.path}${ref.start ? `:${ref.start}${ref.end ? `-${ref.end}` : ''}` : ''}`;
}

export function FlowScene({ block }: { block: FlowBlock }) {
  // One edge per ordered pair of participants that talk to each other.
  const edges = useMemo(() => {
    const seen = new Map<string, EdgeInput>();
    for (const step of block.steps) {
      if (!step.to || step.to === step.from) continue;
      const id = `${step.from}->${step.to}`;
      if (!seen.has(id)) seen.set(id, { id, from: step.from, to: step.to });
    }
    return [...seen.values()];
  }, [block]);
  const layout = useLayout(block, edges);
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.steps.map((s) => stepDuration(s.narration)), [block]);
  const playback = usePlayback(durations, !reducedMotion);
  const step = block.steps[playback.index];
  const total = block.steps.length;

  const activeNodes = useMemo(() => new Set(step ? [step.from, step.to ?? step.from] : []), [step]);
  const activeEdge = step?.to && step.to !== step.from ? `${step.from}->${step.to}` : undefined;
  const nodeLabel = (id: string | undefined): string => block.nodes.find((n) => n.id === id)?.label ?? id ?? '';

  return (
    <SceneFrame
      kind="Flow"
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
        {layout && !(layout instanceof Error) ? (
          <Diagram
            layout={layout}
            activeNodes={activeNodes}
            {...(activeEdge ? { activeEdge } : {})}
            {...(step?.label ? { activeLabel: step.label } : {})}
            {...(step && !activeEdge ? { pulseNode: step.from } : {})}
            tokenKey={playback.index}
            reducedMotion={reducedMotion}
            ariaLabel={`Flow diagram: ${block.title}`}
          />
        ) : (
          <LayoutState layout={layout} />
        )}
      </div>
      {step && (
        <div className="border-t border-border px-4 py-3" aria-live="polite">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-active">
              Step {playback.index + 1} of {total}
            </span>
            <span>
              {nodeLabel(step.from)}
              {step.to && step.to !== step.from ? ` → ${nodeLabel(step.to)}` : ''}
              {step.label ? ` · ${step.label}` : ''}
            </span>
            {step.ref && <code className="rounded bg-muted px-1.5 py-0.5">{formatRef(step.ref)}</code>}
          </div>
          <p className="text-[15px] leading-relaxed">{step.narration}</p>
        </div>
      )}
      <ol className="flex gap-1 border-t border-border px-4 py-3" aria-label="Steps">
        {block.steps.map((s, i) => (
          <li key={i} className="flex-1">
            <button
              type="button"
              onClick={() => playback.goTo(i)}
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                i === playback.index ? 'bg-active' : i < playback.index ? 'bg-primary/50' : 'bg-muted',
              )}
              aria-label={`Step ${i + 1}: ${s.label ?? s.narration.slice(0, 60)}`}
              aria-current={i === playback.index ? 'step' : undefined}
            />
          </li>
        ))}
      </ol>
    </SceneFrame>
  );
}
