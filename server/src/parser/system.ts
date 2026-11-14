// <system> (F26): a web of causes. Factors go up or down, signed links say what moves what, and the loops the links
// close are found here, with their kind. A push is played step by step: each effect follows a link from a factor that
// already moved, and the parser works out which way its target goes, so the scene cannot claim an effect the links do
// not carry.
import type { Element } from './reader.ts';
import { blockHead, catalog, checkId, checkMath, checkText, childElements, limits, narrationOf, readAttrs, readDesc, readEnum, readRef, type Report } from './common.ts';
import { directions, linkSigns, type Direction, type LinkSign, type SystemBlock, type SystemFactor, type SystemLink, type SystemLoop, type SystemStep } from './types.ts';

const spec = (name: string) => catalog[name] ?? { attrs: {} };
const offsetOf = (element: Element, attr: string): number => element.attrs.get(attr)?.offset ?? element.offset;
const flip = (change: Direction): Direction => (change === 'up' ? 'down' : 'up');

export function buildSystem(element: Element, ordinal: number, report: Report): SystemBlock {
  const { id, title, attrs: a } = blockHead(element, spec('system'), ordinal, report);
  const children = childElements(element, spec('system'), report);

  const factors: SystemFactor[] = [];
  const ids = new Set<string>();
  for (const child of children.filter((c) => c.name === 'factor')) {
    const f = readAttrs(child, spec('factor'), report);
    if (!child.selfClosing) report(child.offset, '<factor> must be self-closing: <factor id="load" label="Database load" />');
    if (f.id === undefined || f.label === undefined) continue;
    checkId(f.id, child, report);
    if (ids.has(f.id)) {
      report(child.offset, `Duplicate factor id "${f.id}"`);
      continue;
    }
    ids.add(f.id);
    factors.push({ id: f.id, label: checkText(f.label, 'label', limits.labelLength, child, report), ...readDesc(f.desc, child, report), ...readRef(f.ref, child, report) });
  }
  const knownFactor = (value: string | undefined, attr: string, child: Element): boolean => {
    if (value === undefined) return false;
    if (ids.has(value)) return true;
    report(offsetOf(child, attr), `"${attr}" refers to unknown factor "${value}"`);
    return false;
  };

  const links: SystemLink[] = [];
  for (const child of children.filter((c) => c.name === 'link')) {
    const l = readAttrs(child, spec('link'), report);
    if (!child.selfClosing) report(child.offset, '<link> must be self-closing: <link from="a" to="b" sign="same" />');
    const from = knownFactor(l.from, 'from', child);
    const to = knownFactor(l.to, 'to', child);
    const sign = l.sign === undefined ? undefined : readEnum<LinkSign>(l.sign, linkSigns, 'same', 'sign', child, report);
    if (!from || !to || !sign || l.from === undefined || l.to === undefined) continue;
    if (l.from === l.to) {
      report(child.offset, `A factor cannot act on itself: "${l.from}" links to "${l.to}"`);
      continue;
    }
    if (links.some((link) => link.from === l.from && link.to === l.to)) {
      report(child.offset, `There is already a <link> from "${l.from}" to "${l.to}"`);
      continue;
    }
    const label = l.label === undefined ? undefined : checkText(l.label, 'label', limits.linkLabelLength, child, report);
    links.push({ from: l.from, to: l.to, sign, ...(label ? { label } : {}) });
  }

  const loops = findLoops(factors.map((factor) => factor.id), links);
  for (const child of children.filter((c) => c.name === 'loop')) {
    const l = readAttrs(child, spec('loop'), report);
    if (!child.selfClosing) report(child.offset, '<loop> must be self-closing: <loop through="a b c" label="Retry storm" />');
    if (l.through === undefined || l.label === undefined) continue;
    const through = l.through.split(/\s+/).filter(Boolean);
    if (!through.every((factor) => knownFactor(factor, 'through', child))) continue;
    const key = [...through].sort().join(' ');
    const loop = loops.find((found) => [...found.through].sort().join(' ') === key);
    if (!loop) {
      const all = loops.map((found) => `"${found.through.join(' ')}"`).join(', ');
      report(offsetOf(child, 'through'), `"${l.through}" is not a loop of links${loops.length > 0 ? `; the loops are ${all}` : ': this system has none'}`);
      continue;
    }
    if (loop.label !== undefined) report(child.offset, `The loop "${l.through}" already has a name`);
    loop.label = checkText(l.label, 'label', limits.labelLength, child, report);
  }

  const steps: SystemStep[] = [];
  const moved: Record<string, Direction>[] = [];
  const now: Record<string, Direction> = {};
  for (const child of children.filter((c) => c.name === 'push' || c.name === 'effect')) {
    const s = readAttrs(child, spec(child.name), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    let step: SystemStep | undefined;
    if (child.name === 'push') {
      const change = s.change === undefined ? undefined : readEnum<Direction>(s.change, directions, 'up', 'change', child, report);
      if (knownFactor(s.factor, 'factor', child) && change && s.factor !== undefined) step = { kind: 'push', factor: s.factor, change, narration };
    } else if (knownFactor(s.from, 'from', child) && knownFactor(s.to, 'to', child) && s.from !== undefined && s.to !== undefined) {
      const index = links.findIndex((link) => link.from === s.from && link.to === s.to);
      const link = links[index];
      const source = now[s.from];
      if (!link) report(child.offset, `No <link> runs from "${s.from}" to "${s.to}": an effect follows a link of the system`);
      else if (!source) report(offsetOf(child, 'from'), `"${s.from}" has not moved yet: <push> it, or reach it with an earlier <effect>`);
      else step = { kind: 'effect', factor: s.to, change: link.sign === 'same' ? source : flip(source), link: index, narration };
    }
    if (!step) continue;
    const before = now[step.factor];
    if (before !== undefined && before !== step.change) step.reversed = true;
    now[step.factor] = step.change;
    steps.push(step);
    moved.push({ ...now });
  }

  if (factors.length < 2) report(element.offset, '<system> needs at least two <factor>s');
  if (factors.length > limits.systemFactors) report(element.offset, `<system> has more than ${limits.systemFactors} factors`);
  if (links.length === 0 && factors.length >= 2) report(element.offset, '<system> needs at least one <link>');
  if (links.length > limits.systemLinks) report(element.offset, `<system> has more than ${limits.systemLinks} links`);
  if (steps.length > limits.systemSteps) report(element.offset, `<system> has more than ${limits.systemSteps} steps`);
  if (steps.length > 0 && steps[0]?.kind !== 'push') report(element.offset, 'The first step of a <system> is a <push>');
  return { type: 'system', id, title, factors, links, loops: loops.slice(0, limits.systemLoops), steps, moved, ...readRef(a.ref, element, report) };
}

/**
 * Every simple cycle of links, each once: it starts at its factor declared first and runs in link order. Shorter loops
 * come first. The kind is the product of the signs.
 */
export function findLoops(order: string[], links: SystemLink[]): SystemLoop[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const out = new Map<string, number[]>();
  links.forEach((link, i) => out.set(link.from, [...(out.get(link.from) ?? []), i]));
  const loops: SystemLoop[] = [];
  const CAP = 64;
  for (const start of order) {
    const startRank = rank.get(start) ?? 0;
    const walk = (at: string, path: string[], used: number[]): void => {
      if (loops.length >= CAP) return;
      for (const index of out.get(at) ?? []) {
        const next = links[index]?.to ?? '';
        if (next === start) {
          const chain = [...used, index];
          const opposite = chain.filter((i) => links[i]?.sign === 'opposite').length;
          loops.push({ through: path, links: chain, kind: opposite % 2 === 0 ? 'reinforcing' : 'balancing' });
        } else if ((rank.get(next) ?? -1) > startRank && !path.includes(next)) {
          walk(next, [...path, next], [...used, index]);
        }
      }
    };
    walk(start, [start], []);
  }
  return loops.sort((a, b) => a.through.length - b.through.length);
}
