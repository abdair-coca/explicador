// Mechanism (c): push the click into the open session as a Claude Code channel event.
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { describeClick, type Click } from '../click.ts';
import { logEvent } from '../log.ts';

export const channelCapability = { 'claude/channel': {} };

export async function pushChannelEvent(server: Server, click: Click): Promise<string> {
  // Meta keys must be letters, digits or underscores; Claude Code drops other keys silently.
  await server.notification({
    method: 'notifications/claude/channel',
    params: { content: describeClick(click), meta: { node: click.node, sent_at: click.at } },
  });
  logEvent('channel_sent', { node: click.node });
  return 'channel event written (Claude Code sends no acknowledgment)';
}
