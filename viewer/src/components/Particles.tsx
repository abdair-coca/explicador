// Small dots that keep flowing along the active edge of a diagram, in the direction the data travels, after the
// token has made its run. Decorative, and absent under reduced motion (the caller does not mount it).
import { useLayoutEffect, useRef } from 'react';
import { gsap, tokens } from '../animation/motion';

const COUNT = 3;
/** Seconds one dot takes from one end of the edge to the other. */
const RUN = 1.3;

export function Particles({ path }: { path: string }) {
  const group = useRef<SVGGElement>(null);
  useLayoutEffect(() => {
    const dots = [...(group.current?.querySelectorAll('circle') ?? [])];
    const timelines = dots.map((dot, i) =>
      gsap
        // They start once the token has arrived, evenly spaced along the run.
        .timeline({ repeat: -1, delay: 0.7 + (i * RUN) / COUNT })
        .set(dot, { autoAlpha: 0 })
        .to(dot, { motionPath: { path }, duration: RUN, ease: 'none' }, 0)
        .to(dot, { autoAlpha: 1, duration: tokens.dur.fast }, 0)
        .to(dot, { autoAlpha: 0, duration: tokens.dur.fast }, RUN - tokens.dur.fast),
    );
    return () => {
      for (const timeline of timelines) timeline.kill();
    };
  }, [path]);
  return (
    <g ref={group} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <circle key={i} r="3.5" className="particle" style={{ visibility: 'hidden' }} />
      ))}
    </g>
  );
}
