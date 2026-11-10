// Full-screen presentation of the current scene. Advances only when the presenter asks.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Prose } from '../components/Prose';
import type { LinkKind, ScenePayload } from '../../../server/src/scene.ts';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ExpandIcon } from '../components/icons';
import { ArchScene, FlowDiagram, formatRef, stepRoute } from '../components/scenes';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DataScene, StateDiagram, StateScene, walkRoute } from '../components/views';
import { cn } from '@/lib/utils';
import { buildSlides, keyAction, type Slide } from './slides';

export function Presenter({ scene, onExit }: { scene: ScenePayload; onExit: () => void }) {
  const slides = useMemo(() => buildSlides(scene.blocks), [scene.blocks]);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const slide = slides[Math.min(index, slides.length - 1)];

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
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-8">
        <div key={index} className="animate-pop-in w-full max-w-7xl">
          {slide && <SlideView scene={scene} slide={slide} />}
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
  return null;
}
