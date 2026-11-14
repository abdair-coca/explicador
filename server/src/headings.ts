// Sections of documents (F28): a ref `notes.md#Deposit` names the section under that heading, so a scene over a document
// points at its parts the way a scene over code points at line ranges. The server finds the section's lines when it
// shows the scene, and refuses a heading the document does not have.
import { readProjectFile } from './files.ts';
import type { Block, Ref } from './scene.ts';

export interface Heading {
  level: number;
  text: string;
  line: number;
}

/** Letters and digits, lowercase, without accents: "3. Deposit" and "3 deposit" read the same. */
const plain = (text: string): string => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** The Markdown headings of a text (`#` to `######`), outside code fences, with their 1-based lines. */
export function headingsOf(text: string): Heading[] {
  const headings: Heading[] = [];
  let fence: string | undefined;
  text.split(/\r?\n/).forEach((line, i) => {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) fence = fence === undefined ? marker[0] : fence === marker[0] ? undefined : fence;
    if (fence !== undefined && !marker) return;
    const match = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match && fence === undefined) headings.push({ level: match[1]?.length ?? 1, text: match[2] ?? '', line: i + 1 });
  });
  return headings;
}

/** Whether a heading is the one a ref names: the same words, with or without its number ("3. Deposit" or "Deposit"). */
function names(heading: string, wanted: string): boolean {
  const target = plain(wanted);
  return plain(heading) === target || plain(heading.replace(/^\s*[\p{N}]+(?:[.)]|\s)\s*/u, '')) === target;
}

/** The lines of the section under `heading`: from it to the line before the next heading of its level or higher. */
export function sectionLines(text: string, heading: string): { start: number; end: number } | undefined {
  const all = headingsOf(text);
  const index = all.findIndex((item) => names(item.text, heading));
  const found = all[index];
  if (!found) return undefined;
  const next = all.slice(index + 1).find((item) => item.level <= found.level);
  const lines = text.split(/\r?\n/);
  let end = next ? next.line - 1 : lines.length;
  while (end > found.line && !(lines[end - 1] ?? '').trim()) end -= 1;
  return { start: found.line, end };
}

/** Every ref in a block, however deep: on the block, its boxes, its steps, its values. */
function eachRef(value: unknown, visit: (ref: Ref) => Ref): unknown {
  if (Array.isArray(value)) return value.map((item) => eachRef(item, visit));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = key === 'ref' && item && typeof item === 'object' && 'path' in item ? visit(item as Ref) : eachRef(item, visit);
  }
  return out;
}

function textOf(root: string, path: string, cache: Map<string, string | undefined>): string | undefined {
  if (!cache.has(path)) {
    const file = readProjectFile(root, path);
    cache.set(path, file.ok && 'lines' in file ? file.lines.join('\n') : undefined);
  }
  return cache.get(path);
}

/** Copies of the blocks whose section refs carry their lines, so the code window can open them like any range. */
export function withSections(root: string, blocks: Block[]): Block[] {
  const cache = new Map<string, string | undefined>();
  return blocks.map((block) =>
    !hasSection(block)
      ? block
      : (eachRef(block, (ref) => {
        if (ref.heading === undefined) return ref;
        const text = textOf(root, ref.path, cache);
        const lines = text === undefined ? undefined : sectionLines(text, ref.heading);
          return lines ? { ...ref, ...lines } : ref;
        }) as Block),
  );
}

/** Whether a block holds a section ref anywhere: blocks without one are passed on untouched. */
function hasSection(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasSection);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => (key === 'ref' && item && typeof item === 'object' && 'heading' in item) || hasSection(item));
}

/** One line per section ref whose heading the document lacks, with the headings it has. */
export function missingSections(root: string, blocks: Block[]): string[] {
  const cache = new Map<string, string | undefined>();
  const problems = new Set<string>();
  for (const block of blocks) {
    eachRef(block, (ref) => {
      if (ref.heading === undefined) return ref;
      const text = textOf(root, ref.path, cache);
      if (text !== undefined && !sectionLines(text, ref.heading)) {
        const known = headingsOf(text).map((item) => `"${item.text}"`);
        problems.add(`- ${ref.path}#${ref.heading}: no such heading${known.length > 0 ? `; it has ${known.slice(0, 12).join(', ')}` : '; it has no Markdown headings, so point at lines instead'}`);
      }
      return ref;
    });
  }
  return [...problems];
}
