// The skill's rules that the server can check, so they hold whichever model writes the scene (F21). Like the slide
// warnings they never block a render: the scene is saved, render_scene lists each failure with how to fix it, and the
// skill asks the agent to fix every one and render again until none is left.
import { readFileSync, statSync } from 'node:fs';
import { isNotebookPath } from './files.ts';
import { resolveInside } from './project.ts';
import { boxesWithoutRange } from './ranges.ts';
import type { ArcPart, Block, ChapterBlock, Scene } from './scene.ts';
import { slideWarnings } from './slides.ts';

/** A subtitle is read while its part plays: about 20 words, never more than this. */
export const MAX_SUBTITLE_WORDS = 25;
/** Boxes on one level of an <arch> (the top, or the inside of a group) that still read at a glance. */
export const MAX_BOXES = 12;
/** Steps of one <flow> that still read as one story. */
export const MAX_STEPS = 12;
/** Flashcards that make the last chapter of a lesson its review. */
export const MIN_REVIEW_CARDS = 3;
/** Items named in one warning before the rest are counted. */
const LISTED = 6;
/** Referred files larger than this are not searched for numbers. */
const SOURCE_BYTES = 8 * 1024 * 1024;

/** Every warning for a scene: its brief, whole-file refs, the slide warnings and the rules below. */
export function sceneWarnings(root: string, scene: Scene, refs: readonly string[]): string[] {
  const { blocks } = scene;
  const unfocused = boxesWithoutRange(root, blocks);
  return [
    ...briefWarnings(scene),
    ...arcWarnings(scene),
    ...termWarnings(scene),
    ...acronymWarnings(scene),
    ...titleWarnings(blocks),
    ...(unfocused.length > 0
      ? [`These boxes point at a whole file, so the code window cannot focus their code: ${listed(unfocused)}. Give each a line range (path:start-end; for a notebook, cell numbers).`]
      : []),
    ...slideWarnings(blocks),
    ...numberWarnings(root, blocks, refs),
    ...boxWarnings(blocks),
    ...subtitleWarnings(blocks),
    ...sectionWarnings(blocks),
    ...lessonWarnings(blocks),
    ...quizWarnings(blocks),
    ...codeWarnings(blocks),
    ...exampleWarnings(blocks),
  ];
}

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;
const listed = (items: string[]): string =>
  items.length <= LISTED ? items.join(', ') : `${items.slice(0, LISTED).join(', ')}, … (${items.length} in all)`;
/** Letters and digits only, lowercase and without accents: "Login form" and "login-form" read the same. */
const plain = (text: string): string => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** How a warning names a block: its tag and its title. */
function named(block: Block): string {
  if (block.type === 'markdown') return 'the prose';
  if (block.type === 'concept') return `<concept> "${block.term}"`;
  if (block.type === 'quiz') return `<quiz> "${block.question}"`;
  return 'title' in block && block.title ? `<${block.type}> "${block.title}"` : `<${block.type}>`;
}

// The brief ----------------------------------------------------------------------------------------------------------

/** Words that frame a misconception instead of stating it ("Believing that…", "Creer que…"); never key words. */
const FRAMING = new Set(
  (
    'that this these those with from have there their they them then than what when where which while will would could should about into only also just more most ' +
    'some such very been being does doing believing believe believes thinking think thinks assuming assume assumes idea people ' +
    'creer cree creen creyendo pensar piensa piensan pensando suponer supone suponen como cuando donde para pero porque sobre entre este esta esto estos estas ' +
    'todo toda todos todas solo tiene tienen puede pueden cada otro otra mismo misma algo nada mucho idea gente ' +
    'pour avec dans sont croire penser isso esse essa achar'
  ).split(' '),
);
/** The first letters that decide whether two words are the same word ("balanced" and "balance"). */
const STEM = 5;

/** The words of a text that carry its meaning: 4 letters or more, framing words left out, cut to their stem. */
export function keyWords(text: string): string[] {
  const words = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return [...new Set(words.filter((word) => word.length >= 4 && !FRAMING.has(word)).map((word) => word.slice(0, STEM)))];
}

