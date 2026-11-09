// Questions about a box, without a monitor or a browser: what is saved, and when nothing is.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Bridge } from '../src/bridge/index.ts';
import { SceneCache } from '../src/cache/index.ts';
import { Navigator } from '../src/navigation.ts';
import { tempProject } from './helpers.ts';

const exl = '<arch id="parts" title="Parts"><node id="a" label="A" ref="src/a.js:1-2" /></arch>';

function setup(): { cache: SceneCache; bridge: Bridge; navigator: Navigator } {
  const cache = new SceneCache(tempProject({ 'src/a.js': 'const a = 1;\nexport default a;\n' }));
  const bridge = new Bridge({ openUrl: () => {} });
  const navigator = new Navigator(bridge, cache, () => Date.parse('2026-11-09T10:00:00Z'));
  const saved = cache.save('parts', exl, ['src/a.js']);
  assert.ok(saved.ok);
  navigator.show(saved.scene, 'fresh', []);
  return { cache, bridge, navigator };
}

describe('questions about a box', () => {
  it('saves nothing when no monitor would deliver the question', () => {
    const { cache, bridge, navigator } = setup();
    assert.deepEqual(navigator.ask({ block: 'parts', node: 'a', question: 'Why?' }), { status: 'no-monitor' });
    assert.deepEqual(cache.questions('parts'), []);
    assert.deepEqual(bridge.questions, []);
  });

  it('keeps answers with the scene, fills their lines when shown, and loses them on a new save', () => {
    const { cache, bridge, navigator } = setup();
    assert.equal(navigator.answer('parts', 'q1', { text: 'x' }), 'no-question');
    assert.equal(navigator.answer('ghost', 'q1', { text: 'x' }), 'no-scene');

    cache.saveQuestions('parts', [{ id: 'q1', block: 'parts', node: 'a', text: 'Why?', askedAt: '2026-11-09T09:00:00.000Z' }]);
    assert.equal(navigator.answer('parts', 'q1', { text: 'Because.', codes: [{ ref: { path: 'src/a.js', start: 2, end: 9 } }] }), 'answered');
    assert.deepEqual(bridge.questions[0]?.answer, {
      text: 'Because.',
      codes: [{ ref: { path: 'src/a.js', start: 2, end: 9 }, lines: ['export default a;', ''] }],
      answeredAt: '2026-11-09T10:00:00.000Z',
    });
    assert.deepEqual(cache.questions('parts')?.[0]?.answer?.codes, [{ ref: { path: 'src/a.js', start: 2, end: 9 } }]);

    const again = cache.save('parts', exl, ['src/a.js']);
    assert.ok(again.ok);
    assert.deepEqual(cache.questions('parts'), []);
  });

  it('answers a scene that is not on screen without touching the viewer', () => {
    const { cache, bridge, navigator } = setup();
    const other = cache.save('other', exl.replace('parts', 'other'), ['src/a.js']);
    assert.ok(other.ok);
    cache.saveQuestions('other', [{ id: 'q9', block: 'other', node: 'a', text: 'Why?', askedAt: '' }]);
    assert.equal(navigator.answer('other', 'q9', { text: 'Because.' }), 'answered');
    assert.deepEqual(bridge.questions, []);
    assert.equal(cache.questions('other')?.[0]?.answer?.text, 'Because.');
  });
});
