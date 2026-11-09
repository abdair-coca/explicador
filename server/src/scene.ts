// Types shared with the viewer. Type-only: no Node imports here, the viewer imports this file.
import type { Block } from './parser/types.ts';

export type * from './parser/types.ts';

export interface FileChange {
  path: string;
  change: 'modified' | 'deleted';
}

/** A scene the user came from; the viewer shows the trail as breadcrumbs. */
export interface TrailEntry {
  topic: string;
  key: string;
}

/** What the viewer receives from GET /api/scene. */
export interface ScenePayload {
  version: number;
  topic: string;
  key: string;
  status: 'fresh' | 'stale';
  changes: FileChange[];
  savedAt: string;
  /** Ancestors, outermost first: scenes the user drilled down from. */
  trail: TrailEntry[];
  blocks: Block[];
}
