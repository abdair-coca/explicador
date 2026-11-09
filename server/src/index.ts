// Explicador MCP server (stdio). Started by Claude Code from the plugin's .mcp.json.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Bridge } from './bridge/index.ts';
import { SceneCache } from './cache/index.ts';
import { projectRoot } from './project.ts';
import { instructions, registerTools } from './tools.ts';

const root = projectRoot();
const bridge = new Bridge();
await bridge.start();

const mcp = new McpServer({ name: 'explicador', version: '0.1.0' }, { instructions });
registerTools(mcp, { root, bridge, cache: new SceneCache(root) });
await mcp.connect(new StdioServerTransport());

const shutdown = (): void => {
  void bridge.close().finally(() => process.exit(0));
};
process.stdin.on('close', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
