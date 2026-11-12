// Math in EXL Markdown, as in Pandoc: `$…$` inline and `$$…$$` display, never inside code. An opening `$` is
// followed by a non-space; a closing `$` follows a non-space and is not followed by a digit, so "$5 and $10" stay
// text; `\$` is a literal dollar. The parser checks each formula with KaTeX; the viewer rewrites them with `markMath`
// so Markdown leaves the LaTeX alone, then renders them with KaTeX. Pure, so the viewer can import it.

export interface MathSpan {
  tex: string;
  display: boolean;
  /** Where the span starts and ends in the text, delimiters included. */
  start: number;
  end: number;
}

/** Inline code that starts with this invisible character is a formula; twice means display style. */
export const MATH_MARK = '⁡';

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const BLANK_LINE = /^\n[ \t]*\n/;

export function findMath(text: string): MathSpan[] {
  const spans: MathSpan[] = [];
  let fence: string | undefined;
  let lineStart = true;
  let i = 0;
  while (i < text.length) {
    if (lineStart) {
      lineStart = false;
      const newline = text.indexOf('\n', i);
      const lineEnd = newline === -1 ? text.length : newline;
      const line = text.slice(i, lineEnd);
      const marker = FENCE.exec(line)?.[1];
      if (fence || marker) {
        if (!fence) fence = marker;
        else if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
        i = lineEnd + 1;
        lineStart = true;
        continue;
      }
    }
    const char = text[i];
    if (char === '\n') {
      lineStart = true;
      i++;
    } else if (char === '\\') {
      i += 2;
    } else if (char === '`') {
      i = afterCodeSpan(text, i);
    } else if (char === '$') {
      const span = text[i + 1] === '$' ? displayAt(text, i) : inlineAt(text, i);
      if (span) spans.push(span);
      i = span ? span.end : i + (text[i + 1] === '$' ? 2 : 1);
    } else {
      i++;
    }
  }
  return spans;
}

/** The offset just after the code span opened by the backtick run at `start`, or after the run when it never closes. */
function afterCodeSpan(text: string, start: number): number {
  const run = /^`+/.exec(text.slice(start))?.[0] ?? '`';
  let from = start + run.length;
  for (;;) {
    const close = text.indexOf(run, from);
    if (close === -1) return start + run.length;
    if (text[close + run.length] !== '`' && text[close - 1] !== '`') return close + run.length;
    from = close + 1;
  }
}

/** `$$…$$` from `start`: a block when it opens a line (it may run over several lines), else display style on one line. */
function displayAt(text: string, start: number): MathSpan | undefined {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const opensLine = text.slice(lineStart, start).trim() === '';
  const close = text.indexOf('$$', start + 2);
  if (close === -1) return undefined;
  const between = text.slice(start + 2, close);
  if (!opensLine && between.includes('\n')) return undefined;
  const tex = between.trim();
  return tex ? { tex, display: true, start, end: close + 2 } : undefined;
}

function inlineAt(text: string, start: number): MathSpan | undefined {
  if (/\s/.test(text[start + 1] ?? ' ')) return undefined;
  for (let j = start + 1; j < text.length; j++) {
    const char = text[j];
    if (char === '\\') {
      j++;
      continue;
    }
    if (char === '\n' && BLANK_LINE.test(text.slice(j))) return undefined;
    if (char !== '$' || /\s/.test(text[j - 1] ?? '') || /\d/.test(text[j + 1] ?? '')) continue;
    return { tex: text.slice(start + 1, j), display: false, start, end: j + 1 };
  }
  return undefined;
}

/** A code span holding `content` verbatim, with a fence longer than any backtick run inside it. */
function codeSpan(content: string): string {
  const longest = Math.max(0, ...[...content.matchAll(/`+/g)].map((run) => run[0].length));
  const fence = '`'.repeat(longest + 1);
  const pad = content.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${content}${pad}${fence}`;
}

/** Whether a display span has its lines to itself, so it can become a block. */
function ownsLines(text: string, span: MathSpan): boolean {
  const before = text.slice(text.lastIndexOf('\n', span.start - 1) + 1, span.start);
  const newline = text.indexOf('\n', span.end);
  const after = text.slice(span.end, newline === -1 ? text.length : newline);
  return before.trim() === '' && after.trim() === '';
}

/**
 * Rewrites the math so Markdown keeps the LaTeX intact: a display block becomes a ```math fence, any other formula a
 * code span marked with `MATH_MARK` (twice for display style). Text without math comes back unchanged.
 */
export function markMath(text: string): string {
  const spans = findMath(text);
  if (spans.length === 0) return text;
  let out = '';
  let last = 0;
  for (const span of spans) {
    out += text.slice(last, span.start);
    out += span.display && ownsLines(text, span) ? `\n\n\`\`\`math\n${span.tex}\n\`\`\`\n\n` : codeSpan(`${MATH_MARK}${span.display ? MATH_MARK : ''}${span.tex}`);
    last = span.end;
  }
  return out + text.slice(last);
}
