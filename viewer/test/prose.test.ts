import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { proseSlide, sentenceGroups, sentences, wrapNumbers, type Hast } from '../src/presentation/prose.ts';

describe('sentences', () => {
  it('cuts at sentence ends followed by a capital, a digit or an opening mark', () => {
    assert.deepEqual(sentences('Uno. Dos? Tres! ¿Cuatro? 5 000 reseñas. «Seis».'), ['Uno.', 'Dos?', 'Tres!', '¿Cuatro?', '5 000 reseñas.', '«Seis».']);
  });

  it('never cuts inside code, bold, italics or links, at decimals or before a lowercase word', () => {
    assert.deepEqual(
      sentences('Usa `a. B` aquí. **Es. Bold** sí. *Ita. Lic* no. [Ver. Doc](https://x.io/a.b) fin. La exactitud es 0.846 y p. ej. sigue.'),
      ['Usa `a. B` aquí.', '**Es. Bold** sí.', '*Ita. Lic* no.', '[Ver. Doc](https://x.io/a.b) fin.', 'La exactitud es 0.846 y p. ej. sigue.'],
    );
  });
});

describe('sentenceGroups', () => {
  it('keeps a short paragraph whole and groups a long one into whole sentences within the limit', () => {
    assert.deepEqual(sentenceGroups('Short one. Another.', 40), ['Short one. Another.']);
    assert.deepEqual(sentenceGroups('Aaaa aaaa aaaa. Bbbb bbbb bbbb. Cccc cccc cccc. Dddd.', 32), ['Aaaa aaaa aaaa. Bbbb bbbb bbbb.', 'Cccc cccc cccc. Dddd.']);
  });

  it('keeps a sentence longer than the limit whole', () => {
    const sentence = 'One very long sentence without any stop inside it at all.';
    assert.deepEqual(sentenceGroups(sentence, 20), [sentence]);
  });
});

describe('proseSlide', () => {
  it('makes a heading, a paragraph, each list item, a callout, a table and a code block parts, in order', () => {
    const text = [
      '# Title',
      '',
      'Intro text.',
      '- one',
      '- two',
      '',
      '> [!NOTE]',
      '> A note.',
      '',
      '| a | b |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '```py',
      'x = 1',
      '',
      'y = 2',
      '```',
      '',
      '1. first',
      '',
      '2. second',
      '   continued',
    ].join('\n');
    const { groups, parts } = proseSlide(text);
    assert.equal(parts, 9);
    assert.deepEqual(groups, [
      { kind: 'heading', depth: 1, part: 0, text: 'Title' },
      { kind: 'paragraph', chunks: [{ part: 1, text: 'Intro text.' }] },
      { kind: 'list', ordered: false, start: 1, items: [{ part: 2, text: 'one' }, { part: 3, text: 'two' }] },
      { kind: 'block', part: 4, text: '> [!NOTE]\n> A note.', callout: true },
      { kind: 'block', part: 5, text: '| a | b |\n|---|---|\n| 1 | 2 |', callout: false },
      { kind: 'block', part: 6, text: '```py\nx = 1\n\ny = 2\n```', callout: false },
      { kind: 'list', ordered: true, start: 1, items: [{ part: 7, text: 'first' }, { part: 8, text: 'second\ncontinued' }] },
    ]);
  });

  it('reveals a long paragraph a few sentences at a time, and counts an empty block as one part', () => {
    const long = `${'Palabra '.repeat(30).trim()}. ${'Otra '.repeat(30).trim()}.`;
    const { groups, parts } = proseSlide(long);
    assert.equal(parts, 2);
    assert.equal(groups.length, 1);
    assert.equal(proseSlide('').parts, 1);
  });
});

describe('wrapNumbers', () => {
  it('wraps numbers with decimals or of 100 and more, outside code', () => {
    const tree: Hast = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'p', children: [{ type: 'text', value: 'De 5 000 quedan 0.846 en la celda 6.' }] },
        { type: 'element', tagName: 'code', children: [{ type: 'text', value: '1000' }] },
      ],
    };
    wrapNumbers(tree);
    const paragraph = tree.children?.[0]?.children ?? [];
    assert.equal(paragraph.map((node) => (node.type === 'text' ? node.value : `[${node.children?.[0]?.value ?? ''}]`)).join(''), 'De [5 000] quedan [0.846] en la celda 6.');
    assert.deepEqual(tree.children?.[1]?.children, [{ type: 'text', value: '1000' }]);
  });
});
