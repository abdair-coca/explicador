// One real value followed through a series of operations. Each step shows what that operation did to the value
// before it: removed words struck out in red, added ones in yellow, changed ones with their letters marked.
import { Fragment, useMemo, useRef } from 'react';
import type { TraceBlock } from '../../../server/src/scene.ts';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { SceneFrame, StepControls, formatRef } from '../components/scenes';
import { Badge } from '../components/ui/badge';
import { cn } from '@/lib/utils';
import { changeCounts, diffWords, words, type Token } from './diff';
import { useSpeaker } from './context';
import { useFirstVisible, useFollowCode } from './hooks';

/** Changes appear one after another, but never take longer than this to finish appearing. */
const STAGGER_MS = 35;
const MAX_DELAY_MS = 800;

function TokenView({ token, delay }: { token: Token; delay: number }) {
  const style = { animationDelay: `${delay}ms` };
  if (token.kind === 'same') return <>{token.text}</>;
  if (token.kind === 'removed') {
    return (
      <del className="tok-del" style={style}>
        {token.text}
      </del>
    );
  }
  if (token.kind === 'added') {
    return (
      <ins className="tok-ins" style={style}>
        {token.text}
      </ins>
    );
  }
  return (
    <span className="tok-chg" style={style} title={`${token.from} → ${token.text}`}>
      {token.parts.map((part, i) =>
        part.kind === 'removed' ? <del key={i}>{part.text}</del> : part.kind === 'added' ? <ins key={i}>{part.text}</ins> : <Fragment key={i}>{part.text}</Fragment>,
      )}
    </span>
  );
}

/** The value at step `index`, with what its operation changed. */
export function TraceView({ block, index }: { block: TraceBlock; index: number }) {
  const value = block.values[index];
  const previous = block.values[index - 1];
  const tokens = useMemo(() => (previous && value ? diffWords(previous.text, value.text) : undefined), [previous, value]);
  const speaker = useSpeaker();
  if (!value) return null;
  const after = words(value.text).length;
  const before = previous ? words(previous.text).length : undefined;
  const changes = tokens ? changeCounts(tokens) : undefined;
  let order = 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={index === 0 ? 'dark' : 'step'}>{index === 0 ? 'Input' : `Step ${index} of ${block.values.length - 1}`}</Badge>
        <span className="text-lg font-extrabold">{value.label}</span>
        {value.code && <code className="op-pill text-[0.8rem]">{value.code}</code>}
        <span className="ml-auto text-sm font-bold tabular-nums text-muted-foreground">
          {before !== undefined && before !== after ? (
            <>
              {before} → <span className="text-foreground">{after}</span> words
            </>
          ) : (
            <>{after} words</>
          )}
        </span>
      </div>
      <p key={index} className="trace-text rounded-xl border-2 border-border bg-card px-4 py-3">
        {tokens
          ? tokens.map((token, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                <TokenView token={token} delay={token.kind === 'same' ? 0 : Math.min(order++ * STAGGER_MS, MAX_DELAY_MS)} />
              </Fragment>
            ))
          : value.text}
      </p>
      {changes && changes.removed + changes.added + changes.changed > 0 && (
        <p className="flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-wide" aria-label="What this step changed">
          {changes.removed > 0 && <span className="rounded-full bg-miss/10 px-2.5 py-1 text-miss">−{changes.removed} removed</span>}
          {changes.changed > 0 && <span className="rounded-full bg-primary-light px-2.5 py-1 text-foreground">{changes.changed} changed</span>}
          {changes.added > 0 && <span className="rounded-full bg-primary px-2.5 py-1 text-foreground">+{changes.added} added</span>}
        </p>
      )}
      {value.note && !speaker && (
        <p key={`note-${index}`} className="animate-fade-up max-w-3xl text-lg font-semibold leading-relaxed">
          {value.note}
        </p>
      )}
      {value.ref && <code className="inline-block rounded-lg bg-subtle px-2 py-0.5 font-mono text-xs font-semibold">{formatRef(value.ref)}</code>}
    </div>
  );
}

export function TraceScene({ block }: { block: TraceBlock }) {
  const reducedMotion = useReducedMotion();
  // Long enough to read the note and to see what changed.
  const durations = useMemo(() => block.values.map((value, i) => (i === 0 ? 2600 : stepDuration(value.note ?? value.label) + 1400)), [block]);
  const playback = usePlayback(durations, false);
  const frame = useRef<HTMLDivElement>(null);
  useFirstVisible(frame, () => {
    if (!reducedMotion && playback.index === 0 && !playback.playing) playback.toggle();
  });
  const value = block.values[playback.index];
  useFollowCode(value?.ref ?? block.ref);
  return (
    <div ref={frame}>
      <SceneFrame kind="Trace" title={block.title} actions={<StepControls playback={playback} />}>
        <ol className="flex flex-wrap gap-1.5 border-b border-border-soft px-5 py-3" aria-label="Steps">
          {block.values.map((step, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => playback.goTo(i)}
                aria-current={i === playback.index ? 'step' : undefined}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-all duration-150 active:scale-[0.96]',
                  i === playback.index ? 'bg-primary shadow-[0_2px_0_var(--primary-dark)]' : i < playback.index ? 'bg-muted text-foreground hover:bg-primary-light' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <span className="tabular-nums">{i === 0 ? '●' : i}</span>
                {step.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="p-5">
          <TraceView block={block} index={playback.index} />
        </div>
      </SceneFrame>
    </div>
  );
}
