// A concept card: the term, what it is, an everyday analogy, its formula and a tiny worked example.
// In Present mode (`shown` is the current part) the term first stands alone, giant, in the middle of the slide with a
// yellow flash. On the next part it flies to the top (GSAP Flip) and the pieces arrive one per part, each a part that
// `choreo.ts` plays and rewinds: the definition rises, the analogy swings in, the formula's atoms pop in from left to
// right and the example rises.
import { useLayoutEffect, useRef } from 'react';
import type { ConceptBlock } from '../../../server/src/scene.ts';
import { Flip, reducedMotion, tokens } from '../animation/motion';
import { BulbIcon, SparkIcon } from '../components/icons';
import { InlineMarkdown, Prose } from '../components/Prose';
import { Tex } from '../components/Tex';
import { cn } from '@/lib/utils';
import { conceptPieces, type ConceptPiece } from './conceptParts';

/** Moves the term from where it was drawn last to where it is now, whenever `hero` changes. */
function useFlip(hero: boolean) {
  const element = useRef<HTMLHeadingElement>(null);
  const last = useRef<Flip.FlipState | undefined>(undefined);
  const wasHero = useRef(hero);
  useLayoutEffect(() => {
    const term = element.current;
    if (!term) return;
    if (last.current && wasHero.current !== hero && !reducedMotion()) {
      Flip.from(last.current, { targets: term, duration: tokens.dur.slow, ease: tokens.ease.move, scale: true, absolute: false });
    }
    wasHero.current = hero;
    last.current = Flip.getState(term);
  }, [hero]);
  return element;
}

function Formula({ tex }: { tex: string }) {
  const element = useRef<HTMLDivElement>(null);
  // A formula wider than its card shrinks to fit instead of scrolling.
  useLayoutEffect(() => {
    const box = element.current;
    const fit = (): void => {
      const formula = box?.querySelector<HTMLElement>('.katex');
      if (!box || !formula) return;
      box.style.removeProperty('--fit');
      const room = box.clientWidth;
      const width = formula.getBoundingClientRect().width;
      if (room > 0 && width > room) box.style.setProperty('--fit', String(Math.max(0.45, room / width)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [tex]);
  return (
    <div ref={element} className="concept-formula">
      <Tex tex={tex} display />
    </div>
  );
}

export function ConceptView({ block, shown }: { block: ConceptBlock; shown?: number }) {
  const presenting = shown !== undefined;
  const hero = presenting && shown === 0;
  const term = useFlip(hero);
  const pieces = conceptPieces(block);
  /** Present mode: a piece's part is its position plus one, after the term; `fx` is how it comes in. */
  const part = (piece: ConceptPiece, fx: string) => {
    if (!presenting) return {};
    const index = pieces.indexOf(piece) + 1;
    return { 'data-part': index, 'data-fx': fx, 'data-stage': index > shown ? 'future' : 'shown' };
  };

  return (
    <section aria-label={`Concept: ${block.term}`} className={cn('concept', presenting && 'concept-slide', hero && 'concept-hero')}>
      <header className="concept-head">
        <span className="concept-chip">
          <SparkIcon size={14} />
          Concept
        </span>
        <h3 ref={term} className="concept-term">
          <span className="concept-term-text">{block.term}</span>
        </h3>
      </header>
      {!hero && (
        <div className="concept-body">
          <p className="concept-define" {...part('define', 'rise')}>
            <InlineMarkdown text={block.define} />
          </p>
          {(block.analogy || block.formula) && (
            <div className="concept-pair">
              {block.analogy && (
                <aside className="concept-analogy" {...part('analogy', 'swing')}>
                  <span className="concept-analogy-icon" aria-hidden="true">
                    <BulbIcon size={18} />
                  </span>
                  <p>
                    <span className="concept-label">Think of it as</span>
                    <InlineMarkdown text={block.analogy} />
                  </p>
                </aside>
              )}
              {block.formula && (
                <div className="concept-math" {...part('formula', 'formula')}>
                  <span className="concept-label">Formula</span>
                  <Formula tex={block.formula} />
                </div>
              )}
            </div>
          )}
          {block.example && (
            <div className="concept-example" {...part('example', 'rise')}>
              <span className="concept-label">Example</span>
              <div className="prose-exl">
                <Prose>{block.example}</Prose>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
