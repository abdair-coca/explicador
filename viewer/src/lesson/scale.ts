// Linear scales and "nice" ticks for the lesson charts (Heckbert's nice numbers).

/** 1, 2, 5 or 10 times a power of ten near `value`. */
function niceNumber(value: number, round: boolean): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const nice = round
    ? fraction < 1.5
      ? 1
      : fraction < 3
        ? 2
        : fraction < 7
          ? 5
          : 10
    : fraction <= 1
      ? 1
      : fraction <= 2
        ? 2
        : fraction <= 5
          ? 5
          : 10;
  return nice * 10 ** exponent;
}

export interface Ticks {
  min: number;
  max: number;
  step: number;
  values: number[];
}

/** About `count` round ticks covering `[min, max]`; the domain grows to the outer ticks. */
export function niceTicks(min: number, max: number, count = 5): Ticks {
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    return niceTicks(min - pad, max + pad, count);
  }
  const step = niceNumber(niceNumber(max - min, false) / Math.max(count - 1, 1), true);
  const low = Math.floor(min / step) * step;
  const high = Math.ceil(max / step) * step;
  const values: number[] = [];
  // Rounded to the step's decimals so 0.1 + 0.2 does not print as 0.30000000000000004.
  const decimals = decimalsOf(step);
  for (let v = low; v <= high + step / 2; v += step) values.push(Number(v.toFixed(decimals)));
  return { min: values[0] ?? low, max: values.at(-1) ?? high, step, values };
}

/** Decimals needed to print multiples of `step` exactly. */
export function decimalsOf(step: number): number {
  if (step >= 1) return 0;
  return Math.min(10, Math.ceil(-Math.log10(step) - 1e-9));
}

/**
 * Ticks for bars, which always grow from zero: the domain includes 0 (and both signs when some values are
 * negative). Lines get a domain around their values instead.
 */
export function barTicks(values: number[], count = 5): Ticks {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return niceTicks(min, max === min ? 1 : max, count);
}

export function lineTicks(values: number[], count = 5): Ticks {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08;
  return niceTicks(min - pad, max + pad, count);
}

/** Maps a value of `domain` onto `range` linearly. */
export function linear(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** A tick label with the decimals its step needs. */
export function formatTick(value: number, step: number): string {
  return value.toFixed(decimalsOf(step));
}
