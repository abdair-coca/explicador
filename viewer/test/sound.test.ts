import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { play, remember, remembered, setSound, soundEnabled } from '../src/animation/sound.ts';

describe('sound switch', () => {
  it('is off by default and when storage fails, and reads back a remembered choice', () => {
    assert.equal(remembered({ getItem: () => null }), false);
    assert.equal(remembered({ getItem: () => 'on' }), true);
    assert.equal(
      remembered({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
      false,
    );
    const stored = new Map<string, string>();
    remember(true, { setItem: (key, value) => void stored.set(key, value) });
    assert.equal(remembered({ getItem: (key) => stored.get(key) ?? null }), true);
    assert.doesNotThrow(() =>
      remember(false, {
        setItem: () => {
          throw new Error('blocked');
        },
      }),
    );
  });

  it('stays silent without Web Audio, even when on', () => {
    setSound(true);
    assert.equal(soundEnabled(), true);
    assert.equal(play('pop'), false);
    setSound(false);
    assert.equal(play('ding'), false);
  });
});
