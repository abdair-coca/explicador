import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spikeDir } from './log.ts';

export interface SessionInfo {
  sessionId: string;
  cwd: string;
  transcriptPath?: string;
}

export const sessionFile = join(spikeDir, 'session.json');

// Written by the SessionStart hook (record-session.ts); the MCP server has no other documented way to learn it.
export function readRecordedSession(): SessionInfo | undefined {
  if (!existsSync(sessionFile)) return undefined;
  const raw = JSON.parse(readFileSync(sessionFile, 'utf8')) as Record<string, unknown>;
  if (typeof raw.session_id !== 'string' || typeof raw.cwd !== 'string') return undefined;
  return {
    sessionId: raw.session_id,
    cwd: raw.cwd,
    transcriptPath: typeof raw.transcript_path === 'string' ? raw.transcript_path : undefined,
  };
}
