// Interactive matrices: a confusion matrix colors hits and errors and derives its metrics from the counts; any other
// matrix shows magnitude with one blue ramp. A focus lifts the cells it reads and narrates them.
import { useMemo, useState } from 'react';
import type { MatrixBlock } from '../../../server/src/scene.ts';
import { SceneFrame } from '../components/scenes';
import { CheckIcon, CrossIcon } from '../components/icons';
import { cn } from '@/lib/utils';
import { cellOutcome, covers, formatRatio } from './confusion';
import { heatOf, isNumeric } from './heat';
import { matrixFocuses, positiveOf, type ViewFocus } from './focuses';

/** The grid, with the cells of `focus` lit and the rest dimmed. */
export function MatrixGrid({ block, focus, large = false }: { block: MatrixBlock; focus?: ViewFocus | undefined; large?: boolean }) {
  const confusion = block.kind === 'confusion';
  const size = block.cols.length;
  const positive = positiveOf(block);
  const heat = useMemo(() => heatOf(block.rows), [block]);
  const corner = block.corner ?? (confusion ? 'actual ↓ · predicted →' : '');
  const state = (r: number, c: number): string | undefined => (focus ? (focus.cells.some((pick) => covers(pick, r, c)) ? 'lit' : 'dim') : undefined);
  return (
    <div className="-m-1 overflow-x-auto p-1.5">
      <div
        role="table"
        aria-label={block.title}
        className="grid w-fit gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `auto repeat(${size}, minmax(${large ? '7rem' : '3.6rem'}, ${large ? '14rem' : '10rem'}))` }}
      >
        <div role="row" className="contents">
          <span role="columnheader" className="self-end px-1 pb-1 text-xs font-bold text-muted-foreground">
            {corner}
          </span>
          {block.cols.map((col, c) => (
            <span key={c} role="columnheader" className="self-end px-2 pb-1 text-center text-sm font-extrabold">
              {col}
            </span>
          ))}
        </div>
        {block.rows.map((row, r) => (
          <div key={r} role="row" className="contents">
            <span role="rowheader" className="flex items-center justify-end whitespace-nowrap pr-2 text-right text-sm font-extrabold">
              {row.label}
            </span>
            {row.values.map((value, c) => {
              const outcome = confusion ? cellOutcome(size, positive, r, c) : undefined;
              const hit = outcome === 'TP' || outcome === 'TN' || outcome === 'hit';
              const level = !confusion ? heat[r]?.[c] : undefined;
              return (
                <div
                  key={c}
                  role="cell"
                  aria-label={`${row.label}, ${block.cols[c] ?? ''}: ${value}${outcome ? ` (${outcome})` : ''}`}
                  className={cn(
                    'matrix-cell relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-border px-2 text-center',
                    large ? 'min-h-28 py-4' : 'min-h-20 py-3',
                    outcome && (hit ? 'matrix-hit' : 'matrix-miss'),
                    !outcome && 'bg-card',
                    state(r, c),
                  )}
                  style={level !== undefined ? { background: `color-mix(in oklab, var(--heat) ${level}%, white)`, color: level > 55 ? '#fff' : undefined } : undefined}
                >
                  <span className={cn('font-black tabular-nums leading-none tracking-tight', large ? 'text-5xl' : isNumeric(value) ? 'text-2xl sm:text-3xl' : 'text-base')}>{value}</span>
                  {outcome && (
                    <span className={cn('inline-flex items-center gap-1 text-[0.7rem] font-extrabold uppercase tracking-wide', hit ? 'text-success' : 'text-miss')}>
                      {hit ? <CheckIcon size={12} /> : <CrossIcon size={12} />}
                      {outcome}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** What a focus says: its label, the worked formula of a metric, and the narration. */
export function FocusNote({ focus }: { focus: ViewFocus }) {
  return (
    <div className="animate-fade-up space-y-1.5">
      <p className="text-lg font-extrabold">
        {focus.label}
        {focus.metric && <span className="tabular-nums"> = {formatRatio(focus.metric.value)}</span>}
      </p>
      {focus.metric && (
        <p className="font-mono text-sm font-semibold text-muted-foreground">
          {focus.metric.formula} = {focus.metric.worked}
        </p>
      )}
      {focus.narration && <p className="max-w-3xl text-base font-semibold leading-relaxed">{focus.narration}</p>}
    </div>
  );
}

export function MatrixScene({ block }: { block: MatrixBlock }) {
  const focuses = useMemo(() => matrixFocuses(block), [block]);
  const [active, setActive] = useState<number>();
  const focus = active !== undefined ? focuses[active] : undefined;
  return (
    <SceneFrame kind={block.kind === 'confusion' ? 'Confusion matrix' : 'Matrix'} title={block.title}>
      {focuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border-soft px-5 py-3" role="group" aria-label="Highlights">
          {focuses.map((item, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive((current) => (current === i ? undefined : i))}
              className={cn(
                'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-all duration-150 active:scale-[0.96]',
                active === i ? 'bg-primary shadow-[0_2px_0_var(--primary-dark)]' : 'bg-muted hover:bg-primary-light',
              )}
            >
              {item.label}
              {item.metric && <span className="tabular-nums text-muted-foreground">{formatRatio(item.metric.value)}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-4 p-5">
        <MatrixGrid block={block} focus={focus} />
        <div aria-live="polite" className="min-h-6">
          {focus ? (
            <FocusNote key={active} focus={focus} />
          ) : (
            focuses.length > 0 && <p className="text-sm font-semibold text-muted-foreground">Pick a highlight above to see which cells it reads.</p>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}
