// Code tours: the steps Claude sends are checked against the real files, so the window never points at lines that are not there.
import { randomBytes } from 'node:crypto';
import { isNotebookPath, readProjectFile, sizeOf } from './files.ts';
import { parseRefString } from './parser/index.ts';
import type { Tour } from './scene.ts';

export const tourLimits = {
  steps: 12,
  title: 80,
  note: 600,
  /** Lines highlighted at once; more would stop being a highlight. */
  lines: 80,
} as const;

export interface TourInput {
  title: string;
  steps: { ref: string; note: string }[];
}

export type TourResult = { ok: true; tour: Tour } | { ok: false; problems: string[] };

export function buildTour(root: string, input: TourInput): TourResult {
  const problems: string[] = [];
  const title = input.title.trim();
  if (!title || title.length > tourLimits.title) problems.push(`- title: one line of at most ${tourLimits.title} characters`);
  if (input.steps.length === 0 || input.steps.length > tourLimits.steps) problems.push(`- steps: between 1 and ${tourLimits.steps}`);

  const lengths = new Map<string, number | string>();
  const steps: Tour['steps'] = [];
  input.steps.forEach((step, i) => {
    const label = `- step ${i + 1}`;
    const note = step.note.trim();
    if (!note || note.length > tourLimits.note) {
      problems.push(`${label}: the note needs 1 to ${tourLimits.note} characters`);
      return;
    }
    const ref = parseRefString(step.ref);
    if (typeof ref === 'string') {
      problems.push(`${label} (${step.ref}): ${ref}`);
      return;
    }
    if (ref.start === undefined) {
      problems.push(`${label} (${step.ref}): give a ${isNotebookPath(ref.path) ? 'cell' : 'line'} range, e.g. "${ref.path}:${isNotebookPath(ref.path) ? '3-5' : '10-24'}"`);
      return;
    }
    const end = ref.end ?? ref.start;
    if (end - ref.start + 1 > tourLimits.lines) {
      problems.push(`${label} (${step.ref}): more than ${tourLimits.lines} ${isNotebookPath(ref.path) ? 'cells' : 'lines'}; split it into steps`);
      return;
    }
    if (!lengths.has(ref.path)) {
      const file = readProjectFile(root, ref.path);
      lengths.set(ref.path, file.ok ? sizeOf(file) : file.reason);
    }
    const total = lengths.get(ref.path);
    if (typeof total === 'string') {
      problems.push(`${label} (${step.ref}): ${reasons[total] ?? 'the file cannot be shown'}`);
    } else if (total !== undefined && end > total) {
      problems.push(`${label} (${step.ref}): the ${isNotebookPath(ref.path) ? `notebook has ${total} cells` : `file has ${total} lines`}`);
    } else {
      steps.push({ ref: { path: ref.path, start: ref.start, end }, note });
    }
  });

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, tour: { id: randomBytes(4).toString('hex'), title, steps } };
}

const reasons: Record<string, string> = {
  missing: 'the file does not exist in the project',
  denied: 'this path cannot be shown (outside the project, or a hidden file or folder)',
  binary: 'binary files cannot be shown',
  invalid: 'this notebook cannot be read (only nbformat 4 is supported)',
  'too-large': 'the file is too large to show',
};
