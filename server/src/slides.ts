// Presentation warnings. In Present mode a speaker does the explaining: the scene's `#` title is the cover, each
// component is a slide whose `title` is its one sentence, and prose stays on the page. render_scene points at what
// would break that. They are advice, never errors: the scene is saved either way.
import type { Block } from './scene.ts';

/** A slide says one short sentence: its title. */
export const MAX_TITLE_WORDS = 12;
const MAX_WARNINGS = 8;

/** Blocks that frame the components: they are no slide of their own, or no picture. */
const NOT_COMPONENT = new Set<Block['type']>(['markdown', 'theme', 'chapter', 'quiz']);

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** The text of the `#` heading that opens a Markdown block, if it does (as the viewer reads the cover). */
function coverTitle(markdown: string): string | undefined {
  const first = markdown.split(/\r?\n/).find((line) => line.trim() !== '');
  return /^#\s+(.+)$/.exec(first?.trim() ?? '')?.[1]?.trim();
}

interface Section {
  name: string;
  /** The intro of a lesson, which may hold only the cover. */
  intro: boolean;
  blocks: Block[];
}

function sectionsOf(blocks: Block[]): Section[] {
  const chapters = blocks.some((block) => block.type === 'chapter');
  const sections: Section[] = [{ name: chapters ? 'the intro' : 'the scene', intro: chapters, blocks: [] }];
  let number = 0;
  for (const block of blocks) {
    if (block.type === 'theme') continue;
    if (block.type === 'chapter') {
      number++;
      sections.push({ name: `chapter ${number} "${block.title}"`, intro: false, blocks: [] });
      continue;
    }
    sections.at(-1)?.blocks.push(block);
  }
  return sections;
}

/** What render_scene should say about the scene as slides; empty when it presents well. */
export function slideWarnings(blocks: Block[]): string[] {
  const warnings: string[] = [];
  if (!blocks.some((block) => block.type === 'theme')) {
    warnings.push('No <theme>: add `<theme name="…" />` right after the title so every slide gets its drawings.');
  }
  const theme = blocks.find((block) => block.type === 'theme');
  if (theme?.type === 'theme') {
    const named = theme.choices ?? [theme.name];
    if (named.includes('plain')) {
      warnings.push('<theme> names "plain", which draws nothing: name two or three themes that fit the subject instead (nature, space, science, history, health, food, art, society for everyday subjects; data, ml, math, text, web, network, database, security, code, hardware, business for technical ones).');
    } else if (named.length === 1) {
      warnings.push(`<theme> names one theme: name two or three that fit the subject, e.g. \`<theme name="${theme.name} ${theme.name === 'science' ? 'nature' : 'science'}" />\`; the viewer draws one of them at random for each presentation, so no two look alike.`);
    }
  }
  const firstProse = blocks.find((block) => block.type === 'markdown' || block.type === 'chapter');
  if (firstProse?.type !== 'markdown' || coverTitle(firstProse.text) === undefined) {
    warnings.push('No "# " title at the top: Present opens with that title as its cover; start the scene with "# " and the question it answers.');
  }
  for (const section of sectionsOf(blocks)) {
    if (section.intro || section.blocks.some((block) => !NOT_COMPONENT.has(block.type))) continue;
    // A section of checks is a review: its slides are the quizzes themselves.
    if (section.blocks.filter((block) => block.type === 'quiz').length >= 2) continue;
    warnings.push(`${section.name} has no component, so Present shows only its title: give its main idea one (<trace>, <flow>, <compare>, <concept>, a chart…).`);
  }
  for (const block of blocks) {
    if (!('title' in block) || typeof block.title !== 'string' || words(block.title) <= MAX_TITLE_WORDS) continue;
    warnings.push(`The title "${block.title}" has ${words(block.title)} words; it is the slide's one sentence, so keep it to ${MAX_TITLE_WORDS} (say the rest on the page).`);
  }
  if (warnings.length <= MAX_WARNINGS) return warnings;
  return [...warnings.slice(0, MAX_WARNINGS), `…and ${warnings.length - MAX_WARNINGS} more.`];
}
