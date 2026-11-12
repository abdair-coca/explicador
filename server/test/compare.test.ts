import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type CompareBlock, type TimelineBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};

describe('<compare>', () => {
  const pairs = '<pair label="Rare words" a="count like any other" b="weigh **more**" winner="b" />\n<pair label="Speed" a="fast" b="fast" winner="tie" />\n<pair label="Values" a="whole counts" b="decimals" />';
  const compare = (body = pairs, attrs = ' a="Counts" b="TF-IDF"') => `<compare title="Two ways to count"${attrs}>\n${body}\n</compare>`;

  it('reads the two sides and their rows', () => {
    const parsed = parseExl(compare());
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'compare',
      id: 'compare-1',
      title: 'Two ways to count',
      a: 'Counts',
      b: 'TF-IDF',
      rows: [
        { label: 'Rare words', a: 'count like any other', b: 'weigh **more**', winner: 'b' },
        { label: 'Speed', a: 'fast', b: 'fast', winner: 'tie' },
        { label: 'Values', a: 'whole counts', b: 'decimals' },
      ],
    } satisfies CompareBlock);
  });

  it('refuses equal names, one row, an unknown winner and a broken formula', () => {
    assert.match(errorsOf(compare(pairs, ' a="Same" b="Same"'))[0] ?? '', /need different names/);
    assert.match(errorsOf(compare('<pair label="x" a="1" b="2" />'))[0] ?? '', /at least two <pair>s/);
    assert.match(errorsOf(compare('<pair label="x" a="1" b="2" winner="left" />\n<pair label="y" a="1" b="2" />'))[0] ?? '', /Unknown winner "left"; use a, b, tie/);
    assert.match(errorsOf(compare('<pair label="x" a="$\\frac{$" b="2" />\n<pair label="y" a="1" b="2" />'))[0] ?? '', /is not valid LaTeX/);
    assert.match(errorsOf(compare(pairs, ' a="Counts"'))[0] ?? '', /missing the "b" attribute/);
  });
});

describe('<timeline>', () => {
  const timeline = (body: string) => `<timeline title="From text to answer">\n${body}\n</timeline>`;

  it('reads the events with their dates, narration and refs', () => {
    const parsed = parseExl(timeline('<event label="Clean" when="cell 6" ref="nb/p2.ipynb:6">Filler words go.</event>\n<event label="Train">The model learns 70 weights.</event>'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual((parsed.scene.blocks[0] as TimelineBlock).events, [
      { label: 'Clean', when: 'cell 6', narration: 'Filler words go.', ref: { path: 'nb/p2.ipynb', start: 6 } },
      { label: 'Train', narration: 'The model learns 70 weights.' },
    ]);
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
  });

  it('refuses one event and an event without narration', () => {
    assert.match(errorsOf(timeline('<event label="Clean">Text.</event>'))[0] ?? '', /at least two <event>s/);
    assert.match(errorsOf(timeline('<event label="Clean"></event>\n<event label="Train">Text.</event>'))[0] ?? '', /<event> needs narration text/);
  });
});
