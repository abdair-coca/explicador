// Mechanism (a): a tool call that blocks until the viewer sends a click.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { describeClick, type Click } from '../click.ts';
import { logEvent } from '../log.ts';

const HEARTBEAT_MS = 60_000;
// Below the 30-minute stdio idle timeout in case the client sends no progress token.
const DEFAULT_TIMEOUT_S = 25 * 60;

type Waiter = (click: Click | undefined) => void;

export class ClickQueue {
  private readonly pending: Click[] = [];
  private waiter: Waiter | undefined;

  get waiting(): boolean {
    return this.waiter !== undefined;
  }

  get queued(): number {
    return this.pending.length;
  }

  push(click: Click): string {
    if (this.waiter) {
      this.settle(click);
      return 'delivered to the waiting wait_for_interaction call';
    }
    this.pending.push(click);
    return `queued for the next wait_for_interaction call (${this.pending.length} queued)`;
  }

  next(signal: AbortSignal, timeoutMs: number): Promise<Click | undefined> {
    const queued = this.pending.shift();
    if (queued) return Promise.resolve(queued);
    this.settle(undefined); // only one waiter at a time; the older call returns empty
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.settle(undefined), timeoutMs);
      const onAbort = (): void => this.settle(undefined);
      signal.addEventListener('abort', onAbort, { once: true });
      this.waiter = (click) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(click);
      };
    });
  }

  private settle(click: Click | undefined): void {
    const waiter = this.waiter;
    this.waiter = undefined;
    waiter?.(click);
  }
}

export function registerWaitTool(mcp: McpServer, queue: ClickQueue): void {
  mcp.registerTool(
    'wait_for_interaction',
    {
      description:
        'Block until the user clicks something in the Explicador viewer, then return what was clicked. ' +
        'After handling the click, call this tool again to keep listening.',
      inputSchema: { timeout_s: z.number().int().min(1).max(86_400).optional() },
    },
    async ({ timeout_s }, extra) => {
      const progressToken = extra._meta?.progressToken;
      const startedAt = Date.now();
      logEvent('wait_start', { hasProgressToken: progressToken !== undefined, queued: queue.queued });

      let beats = 0;
      const heartbeat = setInterval(() => {
        beats += 1;
        if (progressToken !== undefined) {
          void extra.sendNotification({
            method: 'notifications/progress',
            params: { progressToken, progress: beats, message: 'Waiting for a click in the viewer' },
          });
        }
      }, HEARTBEAT_MS);

      try {
        const click = await queue.next(extra.signal, (timeout_s ?? DEFAULT_TIMEOUT_S) * 1000);
        const waitedMs = Date.now() - startedAt;
        logEvent('wait_end', { waitedMs, beats, aborted: extra.signal.aborted, node: click?.node });
        const text = click ? describeClick(click) : 'No interaction before the timeout.';
        return { content: [{ type: 'text', text }] };
      } finally {
        clearInterval(heartbeat);
      }
    },
  );
}
