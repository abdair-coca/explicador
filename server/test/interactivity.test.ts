// End to end: MCP server + click monitor of the same session + clicks from the page.
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

  /** Reads the event stream until `marker` shows up (or the time runs out) and returns what arrived. */
  async function readEvents(marker: string, trigger?: () => Promise<unknown>): Promise<string> {
    const abort = new AbortController();
    const response = await fetch(`${origin}/api/events?t=${token}`, { signal: abort.signal });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let received = '';
    const reading = (async () => {
      while (!received.includes(marker)) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value);
      }
    })();
    if (trigger) {
      await delay(100);
      await trigger();
    }
    await Promise.race([reading, delay(3000)]);
    abort.abort();
    await reading.catch(() => {});
    return received;
  }

  const tourSteps = [
    { ref: 'src/api/auth-routes.js:6-8', note: 'It **validates** the body first.' },
    { ref: 'src/api/auth-routes.js:18-19', note: 'Then it sets the cookie.' },
  ];

  it('serves project files and the tree to the viewer, behind the token', async () => {
    const get = (path: string, from = token) => fetch(`${origin}${path}`, { headers: from ? { 'x-token': from } : {} });
    const file = await get('/api/file?path=src/api/auth-routes.js');
    assert.equal(file.status, 200);
    const body = (await file.json()) as { path: string; lines: string[] };
    assert.equal(body.path, 'src/api/auth-routes.js');
    assert.ok(body.lines.length >= 19);
    assert.equal((await get('/api/file?path=.explicador/runtime/x.json')).status, 403);
    assert.equal((await get('/api/file?path=..%2F..%2Fpackage.json')).status, 403);
    assert.equal((await get('/api/file?path=src/ghost.js')).status, 404);
    assert.equal((await get('/api/file')).status, 400);
    assert.equal((await get('/api/file?path=src/api/auth-routes.js', '')).status, 403);
    const tree = (await (await get('/api/tree')).json()) as { files: string[] };
    assert.ok(tree.files.includes('src/api/auth-routes.js'));
    assert.ok(!tree.files.some((path) => path.startsWith('.')));
  });

  it('opens a tour with explain_code, and replays it to a viewer that connects later', async () => {
    const refused = await call('explain_code', { title: 'Bad', steps: [{ ref: 'src/ghost.js:1-2', note: 'x' }] });
    assert.ok(refused.isError);
    assert.match(refused.text, /step 1 .*does not exist/);

    let started = { isError: true, text: '' };
    const events = await readEvents('event: tour', async () => {
      started = await call('explain_code', { title: 'How login is checked', steps: tourSteps });
    });
    assert.ok(!started.isError, started.text);
    assert.match(started.text, /2 steps\) is open in the code window/);
    const tour = JSON.parse(/event: tour\ndata: (.*)\n/.exec(events)?.[1] ?? 'null') as { id: string; title: string; steps: { ref: unknown; note: string }[] };
    assert.equal(tour.title, 'How login is checked');
    assert.deepEqual(tour.steps[0], { ref: { path: 'src/api/auth-routes.js', start: 6, end: 8 }, note: 'It **validates** the body first.' });

    const later = await readEvents('event: tour');
    assert.ok(later.includes(`"id":"${tour.id}"`), 'a viewer that connects afterwards gets the last tour');
  });

  it('keeps a tour in the answer to a question, and refuses an answer whose tour is wrong', async () => {
    const asked = await post('/api/ask', { block: 'routes-flow', node: 'routes', question: 'Walk me through it' });
    const id = String(asked.json.id);
    const args = { topic: 'auth routes', question: id, answer: 'Here is the path.' };
    const bad = await call('answer_question', { ...args, tour: { title: 'Bad', steps: [{ ref: 'src/api/auth-routes.js:99-120', note: 'x' }] } });
    assert.ok(bad.isError);
    assert.match(bad.text, /fix the tour/);
    assert.equal((await questions()).questions.find((q) => q.id === id)?.answer, undefined);

    const good = await call('answer_question', { ...args, tour: { title: 'Login path', steps: tourSteps } });
    assert.ok(!good.isError, good.text);
    const answer = (await questions()).questions.find((q) => q.id === id)?.answer as { tour?: { title: string; steps: unknown[] } } | undefined;
    assert.equal(answer?.tour?.title, 'Login path');
    assert.equal(answer?.tour?.steps.length, 2);
    const saved = JSON.parse(readFileSync(join(project, '.explicador/scenes/auth-routes.json'), 'utf8')) as { questions: { answer?: { tour?: unknown } }[] };
    assert.ok(saved.questions.some((q) => q.answer?.tour), 'the tour is saved with the scene');
  });

  it('reads a notebook as numbered cells, and warns about boxes that point at a whole notebook', async () => {
    const cell = (type: string, source: string) => ({ cell_type: type, metadata: {}, source, ...(type === 'code' ? { execution_count: null, outputs: [] } : {}) });
    writeFileSync(
      join(project, 'analysis.ipynb'),
      JSON.stringify({ nbformat: 4, nbformat_minor: 5, metadata: {}, cells: [cell('markdown', '# Plan'), cell('code', 'x = 1'), cell('code', 'y = x + 1'), cell('code', 'print(y)')] }),
    );
    const outline = await call('read_notebook', { path: 'analysis.ipynb' });
    assert.match(outline.text, /4 cells\. Refs use cell numbers/);
    assert.match(outline.text, /\[2\] code: x = 1/);
    assert.match((await call('read_notebook', { path: 'analysis.ipynb', cells: '3' })).text, /--- \[3\] code\ny = x \+ 1/);
    assert.ok((await call('read_notebook', { path: 'src/api/auth-routes.js' })).isError);
    assert.ok((await call('read_notebook', { path: 'analysis.ipynb', cells: '1-40' })).isError);

    const exl = (ref: string) => `<arch id="nb" title="Notebook">\n<node id="n" label="Analysis" ref="${ref}" />\n</arch>`;
    const whole = await call('render_scene', { topic: 'notebook whole', exl: exl('analysis.ipynb') });
    assert.ok(!whole.isError, whole.text);
    assert.match(whole.text, /Warning: these boxes point at a whole file.*Analysis \(analysis\.ipynb\)/);
    const ranged = await call('render_scene', { topic: 'notebook cells', exl: exl('analysis.ipynb:2-3') });
    assert.ok(!ranged.isError && !ranged.text.includes('point at a whole file'), ranged.text);
    // The cached notebook scene has no chapters: show_scene asks for a lesson instead of answering from it.
    const shown = await call('show_scene', { topic: 'notebook cells' });
    assert.match(shown.text, /predates lessons\. Rebuild it as a lesson/);
    assert.doesNotMatch((await call('show_scene', { topic: 'auth routes' })).text, /predates lessons/);
    await render('auth routes', routesExl);
  });

  it('turns "Explain code" into one line for Claude, for a box or for the file being read', async () => {
    const before = printed.length;
    assert.deepEqual((await post('/api/explain', { block: 'routes-flow', node: 'routes' })).json, { status: 'sent' });
    const line = await waitFor(() => printed[before]);
    assert.match(line, /^Explicador viewer: the user asks you to explain the code of "handleLogin" \(node routes, function, src\/api\/auth-routes\.js:6-20\)/);
    assert.match(line, /call explain_code/);

    assert.deepEqual((await post('/api/explain', { path: 'src/api/auth-routes.js', start: 6, end: 8 })).json, { status: 'sent' });
    assert.match(await waitFor(() => printed[before + 1]), /reading in the code window: src\/api\/auth-routes\.js:6-8\. /);

    assert.deepEqual((await post('/api/explain', { path: '.env' })).json, { status: 'unknown' });
    assert.deepEqual((await post('/api/explain', { path: 'src/ghost.js' })).json, { status: 'unknown' });
    assert.deepEqual((await post('/api/explain', { block: 'routes-flow', node: 'ghost' })).json, { status: 'unknown' });
    assert.equal((await post('/api/explain', { block: 'routes-flow', node: 'routes' }, 'http://evil.example')).status, 403);
    await delay(200);
    assert.equal(printed.length, before + 2);
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
