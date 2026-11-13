// The vector store: one row per chunk with its id, its text and its embedding, kept in a JSON file.
import { writeFileSync, readFileSync } from 'node:fs';
import { embed } from './embed.js';

export function buildStore(chunks) {
  return chunks.map((chunk) => ({ id: chunk.id, text: chunk.text, vector: embed(chunk.text) }));
}

export function saveStore(rows, path) {
  writeFileSync(path, JSON.stringify(rows, null, 2) + '\n');
}

export function loadStore(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
