// The pieces of a traced value and their identity from one step to the next. A word of the sentence, an item of
// a list, the name of a row or of a bar are the same piece when their letters and digits match, case and accents
// aside, so "Not," in the sentence becomes the chip "not", then the row "not", then the bar "not".
import type { TraceItem, TraceValue } from '../../../server/src/scene.ts';
import { words } from './diff.ts';

/** Letters and digits, lowercase and without accents; the text itself when it has none (a lone "?" or "+"). */
export function pieceKey(name: string): string {
  const key = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  return key || name.trim();
}

/** Keys made unique in order: a second "good" is "good#2", so each occurrence travels on its own. */
export function keyed(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = pieceKey(name);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count === 1 ? key : `${key}#${count}`;
  });
}

/** The names of a value's pieces: its words, its items, or none for a single number. */
export function pieceNames(value: TraceValue): string[] {
  if (!value.kind) return words(value.text);
  if (value.kind === 'number') return [];
  return (value.items ?? []).map((item) => item.name);
}

/** How many pieces a step kept, dropped and brought in. */
export function pieceChanges(before: TraceValue, after: TraceValue): { kept: number; removed: number; added: number } {
  const left = new Set(keyed(pieceNames(before)));
  const right = keyed(pieceNames(after));
  const kept = right.filter((key) => left.has(key)).length;
  return { kept, removed: left.size - kept, added: right.length - kept };
}

export interface Bar {
  name: string;
  key: string;
  /** As written, e.g. "+0.52". */
  text: string;
  value: number;
  /** Length as a share of the longest bar, from 0 to 1. */
  share: number;
}

/** Bars from `name=value` items, measured against the largest absolute value; negatives keep their sign. */
export function barsOf(items: readonly TraceItem[]): Bar[] {
  const keys = keyed(items.map((item) => item.name));
  const values = items.map((item) => Number(item.value ?? 0));
  const largest = Math.max(0, ...values.map((value) => Math.abs(value)));
  return items.map((item, i) => {
    const value = values[i] ?? 0;
    return { name: item.name, key: keys[i] ?? item.name, text: item.value ?? '', value, share: largest > 0 ? Math.abs(value) / largest : 0 };
  });
}

export interface VectorCell {
  /** Position in the vector, from 1. */
  n: number;
  /** As written. */
  text: string;
  value: number;
  /** Strength as a share of the largest absolute number shown, from 0 to 1. */
  share: number;
}

/** The cells of a vector, colored by sign and strength, and how many of its numbers are not shown. */
export function vectorOf(value: TraceValue): { cells: VectorCell[]; hidden: number; size: number } {
  const items = value.items ?? [];
  const numbers = items.map((item) => Number(item.value ?? 0));
  const largest = Math.max(0, ...numbers.map((n) => Math.abs(n)));
  const cells = items.map((item, i) => {
    const n = numbers[i] ?? 0;
    return { n: i + 1, text: item.value ?? '', value: n, share: largest > 0 ? Math.abs(n) / largest : 0 };
  });
  const size = Math.max(value.dims ?? 0, cells.length);
  return { cells, hidden: size - cells.length, size };
}
