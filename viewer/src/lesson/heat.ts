// Heat for plain numeric matrices: one blue ramp from the smallest to the largest number; text cells stay white.

const NUMBER = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;

export function isNumeric(value: string): boolean {
  return NUMBER.test(value.trim());
}

/** Percent of `--heat` mixed into white per cell (6 to 76), or undefined for a text cell. */
export function heatOf(rows: { values: string[] }[]): (number | undefined)[][] {
  const numbers = rows.flatMap((row) => row.values.filter(isNumeric).map(Number));
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return rows.map((row) =>
    row.values.map((value) => {
      if (!isNumeric(value)) return undefined;
      const t = max === min ? 0.5 : (Number(value) - min) / (max - min);
      return Math.round(6 + 70 * t);
    }),
  );
}
