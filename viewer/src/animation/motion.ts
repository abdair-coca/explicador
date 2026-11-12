// The motion system (F16): GSAP with its plugins, and the only place where durations, eases and staggers are defined.
// Every animation takes its numbers from `tokens`, so the whole viewer moves with one voice.
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(Flip, SplitText, DrawSVGPlugin, MotionPathPlugin);

export const tokens = {
  /** Seconds. */
  dur: { fast: 0.18, base: 0.38, slow: 0.62, draw: 0.9, travel: 1.1 },
  ease: {
    /** Things that arrive. */
    out: 'power3.out',
    /** Things that move from one place to another. */
    move: 'power3.inOut',
    /** Things that pop: a slight overshoot, the Titi bounce. */
    pop: 'back.out(1.6)',
    /** Things that land with weight. */
    spring: 'elastic.out(1, 0.7)',
    /** Lines being drawn. */
    draw: 'power2.inOut',
  },
  /** Seconds between two items of a group. */
  stagger: { tight: 0.025, base: 0.06, loose: 0.11 },
  /** The longest a staggered group takes to start all its items, however many they are. */
  spread: 0.9,
  /** How much faster a part plays when it is taken back with ←. */
  rewind: 1.9,
} as const;

/** The delay between `count` items: `step` seconds, less when the group would take longer than `tokens.spread`. */
export function staggerOf(count: number, step: number = tokens.stagger.base): number {
  return count > 1 ? Math.min(step, tokens.spread / (count - 1)) : 0;
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { DrawSVGPlugin, Flip, gsap, MotionPathPlugin, SplitText };
