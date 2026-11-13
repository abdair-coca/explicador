// Explicador MCP server (stdio). Started by Claude Code from the plugin manifest.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Bridge } from './bridge/index.ts';
import { SceneCache } from './cache/index.ts';
import { removeRuntime, writeRuntime } from './clicks/index.ts';
import { serveProject } from './files.ts';
import { Navigator } from './navigation.ts';
import { projectRoot } from './project.ts';
import { instructions, registerTools } from './tools.ts';

const root = projectRoot();
const bridge = new Bridge();
await bridge.start();
const cache = new SceneCache(root);
const navigator = new Navigator(bridge, cache);
bridge.action('click', (body) => navigator.click(body));
bridge.action('open', (body) => navigator.open(body));
bridge.action('ask', (body) => navigator.ask(body));
bridge.action('follow', (body) => navigator.follow(body));
bridge.action('explain', (body) => navigator.explain(body));
serveProject(bridge, root);

// The monitor of this same session finds the bridge through this file.
const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
const runtimeFile = sessionId
  ? writeRuntime(root, sessionId, { origin: bridge.pageOrigin, token: bridge.token, pid: process.pid })
  : undefined;

const mcp = new McpServer({ name: 'explicador', version: '0.2.0' }, { instructions });
registerTools(mcp, { root, bridge, cache, navigator });
await mcp.connect(new StdioServerTransport());

let closing = false;
const shutdown = (): void => {
  if (closing) return;
  closing = true;
  if (runtimeFile) removeRuntime(runtimeFile);
  void bridge.close().finally(() => process.exit(0));
};
process.stdin.on('close', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
