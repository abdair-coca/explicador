import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { appendFinding } from '../src/findings/index.ts';
import { tempProject } from './helpers.ts';

const day = new Date('2026-11-09T10:00:00Z');

describe('appendFinding', () => {
  it('creates FINDINGS.md with a header and appends entries in order', () => {
    const root = tempProject({ 'src/auth.js': '' });
    const first = appendFinding(
      root,
      { title: 'Passwords are compared in constant time', body: 'Uses timingSafeEqual.', topic: 'login', refs: ['src/auth.js:3-9'] },
      day,
    );
    assert.equal(first.status, 'appended');
    appendFinding(root, { title: 'Sessions never expire', body: 'No TTL is set.' }, day);

    assert.equal(
      readFileSync(join(root, 'FINDINGS.md'), 'utf8'),
      [
        '# Findings',
        '',
        'Notes recorded by Explicador while explaining this project, oldest first.',
        '',
        '## 2026-11-09 · login: Passwords are compared in constant time',
        '',
        'Refs: `src/auth.js:3-9`',
        '',
        'Uses timingSafeEqual.',
        '',
        '## 2026-11-09 · Sessions never expire',
        '',
        'No TTL is set.',
        '',
      ].join('\n'),
    );
  });

  it('keeps existing content written by people', () => {
    const root = tempProject();
    writeFileSync(join(root, 'FINDINGS.md'), '# Our notes\n\nHand-written.');
    appendFinding(root, { title: 'T', body: 'B' }, day);
    assert.equal(readFileSync(join(root, 'FINDINGS.md'), 'utf8'), '# Our notes\n\nHand-written.\n\n## 2026-11-09 · T\n\nB\n');
  });

  it('skips a finding that is already recorded', () => {
    const root = tempProject();
    appendFinding(root, { title: 'T', body: 'B' }, day);
    assert.equal(appendFinding(root, { title: 'T', body: 'B' }, new Date('2026-12-01')).status, 'duplicate');
  });

  it('rejects multi-line titles, empty bodies and bad refs', () => {
    const root = tempProject();
    const result = appendFinding(root, { title: 'a\nb', body: ' ', refs: ['../x.js', 'src/ghost.js'] }, day);
    assert.deepEqual(result, {
      status: 'invalid',
      errors: [
        'title must be one non-empty line of at most 120 characters',
        'body must be non-empty and at most 4000 characters',
        'ref "../x.js": the path must stay inside the project',
        'ref "src/ghost.js": file not found',
      ],
    });
  });
});
