// A Jupyter notebook as cells: Markdown rendered, code highlighted with its number, and the outputs the server kept.
// Refs to a notebook count cells, so the cell numbers are always visible and the cells in focus are highlighted.
import { Fragment, memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Notebook, NotebookCell, NotebookOutput } from '../../../server/src/scene.ts';
import { Prose } from '../components/Prose';
import { highlight } from '../lib/highlight';
import { cn } from '@/lib/utils';
import { scrollToFocus } from './scroll';
import { StepNoteCard, type StepNote } from './StepNote';
import type { LineRange } from './state';

const extensions: Record<string, string> = { python: 'py', r: 'r', julia: 'jl', javascript: 'js', typescript: 'ts', bash: 'sh', sql: 'sql', ruby: 'rb' };

const frameStyles =
  'body{margin:8px;font:13px/1.45 system-ui,sans-serif;color:#1a1a2e}table{border-collapse:collapse;font-size:12.5px}' +
  'th,td{border:1px solid #e5e7eb;padding:4px 10px;text-align:right}th{background:#f9f5e7;font-weight:700}img{max-width:100%}';

/** HTML from a notebook, in a frame that runs nothing and cannot reach the page: sandbox without scripts. */
function HtmlFrame({ html, minimal }: { html: string; minimal?: boolean }) {
  const [height, setHeight] = useState(60);
  return (
    <iframe
      title="Notebook HTML"
      sandbox="allow-same-origin"
      srcDoc={`<!doctype html><meta charset="utf-8"><style>${minimal ? 'body{margin:0;font:14px/1.5 system-ui,sans-serif}img{max-width:100%}' : frameStyles}</style>${html}`}
      onLoad={(event) => {
        const doc = event.currentTarget.contentDocument?.documentElement;
        if (doc) setHeight(Math.min(Math.max(doc.scrollHeight + 2, 32), 520));
      }}
      style={{ height }}
      className={cn('w-full rounded-lg bg-white', !minimal && 'border border-border-soft')}
    />
  );
}

function Output({ output }: { output: NotebookOutput }) {
  if (output.kind === 'image') {
    return <img src={`data:${output.mime};base64,${output.data}`} alt="Notebook output" className="max-h-[28rem] max-w-full rounded-lg border border-border-soft bg-white" />;
  }
  if (output.kind === 'html') return <HtmlFrame html={output.html} />;
  if (output.kind === 'omitted') {
    return <p className="w-fit rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">Output omitted: {output.label}</p>;
  }
  return (
    <pre
      className={cn(
        'max-h-72 overflow-auto whitespace-pre-wrap rounded-lg px-3 py-2 font-mono text-[12.5px] leading-5 [overflow-wrap:anywhere]',
        output.stream === 'error' ? 'bg-red-50 text-red-800' : output.stream === 'stderr' ? 'bg-warning text-warning-foreground' : 'bg-white text-foreground',
      )}
    >
      {output.text}
    </pre>
  );
}

const isHtmlCell = (source: string): boolean => /^\s*<(div|span|table|img|p|h[1-6]|br|a|b|i|center|style|section|ul|ol)\b/i.test(source);

export const CellView = memo(function CellView(props: { cell: NotebookCell; language: string; marked?: boolean; compact?: boolean }) {
  const { cell, language, compact } = props;
  const tokens = useMemo(() => (cell.type === 'code' ? highlight(cell.source.split('\n'), `cell.${extensions[language] ?? 'py'}`) : []), [cell, language]);
  return (
    <section data-cell={cell.n} className={cn('nb-cell flex gap-3', props.marked && 'marked')}>
      <div className="w-16 shrink-0 pt-2.5 text-right font-mono text-[11px] font-bold leading-4 text-muted-foreground">
        <span className="mb-0.5 inline-block rounded-md bg-card px-1.5 py-0.5 text-foreground shadow-[0_1px_0_var(--border)]">#{cell.n}</span>
        {cell.type === 'code' && <span className="block pt-1">[{cell.count ?? ' '}]</span>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {cell.type === 'markdown' ? (
          <div className="rounded-xl border-2 border-border bg-card px-4 py-3">
            {isHtmlCell(cell.source) ? (
              <HtmlFrame html={cell.source} minimal />
            ) : (
              <div className="prose-exl prose-panel">
                <Prose>{cell.source}</Prose>
              </div>
            )}
          </div>
        ) : cell.type === 'code' ? (
          <pre className="code-block overflow-x-auto rounded-xl py-2.5 font-mono text-[12.5px] leading-5">
            <code>
              {tokens.length === 0 || cell.source === '' ? (
                <span className="px-3.5 text-[#8b95a5]">(empty cell)</span>
              ) : (
                tokens.map((line, i) => (
                  <span key={i} className="block whitespace-pre px-3.5">
                    {line.length === 0 ? ' ' : line.map((t, j) => <span key={j} className={`tok-${t.kind}`}>{t.text}</span>)}
                  </span>
                ))
              )}
            </code>
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap rounded-xl bg-muted px-3.5 py-2.5 font-mono text-[12.5px] text-muted-foreground">{cell.source}</pre>
        )}
        {!compact && cell.outputs?.map((output, i) => <Output key={i} output={output} />)}
      </div>
    </section>
  );
});

export function NotebookView(props: {
  path: string;
  notebook: Notebook;
  /** Cell range in focus (1-based, inclusive). */
  focus: LineRange | undefined;
  focusId: number;
  note?: StepNote | undefined;
}) {
  const { path, notebook, focus, focusId, note } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const noteBox = useRef<HTMLDivElement>(null);
  const scrolledPath = useRef<string | undefined>(undefined);
  const count = notebook.cells.length;
  const range = useMemo(() => {
    if (!focus || count === 0) return undefined;
    const start = Math.min(focus.start, count);
    return { start, end: Math.min(Math.max(focus.end, start), count) };
  }, [focus, count]);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const first = range && element.querySelector<HTMLElement>(`[data-cell="${range.start}"]`);
    const last = range && element.querySelector<HTMLElement>(`[data-cell="${range.end}"]`);
    if (!first || !last) {
      element.scrollTo({ top: 0, left: 0 });
      return;
    }
    const height = last.offsetTop + last.offsetHeight - first.offsetTop + (noteBox.current ? noteBox.current.offsetHeight + 12 : 0);
    const same = scrolledPath.current === path;
    scrolledPath.current = path;
    scrollToFocus(element, first.offsetTop, height, same);
  }, [focusId, path, range?.start, range?.end, note?.index]);

  return (
    <div
      ref={scroller}
      tabIndex={0}
      aria-label={`Notebook ${path}`}
      className={cn('notebook relative min-h-0 flex-1 overflow-auto bg-background', note && 'tour')}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5">
        {note && !range && <StepNoteCard ref={noteBox} key={`${path}:${note.index}`} note={note} className="ml-[4.75rem]" />}
        {notebook.cells.map((cell) => {
          const marked = range !== undefined && cell.n >= range.start && cell.n <= range.end;
          return (
            <Fragment key={cell.n}>
              <CellView cell={cell} language={notebook.language} marked={marked} />
              {note && range && cell.n === range.end && <StepNoteCard ref={noteBox} key={`${path}:${note.index}`} note={note} className="ml-[4.75rem]" />}
            </Fragment>
          );
        })}
        {count === 0 && <p className="text-center text-sm font-bold text-muted-foreground">This notebook has no cells.</p>}
      </div>
    </div>
  );
}
