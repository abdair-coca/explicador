// The comprehension bench (F22): ten topics, each with its source material, the scene Explicador makes of it and five
// questions whose answers can be checked without a judge. This file loads and grades them; evals/comprehension.ts asks
// the model.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExl } from '../server/src/parser/index.ts';
import { sceneWarnings } from '../server/src/rules.ts';
import type { Block, Scene } from '../server/src/scene.ts';
import { sceneText } from './sceneText.ts';

export const repo = fileURLToPath(new URL('..', import.meta.url));
export const benchDir = join(repo, 'evals/bench');
export const QUESTIONS_PER_TOPIC = 5;
export const LETTERS = ['A', 'B', 'C', 'D'] as const;

/** A multiple-choice question (`options`, `answer` is its letter) or a numeric one (`answer` is a number). */
export interface Question {
  q: string;
  options?: string[];
  answer: string | number;
  /** Numeric only: how far a reply may be from the answer. Default 0. */
  tolerance?: number;
}

export interface Topic {
  id: string;
  title: string;
  /** Who the scene is for. */
  audience: string;
  language: 'es' | 'en';
  /** The material the scene explains, relative to the repository (for the people who read the bench). */
  sources: string[];
  /** The scene, relative to the repository. */
  scene: string;
  /** The project the scene's refs are relative to, relative to the repository. */
  root: string;
  questions: Question[];
}

export function loadTopics(): Topic[] {
  return readdirSync(benchDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(benchDir, entry.name, 'topic.json')))
    .map((entry) => JSON.parse(readFileSync(join(benchDir, entry.name, 'topic.json'), 'utf8')) as Topic)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export interface LoadedScene {
  exl: string;
  scene: Scene;
  /** What a reader meets, in order. */
  text: string;
  /** The server's own rules, as `render_scene` would list them. */
  warnings: string[];
  /** Components other than prose, themes, chapters and checks: roughly the slides. */
  components: number;
}

const NOT_COMPONENT = new Set<Block['type']>(['markdown', 'theme', 'chapter', 'quiz']);

export function loadScene(topic: Topic): LoadedScene {
  const exl = readFileSync(join(repo, topic.scene), 'utf8');
  const parsed = parseExl(exl);
  if (!parsed.ok) throw new Error(`${topic.id}: the scene does not parse: ${parsed.errors.map((error) => `line ${error.line}: ${error.message}`).join('; ')}`);
  const root = join(repo, topic.root);
  return {
    exl,
    scene: parsed.scene,
    text: sceneText(parsed.scene),
    warnings: sceneWarnings(root, parsed.scene, parsed.refs),
    components: parsed.scene.blocks.filter((block) => !NOT_COMPONENT.has(block.type)).length,
  };
}

/** The questions as the model reads them. */
export function formatQuestions(topic: Topic): string {
  return topic.questions
    .map((question, i) => {
      const options = question.options?.map((option, j) => `   ${LETTERS[j]}) ${option}`) ?? [];
      return [`${i + 1}. ${question.q}${question.options ? '' : ' (reply with a number only)'}`, ...options].join('\n');
    })
    .join('\n\n');
}

/** The instruction for one condition: with the scene's text, or from what the model already knows. */
export function promptOf(topic: Topic, sceneBody: string | undefined): string {
  const reply = 'Reply with only a JSON object that maps each question number to your answer: the option letter for a multiple-choice question, a number for a numeric one. Example: {"1": "B", "2": 12.5}. If you are unsure, still pick the most plausible answer.';
  const questions = `Questions (language: ${topic.language === 'es' ? 'Spanish' : 'English'}):\n\n${formatQuestions(topic)}`;
  if (sceneBody === undefined) return `Answer these questions about "${topic.title}" from your own knowledge.\n\n${questions}\n\n${reply}`;
  return `Below is an explanation of "${topic.title}" written for a reader. Answer the questions using only what the explanation says or shows.\n\n<explanation>\n${sceneBody}\n</explanation>\n\n${questions}\n\n${reply}`;
}

/** The answers in a model's reply, by question number (1-based, as an array index minus one); undefined when missing. */
export function parseAnswers(reply: string, count: number): (string | number | undefined)[] {
  const answers: (string | number | undefined)[] = Array.from({ length: count }, () => undefined);
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) return answers;
  let data: unknown;
  try {
    data = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return answers;
  }
  if (typeof data !== 'object' || data === null) return answers;
  const record = data as Record<string, unknown>;
  for (let i = 0; i < count; i++) {
    const value = record[String(i + 1)];
    if (typeof value === 'string' || typeof value === 'number') answers[i] = value;
  }
  return answers;
}

/** A number as a person writes it: "1 254,40 €", "1254.4", "12%". NaN when there is none. */
export function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number.NaN;
  const text = value.replace(/\s/g, '').replace(/[^\d.,+-]/g, '');
  if (!/\d/.test(text)) return Number.NaN;
  // "1.234,56" and "1,234.56": the last separator is the decimal one; a lone "," is a decimal comma.
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  const normal = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  return Number(normal);
}

/** Whether a reply is right. */
export function isRight(question: Question, reply: string | number | undefined): boolean {
  if (reply === undefined) return false;
  if (question.options) return typeof reply === 'string' && reply.trim().toUpperCase().startsWith(String(question.answer)) && /^[A-D]\b/i.test(reply.trim());
  const got = toNumber(reply);
  return Number.isFinite(got) && Math.abs(got - Number(question.answer)) <= (question.tolerance ?? 0) + 1e-9;
}

/** Right answers out of the topic's questions. */
export function score(topic: Topic, replies: (string | number | undefined)[]): number {
  return topic.questions.filter((question, i) => isRight(question, replies[i])).length;
}