/** Keys whose values are not text a reader sees as prose: ids, refs, kinds, code and the arc itself. */
const UNSHOWN = new Set(['ref', 'id', 'type', 'kind', 'arc', 'code', 'op', 'role', 'theme', 'stage', 'group', 'parent', 'node', 'from', 'to', 'cluster']);

/** Every text a block shows or narrates, in one string: titles, labels, narration, options, whys, notes. */
function blockText(block: Block): string {
  const parts: string[] = [];
  const walk = (value: unknown, key: string): void => {
    if (UNSHOWN.has(key)) return;
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value)) value.forEach((item) => walk(item, ''));
    else if (value && typeof value === 'object') for (const [name, item] of Object.entries(value)) walk(item, name);
  };
  walk(block, '');
  return parts.join(' ');
}

/**
 * Whether at least half of the misconception's key words appear in one component, check or concept. Words it shares with
 * the brief's question name the topic, which every block names, so they do not count.
 */
export function takesUp(misconception: string, blocks: readonly Block[], question = ''): boolean {
  const topic = keyWords(question);
  const wanted = keyWords(misconception).filter((word) => !topic.includes(word));
  if (wanted.length === 0) return true;
  const needed = Math.ceil(wanted.length / 2);
  return blocks.some((block) => {
    if (block.type === 'markdown' || block.type === 'theme' || block.type === 'chapter') return false;
    const present = keyWords(blockText(block));
    const found = wanted.filter((word) => present.some((other) => other.startsWith(word) || word.startsWith(other)));
    return found.length >= needed;
  });
}

/** The brief is the plan of the scene: its misconception is corrected on screen and its check is asked as a quiz. */
export function briefWarnings(scene: Scene): string[] {
  const { brief, blocks } = scene;
  if (!brief) {
    return [
      'No <brief>: this scene was made before every scene opened with one. Rebuild it under the same topic: first a <brief form="…"> right after the # title ' +
        '(audience, question, example, misconception, check, terms; presenting.md, step 1), then every slide designed from it.',
    ];
  }
  const warnings: string[] = [];
  if (!takesUp(brief.misconception, blocks, brief.question)) {
    warnings.push(
      `No component takes up the misconception of the brief ("${brief.misconception}"): correct it where the reader would make it, ` +
        'with its own words, in a <quiz> option and its why, a <compare>, a <concept> or the narration of the step that disproves it.',
    );
  }
  if (!blocks.some((block) => block.type === 'quiz' && block.options.length > 0)) {
    warnings.push(
      `No <quiz> with options: the reader never predicts the check of the brief ("${brief.check}"). ` +
        'Ask it as a <quiz> near the end, with plausible wrong options and a why for each.',
    );
  }
  return warnings;
}

// The arc ------------------------------------------------------------------------------------------------------------

/** Whether a block is a slide of its own: everything but prose, the theme and chapter cards. */
const isComponent = (block: Block): boolean => block.type !== 'markdown' && block.type !== 'theme' && block.type !== 'chapter';

/** A component's part of the arc: the one it declares, or its tag's default (a concept is an idea, a quiz a check or, as a flashcard, a recap). */
export function arcOf(block: Block): ArcPart | undefined {
  if ('arc' in block && block.arc) return block.arc;
  if (block.type === 'concept') return 'idea';
  if (block.type === 'quiz') return block.options.length > 0 ? 'check' : 'recap';
  return undefined;
}

/** The concrete data of the brief's example: its numbers, its quoted values and its names. */
export function exampleData(example: string): string[] {
  const data = new Set<string>(example.match(/\d+(?:[.,]\d+)?/g) ?? []);
  for (const match of example.matchAll(/"([^"]+)"|“([^”]+)”|«([^»]+)»|‘([^’]+)’|`([^`]+)`/g)) {
    const quoted = match.slice(1).find(Boolean);
    if (quoted) data.add(quoted);
  }
  const words = example.split(/\s+/).filter(Boolean);
  words.forEach((word, i) => {
    if (i > 0 && !/[.!?:]$/.test(words[i - 1] ?? '') && /^[("“«¿¡]?\p{Lu}\p{L}/u.test(word)) data.add(word.replace(/^[("“«¿¡]+|[^\p{L}\p{N}]+$/gu, ''));
  });
  return [...data].filter((item) => plain(item));
}

