import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { describeClick, findClickTarget, readRuntime, removeRuntime, runtimePath, writeRuntime } from '../src/clicks/index.ts';
import { parseExl, type Block } from '../src/parser/index.ts';
import type { ScenePayload } from '../src/scene.ts';
import { tempProject } from './helpers.ts';

function scene(exl: string): ScenePayload {
  const parsed = parseExl(exl);
  assert.ok(parsed.ok);
  const blocks: Block[] = parsed.scene.blocks;
  return { version: 1, topic: 'login', key: 'login', status: 'fresh', changes: [], savedAt: '', trail: [], blocks };
}

const login = scene(
  [
    '<arch id="overview" title="Login parts">',
    '  <node id="form" label="Login form" kind="ui" ref="src/ui/login-form.js:3-9" />',
    '  <node id="api" label="Auth routes" kind="service" />',
    '  <edge from="form" to="api" />',
    '  <drill node="api" topic="auth routes" />',
    '</arch>',
  ].join('\n'),
);

describe('click messages', () => {
  it('finds the clicked node and its drill topic from scene data', () => {
    assert.equal(findClickTarget(login, 'overview', 'api')?.topic, 'auth routes');
    assert.equal(findClickTarget(login, 'overview', 'api')?.drilled, true);
    assert.equal(findClickTarget(login, 'overview', 'form')?.topic, 'Login form');
    assert.equal(findClickTarget(login, 'overview', 'ghost'), undefined);
    assert.equal(findClickTarget(login, 'nope', 'form'), undefined);
    assert.equal(findClickTarget(login, 'overview', { evil: true }), undefined);
  });

  it('builds one line that names the node, its ref, the scene and the topic', () => {
    const target = findClickTarget(login, 'overview', 'form');
    assert.ok(target);
    const message = describeClick(login, target);
    assert.equal(
      message,
      'Explicador viewer: the user clicked "Login form" (node form, ui, src/ui/login-form.js:3-9) in "Login parts" of the scene "login" and wants to go deeper. Explain it with Explicador under the topic "Login form": call show_scene first, then build the scene with render_scene if it is missing or stale, and reply briefly in the chat.',
    );
    assert.ok(!/[\r\n]/.test(message));
  });
});

describe('runtime file', () => {
  it('is written per session and removed only by its owner', () => {
    const root = tempProject();
    const path = writeRuntime(root, 'session-1', { origin: 'http://127.0.0.1:1', token: 't', pid: 42 });
    assert.equal(path, runtimePath(root, 'session-1'));
    assert.ok(path && existsSync(path));
    assert.deepEqual(readRuntime(path), { origin: 'http://127.0.0.1:1', token: 't', pid: 42 });
    removeRuntime(path, 7);
    assert.ok(existsSync(path), 'another process must not remove it');
    removeRuntime(path, 42);
    assert.ok(!existsSync(path));
  });

  it('rejects session ids that could escape the folder', () => {
    assert.equal(runtimePath('/p', '../x'), undefined);
    assert.equal(runtimePath('/p', ''), undefined);
  });
});
