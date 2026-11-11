// Full-screen presentation of the current scene. Advances only when the presenter asks.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Prose } from '../components/Prose';
import type { LinkKind, ScenePayload } from '../../../server/src/scene.ts';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ExpandIcon } from '../components/icons';
import { DiagramFitContext } from '../components/Diagram';
import { ArchScene, FlowDiagram, formatRef, stepRoute } from '../components/scenes';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DataScene, StateDiagram, StateScene, walkRoute } from '../components/views';
import { ChartView } from '../lesson/Chart';
import { matrixFocuses } from '../lesson/focuses';
import { JourneyTrack, stageRoute } from '../lesson/Journey';
import { FocusNote, MatrixGrid } from '../lesson/Matrix';
import { QuizView } from '../lesson/Quiz';
import { StatsView } from '../lesson/Stats';
import { TraceView } from '../lesson/Trace';
import { FlagIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import { buildSlides, keyAction, type Slide } from './slides';

/** A diagram never gets smaller than this to make a slide fit; past it, the slide scrolls. */
const MIN_FIT = 180;

/**
 * Shrinks the slide's diagram (through `--fit-h` on `stage`) by as much as the slide overflows the stage, so title,
 * diagram and narration show together. Runs again whenever the slide or the stage change size (the diagram's layout
 * arrives a moment after the slide, and the window can be resized or go full screen).
 */
function useFitToStage(stage: React.RefObject<HTMLElement | null>, slideKey: number): void {
  useLayoutEffect(() => {
    const element = stage.current;
    const slide = element?.firstElementChild;
    if (!element || !(slide instanceof HTMLElement)) return;
    element.style.removeProperty('--fit-h');
    const fit = (): void => {
      const diagrams = [...slide.querySelectorAll<SVGSVGElement>('svg[role="group"]:not([aria-roledescription="chart"])')];
      const diagram = diagrams.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (!diagram) return;
      const style = getComputedStyle(element);
      const room = element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      // Layout sizes only: the slide's entrance animation scales it, and that must not count.
      const overflow = slide.offsetHeight - room;
      // Two pixels of slack absorb fractional heights, which would otherwise leave a 1 px scrollbar.
      const next = Math.max(MIN_FIT, Math.floor(diagram.clientHeight - overflow) - 2);
      const current = parseFloat(element.style.getPropertyValue('--fit-h'));
      if (!Number.isFinite(current) || Math.abs(current - next) > 1) element.style.setProperty('--fit-h', `${next}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    observer.observe(slide);
    return () => observer.disconnect();
  }, [stage, slideKey]);
}

export function Presenter({ scene, onExit }: { scene: ScenePayload; onExit: () => void }) {
  const slides = useMemo(() => buildSlides(scene.blocks), [scene.blocks]);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const slide = slides[Math.min(index, slides.length - 1)];
  useFitToStage(stage, index);

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(slides.length - 1, next))), [slides.length]);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => {});
  }, []);
  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    onExit();
  }, [onExit]);

  useEffect(() => {
    root.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // Let buttons inside the slide (breadcrumbs, zoom out) take Enter and Space.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.closest('[role="button"]')) return;
      const action = keyAction(event.key);
      if (!action) return;
      event.preventDefault();
      if (action === 'next') go(index + 1);
      else if (action === 'prev') go(index - 1);
      else if (action === 'first') go(0);
      else if (action === 'last') go(slides.length - 1);
      else if (action === 'fullscreen') toggleFullscreen();
      else if (!document.fullscreenElement) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, slides.length, toggleFullscreen, exit]);

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Presenting ${scene.topic}`}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      <header className="flex items-center gap-3 border-b border-border-soft bg-card px-6 py-2.5 text-sm">
        <span className="font-black">{scene.topic}</span>
        <span className="font-bold tabular-nums text-muted-foreground" aria-live="polite">
          {index + 1} / {slides.length}
        </span>
        <span className="ml-auto hidden font-semibold text-muted-foreground sm:inline">← → to move · F full screen · Esc to leave</span>
        <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label="Toggle full screen">
          <ExpandIcon size={16} />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={exit} aria-label="Leave presentation">
          <CloseIcon size={16} />
        </Button>
      </header>
      {/* Auto margins center the slide when it fits and let it start at the top when it does not:
          align-items/justify-content center would push its top out of reach of the scrollbar. */}
      <main ref={stage} className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-6">
        <div key={index} className="animate-pop-in m-auto w-full max-w-7xl">
          <DiagramFitContext.Provider value={true}>{slide && <SlideView scene={scene} slide={slide} />}</DiagramFitContext.Provider>
        </div>
      </main>
      <footer className="flex items-center gap-4 border-t border-border-soft bg-card px-6 py-3">
        <Button size="sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
          <ArrowLeftIcon size={16} />
          Back
        </Button>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn('h-2.5 flex-1 rounded-full transition-colors duration-300', i < index ? 'bg-primary' : i === index ? 'bg-primary-dark' : 'bg-muted')}
            />
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => go(index + 1)} disabled={index >= slides.length - 1} aria-label="Next slide">
          Next
          <ArrowRightIcon size={16} />
        </Button>
      </footer>
    </div>
  );
}

function StepSlide(props: {
  title: string;
  step: number;
  of: number;
  route: string;
  kind?: LinkKind | undefined;
  refText?: string | undefined;
  narration?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <h2 className="flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight">
        {props.title}
        <Badge variant="step">
          Step {props.step + 1} of {props.of}
        </Badge>
        {props.kind === 'return' && <Badge variant="muted">Answer back</Badge>}
        {props.kind === 'async' && <Badge variant="info">Async</Badge>}
      </h2>
      <div className="rounded-2xl border border-border-soft bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">{props.children}</div>
      {props.narration && (
        <div aria-live="polite">
          <p className="flex flex-wrap items-center gap-2 text-base font-bold text-muted-foreground">
            {props.route}
            {props.refText && (
              <code className="rounded-lg bg-subtle px-2 py-0.5 font-mono text-sm font-semibold text-foreground">{props.refText}</code>
            )}
          </p>
          <p className="mt-2 text-3xl font-bold leading-snug">{props.narration}</p>
        </div>
      )}
    </div>
  );
}

function SlideView({ scene, slide }: { scene: ScenePayload; slide: Slide }) {
  const block = scene.blocks[slide.block];
  if (!block) return null;
  if (slide.kind === 'markdown' && block.type === 'markdown') {
    return (
      <div className="prose-exl prose-slide mx-auto max-w-3xl">
        <Prose>{block.text}</Prose>
      </div>
    );
  }
  if (slide.kind === 'arch' && block.type === 'arch') return <ArchScene key={slide.block} block={block} />;
  if (slide.kind === 'step' && block.type === 'flow') {
    const step = block.steps[slide.step];
    return (
      <StepSlide
        title={block.title}
        step={slide.step}
        of={slide.of}
        route={stepRoute(block, slide.step)}
        kind={step?.kind}
        refText={step?.ref ? formatRef(step.ref) : undefined}
        narration={step?.narration}
      >
        <FlowDiagram block={block} index={slide.step} />
      </StepSlide>
    );
  }
  if (slide.kind === 'data' && block.type === 'data') return <DataScene key={slide.block} block={block} />;
  if (slide.kind === 'state' && block.type === 'state') return <StateScene key={slide.block} block={block} />;
  if (slide.kind === 'walk' && block.type === 'state') {
    const step = block.walk[slide.step];
    return (
      <StepSlide title={block.title} step={slide.step} of={slide.of} route={walkRoute(block, slide.step)} narration={step?.narration}>
        <StateDiagram block={block} step={slide.step} />
      </StepSlide>
    );
  }
  if (slide.kind === 'chapter' && block.type === 'chapter') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-3xl font-black shadow-[0_4px_0_var(--primary-dark)]">{slide.number}</span>
          <span className="text-lg font-extrabold uppercase tracking-wide text-muted-foreground">
            Chapter {slide.number} of {slide.of}
          </span>
        </div>
        <h2 className="text-6xl font-black leading-tight tracking-tight">{block.title}</h2>
        {block.goal && (
          <p className="flex items-start gap-3 text-2xl font-semibold leading-snug text-muted-foreground">
            <FlagIcon size={26} className="mt-1 shrink-0 text-foreground" />
            {block.goal}
          </p>
        )}
      </div>
    );
  }
  if (slide.kind === 'stats' && block.type === 'stats') {
    return (
      <div className="mx-auto max-w-5xl">
        <StatsView block={block} />
      </div>
    );
  }
  if (slide.kind === 'stage' && block.type === 'journey') {
    const stage = block.stages[slide.step];
    return (
      <StepSlide
        title={block.title}
        step={slide.step}
        of={slide.of}
        route={stageRoute(block, slide.step)}
        refText={stage?.ref ? formatRef(stage.ref) : undefined}
        narration={stage?.narration}
      >
        <JourneyTrack block={block} index={slide.step} />
      </StepSlide>
    );
  }
  if (slide.kind === 'trace' && block.type === 'trace') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black tracking-tight">{block.title}</h2>
        <div className="rounded-2xl border border-border-soft bg-card p-5 text-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <TraceView block={block} index={slide.step} />
        </div>
      </div>
    );
  }
  if (slide.kind === 'chart' && block.type === 'chart') {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-black tracking-tight">{block.title}</h2>
        <div className="rounded-2xl border border-border-soft bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <ChartView block={block} />
        </div>
      </div>
    );
  }
  if (slide.kind === 'matrix' && block.type === 'matrix') {
    const focus = slide.focus !== undefined ? matrixFocuses(block)[slide.focus] : undefined;
    return (
      <div className="space-y-6">
        <h2 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight">
          {block.title}
          {focus && <Badge variant="step">{focus.label}</Badge>}
        </h2>
        <div className="flex flex-wrap items-start gap-8">
          <MatrixGrid block={block} focus={focus} large />
          {focus && (
            <div className="min-w-[16rem] max-w-xl flex-1 text-xl">
              <FocusNote focus={focus} />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (slide.kind === 'quiz' && block.type === 'quiz') {
    return (
      <div className="mx-auto max-w-3xl text-lg">
        <QuizView block={block} />
      </div>
    );
  }
  return null;
}
