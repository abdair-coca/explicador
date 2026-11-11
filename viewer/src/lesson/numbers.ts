// Numbers inside display strings ("84.6 %", "49 582", "4 000 × 23 672", "F1 0.851"), so they can count up
// from zero and land on exactly the text the agent wrote.

export type Part = { kind: 'text'; text: string } | { kind: 'number'; text: string; value: number; decimals: number; group: string };

// A grouped number (1 000, 23 672, 1,000) starts with 1-9; otherwise plain digits with optional decimals.
// Digits glued to letters ("F1", "x2") or to other digits are text.
const NUMBER = /(?<![\p{L}\p{N}.,])([1-9]\d{0,2}(?:([   ,])\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\p{L}\p{N}])/gu;

export function splitNumbers(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(NUMBER)) {
    const raw = match[1] ?? '';
    const at = match.index ?? 0;
    if (at > last) parts.push({ kind: 'text', text: text.slice(last, at) });
    const group = match[2] ?? '';
    const plain = group ? raw.split(group).join('') : raw;
    const decimals = plain.includes('.') ? (plain.split('.')[1]?.length ?? 0) : 0;
    parts.push({ kind: 'number', text: raw, value: Number(plain), decimals, group });
    last = at + raw.length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** `value` written like `part`: same decimals and the same thousands separator. */
export function formatLike(part: Extract<Part, { kind: 'number' }>, value: number): string {
  const fixed = Math.abs(value).toFixed(part.decimals);
  const [whole = '0', fraction] = fixed.split('.');
  const grouped = part.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, part.group) : whole;
  return `${value < 0 ? '-' : ''}${grouped}${fraction !== undefined ? `.${fraction}` : ''}`;
}

/** The text with every number at `progress` (0 to 1) of its value; at 1 it is the original text. */
export function textAt(parts: Part[], progress: number): string {
  return parts.map((part) => (part.kind === 'text' || progress >= 1 ? part.text : formatLike(part, part.value * progress))).join('');
}
