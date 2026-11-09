import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Measurements land next to the sandbox so the guided test can read them afterwards.
export const spikeDir = fileURLToPath(new URL('../sandbox/.spike/', import.meta.url));

export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  mkdirSync(spikeDir, { recursive: true });
  const line = JSON.stringify({ t: new Date().toISOString(), event, ...data });
  appendFileSync(join(spikeDir, 'events.jsonl'), `${line}\n`);
}
