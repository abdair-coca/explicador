// Full-screen presentation of the current scene. Advances only when the presenter asks.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { ScenePayload } from '../../../server/src/scene.ts';
import { ArchScene, FlowDiagram, formatRef, stepRoute } from '../components/scenes';
import { Button } from '../components/ui/button';
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
      <header className="flex items-center gap-3 border-b border-border px-6 py-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{scene.topic}</span>
        <span aria-live="polite">
          {index + 1} / {slides.length}
        </span>
        <span className="ml-auto hidden sm:inline">← → to move · F full screen · Esc to leave</span>
        <Button variant="ghost" size="sm" onClick={toggleFullscreen} aria-label="Toggle full screen">
          ⛶
        </Button>
        <Button variant="ghost" size="sm" onClick={exit} aria-label="Leave presentation">
          ✕
        </Button>
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-8">
        <div className="w-full max-w-6xl">{slide && <SlideView scene={scene} slide={slide} />}</div>
      </main>
      <footer className="flex items-center gap-3 border-t border-border px-6 py-3">
        <Button variant="outline" size="sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
          ← Back
        </Button>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {slides.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
        <Button size="sm" onClick={() => go(index + 1)} disabled={index >= slides.length - 1} aria-label="Next slide">
          Next →
        </Button>
      </footer>
    </div>
  );
}

function SlideView({ scene, slide }: { scene: ScenePayload; slide: Slide }) {
  const block = scene.blocks[slide.block];
  if (!block) return null;
  if (slide.kind === 'markdown' && block.type === 'markdown') {
    return (
      <div className="prose-exl prose-slide mx-auto max-w-3xl">
        <Markdown>{block.text}</Markdown>
      </div>
    );
  }
  if (slide.kind === 'arch' && block.type === 'arch') return <ArchScene key={slide.block} block={block} />;
  if (slide.kind === 'step' && block.type === 'flow') {
    const step = block.steps[slide.step];
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">
          {block.title}
          <span className="ml-3 text-base font-normal text-muted-foreground">
            Step {slide.step + 1} of {slide.of}
          </span>
        </h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <FlowDiagram block={block} index={slide.step} />
        </div>
        {step && (
          <div aria-live="polite">
            <p className="text-sm font-medium text-active">
              {stepRoute(block, slide.step)}
              {step.ref && <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{formatRef(step.ref)}</code>}
            </p>
            <p className="mt-2 text-2xl leading-snug">{step.narration}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
}
