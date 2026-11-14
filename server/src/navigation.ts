// What the viewer shows and how the user moves between scenes: drilling into a node,
// going back through the breadcrumb trail, and asking questions about a box.
import { randomBytes } from 'node:crypto';
import type { Bridge } from './bridge/index.ts';
import { topicKey, type CachedScene, type SceneCache } from './cache/index.ts';
import { describeClick, describeExplain, describeExplainFile, describeQuestion, findClickTarget } from './clicks/index.ts';
import { readProjectFile } from './files.ts';
import { parseExl, formatErrors } from './parser/index.ts';
import type { Answer, FileChange, Question, Scene, TrailEntry } from './scene.ts';
import { withAnswerLines, withSnippets } from './snippets.ts';

/** A click forwarded to Claude: the next scene rendered within this time is its answer. */
const PENDING_MS = 15 * 60 * 1000;

export type ClickReply =
  | { status: 'opened'; topic: string }
  | { status: 'sent'; topic: string; monitors: number }
  | { status: 'no-monitor'; topic: string; message: string }
  | { status: 'unknown' };

export const MAX_QUESTION_LENGTH = 500;
/** Older questions are dropped past this many per scene. */
const MAX_QUESTIONS = 50;

export type AskReply =
  | { status: 'sent'; id: string }
  | { status: 'no-monitor' }
  | { status: 'invalid'; message: string }
  | { status: 'unknown' };

export type ExplainReply = { status: 'sent' } | { status: 'no-monitor' } | { status: 'unknown' };

export type AnswerResult = 'answered' | 'no-scene' | 'no-question';

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
  ): { ok: true; scene: Scene } | { ok: false; errors: string } {
    const parsed = parseExl(scene.exl);
    if (!parsed.ok) return { ok: false, errors: formatErrors(parsed.errors) };
    const current = this.bridge.current;
    let resolved = trail;
    if (!resolved && this.pending && this.now() - this.pending.at < PENDING_MS) resolved = this.pending.trail;
    if (!resolved && current?.key === scene.key) resolved = current.trail;
    this.pending = undefined;
    this.bridge.publish(
      {
        topic: scene.topic,
        key: scene.key,
        status,
        changes,
        savedAt: scene.savedAt,
        trail: (resolved ?? []).filter((entry) => entry.key !== scene.key),
        blocks: withSnippets(this.cache.root, parsed.scene.blocks),
      },
      withAnswerLines(this.cache.root, scene.questions ?? []),
    );
    return { ok: true, scene: parsed.scene };
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

  /** POST /api/ask {block, node, question}: a question about a box, saved with the scene and sent to Claude. */
  ask(body: Record<string, unknown>): AskReply {
    const current = this.bridge.current;
    const target = current && findClickTarget(current, body.block, body.node);
    if (!current || !target) return { status: 'unknown' };
    // One line: the monitor delivers lines, and control characters have no place in a question.
    // eslint-disable-next-line no-control-regex
    const text = typeof body.question === 'string' ? body.question.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim() : '';
    if (!text) return { status: 'invalid', message: 'Type a question first.' };
    if (text.length > MAX_QUESTION_LENGTH) {
      return { status: 'invalid', message: `Keep the question under ${MAX_QUESTION_LENGTH} characters.` };
    }
    // Nobody would answer: do not leave a question waiting forever.
    if (this.bridge.monitors === 0) return { status: 'no-monitor' };
    const stored = safeQuestions(this.cache, current.key);
    if (!stored) return { status: 'unknown' };
    const question: Question = {
      id: randomBytes(4).toString('hex'),
      block: target.block.id,
      node: target.node.id,
      text,
      askedAt: new Date(this.now()).toISOString(),
    };
    this.saveQuestions(current.key, [...stored, question].slice(-MAX_QUESTIONS));
    this.bridge.sendToMonitors(describeQuestion(current, target, question));
    return { status: 'sent', id: question.id };
  }

  /**
   * POST /api/explain {block, node} or {path, start?, end?}: asks the agent for a code tour of a box, or of the
   * file and lines open in the code window. The tour arrives through explain_code.
   */
  explain(body: Record<string, unknown>): ExplainReply {
    let message: string | undefined;
    if (typeof body.path === 'string') {
      const start = typeof body.start === 'number' && Number.isInteger(body.start) && body.start > 0 ? body.start : undefined;
      const end = start !== undefined && typeof body.end === 'number' && Number.isInteger(body.end) && body.end >= start ? body.end : undefined;
      if (readProjectFile(this.cache.root, body.path).ok) {
        message = describeExplainFile({ path: body.path, ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}) });
      }
    } else {
      const current = this.bridge.current;
      const target = current && findClickTarget(current, body.block, body.node);
      if (current && target) message = describeExplain(current, target);
    }
    if (message === undefined) return { status: 'unknown' };
    return this.bridge.sendToMonitors(message) === 0 ? { status: 'no-monitor' } : { status: 'sent' };
  }

  /** The agent's answer to a question of the scene cached under `key` (the answer_question tool). */
  answer(key: string, id: string, answer: Omit<Answer, 'answeredAt'>): AnswerResult {
    const stored = safeQuestions(this.cache, key);
    if (!stored) return 'no-scene';
    if (!stored.some((q) => q.id === id)) return 'no-question';
    const answered = { ...answer, answeredAt: new Date(this.now()).toISOString() };
    this.saveQuestions(key, stored.map((q) => (q.id === id ? { ...q, answer: answered } : q)));
    return 'answered';
  }

  /** POST /api/follow {question}: open the scene the agent drew for an answer, one level below the current scene. */
  follow(body: Record<string, unknown>): { status: 'opened' | 'missing' | 'unknown' } {
    const current = this.bridge.current;
    const linked = this.bridge.questions.find((q) => q.id === body.question)?.answer?.scene;
    if (!current || !linked) return { status: 'unknown' };
    const lookup = safeLookup(this.cache, linked.key);
    if (!lookup || lookup.status === 'missing') return { status: 'missing' };
    const changes = lookup.status === 'stale' ? lookup.changes : [];
    const trail = [...current.trail, { topic: current.topic, key: current.key }];
    return { status: this.show(lookup.scene, lookup.status, changes, trail).ok ? 'opened' : 'missing' };
  }

  private saveQuestions(key: string, questions: Question[]): void {
    this.cache.saveQuestions(key, questions);
    if (this.bridge.current?.key === key) this.bridge.setQuestions(withAnswerLines(this.cache.root, questions));
  }
}

/** Questions of a cached scene; undefined when there is none under that key (e.g. in preview mode). */
function safeQuestions(cache: SceneCache, key: string): Question[] | undefined {
  try {
    return cache.questions(topicKey(key));
  } catch {
    return undefined;
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
