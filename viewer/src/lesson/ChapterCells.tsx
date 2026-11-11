// "Your cells": the chapter's notebook cells with their outputs (or its lines of code), folded under the chapter
// header so the lesson stays readable; open it to compare the explanation with the real code.
import { useId, useMemo, useState } from 'react';
import type { ChapterBlock } from '../../../server/src/scene.ts';
import { CellView } from '../code/NotebookView';
import { ChevronDownIcon, CodeIcon } from '../components/icons';
import { formatRef } from '../components/scenes';
import { useSelection } from '../components/selection';
import { highlight } from '../lib/highlight';
import { cn } from '@/lib/utils';

function Lines({ chapter }: { chapter: ChapterBlock }) {
  const lines = useMemo(() => (chapter.lines && chapter.ref ? highlight(chapter.lines, chapter.ref.path) : []), [chapter]);
  const first = chapter.ref?.start ?? 1;
  return (
    <pre className="code-block overflow-x-auto rounded-xl py-3 font-mono text-[12.5px] leading-5">
      <code>
        {lines.map((tokens, i) => (
          <span key={i} className="flex">
            <span className="code-line-number w-11 shrink-0 select-none pr-3 text-right">{first + i}</span>
            <span className="min-w-0 whitespace-pre pr-3">{tokens.length === 0 ? ' ' : tokens.map((t, j) => <span key={j} className={`tok-${t.kind}`}>{t.text}</span>)}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}

export function ChapterCells({ chapter }: { chapter: ChapterBlock }) {
  const [open, setOpen] = useState(false);
  const openCode = useSelection()?.openCode;
  const body = useId();
  const ref = chapter.ref;
  if (!ref) return null;
  const notebook = chapter.cells !== undefined || ref.path.toLowerCase().endsWith('.ipynb');
  const count = chapter.cells ? `${chapter.cells.length} ${chapter.cells.length === 1 ? 'cell' : 'cells'}` : chapter.lines ? `${chapter.lines.length} lines` : undefined;
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card/60">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={body}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left"
        >
          <ChevronDownIcon size={18} className={cn('shrink-0 transition-transform duration-200', !open && '-rotate-90')} />
          <span className="font-extrabold">{notebook ? 'Your cells' : 'Your code'}</span>
          <code className="min-w-0 truncate rounded-md bg-subtle px-1.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground">{formatRef(ref)}</code>
          {count && <span className="text-xs font-bold text-muted-foreground">{count}</span>}
        </button>
        {openCode && !chapter.missing && (
          <button
            type="button"
            onClick={() => openCode(ref)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold text-muted-foreground transition-all duration-150 hover:bg-primary-light hover:text-foreground active:scale-[0.96]"
          >
            <CodeIcon size={16} />
            Open in the code window
          </button>
        )}
      </div>
      {open && (
        <div id={body} className="animate-fade-up space-y-3 border-t-2 border-dashed border-border px-3 py-4">
          {chapter.missing ? (
            <p className="text-sm font-bold text-muted-foreground">These cells are no longer in the file; ask Claude to refresh the lesson.</p>
          ) : chapter.cells ? (
            chapter.cells.map((cell) => <CellView key={cell.n} cell={cell} language="python" />)
          ) : chapter.lines ? (
            <Lines chapter={chapter} />
          ) : (
            <p className="text-sm font-bold text-muted-foreground">The code shows when Claude publishes the lesson.</p>
          )}
        </div>
      )}
    </div>
  );
}
