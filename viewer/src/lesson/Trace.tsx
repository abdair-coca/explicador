// One real example followed through a series of operations, in whatever form it takes at each step: a sentence,
// a list of items, `name = value` rows, bars or one number. The steps already played stay in sight as a strip of small
// cards (F31), so the slide shows the whole way the example has come. The pieces that survive a step (a word, an item,
// a row's name) glide into their new form, so the reader watches the same example change; what the step removed is
// struck out in red and what it added comes in yellow.
import { Component, createRef, Fragment, useMemo, useRef, type ReactNode } from 'react';
import type { TraceBlock, TraceItem, TraceValue } from '../../../server/src/scene.ts';
import { Flip, gsap, reducedMotion, staggerOf, tokens } from '../animation/motion';
import { stepDuration, usePlayback, useReducedMotion } from '../animation/playback';
import { SceneFrame, StepControls, formatRef } from '../components/scenes';
import { Badge } from '../components/ui/badge';
import { cn } from '@/lib/utils';
import { useSpeaker } from './context';
import { CountUp } from './CountUp';
import { diffWords, words, type Token } from './diff';
import { t } from '../i18n';
import { useFirstVisible, useFollowCode } from './hooks';
import { barsOf, keyed, pieceChanges, pieceNames, stripOf, vectorOf } from './traceShape';

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

/**
 * Keeps each piece in sight between two steps. Before React changes the DOM it records where every piece is (its
 * `data-flip-id`); after, the pieces with the same id glide from there into their new form, and the new ones pop in.
 * A class, because only `getSnapshotBeforeUpdate` runs before the DOM changes.
 */
class FlipPieces extends Component<{ step: number; className?: string; children: ReactNode }> {
  private box = createRef<HTMLDivElement>();

  override getSnapshotBeforeUpdate(previous: Readonly<{ step: number }>): Flip.FlipState | null {
    const box = this.box.current;
    if (!box || previous.step === this.props.step || reducedMotion()) return null;
    return Flip.getState(box.querySelectorAll('[data-flip-id]'));
  }

  override componentDidUpdate(_props: unknown, _state: unknown, snapshot: Flip.FlipState | null): void {
    const box = this.box.current;
    if (!box || !snapshot) return;
    Flip.from(snapshot, {
      targets: box.querySelectorAll('[data-flip-id]'),
      duration: tokens.dur.slow,
      ease: tokens.ease.move,
      scale: true,
      onEnter: (entering) =>
        gsap.from(entering, { autoAlpha: 0, scale: 0.6, duration: tokens.dur.base, ease: tokens.ease.pop, delay: tokens.dur.base, stagger: staggerOf(entering.length, tokens.stagger.tight) }),
    });
  }

  override render(): ReactNode {
    return (
      <div ref={this.box} className={this.props.className}>
        {this.props.children}
      </div>
    );
  }
}

