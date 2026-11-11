// Lesson progress: which checks the reader got right (or knew) and which chapters they reached. It lives in this
// browser only, per scene version, so re-rendering a lesson starts it again. Storage can be blocked: every access
// is guarded and the lesson works without it.
import type { Chapter, LessonPlan } from './chapters.ts';

/** right: picked the right option · tried: picked a wrong one, not yet the right one · known/review: a flashcard. */
export type CheckState = 'right' | 'tried' | 'known' | 'review';

export interface Progress {
  checks: Record<string, CheckState>;
  /** Ids of the chapters the reader has reached. */
  seen: string[];
}

export const emptyProgress: Progress = { checks: {}, seen: [] };

export function progressKey(sceneKey: string, savedAt: string): string {
  return `explicador.lesson.${sceneKey}.${savedAt}`;
}

export function loadProgress(key: string): Progress {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyProgress;
    const value = JSON.parse(raw) as Partial<Progress>;
    return { checks: typeof value.checks === 'object' && value.checks ? value.checks : {}, seen: Array.isArray(value.seen) ? value.seen : [] };
  } catch {
    return emptyProgress;
  }
}

export function saveProgress(key: string, progress: Progress): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Without storage the progress lasts until the tab closes.
  }
}

export function isDone(state: CheckState | undefined): boolean {
  return state === 'right' || state === 'known';
}

/** A chapter is done when its checks are; one without checks, once the reader reached it. */
export function chapterDone(chapter: Chapter, progress: Progress): boolean {
  if (chapter.checks.length === 0) return progress.seen.includes(chapter.block.id);
  return chapter.checks.every((id) => isDone(progress.checks[id]));
}

export function lessonSummary(plan: LessonPlan, progress: Progress): { done: number; total: number; chapters: number } {
  const checks = [...plan.introChecks, ...plan.chapters.flatMap((c) => c.checks)];
  return {
    done: checks.filter((id) => isDone(progress.checks[id])).length,
    total: checks.length,
    chapters: plan.chapters.filter((chapter) => chapterDone(chapter, progress)).length,
  };
}

/** A check's next state; a right answer is never taken back by a later wrong click. */
export function record(progress: Progress, id: string, state: CheckState): Progress {
  const current = progress.checks[id];
  if (current === 'right' && state === 'tried') return progress;
  return { ...progress, checks: { ...progress.checks, [id]: state } };
}

export function markSeen(progress: Progress, chapterId: string): Progress {
  return progress.seen.includes(chapterId) ? progress : { ...progress, seen: [...progress.seen, chapterId] };
}
