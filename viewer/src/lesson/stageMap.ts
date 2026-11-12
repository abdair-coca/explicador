// The map of a deep dive: the <journey> a chapter belongs to, with the chapter's stage as "you are here". Pure.
import type { Block, ChapterBlock, JourneyStage } from '../../../server/src/scene.ts';

export interface StageMap {
  stages: Pick<JourneyStage, 'id' | 'label' | 'kind'>[];
  /** Index of the chapter's stage. */
  current: number;
}

/** The journey that holds the chapter's stage, or undefined when the chapter names none (or a missing one). */
export function stageMapOf(blocks: readonly Block[], chapter: ChapterBlock): StageMap | undefined {
  if (chapter.stage === undefined) return undefined;
  for (const block of blocks) {
    if (block.type !== 'journey') continue;
    const current = block.stages.findIndex((stage) => stage.id === chapter.stage);
    if (current >= 0) return { stages: block.stages.map(({ id, label, kind }) => ({ id, label, kind })), current };
  }
  return undefined;
}
