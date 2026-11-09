// SessionStart hook: stores the session id so the relaunch mechanism (b) can resume it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { logEvent, spikeDir } from './log.ts';
import { sessionFile } from './session.ts';

const input = JSON.parse(readFileSync(0, 'utf8')) as Record<string, unknown>;
const record = {
  session_id: input.session_id,
  transcript_path: input.transcript_path,
  cwd: input.cwd,
  source: input.source,
  recorded_at: new Date().toISOString(),
};
mkdirSync(spikeDir, { recursive: true });
writeFileSync(sessionFile, JSON.stringify(record, null, 2));
logEvent('session_start_hook', record);
