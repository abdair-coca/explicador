// What the viewer shows and how the user moves between scenes: drilling into a node,
// and going back through the breadcrumb trail.
import type { Bridge } from './bridge/index.ts';
import { topicKey, type CachedScene, type SceneCache } from './cache/index.ts';
import { describeClick, findClickTarget } from './clicks/index.ts';
import { parseExl, formatErrors } from './parser/index.ts';
import type { FileChange, TrailEntry } from './scene.ts';

/** A click forwarded to Claude: the next scene rendered within this time is its answer. */
const PENDING_MS = 15 * 60 * 1000;

export type ClickReply =
  | { status: 'opened'; topic: string }
  | { status: 'sent'; topic: string; monitors: number }
  | { status: 'no-monitor'; topic: string; message: string }
  | { status: 'unknown' };

export class Navigator {
  private pending: { trail: TrailEntry[]; at: number } | undefined;
  private readonly bridge: Bridge;
  private readonly cache: SceneCache;
  private readonly now: () => number;

  constructor(bridge: Bridge, cache: SceneCache, now: () => number = Date.now) {
    this.bridge = bridge;
    this.cache = cache;
    this.now = now;
  }

  /**
   * Publishes a cached scene. Its trail is, in order: the one given; the drill that is waiting
   * for an answer; the current trail when the same scene is shown again; otherwise empty.
   */
  show(
    scene: CachedScene,
    status: 'fresh' | 'stale',
    changes: FileChange[],
    trail?: TrailEntry[],
  ): { ok: true } | { ok: false; errors: string } {
    const parsed = parseExl(scene.exl);
    if (!parsed.ok) return { ok: false, errors: formatErrors(parsed.errors) };
    const current = this.bridge.current;
    let resolved = trail;
    if (!resolved && this.pending && this.now() - this.pending.at < PENDING_MS) resolved = this.pending.trail;
    if (!resolved && current?.key === scene.key) resolved = current.trail;
    this.pending = undefined;
    this.bridge.publish({
      topic: scene.topic,
      key: scene.key,
      status,
      changes,
      savedAt: scene.savedAt,
      trail: (resolved ?? []).filter((entry) => entry.key !== scene.key),
      blocks: parsed.scene.blocks,
    });
    return { ok: true };
  }

  /** POST /api/click {block, node}. */
  click(body: Record<string, unknown>): ClickReply {
    const current = this.bridge.current;
    const target = current && findClickTarget(current, body.block, body.node);
    if (!current || !target) return { status: 'unknown' };
    const trail = [...current.trail, { topic: current.topic, key: current.key }];

    if (target.drilled) {
      const lookup = safeLookup(this.cache, target.topic);
      if (lookup?.status === 'fresh' && this.show(lookup.scene, 'fresh', [], trail).ok) {
        return { status: 'opened', topic: target.topic };
      }
    }
    const message = describeClick(current, target);
    const monitors = this.bridge.sendToMonitors(message);
    if (monitors === 0) return { status: 'no-monitor', topic: target.topic, message };
    this.pending = { trail, at: this.now() };
    return { status: 'sent', topic: target.topic, monitors };
  }

  /** POST /api/open {key}: go back to a scene in the breadcrumb trail. */
  open(body: Record<string, unknown>): { status: 'opened' | 'missing' | 'unknown' } {
    const current = this.bridge.current;
    const index = current?.trail.findIndex((entry) => entry.key === body.key) ?? -1;
    const entry = current?.trail[index];
    if (!current || !entry) return { status: 'unknown' };
    const lookup = safeLookup(this.cache, entry.key);
    if (!lookup || lookup.status === 'missing') return { status: 'missing' };
    const changes = lookup.status === 'stale' ? lookup.changes : [];
    const shown = this.show(lookup.scene, lookup.status, changes, current.trail.slice(0, index));
    return { status: shown.ok ? 'opened' : 'missing' };
  }
}

function safeLookup(cache: SceneCache, topic: string): ReturnType<SceneCache['lookup']> | undefined {
  try {
    topicKey(topic);
    return cache.lookup(topic);
  } catch {
    return undefined;
  }
}
