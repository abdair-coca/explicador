// Locations inside the analyzed project. State lives there, never in the plugin root.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export function projectRoot(): string {
  return resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

export function stateDir(root: string, ...parts: string[]): string {
  return join(root, '.explicador', ...parts);
}

/** Resolves a project-relative path and returns it only if it stays inside the root. */
export function resolveInside(root: string, path: string): string | undefined {
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (rel === '' || rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) return undefined;
  return full;
}

/** Project-relative path with forward slashes, as EXL refs and the index use. */
export function toProjectPath(root: string, full: string): string {
  return relative(root, full).split(sep).join('/');
}

/** Writes through a temporary file so readers never see a half-written file. */
export function writeFileAtomic(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, content);
  renameSync(temp, path);
}
