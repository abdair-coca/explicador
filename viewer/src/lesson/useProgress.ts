// The lesson context value for a progress key, backed by the shared store.
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Lesson } from './context';
import { markSeen, record, type CheckState } from './progress';
import { getProgress, subscribeProgress, updateProgress } from './store';

export function useLessonProgress(key: string): Lesson & { markSeen(chapterId: string): void } {
  const subscribe = useCallback((listener: () => void) => subscribeProgress(key, listener), [key]);
  const progress = useSyncExternalStore(subscribe, () => getProgress(key));
  return useMemo(
    () => ({
      progress,
      record: (id: string, state: CheckState) => updateProgress(key, (current) => record(current, id, state)),
      markSeen: (chapterId: string) => updateProgress(key, (current) => markSeen(current, chapterId)),
    }),
    [key, progress],
  );
}
