// Light project index in `.explicador/index/`: the file tree, an import grep and, for sources that are not code (F28),
// an outline of the documents: their headings, the columns of data files, and the files the agent reads with its tools.
// The agent reads it before opening code. Rebuilds are incremental by size and mtime.
import { existsSync, openSync, readFileSync, readSync, closeSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir, writeFileAtomic } from '../project.ts';
import { headingsOf } from '../headings.ts';
import { grepImports, hasImportPatterns, resolveImport } from './imports.ts';

export const indexLimits = {
  files: 5000,
  grepBytes: 512 * 1024,
  /** Characters of tree, imports and documents returned inline to the agent. */
  inlineChars: 24_000,
  /** Documents outlined, and headings listed per document. */
  documents: 200,
  headings: 24,
} as const;

/** Directories that never hold the project's own source. */
const ignoredDirs = new Set([
  'node_modules', 'bower_components', 'vendor', 'dist', 'build', 'out', 'target', 'obj',
  'coverage', '__pycache__', 'venv', 'Pods', 'DerivedData',
]);

interface FileEntry {
  size: number;
  mtimeMs: number;
  imports: string[];
}

interface IndexMeta {
  version: 1;
  builtAt: string;
  truncated: boolean;
  files: Record<string, FileEntry>;
}

export interface IndexResult {
  status: 'created' | 'updated' | 'unchanged';
  files: number;
  changed: number;
  removed: number;
  truncated: boolean;
  treePath: string;
  importsPath: string;
  tree: string;
  imports: string;
  documentsPath: string;
  documents: string;
}

const TEXT_DOCUMENTS = /\.(md|markdown|mdx|txt|rst|adoc)$/i;
const DATA_FILES = /\.(csv|tsv)$/i;
const OTHER_DOCUMENTS = /\.(pdf|docx?|odt|rtf|xlsx?|ods|pptx?|odp|epub)$/i;

/** First bytes of a file as text, or undefined when it is too big to outline. */
function headOf(root: string, path: string, size: number): string | undefined {
  if (size > indexLimits.grepBytes) return undefined;
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch {
    return undefined;
  }
}

/** One line per document: its headings with their lines, a data file's columns and rows, or how to read it. */
export function outlineDocuments(root: string, paths: string[], sizeOf: (path: string) => number): string {
  const lines: string[] = [];
  for (const path of paths) {
    if (lines.length >= indexLimits.documents) break;
    if (TEXT_DOCUMENTS.test(path)) {
      const text = headOf(root, path, sizeOf(path));
      if (text === undefined) continue;
      const headings = headingsOf(text).slice(0, indexLimits.headings);
      const listed = headings.map((heading) => `${'#'.repeat(heading.level)} ${heading.text} (L${heading.line})`).join('; ');
      lines.push(`${path} (${text.split(/\r?\n/).length} lines)${listed ? `: ${listed}` : ''}`);
    } else if (DATA_FILES.test(path)) {
      const text = headOf(root, path, sizeOf(path));
      if (text === undefined) continue;
      const rows = text.split(/\r?\n/).filter((line) => line.trim());
      const columns = (rows[0] ?? '').split(/\.tsv$/i.test(path) ? '\t' : ',').map((cell) => cell.trim()).filter(Boolean);
      lines.push(`${path}: ${Math.max(0, rows.length - 1)} rows; columns ${columns.join(', ')}`);
    } else if (OTHER_DOCUMENTS.test(path)) {
      lines.push(`${path} (not text: read it with your own tools; refs can only name the file)`);
    }
  }
  return lines.join('\n');
}