/**
 * The order the principles ask for (F24): every component says what it does for the brief's question, the concrete
 * example comes before the idea and the answer, the misconception and the answer each get a slide, and the scene ends
 * on a check or a recap.
 */
export function arcWarnings(scene: Scene): string[] {
  const { brief } = scene;
  const components = scene.blocks.filter(isComponent);
  if (!brief || components.length === 0) return [];
  const arcs = components.map(arcOf);
  const at = (part: ArcPart): number => arcs.indexOf(part);
  const warnings: string[] = [];
  const undeclared = components.filter((_, i) => arcs[i] === undefined).map(named);
  if (undeclared.length > 0) {
    warnings.push(
      `These components declare no part of the arc: ${listed(undeclared)}. Give each arc="…": question, example, idea, contrast, apply, answer, check or recap, ` +
        'what it does for the brief\'s question (presenting.md, "The arc").',
    );
  }
  const example = at('example');
  if (example < 0) {
    warnings.push(`No arc="example": no slide shows the brief's example ("${brief.example}"). Show the concrete case, with its real data, before any rule or result.`);
  } else {
    for (const part of ['idea', 'answer'] as const) {
      const early = arcs.findIndex((arc, i) => arc === part && i < example);
      const block = components[early];
      if (block) {
        warnings.push(
          `${named(block)} (arc="${part}") comes before the first example, ${named(components[example] ?? block)}: concrete first. ` +
            `Show the example, then the ${part === 'idea' ? 'rule or term it motivates' : 'answer it leads to'}.`,
        );
      }
    }
    const data = exampleData(brief.example);
    const shown = components.some((block, i) => arcs[i] === 'example' && data.some((item) => plain(blockText(block)).includes(plain(item))));
    if (data.length > 0 && !shown) {
      warnings.push(`No slide with arc="example" shows the brief's example ("${brief.example}"): put its real data (${listed(data)}) on the slide that introduces it.`);
    }
  }
  if (at('contrast') < 0) {
    warnings.push(
      `No arc="contrast": no slide sets the misconception ("${brief.misconception}") against what really happens. ` +
        'Give that slide arc="contrast": a <compare> of the belief and the fact, or the step, quiz or concept that disproves it.',
    );
  }
  if (at('answer') < 0) {
    warnings.push(`No arc="answer": no slide answers the brief's question ("${brief.question}"). Give the slide whose title states the answer arc="answer", after the example.`);
  }
  const last = components.at(-1);
  if (last && arcs.at(-1) !== 'check' && arcs.at(-1) !== 'recap') {
    warnings.push(`The scene ends on ${named(last)}, which is no check or recap: end with the <quiz> that asks the brief's check ("${brief.check}"), or a review.`);
  }
  return warnings;
}

// Terms and acronyms ---------------------------------------------------------------------------------------------------

