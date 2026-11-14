// The forms of F27: a text read part by part (<annotated>) and a claim weighed point by point (<argument>). Quotes are
// found in the passage here, so a note can never point at words the text does not hold.
import type { Element } from './reader.ts';
import { blockHead, bodyText, catalog, checkMath, checkText, childElements, limits, narrationOf, optionalText, readAttrs, readRef, type Report } from './common.ts';
import { markdownBody } from './lesson.ts';
import type { AnnotatedBlock, AnnotatedNote, ArgumentBlock, ArgumentPoint } from './types.ts';

const spec = (name: string) => catalog[name] ?? { attrs: {} };
const offsetOf = (element: Element, attr: string): number => element.attrs.get(attr)?.offset ?? element.offset;

/** Where `quote` is in `passage`, any run of whitespace matching any other, or undefined. */
export function findQuote(passage: string, quote: string): { start: number; end: number } | undefined {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  const pattern = new RegExp(words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'));
  const match = pattern.exec(passage);
  return match ? { start: match.index, end: match.index + match[0].length } : undefined;
}

export function buildAnnotated(element: Element, ordinal: number, report: Report): AnnotatedBlock {
  const { id, title, attrs: a } = blockHead(element, spec('annotated'), ordinal, report);
  const children = childElements(element, spec('annotated'), report);
  const passages = children.filter((c) => c.name === 'passage');
  if (passages.length !== 1) report(passages[1]?.offset ?? element.offset, '<annotated> needs exactly one <passage>: the text as written');
  const passageElement = passages[0];
  if (passageElement && passageElement.attrs.size > 0) readAttrs(passageElement, spec('passage'), report);
  const passage = passageElement ? markdownBody(passageElement, report) : '';
  if (passageElement && !passage) report(passageElement.offset, '<passage> needs its text');
  if (passage.length > limits.passageLength) report(passageElement?.offset ?? element.offset, `<passage> is longer than ${limits.passageLength} characters: keep the part the notes read`);

  const notes: AnnotatedNote[] = [];
  for (const child of children.filter((c) => c.name === 'note')) {
    const n = readAttrs(child, spec('note'), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    if (n.quote === undefined) continue;
    const quote = checkText(n.quote, 'quote', limits.questionLength, child, report);
    const label = optionalText(n.label, 'label', limits.labelLength, child, report);
    const span = findQuote(passage, quote);
    if (!span) {
      if (passage) report(offsetOf(child, 'quote'), `"${quote}" is not in the <passage>: quote its words as written`);
      continue;
    }
    const clash = notes.find((other) => span.start < other.end && other.start < span.end);
    if (clash) {
      report(offsetOf(child, 'quote'), `"${quote}" overlaps the words of another note ("${clash.quote}"): give each note its own words`);
      continue;
    }
    notes.push({ quote, ...span, ...(label ? { label } : {}), narration });
  }
  if (notes.length === 0 && passage) report(element.offset, '<annotated> needs at least one <note quote="…">');
  if (notes.length > limits.annotatedNotes) report(element.offset, `<annotated> has more than ${limits.annotatedNotes} notes`);
  return { type: 'annotated', id, title, passage, notes, ...readRef(a.ref, element, report) };
}

/** A one-line body: the claim or the verdict. */
function lineOf(child: Element, report: Report): string {
  if (child.attrs.size > 0) readAttrs(child, spec(child.name), report);
  const text = bodyText(child, report);
  if (!text) report(child.offset, `<${child.name}> needs its text`);
  else if (text.length > limits.questionLength) report(child.offset, `<${child.name}> is longer than ${limits.questionLength} characters`);
  checkMath(text, child.offset, report);
  return text;
}

export function buildArgument(element: Element, ordinal: number, report: Report): ArgumentBlock {
  const { id, title, attrs: a } = blockHead(element, spec('argument'), ordinal, report);
  const children = childElements(element, spec('argument'), report);
  const claims = children.filter((c) => c.name === 'claim');
  const verdicts = children.filter((c) => c.name === 'verdict');
  if (claims.length !== 1) report(claims[1]?.offset ?? element.offset, '<argument> needs exactly one <claim>: the thesis or the decision weighed');
  if (verdicts.length > 1) report(verdicts[1]?.offset ?? element.offset, 'Only one <verdict> per <argument>');
  if (children.at(-1)?.name !== 'verdict' && verdicts.length === 1) report(verdicts[0]?.offset ?? element.offset, 'Put <verdict> last: it weighs every point before it');
  if (claims[0] && children[0] !== claims[0]) report(claims[0].offset, 'Put <claim> first: every point is for or against it');
  const claim = claims[0] ? lineOf(claims[0], report) : '';

  const points: ArgumentPoint[] = [];
  for (const child of children.filter((c) => c.name === 'support' || c.name === 'objection')) {
    const p = readAttrs(child, spec(child.name), report);
    const narration = narrationOf(child, report);
    checkMath(narration, child.offset, report);
    if (p.label === undefined) continue;
    const label = checkText(p.label, 'label', limits.labelLength, child, report);
    const reply = child.name === 'objection' ? optionalText(p.reply, 'reply', limits.replyLength, child, report) : undefined;
    points.push({ side: child.name === 'support' ? 'support' : 'objection', label, narration, ...(reply ? { reply } : {}) });
  }
  if (points.length === 0) report(element.offset, '<argument> needs at least one <support> or <objection>');
  if (points.length > limits.argumentPoints) report(element.offset, `<argument> has more than ${limits.argumentPoints} points`);
  const verdict = verdicts[0] ? lineOf(verdicts[0], report) : undefined;
  return { type: 'argument', id, title, claim, points, ...(verdict ? { verdict } : {}), ...readRef(a.ref, element, report) };
}
