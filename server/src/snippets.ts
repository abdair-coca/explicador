// Key code: the lines each <code> points to, copied from the analyzed project when a scene is shown,
// so the viewer shows the real code and the agent never writes it out.
import { readFileSync } from 'node:fs';
import { isNotebookPath, readProjectFile } from './files.ts';
import { quoteCells } from './notebook.ts';
import type { Block, NotebookCell, Question, Ref } from './scene.ts';
import { resolveInside } from './project.ts';

/** Longer lines (minified code) are cut so one snippet cannot flood the viewer. */
const MAX_LINE = 400;

type Lines = { lines: string[] } | { cells: NotebookCell[] } | { missing: true };

/**
 * Reads the lines of a ref, opening each file once. A notebook's range counts cells: quotes carry their source only,
 * while `outputs` (a lesson chapter) keeps what each cell printed.
 */
function lineReader(root: string, outputs = false): (ref: Ref) => Lines {
  const files = new Map<string, string[] | undefined>();
  const notebooks = new Map<string, ReturnType<typeof readProjectFile>>();
  return (ref) => {
    if (isNotebookPath(ref.path)) {
      if (!notebooks.has(ref.path)) notebooks.set(ref.path, readProjectFile(root, ref.path));
      const file = notebooks.get(ref.path);
      const start = ref.start ?? 1;
      const end = ref.end ?? start;
      const cells = file?.ok && 'notebook' in file ? (outputs ? file.notebook.cells.slice(start - 1, end) : quoteCells(file.notebook, start, end)) : [];
      return cells.length > 0 ? { cells } : { missing: true };
    }
    if (!files.has(ref.path)) {
      const full = resolveInside(root, ref.path);
      let lines: string[] | undefined;
      try {
        lines = full === undefined ? undefined : readFileSync(full, 'utf8').split(/\r?\n/);
      } catch {
        lines = undefined;
      }
      files.set(ref.path, lines);
    }
    const lines = files.get(ref.path);
    const start = ref.start ?? 1;
    const end = ref.end ?? start;
    if (!lines || start > lines.length) return { missing: true };
    return { lines: lines.slice(start - 1, end).map((line) => (line.length > MAX_LINE ? `${line.slice(0, MAX_LINE)}…` : line)) };
  };
}

/**
 * Copies of `blocks` whose snippets carry their lines and whose chapters carry their cells (with outputs) or lines,
 * or `missing` when the file or the range is gone.
 */
export function withSnippets(root: string, blocks: Block[]): Block[] {
  const read = lineReader(root);
  const readChapter = lineReader(root, true);
  return blocks.map((block) => {
    if (block.type === 'chapter') return block.ref ? { ...block, ...readChapter(block.ref) } : block;
    if (!('codes' in block) || !block.codes) return block;
    return { ...block, codes: block.codes.map((code) => ({ ...code, ...read(code.ref) })) };
  });
}

/** Copies of `questions` whose answers carry the lines they quote. */
export function withAnswerLines(root: string, questions: Question[]): Question[] {
  const read = lineReader(root);
  return questions.map((question) => {
    const codes = question.answer?.codes;
    if (!question.answer || !codes) return question;
    return { ...question, answer: { ...question.answer, codes: codes.map((code) => ({ ref: code.ref, ...read(code.ref) })) } };
  });
}
