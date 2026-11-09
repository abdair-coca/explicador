// Types shared with the viewer. Type-only: no Node imports here, the viewer imports this file.
import type { Block, Ref } from './parser/types.ts';

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

/** Lines quoted in an answer; the server copies them from the file when the questions are shown. */
export interface AnswerCode {
  /** Always a line range. */
  ref: Ref;
  lines?: string[];
  missing?: boolean;
}

export interface Answer {
  /** Markdown. */
  text: string;
  codes?: AnswerCode[];
  /** A deeper scene the agent drew for this question; the viewer links to it. */
  scene?: TrailEntry;
  answeredAt: string;
}

/** Something the user asked about a box in the detail panel. Saved with the scene. */
export interface Question {
  id: string;
  block: string;
  node: string;
  text: string;
  askedAt: string;
  /** Absent while the agent has not answered. */
  answer?: Answer;
}

/** What the viewer receives in a `questions` event: the questions of the scene with that key. */
export interface QuestionsPayload {
  key: string;
  questions: Question[];
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
