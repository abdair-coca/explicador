import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchAtoms } from '../src/lesson/deriveMatch.ts';
import { buildSlides } from '../src/presentation/slides.ts';

const atoms = (text: string): string[] => text.split(' ');

describe('matchAtoms', () => {
  it('keeps the symbols two lines share, in order, and marks the rest as new', () => {
    // p = σ ( z )  →  p = 1 / ( 1 + e − z )
    assert.deepEqual(matchAtoms(atoms('p = σ ( z )'), atoms('p = 1 ( 1 + e − z )')), [0, 1, undefined, 3, undefined, undefined, undefined, undefined, 4, 5]);
  });

  it('follows a substitution: only the replaced symbol is new', () => {
    assert.deepEqual(matchAtoms(atoms('1 + e − z'), atoms('1 + e − 0.438')), [0, 1, 2, 3, undefined]);
  });

  it('never matches a symbol twice or out of order', () => {
    const matches = matchAtoms(atoms('a b a'), atoms('a a b a'));
    const used = matches.filter((match): match is number => match !== undefined);
    assert.equal(new Set(used).size, used.length);
    assert.deepEqual(used, [...used].sort((x, y) => x - y));
    assert.equal(used.length, 3);
  });

  it('handles empty lines', () => {
    assert.deepEqual(matchAtoms([], atoms('a b')), [undefined, undefined]);
    assert.deepEqual(matchAtoms(atoms('a b'), []), []);
  });
});

describe('a derivation in Present mode', () => {
  it('is one slide with one part per line', () => {
    assert.equal(buildSlides([{ type: 'derive', id: 'd', title: 'D', lines: [{ tex: 'a' }, { tex: 'b' }, { tex: 'c' }] }])[0]?.parts, 3);
  });
});
