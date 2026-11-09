// End to end: MCP server + click monitor of the same session + clicks from the page.
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { after, before, describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { tempProject } from './helpers.ts';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const SESSION = 'e2e-session-1';

const loginExl = [
  '<arch id="overview" title="Login parts">',
  '  <node id="form" label="Login form" kind="ui" ref="src/ui/login-form.js" />',
  '  <group id="auth" label="Auth">',
  '    <node id="routes" label="Auth routes" kind="service" ref="src/api/auth-routes.js" />',
  '    <node id="service" label="Auth service" ref="src/auth/auth-service.js" />',
  '  </group>',
  '  <edge from="form" to="routes" />',
  '  <edge from="routes" to="service" />',
  '  <drill node="routes" topic="auth routes" />',
  '</arch>',
].join('\n');
const routesExl = [
  '<flow id="routes-flow" title="handleLogin">',
  '  <node id="routes" label="handleLogin" kind="function" ref="src/api/auth-routes.js:6-20" />',
  '  <step from="routes">Validates the body.</step>',
  '</flow>',
].join('\n');

describe('clicks reach the monitor of the same session', () => {
  const project = tempProject();
  cpSync(join(repo, 'examples/shop'), project, { recursive: true });
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  Object.assign(env, { CLAUDE_PROJECT_DIR: project, CLAUDE_CODE_SESSION_ID: SESSION, EXPLICADOR_NO_BROWSER: '1' });
  delete env.EXPLICADOR_DEV_ORIGIN;

  const client = new Client({ name: 'e2e', version: '0.0.0' });
  let monitor: ChildProcess;
  const printed: string[] = [];
  let origin = '';
  let token = '';

  before(async () => {
    // The monitor starts first, as Claude Code may start it before the MCP server.
    monitor = spawn(process.execPath, [join(repo, 'server/src/monitor.ts'), project], { env, stdio: ['ignore', 'pipe', 'inherit'] });
    createInterface({ input: monitor.stdout! }).on('line', (line) => printed.push(line));
    await client.connect(
      new StdioClientTransport({ command: process.execPath, args: [join(repo, 'server/src/index.ts')], cwd: project, env, stderr: 'inherit' }),
    );
  });
  after(async () => {
    monitor.kill();
    await client.close();
  });

  async function render(topic: string, exl: string): Promise<void> {
    const result = (await client.callTool({ name: 'render_scene', arguments: { topic, exl } })) as {
      content: { text: string }[];
      isError?: boolean;
    };
    assert.ok(!result.isError, result.content[0]?.text ?? 'render failed');
  }

  async function post(path: string, body: unknown, from = origin): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${origin}${path}`, {
      method: 'POST',
      headers: { 'x-token': token, origin: from, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, json: (await response.json()) as Record<string, unknown> };
  }

  async function current(): Promise<{ key: string; trail: { key: string }[] }> {
    const response = await fetch(`${origin}/api/scene`, { headers: { 'x-token': token } });
    return ((await response.json()) as { scene: { key: string; trail: { key: string }[] } }).scene;
  }

  async function waitFor<T>(check: () => T | undefined, ms = 5000): Promise<T> {
    for (let waited = 0; waited < ms; waited += 50) {
      const value = check();
      if (value !== undefined) return value;
      await delay(50);
    }
    throw new Error('timed out');
  }

  it('publishes the bridge in the per-session runtime file', async () => {
    const { readRuntime } = await import('../src/clicks/index.ts');
    const info = await waitFor(() => readRuntime(join(project, '.explicador/runtime', `${SESSION}.json`)));
    origin = info.origin;
    token = info.token;
    await render('login', loginExl);
  });

  it('prints exactly one line per click, built from scene data', async () => {
    // The monitor polls the runtime file once a second.
    await delay(1500);
    const reply = await post('/api/click', { block: 'overview', node: 'form', label: 'IGNORED page text' });
    assert.deepEqual(reply.json, { status: 'sent', topic: 'Login form', monitors: 1 });
    const line = await waitFor(() => printed[0]);
    assert.match(line, /^Explicador viewer: the user clicked "Login form" \(node form, ui, src\/ui\/login-form\.js\)/);
    assert.ok(!line.includes('IGNORED'));
    await delay(200);
    assert.equal(printed.length, 1);
  });

  it('treats the next rendered scene as the answer to the click and sets its trail', async () => {
    await render('Login form', routesExl);
    const scene = await current();
    assert.equal(scene.key, 'login-form');
    assert.deepEqual(scene.trail.map((t) => t.key), ['login']);
  });

  it('goes back through the breadcrumb, then opens a cached drill without asking Claude', async () => {
    assert.deepEqual((await post('/api/open', { key: 'login' })).json, { status: 'opened' });
    assert.deepEqual(await current().then((s) => [s.key, s.trail.length]), ['login', 0]);

    await render('auth routes', routesExl);
    await render('login', loginExl);
    const before = printed.length;
    assert.deepEqual((await post('/api/click', { block: 'overview', node: 'routes' })).json, {
      status: 'opened',
      topic: 'auth routes',
    });
    const scene = await current();
    assert.equal(scene.key, 'auth-routes');
    assert.deepEqual(scene.trail.map((t) => t.key), ['login']);
    assert.equal(printed.length, before, 'a cached drill does not reach Claude');
  });

  it('rejects unknown nodes, foreign origins and missing tokens', async () => {
    assert.deepEqual((await post('/api/click', { block: 'routes-flow', node: 'ghost' })).json, { status: 'unknown' });
    assert.equal((await post('/api/click', { block: 'routes-flow', node: 'routes' }, 'http://evil.example')).status, 403);
    const anonymous = await fetch(`${origin}/api/clicks`);
    assert.equal(anonymous.status, 403);
  });

  it('removes the runtime file when the server stops', async () => {
    await client.close();
    const path = join(project, '.explicador/runtime', `${SESSION}.json`);
    await waitFor(() => (existsSync(path) ? undefined : true));
  });
});
