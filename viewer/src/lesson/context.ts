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

/**
 * True in Present mode, where a speaker does the explaining: components leave out their paragraphs (narration, notes)
 * and keep their titles, labels and values. The page shows everything.
 */
export const SpeakerContext = createContext(false);

export function useSpeaker(): boolean {
  return useContext(SpeakerContext);
}
