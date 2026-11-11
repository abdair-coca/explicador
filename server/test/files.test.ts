import assert from 'node:assert/strict';
import { symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileLimits, readProjectFile, serveFile, serveTree } from '../src/files.ts';
import { buildTour, tourLimits } from '../src/tours.ts';
import { tempProject } from './helpers.ts';

describe('readProjectFile', () => {
  const root = tempProject({
    'src/a.js': 'one\r\ntwo\r\nthree\r\n',
    'src/empty.txt': '',
    'src/blank-ends.txt': 'x\n\n',
    'bin/data.bin': 'ab\0cd',
    'big.txt': 'x'.repeat(fileLimits.bytes + 1),
    '.env': 'SECRET=1',
    '.git/config': '[core]',
    'src/.hidden/x.js': 'x',
    'node_modules/dep/index.js': 'module.exports = 1;\n',
  });

  it('returns the lines of a text file, with CRLF or LF, without a phantom last line', () => {
    assert.deepEqual(readProjectFile(root, 'src/a.js'), { ok: true, path: 'src/a.js', lines: ['one', 'two', 'three'] });
    assert.deepEqual(readProjectFile(root, 'src/blank-ends.txt'), { ok: true, path: 'src/blank-ends.txt', lines: ['x', ''] });
    assert.deepEqual(readProjectFile(root, 'src/empty.txt'), { ok: true, path: 'src/empty.txt', lines: [''] });
  });

  it('refuses hidden files and folders, paths outside the project and odd paths', () => {
    for (const path of ['.env', '.git/config', 'src/.hidden/x.js', '../outside.txt', 'src/../../x', '/etc/passwd', 'src\\a.js', '', 'src/a.js\0']) {
      assert.deepEqual(readProjectFile(root, path), { ok: false, reason: 'denied' }, JSON.stringify(path));
    }
    // A drive path is absolute only on Windows; elsewhere it names a (missing) folder "C:" inside the project.
    assert.deepEqual(readProjectFile(root, 'C:/Windows/win.ini'), { ok: false, reason: process.platform === 'win32' ? 'denied' : 'missing' });
  });

  it('refuses binary, huge and missing files, and directories', () => {
    assert.deepEqual(readProjectFile(root, 'bin/data.bin'), { ok: false, reason: 'binary' });
    assert.deepEqual(readProjectFile(root, 'big.txt'), { ok: false, reason: 'too-large' });
    assert.deepEqual(readProjectFile(root, 'src/ghost.js'), { ok: false, reason: 'missing' });
    assert.deepEqual(readProjectFile(root, 'src'), { ok: false, reason: 'missing' });
  });

  it('does not follow a symbolic link out of the project', (t) => {
    const outside = tempProject({ 'secret.txt': 'top secret' });
    try {
      // A directory link: a junction on Windows (no privilege needed), a symbolic link elsewhere.
      symlinkSync(outside, join(root, 'src', 'linked'), 'junction');
    } catch {
      t.skip('links are not allowed here');
      return;
    }
    assert.deepEqual(readProjectFile(root, 'src/linked/secret.txt'), { ok: false, reason: 'denied' });
  });
});

describe('serveFile and serveTree', () => {
  const root = tempProject({ 'src/a.js': 'one\n', 'src/b.py': 'x = 1\n', 'node_modules/dep/i.js': 'x', '.env': 'S=1' });

  it('answers with a status the viewer can show', () => {
    assert.deepEqual(serveFile(root, 'src/a.js'), { status: 200, body: { path: 'src/a.js', lines: ['one'] } });
    assert.deepEqual(serveFile(root, 'nope.js'), { status: 404, body: { error: 'missing' } });
    assert.deepEqual(serveFile(root, '.env'), { status: 403, body: { error: 'denied' } });
    assert.deepEqual(serveFile(root, null), { status: 400, body: { error: 'denied' } });
  });

  it('lists the files of the index, without dot files or dependencies', () => {
    assert.deepEqual(serveTree(root), { status: 200, body: { files: ['src/a.js', 'src/b.py'], truncated: false } });
  });
});

describe('buildTour', () => {
  const root = tempProject({ 'src/a.js': 'a1\na2\na3\na4\na5\n', 'src/b.py': 'b1\nb2\n', 'pic.bin': 'x\0' });
  const step = (ref: string, note = 'What it does.') => ({ ref, note });

  it('builds a tour with a range per step and an id', () => {
    const result = buildTour(root, { title: ' How it works ', steps: [step('src/a.js:2-3'), step('src/b.py:1', '  Second.  ')] });
    assert.ok(result.ok);
    assert.equal(result.tour.title, 'How it works');
    assert.match(result.tour.id, /^[0-9a-f]{8}$/);
    assert.deepEqual(result.tour.steps, [
      { ref: { path: 'src/a.js', start: 2, end: 3 }, note: 'What it does.' },
      { ref: { path: 'src/b.py', start: 1, end: 1 }, note: 'Second.' },
    ]);
  });

  it('reports every bad step at once', () => {
    const result = buildTour(root, {
      title: '',
      steps: [
        step('src/a.js'),
        step('src/a.js:4-9'),
        step('src/ghost.js:1-2'),
        step('src/a.js:3-2'),
        step('.env:1-2'),
        step('pic.bin:1-1'),
        step('src/a.js:1-2', ' '),
        step(`src/a.js:1-${tourLimits.lines + 1}`),
      ],
    });
    assert.ok(!result.ok);
    const text = result.problems.join('\n');
    assert.match(text, /title/);
    assert.match(text, /step 1 \(src\/a\.js\): give a line range/);
    assert.match(text, /step 2 \(src\/a\.js:4-9\): the file has 5 lines/);
    assert.match(text, /step 3 .*does not exist/);
    assert.match(text, /step 4 .*end line is before/);
    assert.match(text, /step 5 .*hidden/);
    assert.match(text, /step 6 .*binary/);
    assert.match(text, /step 7: the note/);
    assert.match(text, /step 8 .*more than 80 lines/);
  });

  it('limits the number of steps', () => {
    const many = Array.from({ length: tourLimits.steps + 1 }, () => step('src/a.js:1-2'));
    assert.ok(!buildTour(root, { title: 'Many', steps: many }).ok);
    assert.ok(!buildTour(root, { title: 'None', steps: [] }).ok);
  });
});
