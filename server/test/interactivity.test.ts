// End to end: MCP server + click monitor of the same session + clicks from the page.
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, readFileSync } from 'node:fs';
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

  async function call(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean }> {
    const result = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean };
    return { text: result.content[0]?.text ?? '', isError: result.isError === true };
  }

  async function render(topic: string, exl: string): Promise<void> {
    const result = await call('render_scene', { topic, exl });
    assert.ok(!result.isError, result.text || 'render failed');
  }

  interface Asked {
    id: string;
    node: string;
    text: string;
    answer?: { text: string; codes?: { lines?: string[] }[]; scene?: { key: string } };
  }

  async function questions(): Promise<{ key: string; questions: Asked[] }> {
    const response = await fetch(`${origin}/api/questions`, { headers: { 'x-token': token } });
    return (await response.json()) as { key: string; questions: Asked[] };
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

  let questionId = '';

  it('sends a question about a box to the monitor as one line and keeps it waiting', async () => {
    const before = printed.length;
    const reply = await post('/api/ask', { block: 'routes-flow', node: 'routes', question: '  Why validate\nfirst?  ' });
    assert.equal(reply.json.status, 'sent');
    questionId = String(reply.json.id);
    const line = await waitFor(() => printed[before]);
    assert.match(
      line,
      /^Explicador viewer: the user asks about "handleLogin" \(node routes, function, src\/api\/auth-routes\.js:6-20\) in "handleLogin" of the scene "auth routes": "Why validate first\?" /,
    );
    assert.ok(line.includes(`answer_question (topic "auth routes", question "${questionId}")`));
    await delay(200);
    assert.equal(printed.length, before + 1);
    const waiting = await questions();
    assert.equal(waiting.key, 'auth-routes');
    assert.deepEqual(
      waiting.questions.map((q) => [q.id, q.node, q.text, q.answer]),
      [[questionId, 'routes', 'Why validate first?', undefined]],
    );
  });

  it('rejects empty and oversized questions without telling Claude', async () => {
    const before = printed.length;
    assert.equal((await post('/api/ask', { block: 'routes-flow', node: 'routes', question: '   ' })).json.status, 'invalid');
    assert.equal((await post('/api/ask', { block: 'routes-flow', node: 'routes', question: 'x'.repeat(501) })).json.status, 'invalid');
    assert.equal((await post('/api/ask', { block: 'routes-flow', node: 'ghost', question: 'Why?' })).json.status, 'unknown');
    assert.equal((await post('/api/ask', { block: 'routes-flow', node: 'routes', question: 'Why?' }, 'http://evil.example')).status, 403);
    await delay(200);
    assert.equal(printed.length, before);
    assert.equal((await questions()).questions.length, 1);
  });

  it('shows the answer with its code lines and a link to a scene drawn in the background', async () => {
    const hidden = await call('render_scene', { topic: 'validation', exl: routesExl.replace('routes-flow', 'validation-flow'), background: true });
    assert.match(hidden.text, /Cached "validation" .* without showing it/);
    assert.equal((await current()).key, 'auth-routes', 'a background scene does not move the viewer');

    const args = { topic: 'auth routes', question: questionId, answer: 'So the service never sees **bad input**.' };
    assert.match((await call('answer_question', { ...args, refs: ['src/api/auth-routes.js'] })).text, /give a line range/);
    assert.match((await call('answer_question', { ...args, refs: ['src/ghost.js:1-2'] })).text, /does not exist/);
    assert.match((await call('answer_question', { ...args, scene: 'never drawn' })).text, /no cached scene for "never drawn"/);
    assert.match((await call('answer_question', { ...args, question: 'nope' })).text, /no question "nope"/);
    assert.equal((await questions()).questions[0]?.answer, undefined, 'a rejected answer changes nothing');

    const answered = await call('answer_question', { ...args, refs: ['src/api/auth-routes.js:6-8'], scene: 'validation' });
    assert.equal(answered.isError, false, answered.text);
    const [question] = (await questions()).questions;
    assert.equal(question?.answer?.text, 'So the service never sees **bad input**.');
    assert.equal(question?.answer?.codes?.[0]?.lines?.length, 3);
    assert.equal(question?.answer?.scene?.key, 'validation');

    // Saved with the scene, without the copied lines.
    const saved = JSON.parse(readFileSync(join(project, '.explicador/scenes/auth-routes.json'), 'utf8')) as { questions: Asked[] };
    assert.deepEqual(saved.questions[0]?.answer?.codes, [{ ref: { path: 'src/api/auth-routes.js', start: 6, end: 8 } }]);
  });

  it('opens the linked scene one level down, and shows the questions again on the way back', async () => {
    assert.deepEqual((await post('/api/follow', { question: 'nope' })).json, { status: 'unknown' });
    assert.deepEqual((await post('/api/follow', { question: questionId })).json, { status: 'opened' });
    const scene = await current();
    assert.equal(scene.key, 'validation');
    assert.deepEqual(scene.trail.map((t) => t.key), ['login', 'auth-routes']);
    assert.deepEqual(await questions(), { key: 'validation', questions: [] });

    assert.deepEqual((await post('/api/open', { key: 'auth-routes' })).json, { status: 'opened' });
    assert.equal((await questions()).questions[0]?.id, questionId);
  });

  it('drops the questions when the scene is rendered again', async () => {
    await render('auth routes', routesExl);
    assert.deepEqual(await questions(), { key: 'auth-routes', questions: [] });
    assert.match((await call('answer_question', { topic: 'auth routes', question: questionId, answer: 'Late.' })).text, /no question/);
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
