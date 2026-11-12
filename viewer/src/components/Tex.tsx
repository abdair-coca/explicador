// A LaTeX formula drawn by KaTeX, and the Markdown components that turn the formulas `markMath` marked into it.
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import { MATH_MARK } from '../../../server/src/parser/math.ts';

/**
 * `display` draws the formula as its own centered block. `big` keeps display style (tall fractions and sums) inside a
 * line of text. A formula KaTeX cannot parse shows its source in red instead of breaking the page.
 */
export function Tex({ tex, display = false, big = false }: { tex: string; display?: boolean; big?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(big && !display ? `\\displaystyle ${tex}` : tex, { displayMode: display, throwOnError: false, strict: false, output: 'htmlAndMathml' }),
    [tex, display, big],
  );
  return display ? <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} /> : <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}

const isMathFence = (className: unknown): boolean => typeof className === 'string' && className.split(' ').includes('language-math');

/** For react-markdown, over text that went through `markMath`. */
export const mathComponents: Components = {
  code({ className, children }) {
    const text = String(children ?? '');
    if (isMathFence(className)) return <Tex tex={text.trim()} display />;
    if (text.startsWith(MATH_MARK)) {
      const big = text.startsWith(MATH_MARK + MATH_MARK);
      return <Tex tex={text.slice(big ? 2 : 1)} big={big} />;
    }
    return <code className={className}>{children}</code>;
  },
  pre({ node, children }) {
    const code = node?.children[0];
    const math = code?.type === 'element' && isMathFence([code.properties.className].flat().join(' '));
    return math ? <>{children}</> : <pre>{children}</pre>;
  },
};
