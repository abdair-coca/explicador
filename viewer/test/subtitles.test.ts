import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block } from '../../server/src/scene.ts';
import { keyAction } from '../src/presentation/slides.ts';
import { rememberSubtitles, subtitleOf, subtitlesRemembered } from '../src/presentation/subtitles.ts';

const flow: Block = {
  type: 'flow',
  id: 'f',
  title: 'F',
  nodes: [{ id: 'x', label: 'X', kind: 'module' }],
  steps: [
    { from: 'x', narration: 'The query becomes a vector.' },
    { from: 'x', narration: '  ' },
  ],
  drills: [],
};

describe('subtitleOf', () => {
  it('says the narration of the part on screen, and nothing for a blank one or a part past the end', () => {
    assert.equal(subtitleOf(flow, 0), 'The query becomes a vector.');
    assert.equal(subtitleOf(flow, 1), undefined);
    assert.equal(subtitleOf(flow, 5), undefined);
    assert.equal(subtitleOf(undefined, 0), undefined);
  });

  it('reads trace notes, journey stages, derivation notes, timeline events and calc notes part by part', () => {
    const trace: Block = { type: 'trace', id: 't', title: 'T', values: [{ label: 'a', text: 'x', note: 'Raw text.' }, { label: 'b', text: 'y' }] };
    assert.equal(subtitleOf(trace, 0), 'Raw text.');
    assert.equal(subtitleOf(trace, 1), undefined);
    const journey: Block = { type: 'journey', id: 'j', title: 'J', stages: [{ id: 's', label: 'S', kind: 'text', narration: 'Chunks.' }], drills: [] };
    assert.equal(subtitleOf(journey, 0), 'Chunks.');
    const derive: Block = { type: 'derive', id: 'd', title: 'D', lines: [{ tex: 'a' }, { tex: 'b', note: 'Substitute.' }] };
    assert.equal(subtitleOf(derive, 1), 'Substitute.');
    const timeline: Block = { type: 'timeline', id: 'tl', title: 'TL', events: [{ label: 'e', narration: 'First.' }] };
    assert.equal(subtitleOf(timeline, 0), 'First.');
    const calc: Block = { type: 'calc', id: 'c', title: 'C', kind: 'sum', parts: [{ label: 'a', value: '1', note: 'Bias.' }, { label: 'b', value: '2' }] };
    assert.equal(subtitleOf(calc, 0), 'Bias.');
    assert.equal(subtitleOf(calc, 2), undefined);
  });

  it('leaves the first part of a plot and a matrix silent, then says each mark and highlight', () => {
    const plot: Block = { type: 'plot', id: 'p', title: 'P', curves: [{ fn: 'sigmoid' }], marks: [{ x: '0.4', label: 'ours', narration: 'Just over half.' }] };
    assert.equal(subtitleOf(plot, 0), undefined);
    assert.equal(subtitleOf(plot, 1), 'Just over half.');
    const matrix: Block = { type: 'matrix', id: 'm', title: 'M', cols: ['a', 'b'], rows: [{ label: 'a', values: ['1', '2'] }], focuses: [{ cells: [{ row: 0 }], narration: 'The first row.' }] };
    assert.equal(subtitleOf(matrix, 0), undefined);
    assert.equal(subtitleOf(matrix, 1), 'The first row.');
  });
});

describe('subtitles choice', () => {
  it('is on by default and remembers when it is turned off', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    assert.equal(subtitlesRemembered(storage), true);
    rememberSubtitles(false, storage);
    assert.equal(subtitlesRemembered(storage), false);
    rememberSubtitles(true, storage);
    assert.equal(subtitlesRemembered(storage), true);
    assert.equal(subtitlesRemembered(undefined), true);
  });

  it('toggles with S', () => {
    assert.equal(keyAction('s'), 'subtitles');
    assert.equal(keyAction('S'), 'subtitles');
  });
});
