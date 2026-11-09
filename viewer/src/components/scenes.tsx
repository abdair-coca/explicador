// <arch> and <flow> scenes: layout, reveal animation and step playback; shared scene chrome.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ArchBlock, FlowBlock, LinkKind, Ref } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion, type Playback } from '../animation/playback';
import { boxWithin, zoomIn, zoomOut, type Box } from '../animation/zoom';
import { layoutGraph, type EdgeInput, type Layout } from '../layout/elk';
import { archLevel, linkId, withDrills, type ViewNode } from '../layout/levels';
import { Diagram } from './Diagram';
import { ArrowLeftIcon, ArrowRightIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, ReplayIcon, ZoomOutIcon } from './icons';
import { askedIn, selectedIn, useSelection } from './selection';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/** Asks to go deeper from a node ("Go deeper" in the detail panel): the App sends the click to the server. */
export type DrillHandler = (blockId: string, nodeId: string, element: Element) => void;

/** Click handler and highlight for a block's boxes, from the selection; none in presentation mode. */
export function useBoxSelection(blockId: string): {
  onNodeClick?: (id: string, element: Element) => void;
  selected?: string | undefined;
  asked?: ReadonlyMap<string, boolean> | undefined;
} {
  const selection = useSelection();
  if (!selection) return {};
  return {
    onNodeClick: (id, element) => selection.select(blockId, id, element),
    selected: selectedIn(selection, blockId),
    asked: askedIn(selection, blockId),
  };
}

export function useLayout(nodes: ViewNode[], edges: EdgeInput[]): Layout | Error | undefined {
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

/** A Titi information card holding one scene block. */
export function SceneFrame(props: {
  kind: string;
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-soft bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-3.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Badge>{props.kind}</Badge>
          <h2 className="flex min-w-0 flex-wrap items-baseline gap-1 text-lg font-extrabold tracking-tight">{props.title}</h2>
        </div>
        <div className="flex items-center gap-2">{props.actions}</div>
      </header>
      {props.children}
    </section>
  );
}

export function LayoutState(props: { layout: Layout | Error | undefined }) {
  if (props.layout instanceof Error) {
    return <p className="p-6 text-sm font-bold text-red-600">Layout failed: {props.layout.message}</p>;
  }
  return <div className="m-4 h-56 animate-pulse rounded-xl bg-muted" aria-label="Laying out" />;
}

export function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-label="Replay animation">
      <ReplayIcon size={16} />
      Replay
    </Button>
  );
}

/** Previous, play or pause, next. */
export function StepControls({ playback }: { playback: Playback }) {
  return (
    <>
      <Button size="icon-sm" onClick={playback.prev} disabled={playback.index === 0} aria-label="Previous step">
        <PrevIcon size={16} />
      </Button>
      <Button variant="primary" size="sm" onClick={playback.toggle} aria-label={playback.playing ? 'Pause' : 'Play'}>
        {playback.playing ? <PauseIcon size={16} /> : playback.atEnd ? <ReplayIcon size={16} /> : <PlayIcon size={16} />}
        {playback.playing ? 'Pause' : playback.atEnd ? 'Replay' : 'Play'}
      </Button>
      <Button size="icon-sm" onClick={playback.next} disabled={playback.atEnd} aria-label="Next step">
        <NextIcon size={16} />
      </Button>
    </>
  );
}

/** A neighbouring step the narration links to. */
export interface StepLink {
  route: string;
  go: () => void;
}

const kindBadge: Partial<Record<LinkKind, React.ReactNode>> = {
  return: <Badge variant="muted">Answer back</Badge>,
  async: <Badge variant="info">Async</Badge>,
};

/** The current step: where it goes, its kind, its code ref, its narration, and the steps around it. */
export function StepNarration(props: {
  index: number;
  total: number;
  route: string;
  kind?: LinkKind | undefined;
  refText?: string | undefined;
  narration: string;
  before?: StepLink | undefined;
  after?: StepLink | undefined;
}) {
  return (
    <div className="border-t border-border-soft px-5 py-4" aria-live="polite">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="step">
          Step {props.index + 1} of {props.total}
        </Badge>
        {props.kind && kindBadge[props.kind]}
        <span className="text-sm font-bold text-muted-foreground">{props.route}</span>
        {props.refText && (
          <code className="rounded-lg bg-subtle px-2 py-0.5 font-mono text-xs font-semibold text-foreground">{props.refText}</code>
        )}
      </div>
      <p key={props.index} className="animate-fade-up max-w-3xl text-lg font-semibold leading-relaxed">
        {props.narration}
      </p>
      {(props.before || props.after) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.before && (
            <StepLinkButton onClick={props.before.go} label={`Step ${props.index}: ${props.before.route}`}>
              <ArrowLeftIcon size={14} />
              <span className="text-muted-foreground">Comes from</span>
              {props.before.route}
            </StepLinkButton>
          )}
          {props.after && (
            <StepLinkButton onClick={props.after.go} label={`Step ${props.index + 2}: ${props.after.route}`}>
              <span className="text-muted-foreground">Next</span>
              {props.after.route}
              <ArrowRightIcon size={14} />
            </StepLinkButton>
          )}
        </div>
      )}
    </div>
  );
}

function StepLinkButton(props: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={`Go to ${props.label}`}
      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-left text-sm font-bold text-foreground transition-all duration-150 hover:bg-primary-light active:scale-[0.96]"
    >
      {props.children}
    </button>
  );
}

