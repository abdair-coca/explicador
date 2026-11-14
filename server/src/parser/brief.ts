// The pedagogical brief (F23): what the model decides before it designs a scene. Every field is one line the server
// can check; the brief travels outside the blocks, so nothing in it ever reaches the screen.
import { catalog, childElements, limits, readAttrs, type Report, type TagSpec } from './common.ts';
import type { Element } from './reader.ts';
import { briefForms, type Brief, type BriefForm } from './types.ts';

export const briefFields = ['audience', 'question', 'example', 'misconception', 'check', 'terms'] as const;
type BriefField = (typeof briefFields)[number];

/** What each field asks for, quoted when one is missing. */
const hints: Record<BriefField, string> = {
  audience: 'who reads the scene and what they already know',
  question: 'the one question the scene answers',
  example: 'the one concrete example followed from start to finish, with its real data',
  misconception: 'the wrong idea the reader most likely has, which the scene corrects',
  check: 'what the reader predicts or works out at the end to show they understood',
  terms: 'the terms the reader meets, separated by commas',
};

/** A brief to copy, quoted when a scene has none or a field is missing. */
export const briefTemplate = [
  '<brief form="process">',
  '<audience>Who reads it and what they already know</audience>',
  '<question>The one question the scene answers</question>',
  '<example>The one concrete example, with its data: "ana@shop.com" logs in with a wrong password 3 times</example>',
  '<misconception>The wrong idea the reader probably has</misconception>',
  '<check>What the reader predicts at the end, as a quiz</check>',
  '<terms>term one, term two, term three</terms>',
  '</brief>',
].join('\n');

const spec = (name: string): TagSpec => catalog[name] ?? { attrs: {} };

export function buildBrief(element: Element, report: Report): Brief | undefined {
  const a = readAttrs(element, spec('brief'), report);
  let form: BriefForm | undefined;
  if (a.form !== undefined) {
    if ((briefForms as readonly string[]).includes(a.form)) form = a.form as BriefForm;
    else report(element.attrs.get('form')?.offset ?? element.offset, `Unknown form "${a.form}"; use ${briefForms.join(', ')}`);
  }
  if (element.selfClosing) {
    report(element.offset, `<brief> needs its fields:\n${briefTemplate}`);
    return undefined;
  }
  const fields: Partial<Record<BriefField, string>> = {};
  for (const child of childElements(element, spec('brief'), report)) {
    const name = child.name as BriefField;
    if (child.attrs.size > 0) readAttrs(child, spec(name), report);
    if (name in fields) {
      report(child.offset, `Only one <${name}> per <brief>`);
      continue;
    }
    fields[name] = fieldText(child, report);
  }
  const missing = briefFields.filter((name) => fields[name] === undefined);
  for (const name of missing) report(element.offset, `<brief> is missing <${name}>: ${hints[name]}`);

  const example = fields.example;
  if (example && !isConcrete(example)) {
    report(
      element.offset,
      `<example> "${example}" has no concrete data: name the real case with its numbers, a quoted value or a proper name ("Insert 50, 30, 70 and 20 in that order", not "Inserting some values")`,
    );
  }
  const terms = fields.terms === undefined ? [] : readTerms(fields.terms, element, report);
  if (!form || missing.length > 0) return undefined;
  return {
    form,
    audience: fields.audience ?? '',
    question: fields.question ?? '',
    example: fields.example ?? '',
    misconception: fields.misconception ?? '',
    check: fields.check ?? '',
    terms,
  };
}

/** A field's text: one line, not empty, at most 300 characters. */
function fieldText(child: Element, report: Report): string {
  const raw = child.children
    .map((c) => {
      if (c.kind === 'element') report(c.offset, `<${c.name}> is not allowed inside <${child.name}>`);
      return c.kind === 'text' ? c.text : '';
    })
    .join('')
    .trim();
  if (!raw) report(child.offset, `<${child.name}> needs its text: ${hints[child.name as BriefField] ?? ''}`);
  else if (/[\r\n]/.test(raw)) report(child.offset, `<${child.name}> must be one line`);
  else if (raw.length > limits.briefFieldLength) report(child.offset, `<${child.name}> is longer than ${limits.briefFieldLength} characters`);
  return raw.replace(/\s+/g, ' ');
}

function readTerms(text: string, element: Element, report: Report): string[] {
  const terms = text.split(',').map((term) => term.trim()).filter(Boolean);
  if (text && terms.length === 0) report(element.offset, '<terms> needs at least one term');
  if (terms.length > limits.briefTerms) report(element.offset, `<terms> lists ${terms.length} terms; keep the ${limits.briefTerms} the reader must learn`);
  const long = terms.filter((term) => term.length > limits.termLength);
  if (long.length > 0) report(element.offset, `These terms are longer than ${limits.termLength} characters: ${long.join(', ')}`);
  return terms;
}

/** A quoted literal: "…", “…”, «…», ‘…’, `…`, or '…' between spaces (not an apostrophe). */
const QUOTED = /"[^"]+"|“[^”]+”|«[^»]+»|‘[^’]+’|`[^`]+`|(?:^|[\s(])'[^']+'(?=$|[\s.,;:!?)])/u;

/**
 * Whether an example names a real case: a digit, a quoted literal, or a capitalized name after its first word that does
 * not start a sentence ("Ana", "Gutenberg", "TCP"). "Inserting some values" names none.
 */
export function isConcrete(text: string): boolean {
  if (/\d/.test(text) || QUOTED.test(text)) return true;
  const words = text.split(/\s+/).filter(Boolean);
  return words.some((word, i) => i > 0 && !/[.!?:]$/.test(words[i - 1] ?? '') && /^[("“«¿¡]?\p{Lu}\p{L}/u.test(word));
}
