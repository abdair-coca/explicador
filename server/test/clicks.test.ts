import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { describeClick, describeQuestion, findClickTarget, readRuntime, removeRuntime, runtimePath, writeRuntime } from '../src/clicks/index.ts';
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

  it('quotes a question as data and names the tool, the topic and the question id', () => {
    const target = findClickTarget(login, 'overview', 'api');
    assert.ok(target);
    const question = { id: 'ab12cd34', block: 'overview', node: 'api', text: 'What if "it" fails?', askedAt: '' };
    const message = describeQuestion(login, target, question);
    assert.ok(
      message.startsWith(
        'Explicador viewer: the user asks about "Auth routes" (node api, service) in "Login parts" of the scene "login": "What if \\"it\\" fails?" ' +
          'Answer in the user\'s language with answer_question (topic "login", question "ab12cd34"):',
      ),
      message,
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

describe('click targets in <data> and <state>', () => {
  const views = scene(
    [
      '<data id="model" title="Model">',
      '  <entity id="user" label="User" ref="src/db/users.js"><field name="id" key="pk" /></entity>',
      '  <drill node="user" topic="users table" />',
      '</data>',
      '<state id="life" title="Session">',
      '  <status id="anon" label="Anonymous" role="initial" />',
      '</state>',
    ].join('\n'),
  );

  it('finds entities and states, with their drills', () => {
    const entity = findClickTarget(views, 'model', 'user');
    assert.equal(entity?.topic, 'users table');
    assert.match(describeClick(views, entity!), /clicked "User" \(node user, entity, src\/db\/users\.js\) in "Model"/);
    const state = findClickTarget(views, 'life', 'anon');
    assert.equal(state?.topic, 'Anonymous');
    assert.equal(state?.node.kind, 'state');
  });
});
