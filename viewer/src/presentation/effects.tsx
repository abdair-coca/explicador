// A Present-mode text effect in CSS only, so reduced motion shows it in place: numbers that roll in like an odometer.
import type { CSSProperties } from 'react';

const DIGITS = [...'01234567890123456789'];

/** Each digit spins a full turn and lands on its value, a little after the digit before it. */
export function RollingNumber({ value, delay = 0 }: { value: string; delay?: number }) {
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex">
        {[...value].map((char, i) =>
          /\d/.test(char) ? (
            <span key={i} className="roll">
              <span className="roll-strip" style={{ '--to': Number(char) + 10, animationDelay: `${delay + 70 * i}ms` } as CSSProperties}>
                {DIGITS.map((digit, d) => (
                  <span key={d}>{digit}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{char}</span>
          ),
        )}
      </span>
    </>
  );
}
