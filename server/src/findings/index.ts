// Findings worth keeping are appended to FINDINGS.md at the analyzed project's root.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRefString } from '../parser/index.ts';
import { resolveInside } from '../project.ts';

export interface Finding {
  title: string;
  body: string;
  topic?: string;
  refs?: string[];
}

export type AppendResult =
  | { status: 'appended' | 'duplicate'; path: string }
  | { status: 'invalid'; errors: string[] };

export const FINDINGS_FILE = 'FINDINGS.md';
const HEADER = '# Findings\n\nNotes recorded by Explicador while explaining this project, oldest first.\n';
const MAX_TITLE = 120;
const MAX_BODY = 4000;

export function appendFinding(root: string, finding: Finding, now = new Date()): AppendResult {
  const title = finding.title.trim();
  const body = finding.body.trim();
  const topic = finding.topic?.trim();
  const errors: string[] = [];
  if (!title || /[\r\n]/.test(title) || title.length > MAX_TITLE) {
    errors.push(`title must be one non-empty line of at most ${MAX_TITLE} characters`);
  }
  if (!body || body.length > MAX_BODY) errors.push(`body must be non-empty and at most ${MAX_BODY} characters`);
  if (topic !== undefined && /[\r\n]/.test(topic)) errors.push('topic must be a single line');
  for (const ref of finding.refs ?? []) {
    const parsed = parseRefString(ref);
    if (typeof parsed === 'string') errors.push(`ref "${ref}": ${parsed}`);
    else if (!existsSync(resolveInside(root, parsed.path) ?? '')) errors.push(`ref "${ref}": file not found`);
  }
  if (errors.length > 0) return { status: 'invalid', errors };

  const path = join(root, FINDINGS_FILE);
  const heading = `## ${now.toISOString().slice(0, 10)} · ${topic ? `${topic}: ` : ''}${title}`;
  const refs = finding.refs?.length ? `Refs: ${finding.refs.map((r) => `\`${r.trim()}\``).join(', ')}\n\n` : '';
  const entry = `${heading}\n\n${refs}${body}\n`;

  const existing = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
  // The same finding recorded twice (same title, refs and body) is skipped, whatever the date.
  const withoutDate = entry.slice(entry.indexOf(' · '));
  if (existing?.includes(withoutDate)) return { status: 'duplicate', path };
  if (existing === undefined) writeFileSync(path, `${HEADER}\n${entry}`);
  else appendFileSync(path, `${existing.endsWith('\n') ? '' : '\n'}\n${entry}`);
  return { status: 'appended', path };
}
