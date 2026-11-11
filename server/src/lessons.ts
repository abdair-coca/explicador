// Notebook scenes cached before lessons existed (boxes and flows over cells) are rebuilt as lessons: show_scene says
// so, since the skill alone cannot tell an old cached scene from a new one without reading it.
import type { Block } from './parser/types.ts';
import { isNotebookPath } from './files.ts';

export const lessonHint =
  'This scene explains a notebook without <chapter>s: it predates lessons. Rebuild it as a lesson under the same topic ' +
  '(the skill\'s "Lessons": read_notebook, one <chapter> per section, the real data in <stats>, <journey>, <trace>, <chart> and <matrix>, checks and a final review), ' +
  'then call render_scene. Only answer from it as it is if the user asked a quick question.';

/** True for a scene that points at a notebook and has no chapters. */
export function needsLesson(blocks: readonly Block[], files: readonly string[]): boolean {
  return files.some(isNotebookPath) && !blocks.some((block) => block.type === 'chapter');
}