/** Lowercase words without accents, separated by single spaces: "TF-IDF" reads "tf idf". */
const spaced = (text: string): string =>
  ` ${text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

/** Whether a text uses a term, as a whole word or words, also in the plural ("salt" in "salts"). */
export function uses(text: string, term: string): boolean {
  const wanted = spaced(term).trim();
  if (!wanted) return false;
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(` ${escaped}(s|es)? `).test(spaced(text));
}

/**
 * Every term of the brief has a <concept> card, and no component shows it before that card. A chapter card announces
 * its section's topic, so it may name the term its first component defines.
 */
export function termWarnings(scene: Scene): string[] {
  const { brief, blocks } = scene;
  if (!brief) return [];
  const shown = blocks.filter(isComponent);
  const undefinedTerms: string[] = [];
  const early: string[] = [];
  for (const term of brief.terms) {
    const card = shown.findIndex((block) => block.type === 'concept' && (uses(block.term, term) || uses(term, block.term)));
    if (card < 0) {
      undefinedTerms.push(`"${term}"`);
      continue;
    }
    const first = shown.findIndex((block) => uses(blockText(block), term));
    const block = shown[first];
    if (block && first < card) early.push(`"${term}" (in ${named(block)})`);
  }
  const warnings: string[] = [];
  if (undefinedTerms.length > 0) {
    warnings.push(
      `These terms of the brief have no <concept> card: ${listed(undefinedTerms)}. Define each the first time it appears (<concept term="…"> with <define>, an <analogy> and an <example>), ` +
        'or take it out of <terms> if the reader never meets it.',
    );
  }
  if (early.length > 0) warnings.push(`These terms appear before their <concept> card: ${listed(early)}. Move the card before the first slide that uses the term, or say it in plain words there.`);
  return warnings;
}

/**
 * Two to six capital letters, two of them joined by a hyphen at most ("TF-IDF"); not a code such as "BOOK-1843", and
 * not a roman numeral, which is a date.
 */
const ACRONYM = /(?<![\p{L}\p{N}-])\p{Lu}{2,6}(?:-\p{Lu}{2,6})?(?![\p{L}\p{N}]|-[\p{L}\p{N}])/gu;

/** A well-formed roman numeral ("XV", "XIX"); "LCI" is not one. */
const ROMAN = /^M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/;

/**
 * Acronyms a component shows before the scene spells them out, before a concept names them, and that the audience does
 * not know. The prose counts as spelling out, in its place: the page reads in order.
 */
export function acronymWarnings(scene: Scene): string[] {
  const { brief, blocks } = scene;
  const knownToReader = [brief?.audience ?? '', ...(brief?.terms ?? [])].join('\n');
  let before = '';
  const spelled = (acronym: string, text: string): boolean =>
    // Markdown emphasis may wrap either side: "**TF-IDF** (term frequency…)". An acronym holds only letters and "-".
    new RegExp(`(?<![\\p{L}])${acronym}[*_]*\\s*\\(\\s*[*_]*\\p{L}|\\(\\s*[*_]*${acronym}[*_]*\\s*\\)`, 'u').test(text);
  const defined = new Set<string>();
  const unknown = new Map<string, string>();
  for (const block of blocks) {
    const text = block.type === 'markdown' ? block.text : blockText(block);
    before += `\n${text}`;
    if (block.type === 'concept') for (const match of block.term.matchAll(ACRONYM)) defined.add(match[0]);
    if (!isComponent(block) && block.type !== 'chapter') continue;
    for (const match of text.matchAll(ACRONYM)) {
      const acronym = match[0];
      if (ROMAN.test(acronym) || unknown.has(acronym) || defined.has(acronym)) continue;
      if (spelled(acronym, before) || uses(knownToReader, acronym)) defined.add(acronym);
      else unknown.set(acronym, named(block));
    }
  }
  if (unknown.size === 0) return [];
  const found = [...unknown].map(([acronym, where]) => `${acronym} (in ${where})`);
  return [
    `These acronyms appear before anything spells them out: ${listed(found)}. Write the words the first time, with the acronym after them in parentheses, give it a <concept> before, ` +
      'or, if the reader already knows it, say so in the brief\'s <audience>.',
  ];
}

/** A component's title is the slide's claim or question: one or two words are a label ("Weights", "Overview"). */
export function titleWarnings(blocks: Block[]): string[] {
  const labels = blocks.filter((block) => isComponent(block) && 'title' in block && block.title && words(block.title) <= 2).map(named);
  if (labels.length === 0) return [];
  return [`These titles are labels, not the slide's point: ${listed(labels)}. Write each as the claim the slide shows, in 4 to 12 words ("Only *bad* pulls towards negative", not "Weights").`];
}

// Numbers ------------------------------------------------------------------------------------------------------------

/**
 * In a scene over a notebook every number on screen comes from what the notebook printed (SKILL.md, "Numbers only from
 * the notebook"). A number counts as printed when an output, a cell or another referred file holds it, as written or
 * rounded to the decimals shown; a percentage may be a printed fraction.
 */
