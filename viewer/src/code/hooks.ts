// Data for the code window: files and the explorer's tree from the bridge, and the preferences that survive a reload.
import { useEffect, useState } from 'react';
import { fetchFile, fetchTree, type FileReply } from '../api';

/** Last copy of each file; shown at once when a tab is revisited, then refreshed from disk. */
const cache = new Map<string, FileReply>();

/** Loads a file in the background so the next step of a tour opens without a wait. */
export function prefetch(path: string): void {
  if (!cache.has(path)) void fetchFile(path).then((reply) => cache.set(path, reply));
}

/** The text of `path`: the cached copy straight away, the fresh one as soon as it arrives. */
export function useFile(path: string | undefined): FileReply | 'loading' {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!path) return;
    let current = true;
    void fetchFile(path).then((reply) => {
      const before = cache.get(path);
      cache.set(path, reply);
      const same = before && before.ok && reply.ok && before.lines.length === reply.lines.length && before.lines.every((line, i) => line === reply.lines[i]);
      if (current && !same) bump((n) => n + 1);
    });
    return () => {
      current = false;
    };
  }, [path]);
  return (path && cache.get(path)) || 'loading';
}

/** The project's files, fetched once when the explorer first opens. */
export function useTree(wanted: boolean): { files: string[]; truncated: boolean } | undefined {
  const [tree, setTree] = useState<{ files: string[]; truncated: boolean }>();
  useEffect(() => {
    if (!wanted || tree) return;
    void fetchTree().then(setTree);
  }, [wanted, tree]);
  return tree;
}

/** Preferences live in this browser only; storage can be blocked, so every access is guarded. */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`explicador.${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`explicador.${key}`, JSON.stringify(value));
  } catch {
    // Not saving a preference is harmless.
  }
}

/** True while the viewport matches the media query. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = (): void => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}
