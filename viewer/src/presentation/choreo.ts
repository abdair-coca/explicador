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
  /** A plot: the grid fades in, the axes draw from the origin and each curve is traced. */
  plot: (element, timeline) => {
    timeline.from(element.querySelectorAll('.plot-grid, .plot-tick, .plot-label'), { autoAlpha: 0, duration: dur.base, ease: ease.out, stagger: stagger.tight }, 0);
    timeline.from(element.querySelectorAll('.plot-draw'), { drawSVG: 0, duration: dur.slow, ease: ease.draw, stagger: stagger.loose }, 0.1);
    timeline.from(element.querySelectorAll('.plot-curve'), { drawSVG: 0, duration: dur.draw, ease: ease.draw, stagger: stagger.loose }, 0.45);
  },
  /** A mark on a plot: once the travelling point arrives, its guides draw, its dot lands and its label rises. */
  mark: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, dur.travel - 0.1);
    timeline.from(element.querySelectorAll('.plot-guide'), { drawSVG: 0, duration: dur.base, ease: ease.draw, stagger: stagger.base }, dur.travel - 0.1);
    timeline.from(element.querySelector('.plot-dot'), { scale: 0, transformOrigin: '50% 50%', duration: dur.base, ease: ease.spring }, dur.travel - 0.1);
    timeline.from(element.querySelector('.plot-tag'), { autoAlpha: 0, y: '+=10', duration: dur.base, ease: ease.out }, dur.travel + 0.05);
  },
  /** The two names of a comparison come from their own sides and meet at the "vs", which lands between them. */
  versus: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelector('.compare-a'), { autoAlpha: 0, xPercent: -60, duration: dur.slow, ease: ease.out }, 0);
    timeline.from(element.querySelector('.compare-b'), { autoAlpha: 0, xPercent: 60, duration: dur.slow, ease: ease.out }, 0);
    timeline.from(element.querySelector('.compare-vs'), { autoAlpha: 0, scale: 0, rotate: -30, duration: dur.slow, ease: ease.spring }, dur.base);
  },
  /** A row of a comparison: its label pops, each cell arrives from its side, then the winner's mark lands. */
  pair: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelector('.compare-label'), { autoAlpha: 0, scale: 0.6, duration: dur.base, ease: ease.pop }, 0);
    timeline.from(element.querySelector('.compare-cell.compare-a'), { autoAlpha: 0, x: -36, duration: dur.base, ease: ease.out }, 0.08);
    timeline.from(element.querySelector('.compare-cell.compare-b'), { autoAlpha: 0, x: 36, duration: dur.base, ease: ease.out }, 0.16);
    const mark = element.querySelector('.compare-win');
    if (mark) timeline.from(mark, { autoAlpha: 0, scale: 0, duration: dur.base, ease: ease.spring }, 0.55);
  },
  /** An event of a timeline: its dot lands once the line reaches it, then its date and name rise. */
  event: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelector('.timeline-dot'), { autoAlpha: 0, scale: 0, duration: dur.slow, ease: ease.spring }, 0.2);
    timeline.from(element.querySelectorAll('.timeline-when, .timeline-label'), { autoAlpha: 0, y: 10, duration: dur.base, ease: ease.out, stagger: stagger.base }, 0.35);
  },
  /** The points of one class: each drops onto its place with a little weight. */
  dots: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const dots = element.querySelectorAll('.scatter-dot');
    timeline.from(dots, { autoAlpha: 0, y: -26, scale: 0.3, transformOrigin: '50% 50%', duration: dur.slow, ease: ease.spring, stagger: staggerOf(dots.length, stagger.tight) }, 0);
  },
  /** A decision boundary: the line is traced, then its two sides tint. */
  boundary: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const line = element.querySelector('.scatter-boundary');
    if (line) timeline.from(line, { drawSVG: 0, duration: dur.draw, ease: ease.draw }, 0);
    const sides = element.querySelectorAll('.scatter-side');
    if (sides.length > 0) timeline.from(sides, { autoAlpha: 0, duration: dur.slow, ease: ease.out, stagger: stagger.loose }, dur.draw * 0.6);
  },
  /** The points on the wrong side: a ring closes in on each. */
  wrong: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const rings = element.querySelectorAll('.scatter-ring');
    timeline.from(rings, { autoAlpha: 0, scale: 3, transformOrigin: '50% 50%', duration: dur.slow, ease: ease.out, stagger: staggerOf(rings.length, stagger.base) }, 0);
  },
  /**
   * A line of a derivation: the symbols it shares with the line above glide down from their place there, then the
   * new ones pop in and the note follows. `data-from` on each symbol (set by the derivation) names its source.
   */
  derive: (element, timeline) => {
    const symbols = (line: Element | null): HTMLElement[] =>
      line ? [...line.querySelectorAll<HTMLElement>('.katex-html *')].filter((item) => item.childElementCount === 0 && (item.textContent ?? '').trim() !== '') : [];
    const atoms = symbols(element);
    const above = symbols(element.previousElementSibling);
    const kept = atoms.filter((atom) => atom.dataset.from !== undefined);
    const fresh = atoms.filter((atom) => atom.dataset.from === undefined);
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelector('.derive-step'), { autoAlpha: 0, scale: 0, duration: dur.base, ease: ease.pop }, 0);
    for (const atom of kept) {
      const source = above[Number(atom.dataset.from)];
      if (!source) continue;
      const to = atom.getBoundingClientRect();
      const from = source.getBoundingClientRect();
      timeline.from(atom, { x: from.left - to.left, y: from.top - to.top, scale: to.height > 0 ? from.height / to.height : 1, transformOrigin: '0% 0%', duration: dur.slow, ease: ease.move }, 0);
    }
    const start = kept.length > 0 ? dur.slow * 0.7 : 0.05;
    if (fresh.length > 0) timeline.from(fresh, { autoAlpha: 0, scale: 0.4, y: '0.3em', duration: dur.base, ease: ease.pop, stagger: staggerOf(fresh.length, stagger.base) }, start);
    const note = element.querySelector('.derive-note');
    if (note) timeline.from(note, { autoAlpha: 0, y: 10, duration: dur.base, ease: ease.out }, '>-0.1');
  },
  /** The items of a vector space: each drops onto its place with a little weight. */
  'space-items': (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const items = element.querySelectorAll('.space-item');
    timeline.from(items, { autoAlpha: 0, y: -24, duration: dur.slow, ease: ease.spring, stagger: staggerOf(items.length, stagger.tight) }, 0.15);
  },
  /** The query: it falls onto its place, then a ring pulses out from it. */
  'space-query': (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelector('.space-query'), { y: -90, scale: 1.6, transformOrigin: '50% 50%', duration: dur.slow, ease: ease.spring }, 0);
    timeline.from(element.querySelector('.space-query-ring'), { scale: 0.2, autoAlpha: 0, transformOrigin: '50% 50%', duration: dur.slow, ease: ease.out }, dur.base);
  },
  /** The index sends the query to its cluster: the line is drawn from the query to the centroid. */
  'space-probe': (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelectorAll('.space-probe'), { drawSVG: 0, duration: dur.slow, ease: ease.draw }, 0);
  },
  /** A comparison: the arrows grow from the origin, then the angle between them opens and its value pops. */
  'space-angle': (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    timeline.from(element.querySelectorAll('.space-arrow'), { drawSVG: 0, duration: dur.slow, ease: ease.draw, stagger: stagger.base }, 0);
    const arc = element.querySelector('.space-arc');
    if (arc) timeline.from(arc, { drawSVG: 0, duration: dur.slow, ease: ease.draw }, dur.base);
    const label = element.querySelector('.space-arc-label');
    if (label) timeline.from(label, { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%', duration: dur.base, ease: ease.pop }, dur.slow);
  },
  /** A ranking: the rows rise in order and their bars grow. */
  rank: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const rows = element.querySelectorAll('.space-rank-row');
    timeline.from(rows, { autoAlpha: 0, x: -16, duration: dur.base, ease: ease.out, stagger: staggerOf(rows.length, stagger.base) }, 0);
    const bars = element.querySelectorAll('.space-rank-bar');
    timeline.from(bars, { scaleX: 0, transformOrigin: '0% 50%', duration: dur.slow, ease: ease.out, stagger: staggerOf(bars.length, stagger.base) }, 0.15);
  },
  /** The products of a cosine: each one pops under its pair, left to right. */
  products: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, duration: 0.01 }, 0);
    const cells = element.querySelectorAll('.cosine-product, .cosine-more, .cosine-name');
    timeline.from(cells, { autoAlpha: 0, y: -18, scale: 0.6, duration: dur.base, ease: ease.pop, stagger: staggerOf(cells.length, stagger.base) }, 0);
  },
  /** A result on a gauge: the line rises, then the marker slides from 0 to its value. */
  gauge: (element, timeline) => {
    timeline.from(element, { autoAlpha: 0, y: 18, duration: dur.base, ease: ease.out }, 0);
    const marker = element.querySelector('.cosine-gauge-marker');
    if (marker) timeline.from(marker, { left: '50%', duration: dur.slow * 1.6, ease: ease.move }, dur.base);
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
    const stops = element.querySelectorAll('.stage-map-stop');
    if (stops.length > 0) {
      timeline.from(stops, { autoAlpha: 0, y: 12, duration: dur.base, ease: ease.out, stagger: staggerOf(stops.length, stagger.base) }, '>-0.1');
      const here = element.querySelector('.stage-map-stop.here .stage-map-dot');
      if (here) timeline.from(here, { scale: 0.4, duration: dur.slow, ease: ease.spring }, '>-0.05');
    }
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
    gsap.set([element, ...element.querySelectorAll('*')], { clearProps: 'opacity,visibility,transform,translate,rotate,scale,strokeDasharray,strokeDashoffset' });
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