export function numberWarnings(root: string, blocks: Block[], refs: readonly string[]): string[] {
  const notebooks = [...new Set(refs.filter(isNotebookPath))];
  if (notebooks.length === 0) return [];
  const printed = printedNumbers(root, refs);
  const warnings: string[] = [];
  for (const block of blocks) {
    const missing = [...new Set(dataOf(block).flatMap(tokens).filter((token) => !isPrinted(printed, token)).map((token) => token.text))];
    if (missing.length === 0) continue;
    warnings.push(
      `${named(block)} shows ${listed(missing)}, which no output or cell of ${notebooks.join(', ')} prints: ` +
        'copy each number from an output (read_notebook with cells), or leave it out and say which cell would print it.',
    );
  }
  return warnings;
}

/** The values a block shows as data, as the scene wrote them. Labels, titles and prose are not data. */
function dataOf(block: Block): string[] {
  switch (block.type) {
    case 'stats':
      return block.stats.map((stat) => stat.value);
    case 'journey':
      return block.stages.map((stage) => stage.value ?? '');
    case 'chart':
    case 'matrix':
      return block.rows.flatMap((row) => row.values);
    case 'calc':
      return [...block.parts.map((part) => part.value), block.total ?? ''];
    case 'threshold':
      return block.points.map((point) => point.score);
    case 'trace':
      return block.values.flatMap((value) =>
        value.kind === 'number' ? [value.text] : value.kind === 'list' || value.kind === undefined ? [] : (value.items ?? []).map((item) => item.value ?? ''),
      );
    case 'plot':
      return [
        ...block.marks.map((mark) => mark.x),
        ...block.curves.flatMap((curve) => [...(curve.points ?? []).flat().map(String), ...Object.values(curve.params ?? {}).map(String)]),
      ];
    case 'scatter':
      return [
        ...block.dots.flatMap((dot) => [dot.x, dot.y]),
        ...[block.boundary?.slope, block.boundary?.intercept].filter((n) => n !== undefined).map(String),
        ...(block.boundary?.points ?? []).flat().map(String),
      ];
    case 'space':
      return [
        ...block.items.flatMap((item) => [item.x, item.y, item.score ?? '']),
        ...block.clusters.flatMap((cluster) => [cluster.x, cluster.y]),
        ...(block.query ? [block.query.x, block.query.y] : []),
      ];
    case 'cosine':
      return [...block.dims.flatMap((dim) => [dim.a, dim.b]), block.score ?? ''];
    case 'compare':
      return block.rows.flatMap((row) => [row.a, row.b]);
    case 'derive':
      // Formulas hold constants (the 1 of 1 + e^{-z}); only decimals are numbers taken from the notebook.
      return block.lines.flatMap((line) => line.tex.match(/\d+\.\d+/g) ?? []);
    default:
      return [];
  }
}

interface NumberToken {
  /** As the scene wrote it. */
  text: string;
  value: number;
  /** Half a unit of the last decimal written: a printed number within it rounds to this one. */
  tolerance: number;
  percent: boolean;
}

const SCENE_NUMBER = /[-+−]?\d{1,3}(?:[   ]\d{3})+(?:\.\d+)?|[-+−]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?/g;

/** The numbers in a value: "18 × 70" holds two, "49 582" one, "84.6 %" a percentage. */
export function tokens(text: string): NumberToken[] {
  const found: NumberToken[] = [];
  for (const match of text.matchAll(SCENE_NUMBER)) {
    const raw = match[0];
    let digits = raw.replace(/^[-+−]/, '').replace(/[   ]/g, '');
    // "49,582" groups thousands; "0,833" is a decimal comma.
    digits = /^[1-9]\d{0,2},\d{3}$/.test(digits) ? digits.replace(',', '') : digits.replace(',', '.');
    const [mantissa = '', exponent] = digits.toLowerCase().split('e');
    const decimals = mantissa.split('.')[1]?.length ?? 0;
    const value = Number(digits);
    if (!Number.isFinite(value)) continue;
    const scale = 10 ** Number(exponent ?? 0);
    const after = text.slice((match.index ?? 0) + raw.length);
    found.push({ text: raw.trim(), value: Math.abs(value), tolerance: 0.5 * 10 ** -decimals * scale + 1e-9, percent: /^\s*%/.test(after) });
  }
  return found;
}

