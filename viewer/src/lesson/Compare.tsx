// Two things side by side, row by row. In Present mode (`shown` is the current part) the two names face each other
// first, then each row is a part (its cells arrive from their own side and the winner is marked), and a tally closes it
// when rows have winners. On the page everything shows.
import type { CompareBlock } from '../../../server/src/scene.ts';
import { CheckIcon } from '../components/icons';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { cn } from '@/lib/utils';
import { compareTally } from './compareTally';

export function CompareView({ block, shown }: { block: CompareBlock; shown?: number }) {
  const presenting = shown !== undefined;
  const part = (index: number, fx: string) => (presenting ? { 'data-part': index, 'data-fx': fx, 'data-stage': index > shown ? 'future' : 'shown' } : {});
  const tally = compareTally(block);
  const judged = block.rows.some((row) => row.winner);
  const lead = tally.a === tally.b ? undefined : tally.a > tally.b ? 'a' : 'b';
  return (
    <div className={cn('compare', presenting && 'compare-slide')}>
      <div className="compare-head" {...part(0, 'versus')}>
        <h4 className="compare-name compare-a">{block.a}</h4>
        <span className="compare-vs" aria-hidden="true">
          vs
        </span>
        <h4 className="compare-name compare-b">{block.b}</h4>
      </div>
      <ul className="compare-rows">
        {block.rows.map((row, i) => (
          <li key={i} className="compare-row" {...part(i + 1, 'pair')}>
            <p className={cn('compare-cell compare-a', row.winner === 'a' && 'winner')}>
              {row.winner === 'a' && <Winner />}
              <InlineMarkdown text={row.a} />
            </p>
            <span className="compare-label">{row.label}</span>
            <p className={cn('compare-cell compare-b', row.winner === 'b' && 'winner')}>
              {row.winner === 'b' && <Winner />}
              <InlineMarkdown text={row.b} />
            </p>
          </li>
        ))}
      </ul>
      {judged && (
        <p className="compare-tally" {...part(block.rows.length + 1, 'pop')} aria-label={`${block.a} wins ${tally.a} rows, ${block.b} wins ${tally.b}`}>
          <span className={cn('compare-score compare-a', lead === 'a' && 'lead')}>
            {block.a} <strong>{tally.a}</strong>
          </span>
          <span className={cn('compare-score compare-b', lead === 'b' && 'lead')}>
            <strong>{tally.b}</strong> {block.b}
          </span>
        </p>
      )}
    </div>
  );
}

function Winner() {
  return (
    <span className="compare-win" role="img" aria-label="Better here">
      <CheckIcon size={13} />
    </span>
  );
}

export function CompareScene({ block }: { block: CompareBlock }) {
  return (
    <SceneFrame kind="Comparison" title={block.title}>
      <div className="p-5">
        <CompareView block={block} />
      </div>
    </SceneFrame>
  );
}
