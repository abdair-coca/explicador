// Scene cache in `.explicador/scenes/`: one JSON file per topic with the EXL source and
// the SHA-256 of every file it references. A scene is stale as soon as one hash differs.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveInside, stateDir, writeFileAtomic } from '../project.ts';
import type { FileChange, Question } from '../scene.ts';

export type { FileChange } from '../scene.ts';

export interface CachedScene {
  version: 1;
  topic: string;
  key: string;
  exl: string;
  /** Project-relative path → SHA-256 of its content when the scene was saved. */
  files: Record<string, string>;
  savedAt: string;
  /** Questions asked in the viewer about this scene; saving the scene again drops them. */
  questions?: Question[];
}

export type Lookup =
  | { status: 'missing'; key: string }
  | { status: 'fresh'; scene: CachedScene }
  | { status: 'stale'; scene: CachedScene; changes: FileChange[] };

export type SaveResult = { ok: true; scene: CachedScene } | { ok: false; missing: string[] };

const MAX_KEY_LENGTH = 60;

/** Stable file name for a topic: "Login flow" and "login-flow" share a scene. */
export function topicKey(topic: string): string {
  const key = topic
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_KEY_LENGTH)
    .replace(/-+$/, '');
  if (!key) throw new Error(`Topic "${topic}" has no letters or digits`);
  return key;
}

export function hashFile(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export class SceneCache {
  /** The analyzed project; scenes and their refs live under it. */
  readonly root: string;
  private readonly dir: string;

  constructor(root: string) {
    this.root = root;
    this.dir = stateDir(root, 'scenes');
  }

  /** Hashes the referenced files and stores the scene; fails if a reference does not exist. */
  save(topic: string, exl: string, refs: readonly string[]): SaveResult {
    const key = topicKey(topic);
    const files: Record<string, string> = {};
    const missing: string[] = [];
    for (const ref of refs) {
      const full = resolveInside(this.root, ref);
      const hash = full === undefined ? undefined : hashFile(full);
      if (hash === undefined) missing.push(ref);
      else files[ref] = hash;
    }
    if (missing.length > 0) return { ok: false, missing };
    const scene: CachedScene = { version: 1, topic, key, exl, files, savedAt: new Date().toISOString() };
    writeFileAtomic(this.path(key), `${JSON.stringify(scene, null, 2)}\n`);
    return { ok: true, scene };
  }

  lookup(topic: string): Lookup {
    const key = topicKey(topic);
    const scene = this.read(key);
    if (!scene) return { status: 'missing', key };
    const changes = this.changes(scene);
    return changes.length === 0 ? { status: 'fresh', scene } : { status: 'stale', scene, changes };
  }

  list(): Lookup[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => this.lookup(name.slice(0, -'.json'.length)));
  }

  /** Replaces the questions of a cached scene; false when the scene is gone. */
  saveQuestions(key: string, questions: Question[]): boolean {
    const scene = this.read(key);
    if (!scene) return false;
    writeFileAtomic(this.path(key), `${JSON.stringify({ ...scene, questions }, null, 2)}\n`);
    return true;
  }

  questions(key: string): Question[] | undefined {
    const scene = this.read(key);
    return scene && (scene.questions ?? []);
  }

  private changes(scene: CachedScene): FileChange[] {
    const changes: FileChange[] = [];
    for (const [path, saved] of Object.entries(scene.files)) {
      const full = resolveInside(this.root, path);
      const current = full === undefined ? undefined : hashFile(full);
      if (current === undefined) changes.push({ path, change: 'deleted' });
      else if (current !== saved) changes.push({ path, change: 'modified' });
    }
    return changes;
  }

  private read(key: string): CachedScene | undefined {
    const path = this.path(key);
    if (!existsSync(path)) return undefined;
    try {
      const scene = JSON.parse(readFileSync(path, 'utf8')) as CachedScene;
      // An unreadable or older entry is treated as missing, so the agent regenerates it.
      return scene.version === 1 && typeof scene.exl === 'string' && scene.files ? scene : undefined;
    } catch {
      return undefined;
    }
  }

  private path(key: string): string {
    return join(this.dir, `${key}.json`);
  }
}