/** The sentence, with what the step changed marked; every word that stays is a piece that can travel. */
function TextBody({ value, tokens }: { value: TraceValue; tokens: Token[] | undefined }) {
  const shown = tokens ?? words(value.text).map((text): Token => ({ kind: 'same', text }));
  const keys = keyed(shown.filter((token) => token.kind !== 'removed').map((token) => token.text));
  let piece = 0;
  let order = 0;
  return (
    <p className="trace-text rounded-xl border-2 border-border bg-card px-4 py-3">
      {shown.map((token, i) => {
        const delay = token.kind === 'same' || !tokens ? 0 : Math.min(order++ * STAGGER_MS, MAX_DELAY_MS);
        const view = <TokenView token={token} delay={delay} />;
        return (
          <Fragment key={i}>
            {i > 0 && ' '}
            {token.kind === 'removed' ? (
              view
            ) : (
              <span className="trace-piece" data-flip-id={keys[piece++]}>
                {view}
              </span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}

function ListBody({ items }: { items: TraceItem[] }) {
  const keys = keyed(items.map((item) => item.name));
  return (
    <ul className="trace-list" aria-label="Items">
      {items.map((item, i) => (
        <li key={keys[i]} className="trace-chip" data-flip-id={keys[i]}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

function TableBody({ items }: { items: TraceItem[] }) {
  const keys = keyed(items.map((item) => item.name));
  return (
    <table className="trace-table">
      <tbody>
        {items.map((item, i) => (
          <tr key={keys[i]}>
            <th scope="row">
              <span className="trace-name" data-flip-id={keys[i]}>
                {item.name}
              </span>
            </th>
            <td className="trace-cell" style={{ animationDelay: `${Math.min(i * STAGGER_MS * 2, MAX_DELAY_MS)}ms` }}>
              {item.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Bars from zero; with any negative value they diverge from a center line, positives right and negatives left. */
function BarsBody({ items }: { items: TraceItem[] }) {
  const bars = barsOf(items);
  const diverging = bars.some((bar) => bar.value < 0);
  return (
    <div className={cn('trace-bars', diverging && 'diverging')} role="list" aria-label="Bars">
      {bars.map((bar, i) => (
        <div key={bar.key} className="trace-bar-row" role="listitem" aria-label={`${bar.name} ${bar.text}`}>
          <span className="trace-name" data-flip-id={bar.key}>
            {bar.name}
          </span>
          <span className="trace-track" aria-hidden="true">
            <span
              className={cn('trace-bar', bar.value < 0 && 'negative')}
              style={{ '--share': bar.share, animationDelay: `${Math.min(i * STAGGER_MS * 2, MAX_DELAY_MS) + 200}ms` } as React.CSSProperties}
            />
          </span>
          <span className={cn('trace-bar-value tabular-nums', bar.value < 0 && 'text-miss')}>{bar.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * An embedding: a strip of cells, warm for positive numbers and cool for negative ones, stronger the bigger the number,
 * with the numbers under them; a last cell counts the dimensions not shown. Cells keep their place between two vector
 * steps, so a change (a normalization) shows as the colors and numbers changing in place.
 */
function VectorBody({ value }: { value: TraceValue }) {
  const { cells, hidden, size } = vectorOf(value);
  return (
    <div className="trace-vector" role="list" aria-label={`Vector of ${size} numbers`}>
      <span className="trace-vector-bracket" aria-hidden="true">
        [
      </span>
      {cells.map((cell, i) => (
        <span key={cell.n} className="trace-vector-cell" role="listitem" data-flip-id={`v${cell.n}`} aria-label={`${cell.n}: ${cell.text}`}>
          <span
            className={cn('trace-vector-swatch', cell.value < 0 && 'negative')}
            style={{ '--share': cell.share, animationDelay: `${Math.min(i * STAGGER_MS * 2, MAX_DELAY_MS)}ms` } as React.CSSProperties}
          />
          <span className={cn('trace-vector-number tabular-nums', cell.value < 0 && 'text-miss')}>{cell.text}</span>
        </span>
      ))}
      {hidden > 0 && (
        <span className="trace-vector-cell trace-vector-more" role="listitem">
          <span className="trace-vector-swatch more" />
          <span className="trace-vector-number tabular-nums">+{hidden.toLocaleString()}</span>
        </span>
      )}
      <span className="trace-vector-bracket" aria-hidden="true">
        ]
      </span>
    </div>
  );
}

function NumberBody({ value }: { value: TraceValue }) {
  return (
    <p className="trace-number tabular-nums">
      <CountUp text={value.text} />
    </p>
  );
}

const UNITS = { text: 'words', list: 'items', table: 'rows', bars: 'bars', vector: 'dimensions' } as const;
/** Kinds whose pieces a reader can count: a step that drops two items of a list says so. Text and numbers do not. */
const COUNTED = new Set(['list', 'table', 'bars']);
/** A value in its form, without marks: a past step of the strip. */
function ValueBody({ value }: { value: TraceValue }) {
  const kind = value.kind ?? 'text';
  if (kind === 'list') return <ListBody items={value.items ?? []} />;
  if (kind === 'table') return <TableBody items={value.items ?? []} />;
  if (kind === 'bars') return <BarsBody items={value.items ?? []} />;
  if (kind === 'number') return <p className="trace-number tabular-nums">{value.text}</p>;
  if (kind === 'vector') return <VectorBody value={value} />;
  return <p className="trace-text rounded-xl border-2 border-border bg-card px-3 py-2">{value.text}</p>;
}

function StepBadge({ index }: { index: number }) {
  return <Badge variant={index === 0 ? 'dark' : 'step'}>{index === 0 ? t('Input') : `${t('Step')} ${index}`}</Badge>;
}

/** A step already played, small, so the reader sees where the example has been. */
function PastCard({ value, index }: { value: TraceValue; index: number }) {
  return (
    <li className="trace-card past" aria-label={`${index === 0 ? t('Input') : `${t('Step')} ${index}`}: ${value.label}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StepBadge index={index} />
        <span className="trace-label font-extrabold">{value.label}</span>
      </div>
      <div className="trace-body">
        <ValueBody value={value} />
      </div>
    </li>
  );
}

/**
 * The example at step `index`, as a strip (F31): the steps already played stay in sight as small cards joined by
 * arrows, and the current one, larger, shows its value in its form with what its operation changed.
 */
export function TraceView({ block, index }: { block: TraceBlock; index: number }) {
  const value = block.values[index];
  const previous = block.values[index - 1];
  const bothText = !value?.kind && !previous?.kind;
  const tokens = useMemo(() => (previous && value && bothText ? diffWords(previous.text, value.text) : undefined), [previous, value, bothText]);
  const speaker = useSpeaker();
  if (!value) return null;
  const kind = value.kind ?? 'text';
  // Only pieces a reader can count get a tally: words of a sentence are no pieces to count, a number has none.
  // Pieces are counted within one form: a list that becomes a table changed form, it did not lose items.
  const counted = COUNTED.has(kind) && previous !== undefined && (previous.kind ?? 'text') === kind;
  const changes = counted ? pieceChanges(previous, value) : undefined;
  const removed = changes?.removed ?? 0;
  const added = changes?.added ?? 0;
  const sizeOf = (v: TraceValue): number => (v.kind === 'vector' ? vectorOf(v).size : pieceNames(v).length);
  const count = sizeOf(value);
  const before = previous && (previous.kind ?? 'text') === kind ? sizeOf(previous) : undefined;
  const { folded, past } = stripOf(block.values.length, index);
  return (
    <ol
      className={cn('trace-strip', speaker && 'trace-large', past.length > 0 && 'with-past')}
      style={{ '--strip': `${folded > 0 ? 'max-content ' : ''}repeat(${past.length}, minmax(0, 1fr)) minmax(0, ${past.length > 0 ? 2 : 1}fr)` } as React.CSSProperties}
      aria-label={t('Steps')}
    >
      {folded > 0 && (
        <li className="trace-folded" aria-label={`${folded} ${t('earlier steps')}`}>
          +{folded}
        </li>
      )}
      {past.map((i) => {
        const step = block.values[i];
        return step ? <PastCard key={i} value={step} index={i} /> : null;
      })}
      <li key="current" className="trace-card current space-y-3" aria-current="step">
        <div className="flex flex-wrap items-center gap-2">
          <StepBadge index={index} />
          <span className="trace-label text-lg font-extrabold">{value.label}</span>
          {value.code && <code className="op-pill text-[0.8rem]">{value.code}</code>}
          {kind !== 'number' && kind !== 'text' && (
            <span className="ml-auto text-sm font-bold tabular-nums text-muted-foreground">
              {before !== undefined && before !== count ? (
                <>
                  {before.toLocaleString()} → <span className="text-foreground">{count.toLocaleString()}</span> {t(UNITS[kind])}
                </>
              ) : (
                <>
                  {count.toLocaleString()} {t(UNITS[kind])}
                </>
              )}
            </span>
          )}
        </div>
        <FlipPieces step={index} className="trace-body">
          {kind === 'text' && <TextBody key={index} value={value} tokens={tokens} />}
          {kind === 'list' && <ListBody items={value.items ?? []} />}
          {kind === 'table' && <TableBody items={value.items ?? []} />}
          {kind === 'bars' && <BarsBody items={value.items ?? []} />}
          {kind === 'number' && <NumberBody key={index} value={value} />}
          {kind === 'vector' && <VectorBody value={value} />}
        </FlipPieces>
        {removed + added > 0 && (
          <p className="flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-wide" aria-label={t('What this step changed')}>
            {removed > 0 && (
              <span className="rounded-full bg-miss/10 px-2.5 py-1 text-miss">
                −{removed} {t('removed')}
              </span>
            )}
            {added > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-foreground">
                +{added} {t('added')}
              </span>
            )}
          </p>
        )}
        {value.note && !speaker && (
          <p key={`note-${index}`} className="animate-fade-up max-w-3xl text-lg font-semibold leading-relaxed">
            {value.note}
          </p>
        )}
        {value.ref && !speaker && <code className="inline-block rounded-lg bg-subtle px-2 py-0.5 font-mono text-xs font-semibold">{formatRef(value.ref)}</code>}
      </li>
    </ol>
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
        <ol className="flex flex-wrap gap-1.5 border-b border-border-soft px-5 py-3" aria-label={t('Steps')}>
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
