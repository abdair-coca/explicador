import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TraceValue } from '../../server/src/scene.ts';
import { barsOf, keyed, pieceChanges, pieceKey, pieceNames, vectorOf } from '../src/lesson/traceShape.ts';

const text = (t: string): TraceValue => ({ label: 'T', text: t });
const list = (...names: string[]): TraceValue => ({ label: 'L', text: names.join('|'), kind: 'list', items: names.map((name) => ({ name })) });

describe('trace pieces', () => {
  it('matches a word to its chip, row and bar whatever its case, accents or punctuation', () => {
    assert.equal(pieceKey('Not,'), 'not');
    assert.equal(pieceKey('Película'), 'pelicula');
    assert.equal(pieceKey('?'), '?');
    assert.deepEqual(keyed(['good', 'Good!', 'bad']), ['good', 'good#2', 'bad']);
  });

  it('names the pieces of each form', () => {
    assert.deepEqual(pieceNames(text('Not good at all')), ['Not', 'good', 'at', 'all']);
    assert.deepEqual(pieceNames(list('not', 'good')), ['not', 'good']);
    assert.deepEqual(pieceNames({ label: 'N', text: '0.61', kind: 'number' }), []);
  });

  it('counts what a step kept, dropped and brought in', () => {
    assert.deepEqual(pieceChanges(text('Not good at all, I hated it'), list('not', 'good', 'hated', 'not good')), { kept: 3, removed: 4, added: 1 });
  });

  it('measures bars against the largest absolute value', () => {
    const bars = barsOf([
      { name: 'good', value: '+0.5' },
      { name: 'hated', value: '-1' },
      { name: 'it', value: '0' },
    ]);
    assert.deepEqual(
      bars.map((bar) => [bar.key, bar.text, bar.value, bar.share]),
      [
        ['good', '+0.5', 0.5, 0.5],
        ['hated', '-1', -1, 1],
        ['it', '0', 0, 0],
      ],
    );
    assert.deepEqual(barsOf([{ name: 'a', value: '0' }]).map((bar) => bar.share), [0]);
  });
});

describe('vectorOf', () => {
  it('measures each number against the largest one and counts the dimensions not shown', () => {
    const { cells, hidden, size } = vectorOf({ label: 'v', text: '', kind: 'vector', dims: 768, items: [{ name: '1', value: '0.2' }, { name: '2', value: '-0.4' }] });
    assert.deepEqual(cells, [{ n: 1, text: '0.2', value: 0.2, share: 0.5 }, { n: 2, text: '-0.4', value: -0.4, share: 1 }]);
    assert.equal(hidden, 766);
    assert.equal(size, 768);
  });

  it('shows the whole vector when it has no dims', () => {
    assert.equal(vectorOf({ label: 'v', text: '', kind: 'vector', items: [{ name: '1', value: '0' }] }).hidden, 0);
  });
});
