import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block, FlowBlock } from '../src/scene.ts';
import { withSnippets } from '../src/snippets.ts';
import { tempProject } from './helpers.ts';

function flowWith(codes: FlowBlock['codes']): Block[] {
  return [
    { type: 'markdown', text: '# Intro' },
    { type: 'flow', id: 'f', title: 'F', nodes: [], steps: [], drills: [], ...(codes ? { codes } : {}) },
  ];
}

describe('withSnippets', () => {
  it('copies the referenced lines (CRLF or LF) and leaves blocks without code untouched', () => {
    const root = tempProject({ 'src/a.js': 'one\r\ntwo\r\nthree\r\nfour\r\n', 'src/b.py': 'x = 1\n' });
    const blocks = flowWith([
      { node: 'n', ref: { path: 'src/a.js', start: 2, end: 3 }, note: 'Middle.' },
      { node: 'n', ref: { path: 'src/b.py', start: 1 }, note: 'Single line.' },
    ]);
    const [intro, flow] = withSnippets(root, blocks);
    assert.equal(intro, blocks[0], 'markdown blocks are returned as they are');
    assert.deepEqual((flow as FlowBlock).codes?.map((c) => c.lines), [['two', 'three'], ['x = 1']]);
    assert.equal((blocks[1] as FlowBlock).codes?.[0]?.lines, undefined, 'the input is not changed');
  });

  it('marks snippets whose file or lines are gone, and never reads outside the project', () => {
    const root = tempProject({ 'src/a.js': 'only\n' });
    const [, flow] = withSnippets(
      root,
      flowWith([
        { node: 'n', ref: { path: 'src/gone.js', start: 1, end: 2 }, note: 'Deleted.' },
        { node: 'n', ref: { path: 'src/a.js', start: 9, end: 12 }, note: 'Past the end.' },
        { node: 'n', ref: { path: '../outside.js', start: 1 }, note: 'Escapes.' },
      ]),
    );
    assert.deepEqual(
      (flow as FlowBlock).codes?.map((c) => [c.missing, c.lines]),
      [
        [true, undefined],
        [true, undefined],
        [true, undefined],
      ],
    );
  });

  it('cuts very long lines', () => {
    const root = tempProject({ 'min.js': `${'x'.repeat(1000)}\n` });
    const [, flow] = withSnippets(root, flowWith([{ node: 'n', ref: { path: 'min.js', start: 1 }, note: 'Minified.' }]));
    const line = (flow as FlowBlock).codes?.[0]?.lines?.[0] ?? '';
    assert.equal(line.length, 401);
    assert.ok(line.endsWith('…'));
  });
});
