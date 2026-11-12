// Which symbols of a formula come from the line before it. The longest common subsequence of the two lines' atoms
// keeps their order, so a symbol never crosses another one that also stays. Pure.

/** For each atom of `after`, the index in `before` of the atom it continues, or undefined when it is new. */
export function matchAtoms(before: readonly string[], after: readonly string[]): (number | undefined)[] {
  const rows = before.length;
  const cols = after.length;
  // lengths[i][j]: the longest common subsequence of before[i..] and after[j..].
  const lengths = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      const row = lengths[i];
      if (!row) continue;
      row[j] = before[i] === after[j] ? (lengths[i + 1]?.[j + 1] ?? 0) + 1 : Math.max(lengths[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  const matches = new Array<number | undefined>(cols).fill(undefined);
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      matches[j] = i;
      i++;
      j++;
    } else if ((lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0)) i++;
    else j++;
  }
  return matches;
}
