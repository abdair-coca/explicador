// Plugin monitor for mechanism (d): Claude Code turns every stdout line of this process into a message.
// Print only click messages here; diagnostics go to the event log.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { logEvent, spikeDir } from './log.ts';

const RETRY_MS = 1000;
const urlFile = join(spikeDir, 'url.txt');

logEvent('feed_started', {
  pid: process.pid,
  cwd: process.cwd(),
  claudeEnvNames: Object.keys(process.env).filter((name) => /claude|session/i.test(name)),
  sessionIdEnv: process.env.CLAUDE_CODE_SESSION_ID,
});

for (;;) {
  try {
    await followServer();
  } catch (error) {
    logEvent('feed_disconnected', { message: String(error) });
  }
  await delay(RETRY_MS);
}

// The MCP server may start after this process or leave a stale url.txt behind, so keep retrying.
async function followServer(): Promise<void> {
  if (!existsSync(urlFile)) return;
  const { origin, searchParams } = new URL(readFileSync(urlFile, 'utf8').trim());
  const response = await fetch(`${origin}/events`, { headers: { 'x-token': searchParams.get('t') ?? '' } });
  if (!response.ok || !response.body) throw new Error(`events stream refused: ${response.status}`);
  logEvent('feed_connected', { origin });

  let buffer = '';
  for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    const messages = buffer.split('\n\n');
    buffer = messages.pop() ?? '';
    for (const message of messages) printClick(message);
  }
}

function printClick(message: string): void {
  if (!message.startsWith('data: ')) return;
  process.stdout.write(`${message.slice('data: '.length)}\n`);
  logEvent('feed_printed');
}
