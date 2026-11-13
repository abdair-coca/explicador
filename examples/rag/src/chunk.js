// Splits the help center into chunks: one paragraph each, the unit that is embedded, stored and retrieved.
import { readFileSync } from 'node:fs';

export function chunks(path) {
  return readFileSync(path, 'utf8')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph && !paragraph.startsWith('#'))
    .map((text, i) => ({ id: `c${i + 1}`, text }));
}
