// A concept card: the term, what it is, an everyday analogy, its formula and a tiny worked example.
// In Present mode (`shown` is the current part) the term first stands alone, giant, in the middle of the slide with a
// yellow flash. On the next part it flies to the top (FLIP) and the pieces arrive one per part: the definition rises,
// the analogy swings in, the formula's atoms pop in from left to right and the example fades up.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ConceptBlock } from '../../../server/src/scene.ts';
import { motion, reducedMotion } from '../animation/reveal';
import { BulbIcon, SparkIcon } from '../components/icons';
import { InlineMarkdown, Prose } from '../components/Prose';
import { Tex } from '../components/Tex';
import { cn } from '@/lib/utils';
import { conceptPieces, type ConceptPiece } from './conceptParts';

/** Longest a formula takes to assemble, however many atoms it has. */
const ATOMS_SPREAD = 900;

/** Pops the formula's atoms in, left to right. An atom is a top-level symbol or group of KaTeX's layout. */
function assemble(formula: HTMLElement): void {
  if (reducedMotion()) return;
  const atoms = [...formula.querySelectorAll<HTMLElement>('.katex-html > span > span')].filter((atom) => atom.getBoundingClientRect().width > 0);
  const step = atoms.length > 1 ? Math.min(70, ATOMS_SPREAD / (atoms.length - 1)) : 0;
  atoms.forEach((atom, i) => {
    atom.animate(
      [
        { opacity: 0, transform: 'translateY(0.35em) scale(0.5)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: motion.slow, easing: motion.pop, delay: 120 + i * step, fill: 'backwards' },
    );
  });
}

/** Moves the term from where it was drawn last to where it is now. */
function useFlip(hero: boolean) {
  const element = useRef<HTMLHeadingElement>(null);
  const last = useRef<DOMRect | undefined>(undefined);
  const wasHero = useRef(hero);
  useLayoutEffect(() => {
    const term = element.current;
    if (!term) return;
    const now = term.getBoundingClientRect();
    const before = last.current;
    if (before && wasHero.current !== hero && !reducedMotion() && now.width > 0) {
      term.animate(
        [
          { transformOrigin: '0 0', transform: `translate(${before.left - now.left}px, ${before.top - now.top}px) scale(${before.width / now.width})` },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        { duration: 620, easing: 'cubic-bezier(0.65, 0, 0.2, 1)' },
      );
    }
    wasHero.current = hero;
    last.current = now;
  }, [hero]);
  // The slide may be resized or scrolled between parts.
  useEffect(() => {
    const measure = (): void => {
      last.current = element.current?.getBoundingClientRect();
    };
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return element;
}

function Formula({ tex, live }: { tex: string; live: boolean }) {
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
  useEffect(() => {
    if (live && element.current) assemble(element.current);
  }, [live]);
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
  /** Present mode: the piece's part is its position plus one, after the term. */
  const stage = (piece: ConceptPiece): string | false => {
    if (!presenting) return false;
    const part = pieces.indexOf(piece) + 1;
    return part > shown ? 'future' : part === shown ? 'current' : 'past';
  };
  const live = (piece: ConceptPiece): boolean => stage(piece) === 'current';

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
          <p className={cn('concept-define', stage('define'))}>
            <InlineMarkdown text={block.define} />
          </p>
          {(block.analogy || block.formula) && (
            <div className="concept-pair">
              {block.analogy && (
                <aside className={cn('concept-analogy', stage('analogy'))}>
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
                <div className={cn('concept-math', stage('formula'))}>
                  <span className="concept-label">Formula</span>
                  <Formula tex={block.formula} live={live('formula')} />
                </div>
              )}
            </div>
          )}
          {block.example && (
            <div className={cn('concept-example', stage('example'))}>
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
