// A lesson is a scene with chapters: the blocks before the first <chapter> are its intro, and each chapter
// holds the blocks up to the next one. Checks (quizzes) are counted per chapter for the progress rail.
import type { Block, ChapterBlock } from '../../../server/src/scene.ts';

/** A block with its position in the scene, which keys it and its slides. */
export interface Placed {
  block: Block;
  index: number;
}

export interface Chapter {
  block: ChapterBlock;
  index: number;
  /** 1-based, in reading order. */
  number: number;
  items: Placed[];
  /** Ids of the quizzes in the chapter. */
  checks: string[];
}

export interface LessonPlan {
  intro: Placed[];
  /** Ids of the quizzes before the first chapter. */
  introChecks: string[];
  chapters: Chapter[];
}

const checksOf = (items: Placed[]): string[] => items.flatMap(({ block }) => (block.type === 'quiz' ? [block.id] : []));

/** The lesson's structure, or undefined for a scene without chapters (it keeps the plain layout). */
export function planLesson(blocks: Block[]): LessonPlan | undefined {
  const intro: Placed[] = [];
  const chapters: Chapter[] = [];
  blocks.forEach((block, index) => {
    if (block.type === 'chapter') {
      chapters.push({ block, index, number: chapters.length + 1, items: [], checks: [] });
      return;
    }
    const current = chapters.at(-1);
    (current ? current.items : intro).push({ block, index });
  });
  if (chapters.length === 0) return undefined;
  for (const chapter of chapters) chapter.checks = checksOf(chapter.items);
  return { intro, introChecks: checksOf(intro), chapters };
}

/** DOM id of a chapter's section, for scrolling and the rail's links. */
export function chapterAnchor(id: string): string {
  return `lesson-${id}`;
}
