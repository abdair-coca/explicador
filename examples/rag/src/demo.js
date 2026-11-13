// Runs the whole pipeline on the help center and prints every number Explicador's example scene shows.
import { fileURLToPath } from 'node:url';
import { chunks } from './chunk.js';
import { MEANINGS, rawVector, tokens, length } from './embed.js';
import { buildStore, saveStore } from './store.js';
import { buildIndex } from './index.js';
import { search } from './search.js';
import { projector } from './project.js';
import { cosine } from './similarity.js';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const f = (x) => x.toFixed(2);

const pieces = chunks(here('../data/help-center.md'));
const rows = buildStore(pieces);
saveStore(rows, here('../data/store.json'));
const index = buildIndex(rows, ['c1', 'c4', 'c7', 'c10']);
const question = 'When do I get my money back?';
const found = search(question, rows, index, 3);
const view = projector(rows.map((row) => row.vector));

console.log(`meanings: ${MEANINGS.join(' | ')}`);
console.log(`${pieces.length} chunks`);
const first = rows[0];
console.log(`\n${first.id}: ${first.text}`);
console.log(`  tokens: ${tokens(first.text).join(' | ')}`);
console.log(`  raw: ${rawVector(first.text).map(f).join(' | ')}  (length ${f(length(rawVector(first.text)))})`);
console.log(`  embedding: ${first.vector.map(f).join(' | ')}`);
console.log(`\nquestion: ${question}`);
console.log(`  tokens: ${tokens(question).join(' | ')}`);
console.log(`  raw: ${rawVector(question).map(f).join(' | ')}  (length ${f(length(rawVector(question)))})`);
console.log(`  embedding: ${found.vector.map(f).join(' | ')}`);
console.log('\nclusters:');
index.centroids.forEach((centroid, c) => {
  const members = rows.filter((_, i) => index.assignment[i] === c).map((row) => row.id);
  console.log(`  ${c}: ${members.join(', ')}  at ${view(centroid).map(f).join(', ')}`);
});
console.log(`\nquery sent to cluster ${found.cluster}; compared ${found.compared} of ${rows.length}`);
console.log(`query at ${view(found.vector).map(f).join(', ')}`);
console.log('\nscores (cluster rows):');
for (const row of found.scored) console.log(`  ${row.id} ${row.score.toFixed(3)}  ${row.text}`);
console.log('\nall rows, 2-D view:');
rows.forEach((row, i) => console.log(`  ${row.id} cluster ${index.assignment[i]} at ${view(row.vector).map(f).join(', ')}`));
console.log('\nstore (2 decimals):');
for (const row of rows) console.log(`  ${row.id} ${row.vector.map(f).join(' | ')}`);
const best = rows.find((row) => row.id === found.results[0].id);
console.log(`\ncosine, 3 decimals: question ${found.vector.map((x) => x.toFixed(3)).join(' | ')}`);
console.log(`                    ${best.id}       ${best.vector.map((x) => x.toFixed(3)).join(' | ')}`);
console.log(`  c6 (not compared) cosine ${cosine(found.vector, rows[5].vector).toFixed(3)}`);
console.log(`\ntop ${found.results.length}: ${found.results.map((r) => `${r.id} ${r.score.toFixed(3)}`).join(', ')}`);
