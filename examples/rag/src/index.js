// The index: k-means groups the stored vectors into k clusters, each with a centroid (its average direction). A query
// is then compared only with the rows of the cluster whose centroid it is closest to, instead of with every row.
import { cosine } from './similarity.js';
import { length } from './embed.js';

const normalize = (vector) => vector.map((x) => x / (length(vector) || 1));

/** Spherical k-means: assign each row to the most similar centroid, move each centroid to its rows' average, repeat. */
export function buildIndex(rows, seeds) {
  let centroids = seeds.map((id) => rows.find((row) => row.id === id).vector);
  let assignment = [];
  for (let round = 0; round < 20; round++) {
    const next = rows.map((row) => centroids.reduce((best, centroid, c) => (cosine(row.vector, centroid) > cosine(row.vector, centroids[best]) ? c : best), 0));
    const settled = next.every((cluster, i) => cluster === assignment[i]);
    assignment = next;
    centroids = centroids.map((centroid, c) => {
      const members = rows.filter((_, i) => assignment[i] === c);
      if (members.length === 0) return centroid;
      return normalize(centroid.map((_, d) => members.reduce((sum, row) => sum + row.vector[d], 0)));
    });
    if (settled) break;
  }
  return { centroids, assignment };
}

/** The cluster a query is sent to: the one whose centroid points most the same way. */
export function probe(index, vector) {
  return index.centroids.reduce((best, centroid, c) => (cosine(vector, centroid) > cosine(vector, index.centroids[best]) ? c : best), 0);
}
