// Full-screen presentation of the current scene: a slide per block whose steps are revealed one per →. Slides move in
// the direction of travel, and each chapter opens with a yellow wipe onto a night-blue card. Advances only when the
// presenter asks.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ChapterBlock, LinkKind, MatrixBlock, ScenePayload } from '../../../server/src/scene.ts';
import { reducedMotion, staggerIn } from '../animation/reveal';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ExpandIcon } from '../components/icons';
import { DiagramFitContext } from '../components/Diagram';
import { ArchScene, FlowDiagram, formatRef, stepRoute } from '../components/scenes';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DataScene, StateDiagram, StateScene, walkRoute } from '../components/views';
import { CalcView } from '../lesson/Calc';
import { ChartView } from '../lesson/Chart';
import { matrixFocuses } from '../lesson/focuses';
import { JourneyTrack, stageRoute } from '../lesson/Journey';
import { FocusNote, MatrixGrid } from '../lesson/Matrix';
import { LessonContext } from '../lesson/context';
import { progressKey } from '../lesson/progress';
import { QuizView } from '../lesson/Quiz';
import { ThresholdView } from '../lesson/Threshold';
import { useLessonProgress } from '../lesson/useProgress';
import { StatsView } from '../lesson/Stats';
import { TraceView } from '../lesson/Trace';
import { ChapterCard } from './ChapterCard';
import { ProgressBar } from './ProgressBar';
import { SlideProse } from './SlideProse';
import { buildSlides, keyAction, move, type Move, type Position, type Segment, type Slide } from './slides';

/** A diagram never gets smaller than this to make a slide fit; past it, the slide scrolls. */
const MIN_FIT = 180;
/** In full screen, the header and footer hide after this long without the pointer moving. */
const IDLE_MS = 2500;

/**
 * Shrinks the slide's diagram (through `--fit-h` on `stage`) by as much as the slide overflows the stage, so title,
 * diagram and narration show together. Runs again whenever the slide or the stage change size (the diagram's layout
 * arrives a moment after the slide, a new part can change the narration, and the window can go full screen).
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
      // Layout sizes only: entrance animations scale the slide, and that must not count.
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

/** True after a while without the pointer moving, while `active`. */
function useIdle(active: boolean): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = (): void => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      setIdle(false);
    };
  }, [active]);
  return active && idle;
}

type Travel = 'forward' | 'back';

/** Changes the slide inside a view transition, so the old slide leaves and the new one enters in the direction of travel. */
function moveSlide(travel: Travel, update: () => void): void {
  if (!('startViewTransition' in document) || reducedMotion()) {
    update();
    return;
  }
  document.documentElement.dataset.travel = travel;
  document.startViewTransition(() => flushSync(update));
}

