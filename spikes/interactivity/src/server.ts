// Spike MCP server: one viewer page, three ways to deliver its clicks to Claude Code.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Click } from './click.ts';
import { logEvent } from './log.ts';
import { channelCapability, pushChannelEvent } from './mechanisms/channel.ts';
import { Relauncher } from './mechanisms/relaunch.ts';
import { ClickQueue, registerWaitTool } from './mechanisms/wait.ts';
import { openInBrowser, startPage } from './page.ts';
import { readRecordedSession } from './session.ts';

const instructions = [
  'Explicador interactivity spike.',
  'Clicks in the viewer arrive as the result of wait_for_interaction or as <channel source="explicador-spike"> events.',
  'For each click, reply with one short sentence that names the clicked node.',
].join(' ');

const mcp = new McpServer(
  { name: 'explicador-spike', version: '0.0.0' },
  { capabilities: { experimental: channelCapability }, instructions },
);
const queue = new ClickQueue();
const relauncher = new Relauncher();

function deliver(click: Click): Promise<string> {
  logEvent('click', click);
  switch (click.mechanism) {
    case 'wait':
      return Promise.resolve(queue.push(click));
    case 'relaunch':
      return Promise.resolve(relauncher.relaunch(click));
    case 'channel':
      return pushChannelEvent(mcp.server, click);
  }
}

const pageUrl = await startPage({
  onClick: deliver,
  state: () => ({ waiting: queue.waiting, queued: queue.queued, session: readRecordedSession()?.sessionId }),
});

registerWaitTool(mcp, queue);
mcp.registerTool(
  'open_viewer',
  { description: 'Open the Explicador spike page in the browser and return its URL.' },
  async () => {
    openInBrowser(pageUrl);
    return { content: [{ type: 'text', text: `Opened ${pageUrl}` }] };
  },
);

await mcp.connect(new StdioServerTransport());
logEvent('server_started', {
  pid: process.pid,
  cwd: process.cwd(),
  // Names only: shows whether Claude Code exposes the session id to MCP servers.
  claudeEnvNames: Object.keys(process.env).filter((name) => /claude|session/i.test(name)),
  sessionIdEnv: process.env.CLAUDE_CODE_SESSION_ID,
});
