// End to end over stdio: the MCP server as Claude Code starts it, on a copy of the sample project.
import assert from 'node:assert/strict';
import { cpSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SceneCache } from '../src/cache/index.ts';
import { fakeViewer, tempProject, testBrief } from './helpers.ts';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const exl = readFileSync(join(repo, 'examples/scenes/login.exl.md'), 'utf8');

describe('MCP server over stdio', () => {
  const client = new Client({ name: 'e2e', version: '0.0.0' });
  // Before tempProject's cleanup: after hooks run in order, and Windows cannot delete the running server's cwd.
  after(() => client.close());
  const project = tempProject();
  cpSync(join(repo, 'examples/shop'), project, { recursive: true });
  const viewer = tempProject(fakeViewer);

  before(async () => {
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [join(repo, 'server/src/index.ts')],
        cwd: project,
        env: { ...env, CLAUDE_PROJECT_DIR: project, EXPLICADOR_NO_BROWSER: '1', EXPLICADOR_VIEWER_DIR: viewer },
        stderr: 'inherit',
      }),
    );
  });

  async function call(name: string, args: Record<string, unknown> = {}): Promise<{ text: string; isError: boolean }> {
    const result = (await client.callTool({ name, arguments: args })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
    };
    return { text: result.content.map((c) => c.text).join('\n'), isError: result.isError === true };
  }

  it('lists the tools', async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['add_finding', 'answer_question', 'ensure_index', 'explain_code', 'export_scene', 'read_notebook', 'render_scene', 'show_scene']);
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
    assert.match(rendered.text, /Rendered "login" \(<theme id="theme">, <arch id="login-architecture">, <trace id="login-trace">, <flow id="login-flow">, <quiz id="login-check">\)/);
    assert.match(rendered.text, /No warnings: the scene follows every rule the server checks\./);
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
    const body = (await ok.json()) as {
      scene: { status: string; changes: unknown[]; blocks: { type: string; codes?: { node: string; lines?: string[] }[] }[] };
    };
    assert.equal(body.scene.status, 'stale');
    assert.deepEqual(body.scene.changes, [{ path: 'src/auth/sessions.js', change: 'modified' }]);
    assert.deepEqual(
      body.scene.blocks.map((b) => b.type),
      ['markdown', 'theme', 'markdown', 'arch', 'markdown', 'trace', 'flow', 'quiz', 'markdown'],
    );
    // Key code arrives with the real lines, read from the project when the scene is shown.
    const password = body.scene.blocks[3]?.codes?.find((c) => c.node === 'password');
    assert.match(password?.lines?.join('\n') ?? '', /timingSafeEqual\(key, Buffer\.from\(expected, 'hex'\)\)/);
    assert.equal((await fetch(new URL('/api/scene', url), { headers: { 'x-token': 'nope' } })).status, 403);
    assert.equal((await fetch(new URL('/api/scene', url))).status, 403);
  });

  it('exports the current scene as a download and a cached scene as a file', async () => {
    const url = new URL(viewerUrl);
    const token = url.searchParams.get('t') ?? '';
    const download = await fetch(new URL('/api/export', url), { headers: { 'x-token': token } });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-disposition'), 'attachment; filename="login.html"');
    assert.match(await download.text(), /id="explicador-scene">\{"topic":"login"/);
    assert.equal((await fetch(new URL('/api/export', url))).status, 403);

    const exported = await call('export_scene', { topic: 'login' });
    assert.equal(exported.isError, false, exported.text);
    assert.match(exported.text, /Exported "login" to .*\.explicador[\\/]exports[\\/]login\.html/);
    assert.match(exported.text, /the scene is stale/);
    const html = readFileSync(join(project, '.explicador/exports/login.html'), 'utf8');
    assert.match(html, /"status":"stale"/);
    assert.equal((await call('export_scene', { topic: 'nothing here' })).isError, true);
  });

  it('rejects invalid EXL and missing refs without saving', async () => {
    const invalid = await call('render_scene', { topic: 'broken', exl: '<arch title="A">\n<node id="a" label="A" />' });
    assert.equal(invalid.isError, true);
    assert.match(invalid.text, /line 1, column 1: Unclosed <arch>/);

    const ghost = await call('render_scene', {
      topic: 'ghost',
      exl: `${testBrief}\n<arch title="A"><node id="a" label="A" ref="src/ghost.js" /></arch>`,
    });
    assert.equal(ghost.isError, true);
    assert.match(ghost.text, /- src\/ghost\.js/);
    assert.match((await call('show_scene', { topic: 'ghost' })).text, /No cached scene/);

    const unplanned = await call('render_scene', { topic: 'unplanned', exl: '# A\n\n<arch title="A">\n<node id="a" label="A" ref="src/ui/login-form.js:1-5" />\n</arch>' });
    assert.equal(unplanned.isError, true, 'a scene without a brief is refused');
    assert.match(unplanned.text, /^No <brief>, nothing saved\. Every scene opens with one, right after the # title/);
    assert.match(unplanned.text, /<brief form="process">\n<audience>/);
    assert.match(unplanned.text, /form is one of structure, process, quantity, system, annotated, argument, timeline\./);
    assert.match((await call('show_scene', { topic: 'unplanned' })).text, /No cached scene/);
  });

  it('caches <data> and <state> scenes and invalidates them through their refs', async () => {
    for (const [topic, file] of [
      ['data model', 'data-model.exl.md'],
      ['session lifecycle', 'session-states.exl.md'],
    ] as const) {
      const rendered = await call('render_scene', { topic, exl: readFileSync(join(repo, 'examples/scenes', file), 'utf8') });
      assert.equal(rendered.isError, false, rendered.text);
    }
    assert.match((await call('show_scene', { topic: 'data model' })).text, /is fresh: none of its 3 referenced files changed/);
    appendFileSync(join(project, 'src/cart/cart-service.js'), '\n// edited\n');
    assert.match((await call('show_scene', { topic: 'data model' })).text, /- src\/cart\/cart-service\.js \(modified\)/);
    // The state scene does not reference the cart, so it stays fresh.
    assert.match((await call('show_scene', { topic: 'session lifecycle' })).text, /is fresh/);
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

  it('asks a scene cached before briefs existed to be rebuilt with one', async () => {
    const old = exl.replace(/<brief[\s\S]*?<\/brief>\n\n/, '');
    assert.ok(!old.includes('<brief'));
    const saved = new SceneCache(project).save('old login', old, ['src/ui/login-form.js', 'src/api/auth-routes.js', 'src/auth/auth-service.js', 'src/auth/password.js', 'src/auth/sessions.js', 'src/db/users.js']);
    assert.ok(saved.ok);
    const shown = await call('show_scene', { topic: 'old login' });
    assert.match(shown.text, /It breaks a rule the server checks/);
    assert.match(shown.text, /^Warning: No <brief>: this scene was made before every scene opened with one\. Rebuild it under the same topic/m);
  });

  it('stores what a render asks to fix, and asks again before answering from the cache', async () => {
    const sloppy = `# Logging in\n\n${testBrief}\n\n<arch title="The login">\n<node id="form" label="Login form" ref="src/ui/login-form.js:1-5" />\n</arch>`;
    const rendered = await call('render_scene', { topic: 'sloppy', exl: sloppy });
    assert.equal(rendered.isError, false, 'warnings never block a render');
    assert.match(rendered.text, /^Warning: No <theme>/m);
    assert.match(rendered.text, /^Warning: These boxes have no desc.*"Login form"/m);
    assert.match(rendered.text, /^Warning: No <code>/m);
    assert.match(rendered.text, /^Warning: No component takes up the misconception of the brief/m);
    assert.match(rendered.text, /^Warning: No <quiz> with options/m);
    assert.match(rendered.text, /breaks 5 rules of the explicador skill: fix every warning and call render_scene again/);
    const cachePath = join(project, '.explicador/scenes/sloppy.json');
    const saved = JSON.parse(readFileSync(cachePath, 'utf8')) as { warnings?: string[] };
    assert.equal(saved.warnings?.length, 5, 'the cache keeps them, where an eval can read them');

    const shown = await call('show_scene', { topic: 'sloppy' });
    assert.match(shown.text, /is fresh/);
    assert.match(shown.text, /It breaks 5 rules the server checks\. Fix each warning below/);
    assert.match(shown.text, /^Warning: These boxes have no desc/m);
    assert.doesNotMatch(shown.text, /Answer from this EXL/);

    const fixed = await call('render_scene', { topic: 'sloppy', exl });
    assert.match(fixed.text, /No warnings/);
    assert.equal((JSON.parse(readFileSync(cachePath, 'utf8')) as { warnings?: string[] }).warnings, undefined);
    assert.match((await call('show_scene', { topic: 'sloppy' })).text, /Answer from this EXL/);
  });
});
