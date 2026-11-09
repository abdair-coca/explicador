// Step-by-step playback for <flow> scenes and the reduced-motion preference.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Time a step stays on screen: long enough to read its narration. */
export function stepDuration(narration: string): number {
  return Math.min(9000, Math.max(2600, 1600 + narration.length * 40));
}

export interface Playback {
  index: number;
  playing: boolean;
  atEnd: boolean;
  toggle(): void;
  next(): void;
  prev(): void;
  goTo(index: number): void;
  restart(): void;
}

export function usePlayback(durations: number[], autoplay: boolean): Playback {
  const count = durations.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(autoplay && count > 1);
  const atEnd = index >= count - 1;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex((i) => Math.min(i + 1, count - 1)), durations[index] ?? 3000);
    return () => window.clearTimeout(timer);
  }, [playing, index, atEnd, count, durations]);

  const goTo = useCallback((i: number) => setIndex(Math.max(0, Math.min(count - 1, i))), [count]);
  return {
    index,
    playing,
    atEnd,
    toggle: () => {
      if (atEnd && !playing) setIndex(0);
      setPlaying((p) => !p);
    },
    next: () => {
      setPlaying(false);
      goTo(index + 1);
    },
    prev: () => {
      setPlaying(false);
      goTo(index - 1);
    },
    goTo: (i) => {
      setPlaying(false);
      goTo(i);
    },
    restart: () => {
      setIndex(0);
      setPlaying(true);
    },
  };
}
