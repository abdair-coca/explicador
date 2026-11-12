import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planParts } from '../src/presentation/partPlan.ts';

describe('planParts', () => {
  it('plays the first part of a slide that was just opened', () => {
    assert.deepEqual(planParts(undefined, { slide: 0, part: 0 }), { play: [0], rewind: [] });
    assert.deepEqual(planParts({ slide: 2, part: 3 }, { slide: 3, part: 0 }), { play: [0], rewind: [] });
  });

  it('shows a slide reached from the back as built, without playing anything', () => {
    assert.deepEqual(planParts({ slide: 3, part: 0 }, { slide: 2, part: 4 }), { play: [], rewind: [] });
  });

  it('plays the parts just revealed, in order', () => {
    assert.deepEqual(planParts({ slide: 1, part: 0 }, { slide: 1, part: 1 }), { play: [1], rewind: [] });
    assert.deepEqual(planParts({ slide: 1, part: 0 }, { slide: 1, part: 3 }), { play: [1, 2, 3], rewind: [] });
  });

  it('rewinds the parts just taken back, the last one first', () => {
    assert.deepEqual(planParts({ slide: 1, part: 2 }, { slide: 1, part: 1 }), { play: [], rewind: [2] });
    assert.deepEqual(planParts({ slide: 1, part: 3 }, { slide: 1, part: 0 }), { play: [], rewind: [3, 2, 1] });
  });

  it('moves nothing under reduced motion, or when the position did not change', () => {
    assert.deepEqual(planParts({ slide: 1, part: 0 }, { slide: 1, part: 1 }, true), { play: [], rewind: [] });
    assert.deepEqual(planParts(undefined, { slide: 0, part: 0 }, true), { play: [], rewind: [] });
    assert.deepEqual(planParts({ slide: 1, part: 1 }, { slide: 1, part: 1 }), { play: [], rewind: [] });
  });
});
