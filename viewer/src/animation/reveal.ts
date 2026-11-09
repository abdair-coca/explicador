// Motion tokens and entrances (SocialNeo's motion.md, with the Web Animations API instead of GSAP).
// Snappy, with a slight bounce, 400 ms at most for entrances; nothing moves with reduced motion.

export const motion = {
  fast: 150,
  base: 300,
  slow: 400,
  /** The Titi bounce, the CSS twin of GSAP's back.out(1.5). */
  pop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out: 'cubic-bezier(0.33, 1, 0.68, 1)',
} as const;

/** Total spread of a staggered entrance, so long lists still finish quickly. */
const MAX_STAGGER = 300;

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Delay between items of a staggered entrance of `count` items. */
export function staggerStep(count: number): number {
  return count > 1 ? Math.min(50, MAX_STAGGER / (count - 1)) : 0;
}

/** Each element pops in (scale and fade), one after another. */
export function staggerIn(elements: Iterable<Element>): void {
  if (reducedMotion()) return;
  const items = [...elements];
  const step = staggerStep(items.length);
  items.forEach((element, i) => {
    element.animate(
      [
        { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: motion.base, easing: motion.pop, delay: i * step, fill: 'backwards' },
    );
  });
}
