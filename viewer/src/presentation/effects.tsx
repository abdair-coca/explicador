// Present-mode text effects in CSS only, so reduced motion shows them in place: words that rise one after another
// and numbers that roll in like an odometer.
import type { CSSProperties } from 'react';

/** Each word rises into view after the one before it. The text stays whole for screen readers and copying. */
export function RisingWords({ text, delay = 0, step = 40 }: { text: string; delay?: number; step?: number }) {
  let word = 0;
  return (
    <>
      {text.split(/(\s+)/).map((piece, i) => {
        if (piece.trim() === '') return piece;
        const style: CSSProperties = { animationDelay: `${delay + step * word++}ms` };
        return (
          <span key={i} className="rise">
            <span className="rise-inner" style={style}>
              {piece}
            </span>
          </span>
        );
      })}
    </>
  );
}

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
