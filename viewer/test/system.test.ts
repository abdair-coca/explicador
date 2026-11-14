import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SystemBlock } from '../../server/src/scene.ts';
import { FACTOR, systemGeometry } from '../src/lesson/systemLayout.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { subtitleOf } from '../src/presentation/subtitles.ts';

const block: SystemBlock = {
  type: 'system',
  id: 's',
  title: 'Retries feed the load that causes them',
  factors: ['traffic', 'misses', 'load', 'cached'].map((id) => ({ id, label: id })),
  links: [
    { from: 'traffic', to: 'misses', sign: 'same' },
    { from: 'misses', to: 'load', sign: 'same' },
    { from: 'load', to: 'traffic', sign: 'same' },
    { from: 'misses', to: 'cached', sign: 'same' },
    { from: 'cached', to: 'misses', sign: 'opposite' },
  ],
  loops: [
    { through: ['misses', 'cached'], links: [3, 4], kind: 'balancing' },
    { through: ['traffic', 'misses', 'load'], links: [0, 1, 2], kind: 'reinforcing', label: 'Retry storm' },
  ],
  steps: [
    { kind: 'push', factor: 'traffic', change: 'up', narration: 'A sale.' },
    { kind: 'effect', factor: 'misses', change: 'up', link: 0, narration: 'More misses.' },
  ],
  moved: [{ traffic: 'up' }, { traffic: 'up', misses: 'up' }],
};

const inside = (geometry: ReturnType<typeof systemGeometry>, x: number, y: number, margin = 0): boolean =>
  x >= margin && x <= geometry.width - margin && y >= margin && y <= geometry.height - margin;

describe('the geometry of a system', () => {
  it('puts the factors on a ring, inside the frame, without boxes on top of each other', () => {
    const geometry = systemGeometry(block);
    const spots = [...geometry.factors.values()];
    assert.equal(spots.length, 4);
    assert.ok(spots[0] && spots[0].y < geometry.height / 2 && Math.abs(spots[0].x - geometry.width / 2) < 1, 'the first factor at the top');
    for (const spot of spots) assert.ok(inside(geometry, spot.x - FACTOR.w / 2, spot.y - FACTOR.h / 2) && inside(geometry, spot.x + FACTOR.w / 2, spot.y + FACTOR.h / 2));
    spots.forEach((a, i) => spots.slice(i + 1).forEach((b) => assert.ok(Math.abs(a.x - b.x) >= FACTOR.w || Math.abs(a.y - b.y) >= FACTOR.h, 'boxes apart')));
  });

  it('bends a link and its reverse to opposite sides, and starts each arrow outside its box', () => {
    const geometry = systemGeometry(block);
    const there = geometry.links[3];
    const back = geometry.links[4];
    assert.ok(there && back);
    assert.ok(Math.hypot(there.mid.x - back.mid.x, there.mid.y - back.mid.y) > 30, 'the two signs do not sit on each other');
    const misses = geometry.factors.get('misses');
    const [, sx = '0', sy = '0'] = /^M([\d.-]+) ([\d.-]+)/.exec(there.path) ?? [];
    assert.ok(misses && (Math.abs(Number(sx) - misses.x) > FACTOR.w / 2 || Math.abs(Number(sy) - misses.y) > FACTOR.h / 2), 'the arrow starts at the border');
  });

  it('keeps the loop badges inside the frame and apart', () => {
    const geometry = systemGeometry(block);
    assert.equal(geometry.loops.length, 2);
    for (const spot of geometry.loops) assert.ok(inside(geometry, spot.x, spot.y, 10));
    const [a, b] = geometry.loops;
    assert.ok(a && b && Math.hypot(a.x - b.x, a.y - b.y) >= 60);
  });

  it('faces two factors left and right', () => {
    const geometry = systemGeometry({ factors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], links: [{ from: 'a', to: 'b', sign: 'same' }], loops: [] });
    const [a, b] = [...geometry.factors.values()];
    assert.ok(a && b && a.x < b.x && Math.abs(a.y - b.y) < 1);
  });
});

describe('a system in Present', () => {
  it('shows the system at rest, then one part per step with its narration', () => {
    assert.equal(buildSlides([block])[0]?.parts, 3);
    assert.equal(subtitleOf(block, 0), undefined);
    assert.equal(subtitleOf(block, 2), 'More misses.');
  });
});

describe('the ring order', () => {
  it('follows the longest loop, and seats every other factor beside its closest neighbour', async () => {
    const { ringOrder } = await import('../src/lesson/systemLayout.ts');
    assert.deepEqual(ringOrder(block), ['traffic', 'misses', 'cached', 'load']);
    assert.deepEqual(ringOrder({ ...block, loops: [] }), ['traffic', 'load', 'misses', 'cached'], 'no loop: each beside the first factor it links to');
  });
});
