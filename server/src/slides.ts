// Presentation warnings: in Present mode every Markdown block is a slide of text alone, so render_scene points at
// the places where prose stands without a picture. They are advice, never errors: the scene is saved either way.
import type { Block } from './scene.ts';

/** More ideas than this in one prose block make a wall of text on its slide. */
export const MAX_PROSE_IDEAS = 3;
const MAX_WARNINGS = 8;

/** Blocks that only frame the pictures: they are no illustration themselves. */
const NOT_VISUAL = new Set<Block['type']>(['markdown', 'theme', 'chapter', 'quiz']);

const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^\s{0,3}#{1,6}\s/;
const ITEM = /^\s{0,3}(?:[-*+]|\d+[.)])\s+/;

/** Paragraphs, list items, callouts, tables, formula blocks and code blocks of a Markdown block; headings do not count. */
export function proseIdeas(markdown: string): number {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  let ideas = 0;
  let inChunk = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const fence = FENCE.exec(line)?.[1] ?? (line.trim() === '$$' ? '$$' : undefined);
    if (fence) {
      ideas++;
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith(fence)) i++;
      inChunk = false;
      continue;
    }
    if (line.trim() === '') {
      inChunk = false;
      continue;
    }
    if (HEADING.test(line)) {
      inChunk = false;
      continue;
    }
    if (ITEM.test(line) || !inChunk) ideas++;
    inChunk = true;
  }
  return ideas;
}

/** The first words of a prose block, to name it in a warning. */
function excerpt(markdown: string): string {
  const line = markdown
    .split(/\r?\n/)
    .map((text) => text.trim())
    .find((text) => text !== '' && !HEADING.test(text) && text !== '$$');
  const words = (line ?? '').replace(/^(?:>\s*(?:\[![A-Z]+\]\s*)?|[-*+]\s+|\d+[.)]\s+|\|)/, '').replace(/[*_`]/g, '');
  return words.length > 48 ? `${words.slice(0, 45).trimEnd()}…` : words;
}

interface Section {
  name: string;
  blocks: Block[];
}

function sectionsOf(blocks: Block[]): Section[] {
  const chapters = blocks.some((block) => block.type === 'chapter');
  const sections: Section[] = [{ name: chapters ? 'the intro' : 'the scene', blocks: [] }];
  let number = 0;
  for (const block of blocks) {
    if (block.type === 'theme') continue;
    if (block.type === 'chapter') {
      number++;
      sections.push({ name: `chapter ${number} "${block.title}"`, blocks: [] });
      continue;
    }
    sections.at(-1)?.blocks.push(block);
  }
  return sections;
}

/** What render_scene should say about the scene as slides; empty when every stretch of prose has a picture. */
export function slideWarnings(blocks: Block[]): string[] {
  const warnings: string[] = [];
  if (!blocks.some((block) => block.type === 'theme')) {
    warnings.push('No <theme>: add `<theme name="…" />` right after the title so every slide gets its drawings.');
  }
  for (const section of sectionsOf(blocks)) {
    const isVisual = section.blocks.map((block) => !NOT_VISUAL.has(block.type));
    const prose = section.blocks.filter((block) => block.type === 'markdown' && proseIdeas(block.text) > 0);
    if (prose.length > 0 && !isVisual.includes(true)) {
      // A section of checks is a review: its slides are the quizzes themselves.
      if (section.blocks.filter((block) => block.type === 'quiz').length >= 2) continue;
      warnings.push(`${section.name} has text but no picture: give its main idea a visual (<concept>, <compare>, <flow>, a chart…).`);
      continue;
    }
    section.blocks.forEach((block, i) => {
      if (block.type !== 'markdown') return;
      const ideas = proseIdeas(block.text);
      if (ideas === 0) return;
      const where = `${section.name}, "${excerpt(block.text)}"`;
      if (ideas > MAX_PROSE_IDEAS) {
        warnings.push(`${where}: ${ideas} paragraphs, items or callouts on one text slide; keep at most ${MAX_PROSE_IDEAS} and move the rest into a visual.`);
      } else if (!isVisual[i - 1] && !isVisual[i + 1]) {
        warnings.push(`${where}: text with no picture before or after it; put it right before the visual it introduces.`);
      }
    });
  }
  if (warnings.length <= MAX_WARNINGS) return warnings;
  return [...warnings.slice(0, MAX_WARNINGS), `…and ${warnings.length - MAX_WARNINGS} more.`];
}
