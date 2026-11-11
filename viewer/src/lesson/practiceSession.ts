// Practice order and score: the checks the reader missed come first, then the ones never answered, then the rest,
// each group in lesson order. A check counts as right when the first answer in the session was right.
import type { CheckState, Progress } from './progress.ts';

function rank(state: CheckState | undefined): number {
  if (state === 'tried' || state === 'review') return 0;
  if (state === undefined) return 1;
  return 2;
}

export function practiceOrder(ids: readonly string[], progress: Progress): string[] {
  return ids
    .map((id, index) => ({ id, index, rank: rank(progress.checks[id]) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.id);
}

/** The first answer given to each check in a session. */
export type FirstAnswers = Record<string, CheckState>;

export function firstAnswer(answers: FirstAnswers, id: string, state: CheckState): FirstAnswers {
  return id in answers ? answers : { ...answers, [id]: state };
}

export function practiceScore(ids: readonly string[], answers: FirstAnswers): { right: number; total: number; missed: string[] } {
  const missed = ids.filter((id) => answers[id] !== 'right' && answers[id] !== 'known');
  return { right: ids.length - missed.length, total: ids.length, missed };
}
