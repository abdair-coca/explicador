// Small hooks the lesson blocks share: start playing once a block is seen, and take the code window along.
import { useEffect, useRef, type RefObject } from 'react';
import type { Ref } from '../../../server/src/scene.ts';
import { useSelection } from '../components/selection';

/** Calls `onEnter` once, the first time the element is about half visible. */
export function useFirstVisible(target: RefObject<Element | null>, onEnter: () => void): void {
  const callback = useRef(onEnter);
  callback.current = onEnter;
  useEffect(() => {
    const element = target.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        callback.current();
      },
      { threshold: 0.45 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);
}

/** With the code window open, it shows the lines of the step that is playing. */
export function useFollowCode(ref: Ref | undefined): void {
  const follow = useSelection()?.followStep;
  const latest = useRef(follow);
  latest.current = follow;
  // Keyed by the lines: two steps at the same lines do not move the window twice.
  const key = ref ? `${ref.path}:${ref.start ?? ''}-${ref.end ?? ''}` : '';
  useEffect(() => {
    if (ref) latest.current?.(ref);
  }, [key]);
}