/** Link to step `index` when it exists. */
export function neighbour(playback: Playback, index: number, count: number, route: (index: number) => string): StepLink | undefined {
  return index >= 0 && index < count ? { route: route(index), go: () => playback.goTo(index) } : undefined;
}

/** One segment per step; done steps fill yellow, the current one is darker. */
export function StepProgress(props: { index: number; labels: string[]; onPick: (index: number) => void }) {
  return (
    <ol className="flex gap-1.5 border-t border-border-soft px-5 py-2" aria-label="Steps">
      {props.labels.map((label, i) => (
        <li key={i} className="flex-1">
          <button
            type="button"
            onClick={() => props.onPick(i)}
            className="group flex h-7 w-full items-center"
            aria-label={`Step ${i + 1}: ${label}`}
            aria-current={i === props.index ? 'step' : undefined}
          >
            <span
              className={cn(
                'h-2.5 w-full rounded-full transition-colors duration-300 group-hover:bg-primary-hover',
                i < props.index ? 'bg-primary' : i === props.index ? 'bg-primary-dark' : 'bg-muted',
              )}
            />
          </button>
        </li>
      ))}
    </ol>
  );
}

type Zoom = { direction: 'in'; from: Box | undefined } | { direction: 'out'; focus: string } | undefined;

export function ArchScene({ block }: { block: ArchBlock }) {
  const boxes = useBoxSelection(block.id);
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
    boxes.onNodeClick?.(id, element);
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
            <button type="button" className="font-extrabold text-link hover:underline active:scale-[0.96]" onClick={() => goUp(0)}>
              {block.title}
            </button>
            {path.map((id, i) => (
              <span key={id} className="flex items-baseline gap-1">
                <span className="text-muted-foreground">›</span>
                {i === path.length - 1 ? (
                  <span aria-current="location">{groupLabel(id)}</span>
                ) : (
                  <button type="button" className="font-extrabold text-link hover:underline active:scale-[0.96]" onClick={() => goUp(i + 1)}>
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
            <Button size="sm" onClick={() => goUp(path.length - 1)} aria-label="Zoom out">
              <ZoomOutIcon size={16} />
              Zoom out
            </Button>
          )}
          <ReplayButton onClick={() => setReplay((r) => r + 1)} />
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
              selected={boxes.selected}
              asked={boxes.asked}
              isClickable={(node) => node.role === 'group' || boxes.onNodeClick !== undefined}
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

/** Flow edges: one per ordered pair of participants that talk, with room for the longest step label. */
function flowEdges(block: FlowBlock): EdgeInput[] {
  const seen = new Map<string, EdgeInput>();
  for (const step of block.steps) {
    if (!step.to || step.to === step.from) continue;
    const id = linkId(step.from, step.to, step.kind);
    const edge = seen.get(id) ?? { id, from: step.from, to: step.to, ...(step.kind ? { kind: step.kind } : {}) };
    if (step.label && step.label.length > (edge.reserve?.length ?? 0)) edge.reserve = step.label;
    seen.set(id, edge);
  }
  return [...seen.values()];
}

/** The diagram of a flow with one step highlighted; used inline and in presentation mode. */
export function FlowDiagram(props: { block: FlowBlock; index: number }) {
  const { block, index } = props;
  const boxes = useBoxSelection(block.id);
  const edges = useMemo(() => flowEdges(block), [block]);
  const nodes = useMemo(() => withDrills(block.nodes, block.drills), [block]);
  const layout = useLayout(nodes, edges);
  const reducedMotion = useReducedMotion();
  const step = block.steps[index];
  const activeNodes = useMemo(() => new Set(step ? [step.from, step.to ?? step.from] : []), [step]);
  const activeEdge = step?.to && step.to !== step.from ? linkId(step.from, step.to, step.kind) : undefined;
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
      {...boxes}
    />
  );
}

export function stepRoute(block: FlowBlock, index: number): string {
  const step = block.steps[index];
  if (!step) return '';
  const label = (id: string): string => block.nodes.find((n) => n.id === id)?.label ?? id;
  return `${label(step.from)}${step.to && step.to !== step.from ? ` → ${label(step.to)}` : ''}${step.label ? ` · ${step.label}` : ''}`;
}

export function FlowScene({ block }: { block: FlowBlock }) {
  const reducedMotion = useReducedMotion();
  const durations = useMemo(() => block.steps.map((s) => stepDuration(s.narration)), [block]);
  const playback = usePlayback(durations, !reducedMotion);
  const step = block.steps[playback.index];

  return (
    <SceneFrame kind="Flow" title={block.title} actions={<StepControls playback={playback} />}>
      <div className="p-4">
        <FlowDiagram block={block} index={playback.index} />
      </div>
      {step && (
        <StepNarration
          index={playback.index}
          total={block.steps.length}
          route={stepRoute(block, playback.index)}
          kind={step.kind}
          refText={step.ref ? formatRef(step.ref) : undefined}
          narration={step.narration}
          before={neighbour(playback, playback.index - 1, block.steps.length, (i) => stepRoute(block, i))}
          after={neighbour(playback, playback.index + 1, block.steps.length, (i) => stepRoute(block, i))}
        />
      )}
      <StepProgress
        index={playback.index}
        labels={block.steps.map((s) => s.label ?? s.narration.slice(0, 60))}
        onPick={playback.goTo}
      />
    </SceneFrame>
  );
}
