// The search: embed the question, send it to its cluster, score that cluster's rows by cosine and keep the k best.
import { embed } from './embed.js';
import { probe } from './index.js';
import { cosine } from './similarity.js';

export function search(question, rows, index, k = 3) {
  const vector = embed(question);
  const cluster = probe(index, vector);
  const candidates = rows.filter((_, i) => index.assignment[i] === cluster);
  const scored = candidates.map((row) => ({ id: row.id, text: row.text, score: cosine(vector, row.vector) }));
  scored.sort((a, b) => b.score - a.score);
  return { vector, cluster, compared: candidates.length, results: scored.slice(0, k), scored };
}
