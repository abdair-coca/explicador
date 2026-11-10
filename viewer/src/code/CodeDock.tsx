// The code window: a layer that covers the page from under the top bar down, like an IDE. Tabs, an explorer,
// a read-only editor (or notebook), a status bar, and the bar that plays a guided tour. When the detail panel is
// open at `lg` and up, the window stops before it so both stay visible.
import { useEffect, useState, type Dispatch } from 'react';
import type { Ref } from '../../../server/src/scene.ts';
import type { ExplainReply } from '../api';
import { ExplainButton } from '../components/ExplainButton';
import { CloseIcon, CodeIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, SidebarIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import { Editor } from './Editor';
import { Explorer } from './Explorer';
import { prefetch, readPref, useFile, useTree, writePref } from './hooks';
import { stepDelay, type CodeAction, type CodeState } from './state';

/** Detail panel column: 24 px page gutter + 400 px card (see App) and a 16 px gap between window and panel. */
const PANEL_SPACE = 24 + 400 + 16;
const PAGE_MAX = 1720;

/** Pixels of the right edge the window leaves free for the detail panel. */
export function panelInset(viewportWidth: number): number {
  return Math.max(0, (viewportWidth - PAGE_MAX) / 2) + PANEL_SPACE;
}

/** Height of the top bar, so the window starts right under it. */
function useHeaderHeight(): number {
  const [height, setHeight] = useState(() => document.querySelector('header')?.getBoundingClientRect().height ?? 61);
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const observer = new ResizeObserver(() => setHeight(header.getBoundingClientRect().height));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return height;
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => document.documentElement.clientWidth);
  useEffect(() => {
    const update = (): void => setWidth(document.documentElement.clientWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}

const barButton =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a3acb9] transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-[0.92]';

export function CodeDock(props: {
  state: CodeState;
  dispatch: Dispatch<CodeAction>;
  /** The user closed the window (as opposed to a tour or a click replacing what it shows). */
  onClose: () => void;
  /** Plays the exit animation; the window unmounts when it ends. */
  closing: boolean;
  /** The detail panel is open beside the window. */
  panelOpen: boolean;
  /** Presentation mode owns the arrow keys. */
  keysOff: boolean;
  /** Ask Claude to explain the file (or lines) being read. */
  onExplain: (ref: Ref) => Promise<ExplainReply>;
}) {
  const { state, dispatch } = props;
  const [explorer, setExplorer] = useState(() => readPref('code-explorer', window.innerWidth >= 1024));
  const headerHeight = useHeaderHeight();
  const viewport = useViewportWidth();
  const tree = useTree(explorer);
  const file = useFile(state.active);
  const tour = state.tour;
  const step = tour?.steps[state.step];
  const last = tour ? state.step >= tour.steps.length - 1 : false;
  const inset = props.panelOpen && viewport >= 1024 ? panelInset(viewport) : 0;

  // The next file of a tour is ready before the user gets there.
  useEffect(() => {
    const next = tour?.steps[state.step + 1];
    if (next) prefetch(next.ref.path);
  }, [tour, state.step]);

  // Autoplay: stay on a step long enough to read its note, then move on; stop at the last one.
  useEffect(() => {
    if (!state.playing || !tour || !step) return;
    const timer = setTimeout(() => {
      if (last) dispatch({ type: 'play', playing: false });
      else dispatch({ type: 'step', index: state.step + 1 });
    }, stepDelay(step.note));
    return () => clearTimeout(timer);
  }, [state.playing, state.step, tour, step, last, dispatch]);

  // ← and → walk the tour unless the user is typing, reading in the editor, or presenting.
  useEffect(() => {
    if (!tour || props.keysOff) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target instanceof HTMLElement ? event.target : undefined;
      if (target?.closest('input, textarea, select, [contenteditable], .code-editor, .notebook')) return;
      event.preventDefault();
      dispatch({ type: 'step', index: state.step + (event.key === 'ArrowRight' ? 1 : -1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, state.step, props.keysOff, dispatch]);

  const togglePlay = (): void => {
    if (state.playing) dispatch({ type: 'play', playing: false });
    else {
      // Playing from the end starts over.
      if (last) dispatch({ type: 'step', index: 0 });
      dispatch({ type: 'play', playing: true });
    }
  };

  const notebook = file !== 'loading' && file.ok && 'notebook' in file;
  const unit = notebook ? 'cells' : 'lines';
  const segments = state.active?.split('/') ?? [];
  const total = file !== 'loading' && file.ok ? ('notebook' in file ? file.notebook.cells.length : file.lines.length) : undefined;
  const extension = state.active?.includes('.') ? state.active.split('.').pop()?.toUpperCase() : undefined;
  const focusText = state.focus ? (state.focus.start === state.focus.end ? `${state.focus.start}` : `${state.focus.start}–${state.focus.end}`) : undefined;

  return (
    <section
      aria-label="Code"
      style={{ top: headerHeight, right: inset }}
      className={cn(
        'fixed bottom-0 left-0 z-40 flex flex-col overflow-hidden bg-[#1a1a2e] text-[#e6eaf0] shadow-[0_-8px_32px_rgba(0,0,0,0.22)] [overscroll-behavior:contain]',
        'transition-[right] duration-300 ease-out',
        inset > 0 && 'lg:rounded-tr-2xl',
        props.closing ? 'animate-dock-out' : 'animate-dock-in',
      )}
    >
      <div className="flex shrink-0 items-stretch bg-[#12121f]">
        <button
          type="button"
          className={cn(barButton, 'm-1', explorer && 'bg-white/10 text-white')}
          aria-pressed={explorer}
          aria-label="Show or hide the file explorer"
          title="Explorer"
          onClick={() => {
            setExplorer(!explorer);
            writePref('code-explorer', !explorer);
          }}
        >
          <SidebarIcon size={16} />
        </button>
        <div role="tablist" aria-label="Open files" className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {state.tabs.map((path) => {
            const active = path === state.active;
            return (
              <div
                key={path}
                role="tab"
                aria-selected={active}
                className={cn(
                  'group/tab animate-fade-in flex shrink-0 items-center gap-1 border-t-[3px] pl-3 pr-1 text-[13px] font-semibold transition-colors duration-150',
                  active ? 'border-primary bg-[#1a1a2e] text-white' : 'border-transparent text-[#a3acb9] hover:bg-white/5 hover:text-white',
                )}
              >
                <button type="button" title={path} className="max-w-48 truncate py-2.5 outline-none" onClick={() => dispatch({ type: 'activate', path })}>
                  {path.split('/').at(-1)}
                </button>
                <button
                  type="button"
                  aria-label={`Close ${path}`}
                  className={cn(
                    'grid h-6 w-6 place-items-center rounded-md text-[#a3acb9] transition-opacity hover:bg-white/15 hover:text-white',
                    !active && 'opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100',
                  )}
                  onClick={() => dispatch({ type: 'close-tab', path })}
                >
                  <CloseIcon size={13} />
                </button>
              </div>
            );
          })}
        </div>
        <button type="button" className={cn(barButton, 'm-1')} aria-label="Close the code window" title="Close (Esc)" onClick={props.onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      {tour && step && (
        <div key={tour.id} className="animate-fade-up relative shrink-0 bg-primary text-primary-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2">
            <CodeIcon size={16} className="shrink-0" />
            <p className="min-w-0 flex-1 basis-40 truncate text-sm font-extrabold">{tour.title}</p>
            <ol className="flex items-center gap-1.5" aria-label="Steps">
              {tour.steps.map((_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={i === state.step ? 'step' : undefined}
                    onClick={() => dispatch({ type: 'step', index: i })}
                    className={cn(
                      'block h-2.5 rounded-full transition-all duration-200 ease-out',
                      i === state.step ? 'w-6 bg-foreground' : 'w-2.5 bg-foreground/30 hover:bg-foreground/60',
                    )}
                  />
                </li>
              ))}
            </ol>
            <span className="text-xs font-extrabold tabular-nums" aria-live="polite">
              {state.step + 1} / {tour.steps.length}
            </span>
            <span className="flex items-center gap-0.5">
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 active:scale-[0.92] disabled:opacity-40" aria-label="Previous step" disabled={state.step === 0} onClick={() => dispatch({ type: 'step', index: state.step - 1 })}>
                <PrevIcon size={16} />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-primary hover:opacity-90 active:scale-[0.92]" aria-label={state.playing ? 'Pause' : 'Play the tour'} onClick={togglePlay}>
                {state.playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-foreground/10 active:scale-[0.92] disabled:opacity-40" aria-label="Next step" disabled={last} onClick={() => dispatch({ type: 'step', index: state.step + 1 })}>
                <NextIcon size={16} />
              </button>
            </span>
            <button type="button" className="rounded-lg px-2.5 py-1 text-xs font-extrabold hover:bg-foreground/10 active:scale-[0.96]" onClick={() => dispatch({ type: 'end-tour' })}>
              End tour
            </button>
          </div>
          {state.playing && (
            <span
              key={`${tour.id}:${state.step}`}
              aria-hidden="true"
              className="tour-progress absolute inset-x-0 bottom-0 h-[3px] bg-primary-dark"
              style={{ animationDuration: `${stepDelay(step.note)}ms` }}
            />
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {explorer && <Explorer files={tree?.files} truncated={tree?.truncated ?? false} active={state.active} onOpen={(path) => dispatch({ type: 'open-file', path })} />}
        <div className="flex min-w-0 flex-1 flex-col">
          {state.active ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-white/10 px-4 py-1.5 text-xs font-semibold text-[#a3acb9]">
                {segments.map((segment, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true">›</span>}
                    <span className={i === segments.length - 1 ? 'font-extrabold text-white' : undefined}>{segment}</span>
                  </span>
                ))}
                {focusText && (
                  <span className="ml-1 rounded-md bg-primary/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {notebook ? 'cell' : 'line'}
                    {focusText.includes('–') ? 's' : ''} {focusText}
                  </span>
                )}
                <ExplainButton
                  doneKey={tour?.id}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-extrabold text-white transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-[0.96] disabled:opacity-80"
                  ask={() => props.onExplain({ path: state.active ?? '', ...(state.focus ? { start: state.focus.start, end: state.focus.end } : {}) })}
                >
                  Explain code
                </ExplainButton>
              </div>
              <Editor
                key={state.active}
                path={state.active}
                file={file}
                focus={state.focus}
                focusId={state.focusId}
                note={tour && step && state.active === step.ref.path ? { index: state.step, of: tour.steps.length, text: step.note } : undefined}
              />
            </>
          ) : (
            <p className="m-auto px-6 text-center text-sm font-bold text-[#a3acb9]">Pick a file in the explorer to read it.</p>
          )}
          <div className="flex shrink-0 items-center gap-3 bg-[#12121f] px-4 py-1 text-[11px] font-bold text-[#8b95a5]">
            <span>Read only</span>
            <span className="ml-auto flex items-center gap-3">
              {focusText && <span>{notebook ? 'Cell' : 'Ln'} {focusText}</span>}
              {total !== undefined && <span>{total} {unit}</span>}
              {extension && <span>{extension}</span>}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