/** Whether some printed number rounds to the token (signs aside: printing often adds or drops them). */
function isPrinted(printed: number[], token: NumberToken): boolean {
  const near = (value: number, tolerance: number): boolean => {
    let low = 0;
    let high = printed.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if ((printed[mid] ?? 0) < value - tolerance) low = mid + 1;
      else high = mid;
    }
    return low < printed.length && (printed[low] ?? Infinity) <= value + tolerance;
  };
  return near(token.value, token.tolerance) || (token.percent && near(token.value / 100, token.tolerance / 100));
}

/** Every number the referred files print or hold, as sorted absolute values. */
function printedNumbers(root: string, refs: readonly string[]): number[] {
  const values = new Set<number>();
  for (const ref of new Set(refs)) {
    const full = resolveInside(root, ref);
    if (full === undefined) continue;
    let text: string;
    try {
      if (statSync(full).size > SOURCE_BYTES) continue;
      const bytes = readFileSync(full);
      if (bytes.subarray(0, 8000).includes(0)) continue;
      text = isNotebookPath(ref) ? notebookText(bytes.toString('utf8')) : bytes.toString('utf8');
    } catch {
      continue;
    }
    for (const match of text.matchAll(/\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g)) values.add(Number(match[0]));
    // Thousands written with commas ("49,582") also count as one number.
    for (const match of text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g)) values.add(Number(match[0].replace(/,/g, '')));
  }
  return [...values].filter(Number.isFinite).sort((a, b) => a - b);
}

/** The text of a notebook's cells and outputs, whole: what it printed, not the viewer's clipped copy. */
function notebookText(raw: string): string {
  const join = (value: unknown): string => (Array.isArray(value) ? value.join('') : typeof value === 'string' ? value : '');
  try {
    const json = JSON.parse(raw) as { cells?: { source?: unknown; outputs?: { text?: unknown; data?: Record<string, unknown>; evalue?: unknown }[] }[] };
    return (json.cells ?? [])
      .flatMap((cell) => [
        join(cell.source),
        ...(cell.outputs ?? []).flatMap((output) => [
          join(output.text),
          join(output.data?.['text/plain']),
          join(output.data?.['text/html']).replace(/<[^>]*>/g, ' '),
          join(output.evalue),
        ]),
      ])
      .join('\n');
  } catch {
    return raw;
  }
}

// Boxes --------------------------------------------------------------------------------------------------------------

/** Every box says what it does in its `desc`; levels and flows stay small enough to read. */
export function boxWarnings(blocks: Block[]): string[] {
  const missing = new Set<string>();
  const repeated = new Set<string>();
  const crowded: string[] = [];
  const long: string[] = [];
  for (const block of blocks) {
    const boxes =
      block.type === 'arch' ? [...block.groups, ...block.nodes]
      : block.type === 'flow' ? block.nodes
      : block.type === 'data' ? block.entities
      : block.type === 'state' ? block.states
      : [];
    for (const box of boxes) {
      if (!box.desc) missing.add(`"${box.label}"`);
      else if (plain(box.desc) === plain(box.label)) repeated.add(`"${box.label}"`);
    }
    if (block.type === 'arch') {
      // A level is what one zoom shows: the top of the diagram, or the inside of one group.
      const levels = new Map<string, number>();
      for (const node of block.nodes) levels.set(node.group ?? '', (levels.get(node.group ?? '') ?? 0) + 1);
      for (const group of block.groups) levels.set(group.parent ?? '', (levels.get(group.parent ?? '') ?? 0) + 1);
      for (const [level, count] of levels) {
        if (count <= MAX_BOXES) continue;
        const inside = block.groups.find((group) => group.id === level);
        crowded.push(`${named(block)} shows ${count} boxes ${inside ? `inside the group "${inside.label}"` : 'at its top level'}`);
      }
    }
    if (block.type === 'flow' && block.steps.length > MAX_STEPS) long.push(`${named(block)} has ${block.steps.length} steps`);
  }
  const warnings: string[] = [];
  if (missing.size > 0) {
    warnings.push(
      `These boxes have no desc, the line inside the box that says what the part does: ${listed([...missing])}. ` +
        'Give each one (at most 80 characters, starting with a verb or naming the responsibility: "Checks the password").',
    );
  }
  if (repeated.size > 0) warnings.push(`The desc of ${listed([...repeated])} repeats the label: say what the part does instead ("Checks the password", "Ranks the 15 candidates").`);
  if (crowded.length > 0) warnings.push(`${crowded.join('; ')}: put related boxes in a <group> so each level shows 4–10 (the reader zooms into a group).`);
  if (long.length > 0) warnings.push(`${long.join('; ')}: keep 4–10 steps per <flow>; split the story into two flows, or merge steps that say the same.`);
  return warnings;
}

