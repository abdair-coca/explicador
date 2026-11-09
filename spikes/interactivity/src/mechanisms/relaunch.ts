// Mechanism (b): run a headless Claude Code turn that resumes the recorded session.
import { spawn } from 'node:child_process';
import { describeClick, type Click } from '../click.ts';
import { logEvent } from '../log.ts';
import { readRecordedSession } from '../session.ts';

export class Relauncher {
  private running = false;

  relaunch(click: Click): string {
    if (this.running) return 'busy: a relaunch is already running';
    const session = readRecordedSession();
    if (!session) return 'no session id recorded yet (SessionStart hook did not run)';

    this.running = true;
    const startedAt = Date.now();
    const args = ['-p', '--resume', session.sessionId, '--output-format', 'json', describeClick(click)];
    const child = spawn('claude', args, { cwd: session.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error) => {
      this.running = false;
      logEvent('relaunch_error', { message: error.message });
    });
    child.on('close', (code) => {
      this.running = false;
      logEvent('relaunch_done', {
        code,
        ms: Date.now() - startedAt,
        resumedSessionId: session.sessionId,
        result: summarize(stdout),
        stderr: stderr.slice(0, 500),
      });
    });
    logEvent('relaunch_start', { sessionId: session.sessionId, pid: child.pid });
    return `relaunch started (pid ${child.pid ?? 'unknown'})`;
  }
}

function summarize(stdout: string): unknown {
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const { session_id, result, total_cost_usd, duration_ms, num_turns, usage, is_error } = parsed;
    return { session_id, result, total_cost_usd, duration_ms, num_turns, usage, is_error };
  } catch {
    return { raw: stdout.slice(0, 500) };
  }
}
