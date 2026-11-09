// A small highlighter for any language: comments, strings, numbers and common keywords.
// It reads a few key lines well enough; it does not parse. The comment style comes from the extension.

export type TokenKind = 'plain' | 'comment' | 'string' | 'number' | 'keyword';

export interface Token {
  kind: TokenKind;
  text: string;
}

interface CommentStyle {
  line: string[];
  block?: [string, string];
}

const HASH_COMMENTS = new Set(['py', 'rb', 'sh', 'bash', 'zsh', 'yml', 'yaml', 'toml', 'r', 'pl', 'ex', 'exs', 'ps1', 'jl', 'nim', 'cr', 'conf', 'ini']);
const DASH_COMMENTS = new Set(['sql', 'lua', 'hs', 'elm']);
const MARKUP = new Set(['html', 'htm', 'xml', 'svg', 'vue', 'svelte', 'md']);
const STYLES = new Set(['css', 'scss', 'less']);

const KEYWORDS = new Set(
  (
    'abstract and as assert async auto await begin bool boolean break byte case catch char class const continue crate ' +
    'def default defer del delete do double dyn elif else elsif end ensure enum except export extends extern false final ' +
    'finally float fn for foreach from fun func function go goto if impl implements import in include init inline instanceof ' +
    'int interface is lambda let long loop match mod module move mut namespace native new nil none not null object of open ' +
    'or override package pass private protected pub public raise readonly ref require rescue return select self short static ' +
    'string struct super switch synchronized template then this throw throws trait true try type typedef typeof undefined ' +
    'union unless unsafe until use using val var virtual void volatile when where while with yield'
  ).split(' '),
);

const SQL_KEYWORDS = new Set(
  (
    'select from where insert into update delete join left right inner outer full on and or not null is create table alter ' +
    'drop index primary key foreign references values set group by order having limit offset as distinct union all exists ' +
    'case when then else end begin commit rollback returning with default unique check constraint cascade'
  ).split(' '),
);

const WORD = /0x[0-9a-f]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?|[A-Za-z_$][\w$]*/gi;

function extension(path: string): string {
  const name = path.split('/').pop()?.toLowerCase() ?? '';
  return name.includes('.') ? (name.split('.').pop() ?? '') : name;
}

function commentStyle(ext: string): CommentStyle {
  if (HASH_COMMENTS.has(ext) || ext === 'dockerfile' || ext === 'makefile') return { line: ['#'] };
  if (DASH_COMMENTS.has(ext)) return { line: ['--'], block: ['/*', '*/'] };
  if (MARKUP.has(ext)) return { line: [], block: ['<!--', '-->'] };
  if (STYLES.has(ext)) return { line: [], block: ['/*', '*/'] };
  return { line: ['//'], block: ['/*', '*/'] };
}

/** Tokens per line; a block comment may span lines. */
export function highlight(lines: string[], path: string): Token[][] {
  const ext = extension(path);
  const style = commentStyle(ext);
  const keywords = ext === 'sql' ? SQL_KEYWORDS : KEYWORDS;
  let inBlock = false;

  return lines.map((line) => {
    const tokens: Token[] = [];
    const push = (kind: TokenKind, text: string): void => {
      if (!text) return;
      const last = tokens.at(-1);
      if (last && last.kind === kind) last.text += text;
      else tokens.push({ kind, text });
    };
    const words = (text: string): void => {
      let at = 0;
      for (const match of text.matchAll(WORD)) {
        push('plain', text.slice(at, match.index));
        const word = match[0];
        const kind: TokenKind = /^\d|^0x/i.test(word) ? 'number' : keywords.has(word.toLowerCase()) && (ext === 'sql' || word === word.toLowerCase()) ? 'keyword' : 'plain';
        push(kind, word);
        at = match.index + word.length;
      }
      push('plain', text.slice(at));
    };

    let i = 0;
    let plain = '';
    const flush = (): void => {
      words(plain);
      plain = '';
    };
    while (i < line.length) {
      if (inBlock && style.block) {
        const end = line.indexOf(style.block[1], i);
        const stop = end === -1 ? line.length : end + style.block[1].length;
        push('comment', line.slice(i, stop));
        if (end !== -1) inBlock = false;
        i = stop;
        continue;
      }
      if (style.block && line.startsWith(style.block[0], i)) {
        flush();
        inBlock = true;
        push('comment', style.block[0]);
        i += style.block[0].length;
        continue;
      }
      if (style.line.some((marker) => line.startsWith(marker, i))) {
        flush();
        push('comment', line.slice(i));
        break;
      }
      const ch = line[i] ?? '';
      if (ch === '"' || ch === "'" || ch === '`') {
        flush();
        let j = i + 1;
        while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
        push('string', line.slice(i, j + 1));
        i = j + 1;
        continue;
      }
      plain += ch;
      i += 1;
    }
    flush();
    return tokens;
  });
}
