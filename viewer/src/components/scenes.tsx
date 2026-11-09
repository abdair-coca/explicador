// <arch> and <flow> scenes: layout, reveal animation and step playback.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ArchBlock, FlowBlock, Ref } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { boxWithin, zoomIn, zoomOut, type Box } from '../animation/zoom';
import { layoutGraph, type EdgeInput, type Layout } from '../layout/elk';
import { archLevel, withDrills, type ViewNode } from '../layout/levels';
import { Diagram } from './Diagram';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/** Asks to go deeper from a node: the App sends the click to the server. */
export type DrillHandler = (blockId: string, nodeId: string, element: Element) => void;

function useLayout(nodes: ViewNode[], edges: EdgeInput[]): Layout | Error | undefined {
  const [layout, setLayout] = useState<Layout | Error>();
  useEffect(() => {
    let live = true;
    setLayout(undefined);
    layoutGraph(nodes, edges).then(
      (result) => live && setLayout(result),
      (error: unknown) => live && setLayout(error instanceof Error ? error : new Error(String(error))),
    );
    return () => {
      live = false;
    };
  }, [nodes, edges]);
  return layout;
}

function SceneFrame(props: {
  kind: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{props.kind}</span>
          <h2 className="flex min-w-0 flex-wrap items-baseline gap-1 text-base font-semibold">{props.title}</h2>
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

type Zoom = { direction: 'in'; from: Box | undefined } | { direction: 'out'; focus: string } | undefined;

export function ArchScene({ block, onDrill }: { block: ArchBlock; onDrill?: DrillHandler | undefined }) {
  // Open groups, outermost first; empty at the top level.
  const [path, setPath] = useState<string[]>([]);
  const [zoom, setZoom] = useState<Zoom>();
  const [replay, setReplay] = useState(0);
  const open = path.at(-1);
  const level = useMemo(() => archLevel(block, open), [block, open]);
  const layout = useLayout(level.nodes, level.edges);
  const stage = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element || !zoom || !layout || layout instanceof Error) return;
    if (zoom.direction === 'in') zoomIn(element, zoom.from);
    else {
      const focus = element.querySelector(`[data-node-id="${CSS.escape(zoom.focus)}"]`);
      zoomOut(element, focus ? boxWithin(focus, element) : undefined);
    }
    setZoom(undefined);
  }, [layout, zoom]);

  const clickNode = (id: string, element: Element): void => {
    if (block.groups.some((g) => g.id === id)) {
      setZoom({ direction: 'in', from: stage.current ? boxWithin(element, stage.current) : undefined });
      setPath((p) => [...p, id]);
      setReplay((r) => r + 1);
      return;
    }
    onDrill?.(block.id, id, element);
  };
  const goUp = (depth: number): void => {
    const focus = path[depth];
    if (focus === undefined) return;
    setZoom({ direction: 'out', focus });
    setPath((p) => p.slice(0, depth));
    setReplay((r) => r + 1);
  };
  const groupLabel = (id: string): string => block.groups.find((g) => g.id === id)?.label ?? id;

  return (
    <SceneFrame
      kind="Architecture"
      title={
        path.length === 0 ? (
          block.title
        ) : (
          <nav aria-label="Zoom levels" className="flex flex-wrap items-baseline gap-1">
            <button type="button" className="text-primary hover:underline" onClick={() => goUp(0)}>
              {block.title}
            </button>
            {path.map((id, i) => (
              <span key={id} className="flex items-baseline gap-1">
                <span className="text-muted-foreground">›</span>
                {i === path.length - 1 ? (
                  <span aria-current="location">{groupLabel(id)}</span>
                ) : (
                  <button type="button" className="text-primary hover:underline" onClick={() => goUp(i + 1)}>
                    {groupLabel(id)}
                  </button>
                )}
              </span>
            ))}
          </nav>
        )
      }
      actions={
        <>
          {path.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => goUp(path.length - 1)} aria-label="Zoom out">
              ⤡ Zoom out
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setReplay((r) => r + 1)} aria-label="Replay animation">
            ↻ Replay
          </Button>
        </>
      }
    >
      <div className="overflow-hidden p-4">
        <div ref={stage}>
          {layout && !(layout instanceof Error) ? (
            <Diagram
              layout={layout}
              revealKey={replay}
              ariaLabel={`Architecture diagram: ${block.title}`}
              onNodeClick={clickNode}
              isClickable={(node) => node.role === 'group' || onDrill !== undefined}
            />
          ) : (
            <LayoutState layout={layout} />
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

export function formatRef(ref: Ref): string {
  return `${ref.path}${ref.start ? `:${ref.start}${ref.end ? `-${ref.end}` : ''}` : ''}`;
}

/** Flow edges: one per ordered pair of participants that talk to each other. */
function flowEdges(block: FlowBlock): EdgeInput[] {
  const seen = new Map<string, EdgeInput>();
  for (const step of block.steps) {
    if (!step.to || step.to === step.from) continue;
    const id = `${step.from}->${step.to}`;
    if (!seen.has(id)) seen.set(id, { id, from: step.from, to: step.to });
  }
  return [...seen.values()];
}

/** The diagram of a flow with one step highlighted; used inline and in presentation mode. */
export function FlowDiagram(props: { block: FlowBlock; index: number; onDrill?: DrillHandler | undefined }) {
  const { block, index, onDrill } = props;
  const edges = useMemo(() => flowEdges(block), [block]);
  const nodes = useMemo(() => withDrills(block.nodes, block.drills), [block]);
  const layout = useLayout(nodes, edges);
  const reducedMotion = useReducedMotion();
  const step = block.steps[index];
  const activeNodes = useMemo(() => new Set(step ? [step.from, step.to ?? step.from] : []), [step]);
  const activeEdge = step?.to && step.to !== step.from ? `${step.from}->${step.to}` : undefined;
  if (!layout || layout instanceof Error) return <LayoutState layout={layout} />;
  return (
    <Diagram
      layout={layout}
      activeNodes={activeNodes}
      {...(activeEdge ? { activeEdge } : {})}
      {...(step?.label ? { activeLabel: step.label } : {})}
      {...(step && !activeEdge ? { pulseNode: step.from } : {})}
      tokenKey={index}
      reducedMotion={reducedMotion}
      ariaLabel={`Flow diagram: ${block.title}`}
      {...(onDrill ? { onNodeClick: (id: string, element: Element) => onDrill(block.id, id, element) } : {})}
    />
  );
}

export function stepRoute(block: FlowBlock, index: number): string {
  const step = block.steps[index];
  if (!step) return '';
  const label = (id: string): string => block.nodes.find((n) => n.id === id)?.label ?? id;
  return `${label(step.from)}${step.to && step.to !== step.from ? ` → ${label(step.to)}` : ''}${step.label ? ` · ${step.label}` : ''}`;
}

export function FlowScene({ block, onDrill }: { block: FlowBlock; onDrill?: DrillHandler | undefined }) {
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.steps.map((s) => stepDuration(s.narration)), [block]);
  const playback = usePlayback(durations, !reducedMotion);
  const step = block.steps[playback.index];
  const total = block.steps.length;

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
        <FlowDiagram block={block} index={playback.index} onDrill={onDrill} />
      </div>
      {step && (
        <div className="border-t border-border px-4 py-3" aria-live="polite">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-active">
              Step {playback.index + 1} of {total}
            </span>
            <span>{stepRoute(block, playback.index)}</span>
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
