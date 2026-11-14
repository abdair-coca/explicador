// Word diff for traces: what one operation removed, added or changed in a value. Words are compared whole;
// a removed word and an added one that look alike (case, punctuation, a stem) pair up as one changed word,
// whose letters are compared too, so "horrible" → "horribl" shows only the "e" going away.

export interface Piece {
  kind: 'same' | 'removed' | 'added';
  text: string;
}

export type Token =
  | { kind: 'same'; text: string }
  | { kind: 'removed'; text: string }
  | { kind: 'added'; text: string }
  | { kind: 'changed'; text: string; from: string; parts: Piece[] };

/** Below this likeness (shared letters over the longer word, case ignored) two words are not one changed word. */
const LIKENESS = 0.34;

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Longest common subsequence table of two sequences, for walking back the alignment. */
function lcsTable<T>(a: readonly T[], b: readonly T[]): number[][] {
  const table = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const row = table[i] as number[];
    const next = table[i + 1] as number[];
    for (let j = b.length - 1; j >= 0; j -= 1) {
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  return table;
}

/** Edit script turning `a` into `b`, in order. */
function align<T>(a: readonly T[], b: readonly T[]): { kind: Piece['kind']; value: T }[] {
  const table = lcsTable(a, b);
  const out: { kind: Piece['kind']; value: T }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', value: a[i] as T });
      i += 1;
      j += 1;
    } else if ((table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0)) {
      out.push({ kind: 'removed', value: a[i] as T });
      i += 1;
    } else {
      out.push({ kind: 'added', value: b[j] as T });
      j += 1;
    }
  }
  while (i < a.length) out.push({ kind: 'removed', value: a[i++] as T });
  while (j < b.length) out.push({ kind: 'added', value: b[j++] as T });
  return out;
}

/** Letters of `before` and `after` as runs of same, removed and added text. */
export function diffLetters(before: string, after: string): Piece[] {
  const pieces: Piece[] = [];
  for (const step of align([...before], [...after])) {
    const last = pieces.at(-1);
    if (last && last.kind === step.kind) last.text += step.value;
    else pieces.push({ kind: step.kind, text: step.value });
  }
  return pieces;
}

function likeness(a: string, b: string): number {
  const x = [...a.toLowerCase()];
  const y = [...b.toLowerCase()];
  const longest = Math.max(x.length, y.length);
  return longest === 0 ? 1 : (lcsTable(x, y)[0]?.[0] ?? 0) / longest;
}

/** Pairs removed and added words of one run that look alike, keeping both in order. */
function pairRun(removed: string[], added: string[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  for (const word of added) {
    let best = -1;
    let bestScore = LIKENESS;
    for (let k = i; k < removed.length; k += 1) {
      const score = likeness(removed[k] ?? '', word);
      if (score >= bestScore && (best < 0 || score > bestScore)) {
        best = k;
        bestScore = score;
      }
    }
    if (best < 0) {
      out.push({ kind: 'added', text: word });
      continue;
    }
    for (; i < best; i += 1) out.push({ kind: 'removed', text: removed[i] ?? '' });
    const from = removed[best] ?? '';
    out.push({ kind: 'changed', text: word, from, parts: diffLetters(from, word) });
    i = best + 1;
  }
  for (; i < removed.length; i += 1) out.push({ kind: 'removed', text: removed[i] ?? '' });
  return out;
}

/** What turned `before` into `after`, word by word. */
export function diffWords(before: string, after: string): Token[] {
  const tokens: Token[] = [];
  let removed: string[] = [];
  let added: string[] = [];
  const flush = (): void => {
    if (removed.length > 0 || added.length > 0) tokens.push(...pairRun(removed, added));
    removed = [];
    added = [];
  };
  for (const step of align(words(before), words(after))) {
    if (step.kind === 'same') {
      flush();
      tokens.push({ kind: 'same', text: step.value });
    } else if (step.kind === 'removed') removed.push(step.value);
    else added.push(step.value);
  }
  flush();
  return tokens;
}

/** How many words each kind of change touched. */
export function changeCounts(tokens: Token[]): { removed: number; added: number; changed: number } {
  const counts = { removed: 0, added: 0, changed: 0 };
  for (const token of tokens) if (token.kind !== 'same') counts[token.kind] += 1;
  return counts;
}

/** Below this share of words in common, two texts are different sentences, not one edited (F36). */
const RELATED = 0.4;

/**
 * The marks a trace shows between two texts: a word diff when the new text is an edit of the old one, and none when
 * it is another sentence altogether ("19 200 000 bits en ondas" → "foto.jpg, 2 400 000 bytes"), where marking each
 * word removed or changed only scrambles the new text.
 */
export function editOf(before: string, after: string): Token[] | undefined {
  const a = words(before);
  const b = words(after);
  const shared = lcsTable(a, b)[0]?.[0] ?? 0;
  return shared / Math.max(a.length, b.length, 1) >= RELATED ? diffWords(before, after) : undefined;
}
