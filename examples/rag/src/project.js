// A 2-D view of 8-dimensional vectors for the picture: the two directions along which the stored vectors spread the
// most (the first two singular vectors, found by power iteration). The origin stays at the origin, so a vector's
// direction in the picture follows its real direction; the scores always come from the 8 real dimensions.
import { dot } from './similarity.js';
import { length } from './embed.js';

function topDirection(rows, avoid) {
  let v = rows[0].map((_, i) => (i === 0 ? 1 : 0.5));
  for (let step = 0; step < 200; step++) {
    // (XᵀX)v, with the directions already found taken out.
    let next = v.map(() => 0);
    for (const row of rows) {
      const along = dot(row, v);
      next = next.map((x, i) => x + along * row[i]);
    }
    for (const a of avoid) {
      const along = dot(next, a);
      next = next.map((x, i) => x - along * a[i]);
    }
    const size = length(next);
    v = next.map((x) => x / size);
  }
  return v;
}

export function projector(rows) {
  const first = topDirection(rows, []);
  const second = topDirection(rows, [first]);
  return (vector) => [dot(vector, first), dot(vector, second)];
}
