// Key code: the lines each <code> points to, copied from the analyzed project when a scene is shown,
// so the viewer shows the real code and the agent never writes it out.
import { readFileSync } from 'node:fs';
import { resolveInside } from './project.ts';
import type { Block } from './scene.ts';

/** Longer lines (minified code) are cut so one snippet cannot flood the viewer. */
const MAX_LINE = 400;

/** Copies of `blocks` whose snippets carry their lines, or `missing` when the file or the lines are gone. */
export function withSnippets(root: string, blocks: Block[]): Block[] {
  const files = new Map<string, string[] | undefined>();
  const linesOf = (path: string): string[] | undefined => {
    if (!files.has(path)) {
      const full = resolveInside(root, path);
      let lines: string[] | undefined;
      try {
        lines = full === undefined ? undefined : readFileSync(full, 'utf8').split(/\r?\n/);
      } catch {
        lines = undefined;
      }
      files.set(path, lines);
    }
    return files.get(path);
  };
  return blocks.map((block) => {
    if (block.type === 'markdown' || !block.codes) return block;
    return {
      ...block,
      codes: block.codes.map((code) => {
        const lines = linesOf(code.ref.path);
        const start = code.ref.start ?? 1;
        const end = code.ref.end ?? start;
        if (!lines || start > lines.length) return { ...code, missing: true };
        return { ...code, lines: lines.slice(start - 1, end).map((line) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}…` : line)) };
      }),
    };
  });
}
