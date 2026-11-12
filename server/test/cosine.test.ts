import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type CosineBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};
const dims = '<dim a="0.50" b="0.40" />\n<dim a="0.30" b="0.35" label="refund-ness" />';
const cosine = (body = dims, attrs = '') => `<cosine title="Same direction" a="question" b="chunk"${attrs}>\n${body}\n</cosine>`;

describe('<cosine>', () => {
  it('reads the two names and each pair as written', () => {
    const parsed = parseExl(cosine(undefined, ' ref="rag/search.js:3-8"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'cosine',
      id: 'cosine-1',
      title: 'Same direction',
      a: 'question',
      b: 'chunk',
      dims: [{ a: '0.50', b: '0.40' }, { a: '0.30', b: '0.35', label: 'refund-ness' }],
      ref: { path: 'rag/search.js', start: 3, end: 8 },
    } satisfies CosineBlock);
  });

  it('accepts the real score of longer vectors and checks a score against the numbers when all are shown', () => {
    const parsed = parseExl(cosine(undefined, ' dims="384" score="0.83"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.equal((parsed.scene.blocks[0] as CosineBlock).size, 384);
    assert.ok(parseExl(cosine(undefined, ' score="0.99"')).ok);
    assert.match(errorsOf(cosine(undefined, ' score="0.5"'))[0] ?? '', /score="0.5" is not the cosine of these numbers \(0\.984\)/);
  });

  it('refuses hidden numbers without a score, a score out of range, one pair, and a word for a number', () => {
    assert.match(errorsOf(cosine(undefined, ' dims="384"'))[0] ?? '', /Only 2 of 384 dimensions are shown/);
    assert.match(errorsOf(cosine(undefined, ' score="1.4"'))[0] ?? '', /between -1 and 1/);
    assert.match(errorsOf(cosine('<dim a="1" b="1" />'))[0] ?? '', /at least two <dim>s/);
    assert.match(errorsOf(cosine('<dim a="1" b="high" />\n<dim a="1" b="1" />'))[0] ?? '', /"b" must be a number/);
    assert.match(errorsOf(cosine(undefined, ' dims="1"'))[0] ?? '', /"dims" is the vectors' real size/);
  });
});
