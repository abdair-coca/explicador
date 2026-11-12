// Plays the parts of a slide as GSAP timelines. An element says which part it belongs to with `data-part` and how it
// comes in with `data-fx`; the same timeline runs backwards when the part is taken back with ←.
// React decides what is visible (a hidden part keeps its place with `visibility: hidden`); this file only moves things.
import { gsap, SplitText, staggerOf, tokens } from '../animation/motion';
import type { PartPlan } from './partPlan';

type Cleanup = () => void;
type Effect = (element: HTMLElement, timeline: gsap.core.Timeline) => Cleanup | void;

const { dur, ease, stagger } = tokens;

/**
 * Splits a heading into words that rise from behind their own line. Words, not letters: letters as separate boxes lose
 * their kerning, the line gets wider and the heading would wrap differently while it moves.
 */
function splitRise(element: HTMLElement, timeline: gsap.core.Timeline, at: number | string = 0): Cleanup {
  const split = SplitText.create(element, { type: 'words', mask: 'words', aria: 'auto' });
  timeline.from(split.words, { yPercent: 115, rotate: 4, transformOrigin: '0% 100%', duration: dur.slow, ease: ease.out, stagger: staggerOf(split.words.length, stagger.base) }, at);
  return () => split.revert();
}

const effects: Record<string, Effect> = {
  rise: (element, timeline) => void timeline.from(element, { autoAlpha: 0, y: 18, duration: dur.base, ease: ease.out }),
  fade: (element, timeline) => void timeline.from(element, { autoAlpha: 0, duration: dur.base, ease: ease.out }),
  pop: (element, timeline) => void timeline.from(element, { autoAlpha: 0, scale: 0.8, duration: dur.base, ease: ease.pop }),
  stamp: (element, timeline) => void timeline.from(element, { autoAlpha: 0, scale: 1.14, rotate: -2, duration: dur.base, ease: ease.pop }),
  swing: (element, timeline) => void timeline.from(element, { autoAlpha: 0, rotate: -7, scale: 0.9, transformOrigin: '0% 100%', duration: dur.slow, ease: ease.pop }),
  split: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 });
    return splitRise(element, timeline, 0);
  },
  /** A block with rows (a table): it rises, then its rows follow one by one. */
  rows: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, y: 18, duration: dur.base, ease: ease.out });
    const rows = element.querySelectorAll('tbody tr');
    if (rows.length > 0) timeline.from(rows, { autoAlpha: 0, x: -10, duration: dur.fast, ease: ease.out, stagger: staggerOf(rows.length, stagger.base) }, '<0.12');
  },
  /** A formula: its box fades in and its atoms pop in from left to right. */
  formula: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: dur.fast, ease: ease.out });
    const atoms = [...element.querySelectorAll<HTMLElement>('.katex-html > span > span')].filter((atom) => atom.getBoundingClientRect().width > 0);
    if (atoms.length > 0) timeline.from(atoms, { autoAlpha: 0, y: '0.35em', scale: 0.5, duration: dur.base, ease: ease.pop, stagger: staggerOf(atoms.length, stagger.base) }, '<0.08');
  },
  /** A chapter card: the number drops in, the rule draws, the title rises word by word and the goal follows. */
  chapter: (element, timeline) => {
    const pick = (selector: string): HTMLElement | null => element.querySelector<HTMLElement>(selector);
    const title = pick('.chapter-title');
    // The yellow wipe is still leaving the screen when the card mounts.
    const start = 0.22;
    timeline.from(pick('.chapter-number'), { autoAlpha: 0, yPercent: 30, duration: dur.slow, ease: ease.pop }, start);
    timeline.from(pick('.chapter-count'), { autoAlpha: 0, x: -12, duration: dur.base, ease: ease.out }, start + 0.2);
    timeline.from(pick('.chapter-rule'), { scaleX: 0, transformOrigin: '0% 50%', duration: dur.slow, ease: ease.move }, start + 0.15);
    const revert = title ? splitRise(title, timeline, start + 0.25) : undefined;
    const goal = pick('.chapter-goal');
    if (goal) timeline.from(goal, { autoAlpha: 0, y: 14, duration: dur.base, ease: ease.out }, '>-0.25');
    return revert;
  },
};

interface Running {
  timeline: gsap.core.Timeline;
  cleanup: Cleanup;
}

const running = new WeakMap<HTMLElement, Running>();

/** Stops whatever is moving the element and leaves it as its CSS says. */
function settle(element: HTMLElement): void {
  const current = running.get(element);
  if (!current) return;
  current.timeline.kill();
  current.cleanup();
  running.delete(element);
}

function build(element: HTMLElement): Running {
  settle(element);
  const timeline = gsap.timeline({ paused: true });
  const effect = effects[element.dataset.fx ?? 'rise'] ?? effects.rise;
  const revert = effect?.(element, timeline);
  const cleanup = (): void => {
    revert?.();
    // Everything the timeline touched goes back to what the stylesheet says.
    gsap.set([element, ...element.querySelectorAll('*')], { clearProps: 'opacity,visibility,transform,translate,rotate,scale' });
  };
  const entry = { timeline, cleanup };
  running.set(element, entry);
  return entry;
}

const partsIn = (root: HTMLElement, part: number): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)];

/** Runs the plan on the slide under `root`. Call it from a layout effect, so nothing is painted before it starts. */
export function runParts(root: HTMLElement, plan: PartPlan): void {
  plan.play.forEach((part, i) => {
    for (const element of partsIn(root, part)) {
      const { timeline } = build(element);
      timeline.eventCallback('onComplete', () => settle(element));
      // Several parts revealed at once follow each other closely.
      timeline.delay(i * dur.fast).play();
    }
  });
  for (const part of plan.rewind) {
    for (const element of partsIn(root, part)) {
      // The part is already hidden by its class: show it for as long as it takes to leave.
      settle(element);
      gsap.set(element, { visibility: 'visible' });
      const { timeline } = build(element);
      timeline.eventCallback('onReverseComplete', () => settle(element));
      timeline.progress(1).timeScale(tokens.rewind).reverse();
    }
  }
}
