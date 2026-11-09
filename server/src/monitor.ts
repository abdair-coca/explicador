// Plugin monitor: Claude Code turns every line this process prints into a message for Claude.
// It prints only click messages from the bridge of the same session; nothing else goes to stdout.
//   node monitor.js [project-dir]
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { readRuntime, runtimePath } from './clicks/index.ts';

const RETRY_MS = 1000;
const root = resolve(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const sessionId = process.env.CLAUDE_CODE_SESSION_ID ?? '';
const file = runtimePath(root, sessionId);

if (!file) {
  // Without a session id there is no bridge to follow; stay idle instead of exiting with noise.
  setInterval(() => {}, 1 << 30);
} else {
  for (;;) {
    try {
      await follow(file);
    } catch {
      // The server is not up yet, restarted on a new port, or went away: read the file again.
    }
    await delay(RETRY_MS);
  }
}

async function follow(path: string): Promise<void> {
  const info = readRuntime(path);
  if (!info) return;
  const response = await fetch(`${info.origin}/api/clicks`, { headers: { 'x-token': info.token } });
  if (!response.ok || !response.body) return;
  let buffer = '';
  for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const lines = event.split('\n');
      if (!lines.includes('event: click')) continue;
      const data = lines.find((line) => line.startsWith('data: '));
      if (data) process.stdout.write(`${data.slice('data: '.length)}\n`);
    }
  }
}
