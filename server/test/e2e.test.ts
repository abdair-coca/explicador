// End to end over stdio: the MCP server as Claude Code starts it, on a copy of the sample project.
import assert from 'node:assert/strict';
import { cpSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tempProject } from './helpers.ts';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const exl = readFileSync(join(repo, 'examples/scenes/login.exl.md'), 'utf8');

describe('MCP server over stdio', () => {
  const project = tempProject();
  cpSync(join(repo, 'examples/shop'), project, { recursive: true });
  const client = new Client({ name: 'e2e', version: '0.0.0' });

  before(async () => {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [join(repo, 'server/src/index.ts')],
        cwd: project,
        env: { ...env, CLAUDE_PROJECT_DIR: project, EXPLICADOR_NO_BROWSER: '1' },
        stderr: 'inherit',
      }),
    );
  });
  after(() => client.close());

  async function call(name: string, args: Record<string, unknown> = {}): Promise<{ text: string; isError: boolean }> {
    const result = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { text: result.content.map((c) => c.text).join('\n'), isError: result.isError === true };
  }

  it('lists the four tools', async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['add_finding', 'ensure_index', 'render_scene', 'show_scene']);
  });

  it('builds the index with the import graph', async () => {
    const { text } = await call('ensure_index');
    assert.match(text, /Index created: \d+ files/);
    assert.match(text, /src\/auth\/auth-service\.js -> src\/db\/users\.js, src\/auth\/password\.js, src\/auth\/sessions\.js/);
  });

  let viewerUrl = '';

  it('renders, caches and serves a scene, then marks it stale after an edit', async () => {
    assert.match((await call('show_scene', { topic: 'login' })).text, /No cached scene for "login"/);

    const rendered = await call('render_scene', { topic: 'login', exl });
    assert.equal(rendered.isError, false, rendered.text);
    assert.match(rendered.text, /Rendered "login" \(<arch id="login-architecture">, <flow id="login-flow">\)/);
    viewerUrl = /at (http:\/\/127\.0\.0\.1:\d+\/\?t=[a-f0-9]+)/.exec(rendered.text)?.[1] ?? '';
    assert.ok(viewerUrl);

    const fresh = await call('show_scene', { topic: 'Login' });
    assert.match(fresh.text, /Scene "Login" is fresh: none of its 6 referenced files changed/);
    assert.ok(fresh.text.includes('<flow id="login-flow"'), 'returns the cached EXL');

    appendFileSync(join(project, 'src/auth/sessions.js'), '\n// edited\n');
    const stale = await call('show_scene', { topic: 'login' });
    assert.match(stale.text, /Scene "login" is stale/);
    assert.match(stale.text, /- src\/auth\/sessions\.js \(modified\)/);
  });

  it('serves the current scene to the viewer only with the token and the right Host', async () => {
    const url = new URL(viewerUrl);
    const token = url.searchParams.get('t') ?? '';
    const ok = await fetch(new URL('/api/scene', url), { headers: { 'x-token': token } });
    const body = (await ok.json()) as { scene: { status: string; changes: unknown[]; blocks: { type: string }[] } };
    assert.equal(body.scene.status, 'stale');
    assert.deepEqual(body.scene.changes, [{ path: 'src/auth/sessions.js', change: 'modified' }]);
    assert.deepEqual(
      body.scene.blocks.map((b) => b.type),
      ['markdown', 'arch', 'flow', 'markdown'],
    );
    assert.equal((await fetch(new URL('/api/scene', url), { headers: { 'x-token': 'nope' } })).status, 403);
    assert.equal((await fetch(new URL('/api/scene', url))).status, 403);
  });

  it('rejects invalid EXL and missing refs without saving', async () => {
    const invalid = await call('render_scene', { topic: 'broken', exl: '<arch title="A">\n<node id="a" label="A" />' });
    assert.equal(invalid.isError, true);
    assert.match(invalid.text, /line 1, column 1: Unclosed <arch>/);

    const ghost = await call('render_scene', {
      topic: 'ghost',
      exl: '<arch title="A"><node id="a" label="A" ref="src/ghost.js" /></arch>',
    });
    assert.equal(ghost.isError, true);
    assert.match(ghost.text, /- src\/ghost\.js/);
    assert.match((await call('show_scene', { topic: 'ghost' })).text, /No cached scene/);
  });

  it('appends findings to FINDINGS.md', async () => {
    const result = await call('add_finding', {
      title: 'Sessions are lost on restart',
      body: 'The session store is an in-memory Map.',
      topic: 'login',
      refs: ['src/auth/sessions.js:4-5'],
    });
    assert.match(result.text, /Appended to/);
    assert.match(readFileSync(join(project, 'FINDINGS.md'), 'utf8'), /· login: Sessions are lost on restart/);
    writeFileSync(join(project, 'unused.txt'), '');
  });
});
