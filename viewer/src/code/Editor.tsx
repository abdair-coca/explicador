// The editor of the code window: read-only, line numbers, syntax colors, the lines in focus highlighted
// and, during a tour, the rest dimmed and the step's note shown right under the highlighted lines.
import { Fragment, memo, useLayoutEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { highlight, type Token } from '../lib/highlight';
import type { FileReply } from '../api';
import { cn } from '@/lib/utils';
import type { LineRange } from './state';

const LINE_HEIGHT = 20;

export interface StepNote {
  index: number;
  of: number;
  text: string;
}

const problems: Record<string, string> = {
  missing: 'This file is no longer in the project.',
  denied: 'This file cannot be shown (it is hidden or outside the project).',
  binary: 'This is a binary file; there is no text to show.',
  'too-large': 'This file is too large to show here (over 512 KB).',
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
  const lines = file !== 'loading' && file.ok ? file.lines : undefined;
  const tokens = useMemo(() => (lines ? highlight(lines, path) : []), [lines, path]);

  // Keep the focus inside the file: a tour made before an edit may point past the end.
  const range = useMemo(() => {
    if (!focus || !lines) return undefined;
    const start = Math.min(focus.start, lines.length);
    return { start, end: Math.min(Math.max(focus.end, start), lines.length) };
  }, [focus, lines]);

  // Bring the focus into view: centered when it fits, otherwise starting near the top.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || !range) return;
    const row = element.querySelector<HTMLElement>(`[data-line="${range.start}"]`);
    if (!row) return;
    const height = (range.end - range.start + 1) * LINE_HEIGHT + (noteBox.current ? noteBox.current.offsetHeight + 12 : 0);
    // Centered when there is room to spare; otherwise as much of the lines and the note as fits, starting a little below the top.
    const slack = element.clientHeight - height;
    const top = Math.max(0, row.offsetTop - (slack >= 48 ? slack / 2 : Math.max(8, slack)));
    const same = scrolledPath.current === path;
    scrolledPath.current = path;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ top, left: 0, behavior: same && !calm ? 'smooth' : 'auto' });
  }, [focusId, path, range?.start, range?.end, lines, note?.index]);

  // Opening another file without a focus starts at its top.
  useLayoutEffect(() => {
    if (!range && scroller.current) scroller.current.scrollTo({ top: 0, left: 0 });
  }, [path, range]);

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

  return (
    <div
      ref={scroller}
      tabIndex={0}
      aria-label={`Code of ${path}`}
      className={cn('code-editor relative min-h-0 flex-1 overflow-auto font-mono text-[13px] [container-type:inline-size]', note && 'tour')}
    >
      <div className="w-max min-w-full py-2">
        {tokens.map((line, i) => {
          const n = i + 1;
          return (
            <Fragment key={n}>
              <Line n={n} tokens={line} marked={range !== undefined && n >= range.start && n <= range.end} />
              {note && range && n === range.end && (
                <div className="sticky left-0 w-fit">
                  <div
                    key={`${path}:${note.index}`}
                    ref={noteBox}
                    aria-live="polite"
                    className="animate-pop-in ml-14 mr-4 mt-1.5 mb-2 flex w-[min(40rem,calc(100cqw-4.5rem))] origin-top-left gap-3 rounded-xl border-2 border-primary bg-primary-light px-3.5 py-3 font-sans text-foreground shadow-[0_4px_0_var(--primary-dark)]"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-black shadow-[0_2px_0_var(--primary-dark)]">
                      {note.index + 1}
                    </span>
                    <div className="prose-exl prose-panel min-w-0 flex-1 text-sm font-semibold">
                      <Markdown>{note.text}</Markdown>
                    </div>
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
