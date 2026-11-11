// A display string whose numbers count up from zero the first time it scrolls into view ("49 582", "84.6 %").
// It keeps the final text's width while counting, and screen readers only ever hear the final text.
import { useEffect, useMemo, useRef, useState } from 'react';
import { reducedMotion } from '../animation/reveal';
import { splitNumbers, textAt } from './numbers';

const DURATION = 900;
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export function CountUp({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => splitNumbers(text), [text]);
  const counts = parts.some((part) => part.kind === 'number');
  const [progress, setProgress] = useState(() => (counts && !reducedMotion() ? 0 : 1));
  const element = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = element.current;
    if (!counts || !target || reducedMotion() || typeof IntersectionObserver === 'undefined') {
      setProgress(1);
      return;
    }
    setProgress(0);
    let frame = 0;
    let start = 0;
    const tick = (now: number): void => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      setProgress(easeOut(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [counts, text]);

  return (
    <span ref={element} className={className}>
      <span className="sr-only">{text}</span>
      <span className="count-up" aria-hidden="true">
        <span className="invisible">{text}</span>
        <span>{textAt(parts, progress)}</span>
      </span>
    </span>
  );
}