export function ensureIndex(root: string): IndexResult {
  const dir = stateDir(root, 'index');
  const metaPath = join(dir, 'meta.json');
  const previous = readMeta(metaPath);
  const { paths, truncated } = listProjectFiles(root);

  const files: Record<string, FileEntry> = {};
  let changed = 0;
  for (const path of paths) {
    const stat = statSync(join(root, path));
    const old = previous?.files[path];
    if (old && old.size === stat.size && old.mtimeMs === stat.mtimeMs) {
      files[path] = old;
      continue;
    }
    changed += 1;
    files[path] = { size: stat.size, mtimeMs: stat.mtimeMs, imports: readImports(root, path, stat.size) };
  }
  const removed = previous ? Object.keys(previous.files).filter((path) => !(path in files)).length : 0;

  const tree = paths.join('\n');
  const imports = paths
    .filter((path) => (files[path]?.imports.length ?? 0) > 0)
    .map((path) => {
      const specs = (files[path]?.imports ?? []).map((spec) => resolveImport(root, path, spec) ?? spec);
      return `${path} -> ${specs.join(', ')}`;
    })
    .join('\n');

  const status = !previous ? 'created' : changed > 0 || removed > 0 ? 'updated' : 'unchanged';
  const treePath = join(dir, 'tree.txt');
  const importsPath = join(dir, 'imports.txt');
  const documentsPath = join(dir, 'documents.txt');
  const documents = outlineDocuments(root, paths, (path) => files[path]?.size ?? Infinity);
  if (status !== 'unchanged' || !existsSync(treePath) || !existsSync(importsPath) || !existsSync(documentsPath)) {
    writeFileAtomic(treePath, `${tree}\n`);
    writeFileAtomic(importsPath, `${imports}\n`);
    writeFileAtomic(documentsPath, `${documents}\n`);
    const meta: IndexMeta = { version: 1, builtAt: new Date().toISOString(), truncated, files };
    writeFileAtomic(metaPath, `${JSON.stringify(meta)}\n`);
  }
  return { status, files: paths.length, changed, removed, truncated, treePath, importsPath, tree, imports, documentsPath, documents };
}

/** Text returned by the `ensure_index` tool: a summary plus as much of the index as fits. */
export function describeIndex(result: IndexResult): string {
  const header = [
    `Index ${result.status}: ${result.files} files, ${result.changed} new or changed, ${result.removed} removed.`,
    result.truncated ? `Only the first ${indexLimits.files} files were indexed.` : '',
    `Full tree: ${result.treePath}`,
    `Imports (file -> imported files or packages): ${result.importsPath}`,
    `Documents (headings with their lines, data columns): ${result.documentsPath}`,
  ].filter(Boolean);
  const budget = Math.floor(indexLimits.inlineChars / 3);
  return [
    ...header,
    '',
    '## Files',
    clip(result.tree, budget, result.treePath),
    '',
    '## Imports',
    clip(result.imports || '(no imports found)', budget, result.importsPath),
    '',
    '## Documents',
    clip(result.documents || '(no documents found)', budget, result.documentsPath),
    result.documents ? 'Refs to a section of a document: "path#Heading" (the heading as written, with or without its number).' : '',
  ]
    .join('\n')
    .trimEnd();
}

function clip(text: string, max: number, path: string): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf('\n', max);
  return `${text.slice(0, cut > 0 ? cut : max)}\n… (truncated; read ${path} for the rest)`;
}

/** The project's files, sorted, as relative paths with forward slashes. */
export function listProjectFiles(root: string): { paths: string[]; truncated: boolean } {
  const ignore = gitignoreNames(root);
  const paths: string[] = [];
  let truncated = false;
  const visit = (dir: string, prefix: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (paths.length >= indexLimits.files) {
        truncated = true;
        return;
      }
      if (entry.name.startsWith('.') || ignore.matches(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Symbolic links are skipped: they can loop or point outside the project.
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) visit(join(dir, entry.name), rel);
      } else if (entry.isFile()) {
        paths.push(rel);
      }
    }
  };
  visit(root, '');
  return { paths, truncated };
}

/** The simple part of the root `.gitignore`: bare names and `*.ext` globs, matched on any level. */
function gitignoreNames(root: string): { matches(name: string): boolean } {
  const path = join(root, '.gitignore');
  const names = new Set<string>();
  const suffixes: string[] = [];
  if (existsSync(path)) {
    for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = raw.trim().replace(/^\/|\/$/g, '');
      if (!line || line.startsWith('#') || line.startsWith('!') || line.includes('/')) continue;
      if (/^\*\.[\w.-]+$/.test(line)) suffixes.push(line.slice(1));
      else if (!/[*?[\]]/.test(line)) names.add(line);
    }
  }
  return { matches: (name) => names.has(name) || suffixes.some((suffix) => name.endsWith(suffix)) };
}

function readImports(root: string, path: string, size: number): string[] {
  if (size === 0 || size > indexLimits.grepBytes || !hasImportPatterns(path)) return [];
  const full = join(root, path);
  if (isBinary(full)) return [];
  return grepImports(path, readFileSync(full, 'utf8'));
}

function isBinary(path: string): boolean {
  const buffer = Buffer.alloc(8000);
  const fd = openSync(path, 'r');
  try {
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read).includes(0);
  } finally {
    closeSync(fd);
  }
}

function readMeta(path: string): IndexMeta | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const meta = JSON.parse(readFileSync(path, 'utf8')) as IndexMeta;
    return meta.version === 1 && meta.files ? meta : undefined;
  } catch {
    return undefined;
  }
}
