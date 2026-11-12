// A formula derived line by line. Each line is matched against the one before it: the symbols they share are the
// same symbols, and the rest are new (marked in yellow). In Present mode (`shown` is the current part) each line is a
// part that `choreo.ts` plays: the shared symbols glide down from the line above and the new ones pop in.
import { useLayoutEffect, useRef } from 'react';
import type { DeriveBlock } from '../../../server/src/scene.ts';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { Tex } from '../components/Tex';
import { cn } from '@/lib/utils';
import { matchAtoms } from './deriveMatch';

/** The symbols of a rendered formula: KaTeX's innermost boxes that hold text. */
export function atomsOf(line: Element): HTMLElement[] {
  return [...line.querySelectorAll<HTMLElement>('.katex-html *')].filter((element) => element.childElementCount === 0 && (element.textContent ?? '').trim() !== '');
}

/**
 * Tells every symbol where it comes from: `data-from` is the index of the same symbol in the line above, and a symbol
 * without it is new. KaTeX's markup is not React's, so these attributes stay until the formula changes.
 */
function useLineage(lines: DeriveBlock['lines']) {
  const root = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const rows = [...(root.current?.querySelectorAll('.derive-line') ?? [])];
    rows.forEach((row, i) => {
      const atoms = atomsOf(row);
      const previous = i > 0 ? atomsOf(rows[i - 1] as Element) : [];
      const from = matchAtoms(previous.map((atom) => atom.textContent ?? ''), atoms.map((atom) => atom.textContent ?? ''));
      atoms.forEach((atom, a) => {
        const source = from[a];
        if (source === undefined) delete atom.dataset.from;
        else atom.dataset.from = String(source);
        atom.classList.toggle('derive-new', i > 0 && source === undefined);
      });
    });
  }, [lines]);
  return root;
}

export function DeriveView({ block, shown }: { block: DeriveBlock; shown?: number }) {
  const root = useLineage(block.lines);
  const presenting = shown !== undefined;
  return (
    <ol ref={root} className={cn('derive', presenting && 'derive-slide')}>
      {block.lines.map((line, i) => (
        <li
          key={i}
          className={cn('derive-line', presenting && (i === shown ? 'current' : i < shown ? 'past' : undefined))}
          {...(presenting ? { 'data-part': i, 'data-fx': 'derive', 'data-stage': i > shown ? 'future' : 'shown' } : {})}
        >
          <span className="derive-step" aria-hidden="true">
            {i === 0 ? '' : '='}
          </span>
          <div className="derive-formula">
            <Tex tex={line.tex} display />
          </div>
          {line.note && (
            <p className="derive-note">
              <InlineMarkdown text={line.note} />
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function DeriveScene({ block }: { block: DeriveBlock }) {
  return (
    <SceneFrame kind="Derivation" title={block.title}>
      <div className="p-5">
        <DeriveView block={block} />
      </div>
    </SceneFrame>
  );
}