// Subtitles ----------------------------------------------------------------------------------------------------------

/** Present shows the narration of the part on screen as a subtitle: it must be read while the part plays. */
export function subtitleWarnings(blocks: Block[]): string[] {
  const long: string[] = [];
  const check = (where: string, text: string | undefined): void => {
    if (text && words(text) > MAX_SUBTITLE_WORDS) long.push(`${where} (${words(text)} words)`);
  };
  for (const block of blocks) {
    const at = named(block);
    if (block.type === 'flow') block.steps.forEach((step, i) => check(`${at} step ${i + 1}`, step.narration));
    else if (block.type === 'state') block.walk.forEach((step, i) => check(`${at} walk step ${i + 1}`, step.narration));
    else if (block.type === 'journey') block.stages.forEach((stage) => check(`${at} stage "${stage.label}"`, stage.narration));
    else if (block.type === 'timeline') block.events.forEach((event) => check(`${at} event "${event.label}"`, event.narration));
    else if (block.type === 'structure') block.changes.forEach((change) => check(`${at} change "${change.label}"`, change.narration));
    else if (block.type === 'plot') block.marks.forEach((mark) => check(`${at} mark "${mark.label}"`, mark.narration));
    else if (block.type === 'matrix') block.focuses.forEach((focus, i) => check(`${at} highlight ${i + 1}`, focus.narration));
    else if (block.type === 'trace') block.values.forEach((value) => check(`${at} value "${value.label}"`, value.note));
    else if (block.type === 'derive') block.lines.forEach((line, i) => check(`${at} line ${i + 1}`, line.note));
    else if (block.type === 'calc') block.parts.forEach((part) => check(`${at} part "${part.label}"`, part.note));
    else if (block.type === 'space') {
      block.items.forEach((item) => check(`${at} item "${item.label}"`, item.narration));
      block.clusters.forEach((cluster) => check(`${at} cluster "${cluster.label}"`, cluster.narration));
      check(`${at} query`, block.query?.narration);
    }
  }
  if (long.length === 0) return [];
  return [
    `These subtitles have more than ${MAX_SUBTITLE_WORDS} words, too many to read while their part plays: ${listed(long)}. ` +
      'Keep each to one sentence of about 20 words; the rest goes in the prose on the page.',
  ];
}

// Sections -----------------------------------------------------------------------------------------------------------

/** Headings that split a scene into sections before they are chapters. */
export const MAX_SECTION_HEADINGS = 2;

