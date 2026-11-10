// Project files for the viewer's code window. The viewer asks for a path; the server decides whether it may be read.
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { sep } from 'node:path';
import { listProjectFiles } from './index/index.ts';
import { resolveInside } from './project.ts';

export const fileLimits = {
  /** Bigger files are not sent: the window renders every line. */
  bytes: 512 * 1024,
} as const;

export type FileResult =
  | { ok: true; path: string; lines: string[] }
  | { ok: false; reason: 'missing' | 'denied' | 'binary' | 'too-large' };

/**
 * Reads a text file of the project. Refused: paths with a segment that starts with a dot (`.git`, `.env`,
 * `.explicador`), paths that leave the project (also through symbolic links), anything but regular text files up to 512 KB.
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
  try {
    const stat = statSync(real);
    if (!stat.isFile()) return { ok: false, reason: 'missing' };
    if (stat.size > fileLimits.bytes) return { ok: false, reason: 'too-large' };
    const bytes = readFileSync(real);
    if (bytes.subarray(0, 8000).includes(0)) return { ok: false, reason: 'binary' };
    const lines = bytes.toString('utf8').split(/\r?\n/);
    // A final newline ends the last line; it does not start another one.
    if (lines.length > 1 && lines.at(-1) === '') lines.pop();
    return { ok: true, path, lines };
  } catch {
    return { ok: false, reason: 'missing' };
  }
}

const statusOf = { missing: 404, denied: 403, binary: 415, 'too-large': 413 } as const;

/** GET /api/file?path=... */
export function serveFile(root: string, path: string | null): { status: number; body: unknown } {
  if (path === null) return { status: 400, body: { error: 'denied' } };
  const result = readProjectFile(root, path);
  return result.ok
    ? { status: 200, body: { path: result.path, lines: result.lines } }
    : { status: statusOf[result.reason], body: { error: result.reason } };
}

/** GET /api/tree: the project's files, as the index sees them (no dot-folders, dependencies or ignored names). */
export function serveTree(root: string): { status: number; body: unknown } {
  const { paths, truncated } = listProjectFiles(root);
  return { status: 200, body: { files: paths, truncated } };
}
