// Prose for Present mode: a Markdown block split into the parts revealed one per →, grouped as they render.
// Headings, list items, callouts, tables and code blocks are a part each. A paragraph is one part or, when long, one
// part per group of sentences, cut only at sentence ends outside code, bold, italics and links.
import { splitNumbers, type Part as NumberPart } from '../lesson/numbers.ts';

/** Paragraphs longer than this are revealed a few sentences at a time, each group at most this long when it can be. */
export const PART_CHARS = 200;

export type ProseGroup =
  | { kind: 'heading'; depth: number; part: number; text: string }
  | { kind: 'paragraph'; chunks: { part: number; text: string }[] }
  | { kind: 'list'; ordered: boolean; start: number; items: { part: number; text: string }[] }
  | { kind: 'block'; part: number; text: string; callout: boolean };

type ListGroup = Extract<ProseGroup, { kind: 'list' }>;

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
/** A top-level list item: `- a`, `* a`, `+ a`, `1. a`, `1) a`. */
const ITEM = /^(?:[-*+]|(\d+)[.)])\s+(.*)$/;

export function proseSlide(markdown: string): { groups: ProseGroup[]; parts: number } {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const groups: ProseGroup[] = [];
  let part = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (FENCE.test(line)) {
      const fence = line.trim().slice(0, 3);
      const start = i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith(fence)) i++;
      i++;
      groups.push({ kind: 'block', part: part++, text: lines.slice(start, i).join('\n'), callout: false });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      groups.push({ kind: 'heading', depth: heading[1]?.length ?? 1, part: part++, text: (heading[2] ?? '').trim() });
      i++;
      continue;
    }
    const item = ITEM.exec(line);
    const lead = line.trimStart();
    const quoteOrTable = lead.startsWith('>') || lead.startsWith('|');
    const start = i++;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (next.trim() === '' || HEADING.test(next) || FENCE.test(next)) break;
      // A list or a quote may start right after a paragraph line, as in Markdown.
      if (!item && !quoteOrTable && (ITEM.test(next) || next.trimStart().startsWith('>'))) break;
      i++;
    }
    const block = lines.slice(start, i);
    if (item) {
      const ordered = item[1] !== undefined;
      const previous = groups.at(-1);
      // Items separated by blank lines still belong to the same list, as in Markdown.
      const list: ListGroup = previous?.kind === 'list' && previous.ordered === ordered ? previous : { kind: 'list', ordered, start: ordered ? Number(item[1]) : 1, items: [] };
      if (list !== previous) groups.push(list);
      for (const text of listItems(block)) list.items.push({ part: part++, text });
      continue;
    }
    if (quoteOrTable) {
      groups.push({ kind: 'block', part: part++, text: block.join('\n'), callout: lead.startsWith('>') });
      continue;
    }
    const paragraph = block.map((text) => text.trim()).join(' ');
    groups.push({ kind: 'paragraph', chunks: sentenceGroups(paragraph).map((text) => ({ part: part++, text })) });
  }
  return { groups, parts: Math.max(1, part) };
}

/** The items of a list block; indented or lazy lines continue the item above (nested lists included). */
function listItems(block: string[]): string[] {
  const items: string[] = [];
  for (const line of block) {
    const item = ITEM.exec(line);
    if (item) items.push(item[2] ?? '');
    else if (items.length > 0) items[items.length - 1] += `\n${line.replace(/^ {1,4}/, '')}`;
  }
  return items;
}

const SENTENCE_START = /[\p{Lu}\p{N}¿¡«"“'(*_`[]/u;
const LINK = /^\[[^\]]*\]\([^)]*\)/;

/** Sentences: ". ", "? ", "! " or "… " followed by a capital, a digit or an opening mark, outside code, bold, italics and links. */
export function sentences(text: string): string[] {
  const found: string[] = [];
  let start = 0;
  let code = false;
  let strong = false;
  let em = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? '';
    if (char === '`') {
      code = !code;
      continue;
    }
    if (code) continue;
    if (char === '*') {
      if (text[i + 1] === '*') {
        strong = !strong;
        i++;
      } else em = !em;
      continue;
    }
    if (char === '[') {
      const link = LINK.exec(text.slice(i));
      if (link) i += link[0].length - 1;
      continue;
    }
    if (strong || em || !'.?!…'.includes(char) || !/\s/.test(text[i + 1] ?? '')) continue;
    let next = i + 1;
    while (next < text.length && /\s/.test(text[next] ?? '')) next++;
    if (next >= text.length || !SENTENCE_START.test(text[next] ?? '')) continue;
    found.push(text.slice(start, i + 1).trim());
    start = next;
    i = next - 1;
  }
  const rest = text.slice(start).trim();
  if (rest) found.push(rest);
  return found;
}

/** A paragraph as parts: whole when short, else groups of whole sentences of at most `max` characters when they fit. */
export function sentenceGroups(text: string, max = PART_CHARS): string[] {
  if (text.length <= max) return [text];
  const groups: string[] = [];
  for (const sentence of sentences(text)) {
    const last = groups.at(-1);
    if (last !== undefined && last.length + 1 + sentence.length <= max) groups[groups.length - 1] = `${last} ${sentence}`;
    else groups.push(sentence);
  }
  return groups;
}

/** Numbers worth counting up on a slide: with decimals, or 100 and more ("0.846", "5 000"); small counts and cell numbers stay still. */
export function counts(part: NumberPart): boolean {
  return part.kind === 'number' && (part.decimals > 0 || part.value >= 100);
}

/** The bits of a HAST tree this file touches. */
export interface Hast {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Hast[];
}

/** Wraps the numbers worth counting in `<span class="count">`, outside code. */
export function wrapNumbers(node: Hast): void {
  if (!node.children || node.tagName === 'code' || node.tagName === 'pre') return;
  node.children = node.children.flatMap((child): Hast[] => {
    if (child.type !== 'text' || !child.value) {
      wrapNumbers(child);
      return [child];
    }
    return splitNumbers(child.value).map((piece) =>
      counts(piece)
        ? { type: 'element', tagName: 'span', properties: { className: ['count'] }, children: [{ type: 'text', value: piece.text }] }
        : { type: 'text', value: piece.text },
    );
  });
}

/** The rehype plugin form of `wrapNumbers`. */
export function rehypeCountNumbers() {
  return (tree: Hast): void => wrapNumbers(tree);
}
