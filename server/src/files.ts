// Project files for the viewer's code window. The viewer asks for a path; the server decides whether it may be read.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { sep } from 'node:path';
import { listProjectFiles } from './index/index.ts';
import { notebookLimits, parseNotebook } from './notebook.ts';
import type { Notebook } from './parser/types.ts';
import { resolveInside } from './project.ts';

export const fileLimits = {
  /** Bigger files are not sent: the window renders every line. */
  bytes: 512 * 1024,
} as const;

export type FileReason = 'missing' | 'denied' | 'binary' | 'too-large' | 'invalid';

export type FileResult =
  | { ok: true; path: string; lines: string[] }
  | { ok: true; path: string; notebook: Notebook }
  | { ok: false; reason: FileReason };

export const isNotebookPath = (path: string): boolean => path.toLowerCase().endsWith('.ipynb');

/** Lines of a text file, cells of a notebook: the unit refs count in. */
export function sizeOf(file: Extract<FileResult, { ok: true }>): number {
  return 'notebook' in file ? file.notebook.cells.length : file.lines.length;
}

/**
 * Reads a text file or notebook of the project. Refused: paths with a segment that starts with a dot (`.git`, `.env`,
 * `.explicador`), paths that leave the project (also through symbolic links), anything but regular files,
 * binary files, text over 512 KB and notebooks over 8 MB.
 */
export function readProjectFile(root: string, path: string): FileResult {
  if (!path || path.includes('\\') || path.includes('\0') || path.split('/').some((part) => part.startsWith('.'))) {
    return { ok: false, reason: 'denied' };
  }
  const full = resolveInside(root, path);
  if (full === undefined) return { ok: false, reason: 'denied' };
  let real: string;
  let realRoot: string;
  try {
    real = realpathSync(full);
    realRoot = realpathSync(root);
  } catch {
    return { ok: false, reason: 'missing' };
  }
  if (!real.startsWith(realRoot + sep)) return { ok: false, reason: 'denied' };
  const notebook = isNotebookPath(path);
  try {
    const stat = statSync(real);
    if (!stat.isFile()) return { ok: false, reason: 'missing' };
    if (stat.size > (notebook ? notebookLimits.fileBytes : fileLimits.bytes)) return { ok: false, reason: 'too-large' };
    const bytes = readFileSync(real);
    if (notebook) {
      const parsed = parseNotebook(bytes.toString('utf8'));
      return parsed ? { ok: true, path, notebook: parsed } : { ok: false, reason: 'invalid' };
    }
    if (bytes.subarray(0, 8000).includes(0)) return { ok: false, reason: 'binary' };
    const lines = bytes.toString('utf8').split(/\r?\n/);
    // A final newline ends the last line; it does not start another one.
    if (lines.length > 1 && lines.at(-1) === '') lines.pop();
    return { ok: true, path, lines };
  } catch {
    return { ok: false, reason: 'missing' };
  }
}

const statusOf: Record<FileReason, number> = { missing: 404, denied: 403, binary: 415, invalid: 415, 'too-large': 413 };

/** GET /api/file?path=... */
export function serveFile(root: string, path: string | null): { status: number; body: unknown } {
  if (path === null) return { status: 400, body: { error: 'denied' } };
  const result = readProjectFile(root, path);
  if (!result.ok) return { status: statusOf[result.reason], body: { error: result.reason } };
  return { status: 200, body: 'notebook' in result ? { path: result.path, notebook: result.notebook } : { path: result.path, lines: result.lines } };
}

/** GET /api/tree: the project's files, as the index sees them (no dot-folders, dependencies or ignored names). */
export function serveTree(root: string): { status: number; body: unknown } {
  const { paths, truncated } = listProjectFiles(root);
  return { status: 200, body: { files: paths, truncated } };
}

/** The code window's readers on a bridge: the project's files and its tree, behind the bridge's token and Host check. */
export function serveProject(bridge: { reader(name: string, handler: (query: URLSearchParams) => { status: number; body: unknown }): void }, root: string): void {
  bridge.reader('file', (query) => serveFile(root, query.get('path')));
  bridge.reader('tree', () => serveTree(root));
}