/** A scene in sections is a lesson or a deep dive: its sections are <chapter>s, which get the rail, the cards and the map. */
export function sectionWarnings(blocks: Block[]): string[] {
  if (blocks.some((block) => block.type === 'chapter')) return [];
  const headings = blocks.flatMap((block) => (block.type === 'markdown' ? block.text.split(/\r?\n/).filter((line) => /^##\s+\S/.test(line.trim())) : []));
  if (headings.length <= MAX_SECTION_HEADINGS) return [];
  return [
    `This scene is split into ${headings.length} sections with "##" headings: make each one a <chapter title goal stage?> instead ` +
      '(a lesson or a deep dive: a <journey> map in the intro, then one chapter per stop with its component and a <quiz>, and a review at the end).',
  ];
}

// Lessons ------------------------------------------------------------------------------------------------------------

/** A lesson (a scene with chapters) has goals, a check per chapter, a final review, one example traced and its concepts. */
export function lessonWarnings(blocks: Block[]): string[] {
  const chapters: { chapter: ChapterBlock; blocks: Block[] }[] = [];
  for (const block of blocks) {
    if (block.type === 'chapter') chapters.push({ chapter: block, blocks: [] });
    else chapters.at(-1)?.blocks.push(block);
  }
  const last = chapters.at(-1);
  if (!last) return [];
  const cards = (section: { blocks: Block[] }): number => section.blocks.filter((block) => block.type === 'quiz' && block.answer !== undefined).length;
  const review = cards(last) >= MIN_REVIEW_CARDS ? last : undefined;
  const title = (section: { chapter: ChapterBlock }): string => `"${section.chapter.title}"`;
  const warnings: string[] = [];
  const intro = blocks.slice(0, blocks.findIndex((block) => block.type === 'chapter'));
  if (!intro.some((block) => block.type === 'journey')) {
    warnings.push('No map: put a <journey> in the intro, before the first chapter, with one <stage> per step of the process (its real size as value), and give each chapter that explains a step its stage="…".');
  }
  const noGoal = chapters.filter((section) => !section.chapter.goal).map(title);
  if (noGoal.length > 0) warnings.push(`Chapters without a goal: ${listed(noGoal)}. Give each one: what the reader can do by its end ("Read a confusion matrix").`);
  const unchecked = chapters.filter((section) => section !== review && !section.blocks.some((block) => block.type === 'quiz')).map(title);
  if (unchecked.length > 0) warnings.push(`Chapters without a check: ${listed(unchecked)}. Give each a <quiz> on its main idea, with plausible wrong options and a why that teaches.`);
  if (!review) {
    warnings.push(
      `No final review: end the lesson with a chapter "Review" of 5–8 flashcards (<quiz question="…"><answer>…</answer></quiz>), the questions a reviewer would ask, answered with the real numbers.`,
    );
  }
  if (!blocks.some((block) => block.type === 'trace')) {
    warnings.push('No <trace>: follow one real example through the process (its raw form, then each step, changing kind), so the lesson has a thread.');
  }
  if (!blocks.some((block) => block.type === 'concept')) {
    warnings.push('No <concept>: introduce each new term the lesson needs with a card (<define>, <analogy>, a <formula> when the code uses one, an <example>).');
  }
  return warnings;
}

// Quizzes ------------------------------------------------------------------------------------------------------------

const VERDICT = /^[¡¿"'«]?\s*(right|wrong|correct|incorrect|true|false|yes|no|exactly|nope|correcto|correcta|incorrecto|incorrecta|cierto|falso|verdadero|exacto|bien|mal|sí|si|certo|errado|vrai|faux|richtig|falsch)\s*[,.:;!—–]/i;

/** A why teaches; the viewer already says whether the option was right. */
export function quizWarnings(blocks: Block[]): string[] {
  const opened = blocks.flatMap((block) => (block.type === 'quiz' ? block.options.filter((option) => option.why && VERDICT.test(option.why)).map(() => named(block)) : []));
  if (opened.length === 0) return [];
  return [`Some whys open with a verdict (${listed([...new Set(opened)])}): the viewer already says right or wrong, so start with the reason itself.`];
}

// Key code -----------------------------------------------------------------------------------------------------------

/** A diagram of code shows the key lines of the boxes a reader opens. */
export function codeWarnings(blocks: Block[]): string[] {
  const diagrams = blocks.filter((block) => block.type === 'arch' || block.type === 'flow' || block.type === 'data' || block.type === 'state');
  if (diagrams.length === 0 || blocks.some((block) => 'codes' in block && (block.codes?.length ?? 0) > 0)) return [];
  return [
    'No <code>: give the 1–4 boxes a reader will open their key lines, <code node="id" ref="path:start-end">why these lines matter</code> inside their block; the detail panel shows them, copied from the file.',
  ];
}

// One example --------------------------------------------------------------------------------------------------------

/** A flow is a process something goes through: one real input follows it as a <trace> (presenting.md, step 5). */
export function exampleWarnings(blocks: Block[]): string[] {
  if (!blocks.some((block) => block.type === 'flow') || blocks.some((block) => block.type === 'trace')) return [];
  return [
    'No <trace>: follow one real input through the flow (what the user types, a request, a row), changing form at each step: ' +
      '<trace title="…"><value label="What goes in">the real input</value><value kind="table" label="…" code="the call" note="one sentence">name=value|…</value>…</trace>, every value from the code or its data.',
  ];
}
