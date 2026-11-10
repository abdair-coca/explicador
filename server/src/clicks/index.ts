// Clicks and questions in the viewer: the message Claude receives, built only from scene data the server holds,
// and the per-session runtime file through which the click monitor finds the bridge.
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir, writeFileAtomic } from '../project.ts';
import type { Question, Ref, SceneBlock, ScenePayload } from '../scene.ts';

/** Something the user can click: a node, an entity or a state. */
export interface ClickItem {
  id: string;
  label: string;
  kind: string;
  ref?: Ref;
}

export interface ClickTarget {
  block: SceneBlock;
  node: ClickItem;
  /** Topic of the deeper scene: the node's <drill> topic, or its label. */
  topic: string;
  drilled: boolean;
}

export function findClickTarget(scene: ScenePayload, blockId: unknown, nodeId: unknown): ClickTarget | undefined {
  if (typeof blockId !== 'string' || typeof nodeId !== 'string') return undefined;
  const block = scene.blocks.find((b): b is SceneBlock => b.type !== 'markdown' && b.id === blockId);
  const node = block ? clickItems(block).find((n) => n.id === nodeId) : undefined;
  if (!block || !node) return undefined;
  const drill = block.drills.find((d) => d.node === nodeId);
  return { block, node, topic: drill?.topic ?? node.label, drilled: drill !== undefined };
}

export function clickItems(block: SceneBlock): ClickItem[] {
  switch (block.type) {
    case 'arch':
    case 'flow':
      return block.nodes;
    case 'data':
      return block.entities.map((e) => ({ id: e.id, label: e.label, kind: 'entity', ...(e.ref ? { ref: e.ref } : {}) }));
    case 'state':
      return block.states.map((s) => ({ id: s.id, label: s.label, kind: 'state', ...(s.ref ? { ref: s.ref } : {}) }));
  }
}

/** One line for Claude. It describes the click; it does not restrict what Claude may do. */
export function describeClick(scene: ScenePayload, target: ClickTarget): string {
  return oneLine(
    `Explicador viewer: the user clicked ${describeItem(scene, target)} and wants to go deeper. ` +
      `Explain it with Explicador under the topic "${target.topic}": call show_scene first, ` +
      'then build the scene with render_scene if it is missing or stale, and reply briefly in the chat.',
  );
}

/** One line for Claude with a question typed in the detail panel. The text is the user's; it is quoted as data. */
export function describeQuestion(scene: ScenePayload, target: ClickTarget, question: Question): string {
  return oneLine(
    `Explicador viewer: the user asks about ${describeItem(scene, target)}: ${JSON.stringify(question.text)} ` +
      `Answer in the user's language with answer_question (topic "${scene.topic}", question "${question.id}"): ` +
      'a short Markdown answer for the panel, with refs to the lines that prove it when they help. ' +
      'If the question deserves a diagram, first call render_scene with background true under a new topic and pass that topic as scene. ' +
      'If it is about how code runs, add a tour (steps with ref and note) so the user can step through it in the code window. ' +
      'Then reply in the chat with one sentence.',
  );
}

const EXPLAIN_HOW =
  "Read the code and call explain_code with a tour in the user's language: 3-10 steps in reading order, each with a ref (a line range 'path:start-end'; " +
  "for a notebook, cell numbers 'path.ipynb:3-5', see read_notebook) and a note of 1-3 sentences saying what it does and why. " +
  'Follow the flow across files when the code calls other code. Then reply in the chat with one sentence.';

/** One line for Claude: the user pressed "Explain code" on a box. */
export function describeExplain(scene: ScenePayload, target: ClickTarget): string {
  return oneLine(`Explicador viewer: the user asks you to explain the code of ${describeItem(scene, target)} step by step. ${EXPLAIN_HOW}`);
}

/** One line for Claude: the user pressed "Explain code" in the code window, on the file or lines they are reading. */
export function describeExplainFile(ref: Ref): string {
  const where = `${ref.path}${ref.start ? `:${ref.start}${ref.end ? `-${ref.end}` : ''}` : ''}`;
  return oneLine(`Explicador viewer: the user asks you to explain the code they are reading in the code window: ${where}. ${EXPLAIN_HOW}`);
}

/** `"Label" (node id, kind, ref) in "Block" of the scene "topic"`. */
function describeItem(scene: ScenePayload, target: ClickTarget): string {
  const { node } = target;
  const ref = node.ref
    ? `, ${node.ref.path}${node.ref.start ? `:${node.ref.start}${node.ref.end ? `-${node.ref.end}` : ''}` : ''}`
    : '';
  return `"${node.label}" (node ${node.id}, ${node.kind}${ref}) in "${target.block.title}" of the scene "${scene.topic}"`;
}

function oneLine(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ');
}

export interface RuntimeInfo {
  origin: string;
  token: string;
  pid: number;
}

const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function runtimePath(root: string, sessionId: string): string | undefined {
  return SESSION_ID.test(sessionId) ? join(stateDir(root, 'runtime'), `${sessionId}.json`) : undefined;
}

export function writeRuntime(root: string, sessionId: string, info: RuntimeInfo): string | undefined {
  const path = runtimePath(root, sessionId);
  if (path) writeFileAtomic(path, `${JSON.stringify(info)}\n`);
  return path;
}

export function readRuntime(path: string): RuntimeInfo | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const info = JSON.parse(readFileSync(path, 'utf8')) as RuntimeInfo;
    return typeof info.origin === 'string' && typeof info.token === 'string' ? info : undefined;
  } catch {
    return undefined;
  }
}

/** Removes the file only if it still belongs to this process (a newer server may have replaced it). */
export function removeRuntime(path: string, pid = process.pid): void {
  if (readRuntime(path)?.pid === pid) rmSync(path, { force: true });
}