/** A yellow wipe crosses the whole presenter; the slide changes while it covers everything. */
async function wipeTo(wipe: HTMLElement | null, travel: Travel, update: () => void): Promise<void> {
  if (!wipe || reducedMotion()) {
    update();
    return;
  }
  const sign = travel === 'forward' ? 1 : -1;
  const at = (x: number): Keyframe => ({ transform: `translateX(${x * sign}%) skewX(${-12 * sign}deg)` });
  const timing = { easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' } as const;
  try {
    await wipe.animate([at(-110), at(0)], { ...timing, duration: 260 }).finished;
    flushSync(update);
    await wipe.animate([at(0), at(110)], { ...timing, duration: 340 }).finished;
  } catch {
    update();
  } finally {
    for (const animation of wipe.getAnimations()) animation.cancel();
  }
}

export function Presenter({ scene, onExit }: { scene: ScenePayload; onExit: () => void }) {
  const slides = useMemo(() => buildSlides(scene.blocks), [scene.blocks]);
  const chapterTitles = useMemo(
    () => scene.blocks.filter((block): block is ChapterBlock => block.type === 'chapter').map((block) => block.title),
    [scene.blocks],
  );
  const lesson = useLessonProgress(progressKey(scene.key, scene.savedAt));
  const [at, setAt] = useState<Position>({ slide: 0, part: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const idle = useIdle(fullscreen);
  const slide = slides[Math.min(at.slide, slides.length - 1)];
  const atEnd = at.slide >= slides.length - 1 && at.part >= (slide?.parts ?? 1) - 1;
  useFitToStage(stage, at.slide);

  const goTo = useCallback(
    (next: Position) => {
      if (busy.current || (next.slide === at.slide && next.part === at.part)) return;
      if (next.slide === at.slide) {
        setAt(next);
        return;
      }
      const travel: Travel = next.slide > at.slide ? 'forward' : 'back';
      const update = (): void => setAt(next);
      if (slides[next.slide]?.kind !== 'chapter') {
        moveSlide(travel, update);
        return;
      }
      busy.current = true;
      void wipeTo(wipe.current, travel, update).finally(() => {
        busy.current = false;
      });
    },
    [at, slides],
  );
  const go = useCallback((how: Move) => goTo(move(slides, at, how)), [goTo, slides, at]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => {});
  }, []);
  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    onExit();
  }, [onExit]);

  useEffect(() => {
    const update = (): void => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    root.current?.focus();
  }, [at]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      // Let buttons inside the slide (breadcrumbs, zoom out, quiz options) take Enter and Space.
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLButtonElement) return;
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.closest('[role="button"]')) return;
      const action = keyAction(event.key, event.shiftKey);
      if (!action) return;
      event.preventDefault();
      if (action === 'fullscreen') toggleFullscreen();
      else if (action === 'exit') {
        if (!document.fullscreenElement) exit();
      } else go(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, toggleFullscreen, exit]);

  const label = useCallback(
    (segment: Segment): string => {
      if (!slides.some((item) => item.kind === 'chapter')) return `slide ${segment.first + 1}`;
      return segment.chapter === 0 ? 'Intro' : `${segment.chapter} · ${chapterTitles[segment.chapter - 1] ?? ''}`;
    },
    [slides, chapterTitles],
  );

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Presenting ${scene.topic}`}
      data-tone={slide?.kind === 'chapter' ? 'night' : undefined}
      data-idle={idle ? '' : undefined}
      className="presenter fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground outline-none"
    >
      <header className="presenter-bar presenter-header relative z-10 flex items-center gap-3 border-b border-border-soft bg-card px-6 py-2.5 text-sm">
        <span className="min-w-0 truncate font-black">{scene.topic}</span>
        <span className="shrink-0 whitespace-nowrap font-bold tabular-nums text-muted-foreground" aria-live="polite">
          {at.slide + 1} / {slides.length}
        </span>
        <span className="flex-1 sm:hidden" aria-hidden="true" />
        <span className="ml-auto hidden font-semibold text-muted-foreground lg:inline">
          ← → to move · Shift+→ next slide · F full screen · Esc to leave
        </span>
        <span className="ml-auto hidden font-semibold text-muted-foreground sm:inline lg:hidden">← → · F · Esc</span>
        <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label="Toggle full screen">
          <ExpandIcon size={16} />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={exit} aria-label="Leave presentation">
          <CloseIcon size={16} />
        </Button>
      </header>
      {/* Auto margins center the slide when it fits and let it start at the top when it does not:
          align-items/justify-content center would push its top out of reach of the scrollbar. */}
      <main ref={stage} className="presenter-stage flex min-h-0 flex-1 flex-col overflow-auto px-6 py-6">
        <div key={at.slide} className="m-auto w-full max-w-7xl">
          <DiagramFitContext.Provider value={true}>
            {/* Checks answered here count in the lesson's progress, like on the page. */}
            <LessonContext.Provider value={lesson}>
              {slide && <SlideView scene={scene} slide={slide} part={at.part} chapters={chapterTitles.length} />}
            </LessonContext.Provider>
          </DiagramFitContext.Provider>
        </div>
      </main>
      <footer className="presenter-bar presenter-footer relative z-10 flex items-center gap-4 border-t border-border-soft bg-card px-6 py-3">
        <Button size="sm" onClick={() => go('prev')} disabled={at.slide === 0 && at.part === 0}>
          <ArrowLeftIcon size={16} />
          Back
        </Button>
        <ProgressBar slides={slides} at={at} label={label} onJump={(first) => goTo({ slide: first, part: 0 })} />
        <Button variant="primary" size="sm" onClick={() => go('next')} disabled={atEnd}>
          Next
          <ArrowRightIcon size={16} />
        </Button>
      </footer>
      <div ref={wipe} aria-hidden="true" className="wipe pointer-events-none absolute inset-y-0 -left-[30%] z-20 w-[160%] bg-primary" />
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
        <div key={props.step} className="animate-fade-up" aria-live="polite">
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

/** The whole matrix with its cells cascading in, then one highlight per part with its note. */
function MatrixSlide({ block, part }: { block: MatrixBlock; part: number }) {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (grid.current) staggerIn(grid.current.querySelectorAll('.matrix-cell'));
  }, []);
  const focus = part > 0 ? matrixFocuses(block)[part - 1] : undefined;
  return (
    <div className="space-y-6">
      <h2 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight">
        {block.title}
        {focus && (
          <Badge key={part} variant="step" className="animate-pop-in">
            {focus.label}
          </Badge>
        )}
      </h2>
      <div className="flex flex-wrap items-start gap-8">
        <div ref={grid} className="min-w-0 max-w-full">
          <MatrixGrid block={block} focus={focus} large />
        </div>
        {focus && (
          <div key={part} className="min-w-[16rem] max-w-xl flex-1 text-xl">
            <FocusNote focus={focus} />
          </div>
        )}
      </div>
    </div>
  );
}

function SlideView({ scene, slide, part, chapters }: { scene: ScenePayload; slide: Slide; part: number; chapters: number }) {
  const block = scene.blocks[slide.block];
  if (!block) return null;
  switch (block.type) {
    case 'markdown':
      return <SlideProse text={block.text} part={part} />;
    case 'arch':
      return <ArchScene block={block} />;
    case 'flow': {
      const step = block.steps[part];
      return (
        <StepSlide
          title={block.title}
          step={part}
          of={slide.parts}
          route={stepRoute(block, part)}
          kind={step?.kind}
          refText={step?.ref ? formatRef(step.ref) : undefined}
          narration={step?.narration}
        >
          <FlowDiagram block={block} index={part} />
        </StepSlide>
      );
    }
    case 'data':
      return <DataScene block={block} />;
    case 'state':
      if (block.walk.length === 0) return <StateScene block={block} />;
      return (
        <StepSlide title={block.title} step={part} of={slide.parts} route={walkRoute(block, part)} narration={block.walk[part]?.narration}>
          <StateDiagram block={block} step={part} />
        </StepSlide>
      );
    case 'chapter':
      return <ChapterCard block={block} number={slide.chapter} of={chapters} />;
    case 'stats':
      return (
        <div className="mx-auto max-w-5xl">
          <StatsView block={block} shown={part} />
        </div>
      );
    case 'journey': {
      const stage = block.stages[part];
      return (
        <StepSlide
          title={block.title}
          step={part}
          of={slide.parts}
          route={stageRoute(block, part)}
          refText={stage?.ref ? formatRef(stage.ref) : undefined}
          narration={stage?.narration}
        >
          <JourneyTrack block={block} index={part} />
        </StepSlide>
      );
    }
    case 'trace':
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight">{block.title}</h2>
          <div className="rounded-2xl border border-border-soft bg-card p-5 text-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <TraceView block={block} index={part} />
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-black tracking-tight">{block.title}</h2>
          <div className="rounded-2xl border border-border-soft bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            {/* With a highlight, the first part shows every row and the second dims the rest. */}
            <ChartView block={slide.parts > 1 && part === 0 ? { ...block, highlight: undefined } : block} />
          </div>
        </div>
      );
    case 'matrix':
      return <MatrixSlide block={block} part={part} />;
    case 'calc':
      return (
        <div className="space-y-6">
          <h2 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight">
            {block.title}
            <Badge variant="step">
              Step {part + 1} of {slide.parts}
            </Badge>
          </h2>
          <div className="rounded-2xl border border-border-soft bg-card p-6 text-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <CalcView block={block} index={part} />
          </div>
        </div>
      );
    case 'threshold':
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-black tracking-tight">{block.title}</h2>
          <div className="rounded-2xl border border-border-soft bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <ThresholdView block={block} />
          </div>
        </div>
      );
    case 'quiz':
      return (
        <div className="mx-auto max-w-3xl text-lg">
          <QuizView block={block} revealed={part > 0} presenting />
        </div>
      );
    default:
      return null;
  }
}
