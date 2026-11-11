// One lesson's progress, shared by everything that shows the lesson: the page and the presenter read and write the
// same state, so a check answered in a presentation counts on the page too. Kept in memory per progress key and
// saved to the browser on every change.
import { loadProgress, saveProgress, type Progress } from './progress.ts';

const states = new Map<string, Progress>();
const listeners = new Map<string, Set<() => void>>();

export function getProgress(key: string): Progress {
  let state = states.get(key);
  if (!state) {
    state = loadProgress(key);
    states.set(key, state);
  }
  return state;
}

/** Applies `change`; listeners hear about it only when the progress really changed. */
export function updateProgress(key: string, change: (current: Progress) => Progress): void {
  const current = getProgress(key);
  const next = change(current);
  if (next === current) return;
  states.set(key, next);
  saveProgress(key, next);
  for (const listener of listeners.get(key) ?? []) listener();
}

export function subscribeProgress(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => set.delete(listener);
}
