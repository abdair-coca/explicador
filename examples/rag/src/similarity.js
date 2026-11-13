// Cosine similarity: how much two vectors point the same way, from -1 (opposite) to 1 (same direction).
import { length } from './embed.js';

export const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export function cosine(a, b) {
  return dot(a, b) / (length(a) * length(b));
}
