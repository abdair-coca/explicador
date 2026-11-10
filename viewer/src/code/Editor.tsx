// The editor of the code window: read-only, line numbers, syntax colors, the lines in focus highlighted
// and, during a tour, the rest dimmed and the step's note shown right under the highlighted lines.
// Notebooks are drawn by NotebookView; their refs count cells.
import { Fragment, memo, useLayoutEffect, useMemo, useRef } from 'react';
import { highlight, type Token } from '../lib/highlight';
import type { FileReply } from '../api';
import { cn } from '@/lib/utils';
import { NotebookView } from './NotebookView';
import { scrollToFocus } from './scroll';
import { StepNoteCard, type StepNote } from './StepNote';
import type { LineRange } from './state';

export type { StepNote } from './StepNote';

const LINE_HEIGHT = 20;

const problems: Record<string, string> = {
  missing: 'This file is no longer in the project.',
  denied: 'This file cannot be shown (it is hidden or outside the project).',
  binary: 'This is a binary file; there is no text to show.',
  'too-large': 'This file is too large to show here.',
  invalid: 'This notebook cannot be read (only nbformat 4 notebooks are supported).',
  unreachable: 'Could not reach Claude Code. Is it still running?',
};

const Line = memo(function Line(props: { n: number; tokens: Token[]; marked: boolean }) {
  return (
    <div data-line={props.n} className={cn('code-row flex', props.marked && 'marked')}>
      <span className="code-gutter w-14 shrink-0 select-none pr-4 text-right">{props.n}</span>
      <span className="whitespace-pre pr-6">
        {props.tokens.length === 0 ? ' ' : props.tokens.map((t, i) => <span key={i} className={`tok-${t.kind}`}>{t.text}</span>)}
      </span>
    </div>
  );
});

export function Editor(props: {
  path: string;
  file: FileReply | 'loading';
  focus: LineRange | undefined;
  /** Changes whenever the focus is asked for, so the same lines are scrolled to again. */
  focusId: number;
  note?: StepNote | undefined;
}) {
  const { path, file, focus, focusId, note } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const noteBox = useRef<HTMLDivElement>(null);
  const scrolledPath = useRef<string | undefined>(undefined);
  const lines = file !== 'loading' && file.ok && 'lines' in file ? file.lines : undefined;
  const tokens = useMemo(() => (lines ? highlight(lines, path) : []), [lines, path]);

  // Keep the focus inside the file: a tour made before an edit may point past the end.
  const range = useMemo(() => {
    if (!focus || !lines) return undefined;
    const start = Math.min(focus.start, lines.length);
    return { start, end: Math.min(Math.max(focus.end, start), lines.length) };
  }, [focus, lines]);

  // Bring the focus into view; opening a file without a focus starts at its top.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const row = range && element.querySelector<HTMLElement>(`[data-line="${range.start}"]`);
    if (!range || !row) {
      element.scrollTo({ top: 0, left: 0 });
      return;
    }
    const height = (range.end - range.start + 1) * LINE_HEIGHT + (noteBox.current ? noteBox.current.offsetHeight + 12 : 0);
    const same = scrolledPath.current === path;
    scrolledPath.current = path;
    scrollToFocus(element, row.offsetTop, height, same);
  }, [focusId, path, range?.start, range?.end, lines, note?.index]);

  if (file === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2.5 text-sm font-bold text-[#a3acb9]" role="status">
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="typing-dot bg-[#a3acb9]" />
          <span className="typing-dot bg-[#a3acb9]" />
          <span className="typing-dot bg-[#a3acb9]" />
        </span>
        Opening {path}…
      </div>
    );
  }
  if (!file.ok) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm font-bold text-[#f4b9b9]" role="alert">
        {problems[file.error]}
      </div>
    );
  }
  if ('notebook' in file) return <NotebookView path={path} notebook={file.notebook} focus={focus} focusId={focusId} note={note} />;

  return (
    <div
      ref={scroller}
      tabIndex={0}
      aria-label={`Code of ${path}`}
      className={cn('code-editor relative min-h-0 flex-1 animate-fade-in overflow-auto font-mono text-[13px] [container-type:inline-size]', note && 'tour')}
    >
      <div className="w-max min-w-full py-2">
        {note && !range && (
          <div className="sticky left-0 w-fit">
            <StepNoteCard ref={noteBox} key={`${path}:${note.index}`} note={note} className="mb-2 ml-14 mr-4 mt-1.5 w-[min(40rem,calc(100cqw-4.5rem))]" />
          </div>
        )}
        {tokens.map((line, i) => {
          const n = i + 1;
          return (
            <Fragment key={n}>
              <Line n={n} tokens={line} marked={range !== undefined && n >= range.start && n <= range.end} />
              {note && range && n === range.end && (
                <div className="sticky left-0 w-fit">
                  <StepNoteCard ref={noteBox} key={`${path}:${note.index}`} note={note} className="mb-2 ml-14 mr-4 mt-1.5 w-[min(40rem,calc(100cqw-4.5rem))]" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
