// The lesson's progress, shared with the checks inside it. Outside a lesson there is no provider and a quiz keeps
// its own state.
import { createContext, useContext } from 'react';
import type { CheckState, Progress } from './progress';

export interface Lesson {
  progress: Progress;
  record(id: string, state: CheckState): void;
}

export const LessonContext = createContext<Lesson | undefined>(undefined);

export function useLesson(): Lesson | undefined {
  return useContext(LessonContext);
}
