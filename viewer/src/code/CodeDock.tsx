// The code window: docked under the scene like VS Code's panel. Tabs, an explorer, a read-only editor,
// a status bar, and the bar that plays a guided tour. Below `lg` it is a bottom sheet.
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { CloseIcon, CodeIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, SidebarIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import { Editor } from './Editor';
import { Explorer } from './Explorer';
import { prefetch, readPref, useFile, useTree, writePref } from './hooks';
import { stepDelay, type CodeAction, type CodeState } from './state';

const MIN_HEIGHT = 220;
const TOUR_HEIGHT = 460;

function defaultHeight(): number {
  return Math.round(Math.min(Math.max(window.innerHeight * 0.55, 300), 520));
}

function clampHeight(height: number): number {
  return Math.round(Math.min(Math.max(height, MIN_HEIGHT), Math.max(MIN_HEIGHT, window.innerHeight - 140)));
}

const barButton =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a3acb9] transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-[0.92]';

export function CodeDock(props: {
  state: CodeState;
  dispatch: Dispatch<CodeAction>;
  /** The user closed the window (as opposed to a tour or a click replacing what it shows). */
  onClose: () => void;
  /** Presentation mode owns the arrow keys. */
  keysOff: boolean;
}) {
  const { state, dispatch } = props;
  const [height, setHeight] = useState(() => clampHeight(readPref('code-height', defaultHeight())));
  const [explorer, setExplorer] = useState(() => readPref('code-explorer', window.innerWidth >= 1024));
  const drag = useRef<{ y: number; height: number } | undefined>(undefined);
  const tree = useTree(explorer);
  const file = useFile(state.active);
  const tour = state.tour;
  const step = tour?.steps[state.step];
  const last = tour ? state.step >= tour.steps.length - 1 : false;

  // A tour needs room for the lines and the note under them.
  useEffect(() => {
    if (tour) setHeight((current) => (current < TOUR_HEIGHT ? clampHeight(TOUR_HEIGHT) : current));
  }, [tour?.id]);

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
      if (target?.closest('input, textarea, select, [contenteditable], .code-editor')) return;
      event.preventDefault();
      dispatch({ type: 'step', index: state.step + (event.key === 'ArrowRight' ? 1 : -1) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, state.step, props.keysOff, dispatch]);

  const resize = (value: number): void => {
    const next = clampHeight(value);
    setHeight(next);
    writePref('code-height', next);
  };

  const togglePlay = (): void => {
    if (state.playing) dispatch({ type: 'play', playing: false });
    else {
      // Playing from the end starts over.
      if (last) dispatch({ type: 'step', index: 0 });
      dispatch({ type: 'play', playing: true });
    }
  };

  const segments = state.active?.split('/') ?? [];
  const lines = file !== 'loading' && file.ok ? file.lines.length : undefined;
  const extension = state.active?.includes('.') ? state.active.split('.').pop()?.toUpperCase() : undefined;

  return (
    <section
      aria-label="Code"
      style={{ height: `min(${height}px, 85vh)` }}
      className={cn(
        'animate-sheet-in flex flex-col overflow-hidden border-2 border-b-0 border-border bg-[#1a1a2e] text-[#e6eaf0] shadow-[0_-8px_24px_rgba(0,0,0,0.16)]',
        // A sheet over everything on small screens; stuck to the bottom of the scene column on large ones.
        'fixed inset-x-0 bottom-0 z-40 rounded-t-3xl',
        'lg:sticky lg:inset-x-auto lg:bottom-0 lg:z-20 lg:mt-7 lg:rounded-t-2xl',
      )}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize the code window"
        aria-valuemin={MIN_HEIGHT}
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { y: event.clientY, height };
        }}
        onPointerMove={(event) => {
          if (drag.current) setHeight(clampHeight(drag.current.height + drag.current.y - event.clientY));
        }}
        onPointerUp={() => {
          if (drag.current) writePref('code-height', height);
          drag.current = undefined;
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') resize(height + 32);
          else if (event.key === 'ArrowDown') resize(height - 32);
          else return;
          event.preventDefault();
        }}
        className="group grid h-3 shrink-0 cursor-row-resize touch-none place-items-center bg-[#12121f] outline-none"
      >
        <span className="h-1 w-12 rounded-full bg-white/20 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
      </div>

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
                  'group/tab flex shrink-0 items-center gap-1 border-t-[3px] pl-3 pr-1 text-[13px] font-semibold transition-colors duration-150',
                  active ? 'border-primary bg-[#1a1a2e] text-white' : 'border-transparent text-[#a3acb9] hover:bg-white/5 hover:text-white',
                )}
              >
                <button type="button" title={path} className="max-w-48 truncate py-2 outline-none" onClick={() => dispatch({ type: 'activate', path })}>
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
        <button type="button" className={cn(barButton, 'm-1')} aria-label="Close the code window" title="Close" onClick={props.onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      {tour && step && (
        <div className="relative shrink-0 bg-primary text-primary-foreground">
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
              <div className="flex shrink-0 flex-wrap items-center gap-x-1.5 border-b border-white/10 px-4 py-1.5 text-xs font-semibold text-[#a3acb9]">
                {segments.map((segment, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true">›</span>}
                    <span className={i === segments.length - 1 ? 'font-extrabold text-white' : undefined}>{segment}</span>
                  </span>
                ))}
                {state.focus && (
                  <span className="ml-1 rounded-md bg-primary/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary">
                    {state.focus.start === state.focus.end ? `line ${state.focus.start}` : `lines ${state.focus.start}–${state.focus.end}`}
                  </span>
                )}
              </div>
              <Editor
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
              {state.focus && <span>Ln {state.focus.start === state.focus.end ? state.focus.start : `${state.focus.start}–${state.focus.end}`}</span>}
              {lines !== undefined && <span>{lines} lines</span>}
              {extension && <span>{extension}</span>}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
