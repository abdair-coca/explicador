// Import grep: regular expressions per file extension. No parsing, no language servers;
// the model reads the code when the index is not enough.
import { existsSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';

type Pattern = RegExp;

const js: Pattern[] = [
  /\bimport\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bexport\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
const python: Pattern[] = [/^[ \t]*from[ \t]+([.\w]+)[ \t]+import\b/gm, /^[ \t]*import[ \t]+([\w.]+)/gm];
const go: Pattern[] = [/^[ \t]*import[ \t]+(?:[\w.]+[ \t]+)?"([^"]+)"/gm];
// Go groups imports in `import ( ... )`; only lines inside such a group are specifiers.
const goGroup = /^[ \t]*import[ \t]*\(([\s\S]*?)^[ \t]*\)/gm;
const goGroupLine = /^[ \t]*(?:[\w.]+[ \t]+)?"([^"]+)"/gm;
const rust: Pattern[] = [/^[ \t]*(?:pub[ \t]+)?use[ \t]+([\w:]+)/gm, /^[ \t]*(?:pub[ \t]+)?mod[ \t]+(\w+)[ \t]*;/gm];
const jvm: Pattern[] = [/^[ \t]*import[ \t]+(?:static[ \t]+)?([\w.]+\*?)/gm];
const csharp: Pattern[] = [/^[ \t]*using[ \t]+(?:static[ \t]+)?([\w.]+)[ \t]*;/gm];
const c: Pattern[] = [/^[ \t]*#[ \t]*include[ \t]*["<]([^">]+)[">]/gm];
const ruby: Pattern[] = [/^[ \t]*require(?:_relative)?[ \t(]+['"]([^'"]+)['"]/gm];
const php: Pattern[] = [
  /^[ \t]*use[ \t]+([\w\\]+)/gm,
  /\b(?:require|include)(?:_once)?[ \t(]+['"]([^'"]+)['"]/g,
];
const swift: Pattern[] = [/^[ \t]*import[ \t]+(\w+)/gm];

const byExtension: Record<string, Pattern[]> = {
  '.js': js, '.jsx': js, '.mjs': js, '.cjs': js, '.ts': js, '.tsx': js, '.mts': js, '.cts': js,
  '.vue': js, '.svelte': js, '.astro': js,
  '.py': python,
  '.go': go,
  '.rs': rust,
  '.java': jvm, '.kt': jvm, '.kts': jvm, '.scala': jvm, '.groovy': jvm,
  '.cs': csharp,
  '.c': c, '.h': c, '.cc': c, '.cpp': c, '.hpp': c, '.cxx': c, '.m': c, '.mm': c,
  '.rb': ruby,
  '.php': php,
  '.swift': swift,
};

export function hasImportPatterns(path: string): boolean {
  return posix.extname(path).toLowerCase() in byExtension;
}

/** Import specifiers in a file, in order of appearance, without duplicates. */
export function grepImports(path: string, content: string): string[] {
  const patterns = byExtension[posix.extname(path).toLowerCase()];
  if (!patterns) return [];
  const found: { at: number; spec: string }[] = [];
  for (const pattern of patterns) {
    for (const m of content.matchAll(pattern)) if (m[1]) found.push({ at: m.index, spec: m[1] });
  }
  if (patterns === go) {
    for (const group of content.matchAll(goGroup)) {
      const body = group[1] ?? '';
      const offset = group.index + group[0].indexOf(body);
      for (const m of body.matchAll(goGroupLine)) if (m[1]) found.push({ at: offset + m.index, spec: m[1] });
    }
  }
  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((f) => f.spec))];
}

const resolvableExtensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rb', '.php', '.h', '.vue'];

/** Maps a relative specifier ("./auth", "../db/users.js") to a project file when one exists. */
export function resolveImport(root: string, from: string, spec: string): string | undefined {
  let base: string;
  if (spec.startsWith('./') || spec.startsWith('../')) {
    base = posix.normalize(posix.join(posix.dirname(from), spec));
  } else if (/^\.+\w/.test(spec) && from.endsWith('.py')) {
    // Python relative import: ".auth.service" or "..db".
    const dots = /^\.+/.exec(spec)?.[0].length ?? 1;
    let dir = posix.dirname(from);
    for (let i = 1; i < dots; i += 1) dir = posix.dirname(dir);
    base = posix.join(dir, spec.slice(dots).replace(/\./g, '/'));
  } else {
    return undefined;
  }
  if (base.startsWith('../') || base === '..') return undefined;
  // TypeScript sources import "./x.js" while the file on disk is "./x.ts".
  const candidates = [base, base.replace(/\.js$/, '.ts'), base.replace(/\.jsx$/, '.tsx')];
  for (const candidate of candidates) {
    for (const ext of resolvableExtensions) {
      if (isFile(join(root, candidate + ext))) return candidate + ext;
    }
    for (const index of ['index.ts', 'index.tsx', 'index.js', '__init__.py']) {
      if (isFile(join(root, candidate, index))) return posix.join(candidate, index);
    }
  }
  return undefined;
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}
