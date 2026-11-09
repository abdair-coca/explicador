import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { SceneCache, topicKey } from '../src/cache/index.ts';
import { tempProject, writeFiles } from './helpers.ts';

const exl = '<arch title="A"><node id="a" label="A" ref="src/a.js" /></arch>';

describe('topicKey', () => {
  it('normalizes case, accents and punctuation', () => {
    assert.equal(topicKey('Login'), 'login');
    assert.equal(topicKey('  Flujo de autenticación / sesión '), 'flujo-de-autenticacion-sesion');
    assert.equal(topicKey('login-flow'), topicKey('Login flow'));
  });

  it('rejects topics without letters or digits', () => {
    assert.throws(() => topicKey('¿?'), /no letters or digits/);
  });
});

describe('SceneCache', () => {
  it('reports a missing scene', () => {
    const cache = new SceneCache(tempProject());
    assert.deepEqual(cache.lookup('login'), { status: 'missing', key: 'login' });
  });

  it('serves a saved scene as fresh while its files are unchanged', () => {
    const root = tempProject({ 'src/a.js': 'export const a = 1;\n', 'src/b.js': 'b\n' });
    const cache = new SceneCache(root);
    const saved = cache.save('Login', exl, ['src/a.js', 'src/b.js']);
    assert.ok(saved.ok);
    assert.ok(existsSync(join(root, '.explicador', 'scenes', 'login.json')));

    const lookup = cache.lookup('login');
    assert.equal(lookup.status, 'fresh');
    assert.equal(lookup.status === 'fresh' ? lookup.scene.exl : '', exl);
  });

  it('marks the scene stale when a referenced file changes or disappears', () => {
    const root = tempProject({ 'src/a.js': 'export const a = 1;\n', 'src/b.js': 'b\n' });
    const cache = new SceneCache(root);
    assert.ok(cache.save('login', exl, ['src/a.js', 'src/b.js']).ok);

    writeFileSync(join(root, 'src/a.js'), 'export const a = 2;\n');
    rmSync(join(root, 'src/b.js'));
    const lookup = cache.lookup('login');
    assert.equal(lookup.status, 'stale');
    assert.deepEqual(lookup.status === 'stale' ? lookup.changes : [], [
      { path: 'src/a.js', change: 'modified' },
      { path: 'src/b.js', change: 'deleted' },
    ]);
  });

  it('is fresh again when the content is restored (hashes, not timestamps)', () => {
    const root = tempProject({ 'src/a.js': 'one\n' });
    const cache = new SceneCache(root);
    assert.ok(cache.save('login', exl, ['src/a.js']).ok);
    writeFiles(root, { 'src/a.js': 'two\n' });
    assert.equal(cache.lookup('login').status, 'stale');
    writeFiles(root, { 'src/a.js': 'one\n' });
    assert.equal(cache.lookup('login').status, 'fresh');
  });

  it('ignores changes to files the scene does not reference', () => {
    const root = tempProject({ 'src/a.js': 'a\n', 'src/other.js': 'x\n' });
    const cache = new SceneCache(root);
    assert.ok(cache.save('login', exl, ['src/a.js']).ok);
    writeFiles(root, { 'src/other.js': 'y\n', 'src/new.js': 'z\n' });
    assert.equal(cache.lookup('login').status, 'fresh');
  });

  it('refuses to save a scene whose references do not exist or leave the project', () => {
    const cache = new SceneCache(tempProject({ 'src/a.js': 'a\n' }));
    assert.deepEqual(cache.save('login', exl, ['src/a.js', 'src/ghost.js', '../outside.js']), {
      ok: false,
      missing: ['src/ghost.js', '../outside.js'],
    });
    assert.equal(cache.lookup('login').status, 'missing');
  });

  it('treats a corrupted entry as missing and lists saved scenes', () => {
    const root = tempProject({ 'src/a.js': 'a\n' });
    const cache = new SceneCache(root);
    assert.ok(cache.save('login', exl, ['src/a.js']).ok);
    assert.ok(cache.save('checkout', exl, []).ok);
    assert.deepEqual(
      cache.list().map((l) => l.status),
      ['fresh', 'fresh'],
    );
    writeFileSync(join(root, '.explicador', 'scenes', 'login.json'), '{ not json');
    assert.equal(cache.lookup('login').status, 'missing');
  });
});
