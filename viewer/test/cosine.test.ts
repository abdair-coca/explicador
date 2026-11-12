import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CosineBlock } from '../../server/src/scene.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { cosineModel, gaugeAt, trimmed } from '../src/lesson/cosineMath.ts';

const block: CosineBlock = {
  type: 'cosine',
  id: 'c',
  title: 'C',
  a: 'question',
  b: 'chunk',
  dims: [
    { a: '0.50', b: '0.40' },
    { a: '0.30', b: '0.35' },
    { a: '-0.20', b: '-0.10' },
    { a: '0.70', b: '0.60' },
    { a: '0.05', b: '-0.15' },
  ],
};

describe('cosineModel', () => {
  it('multiplies each pair, adds the products, measures both vectors and divides', () => {
    const model = cosineModel(block);
    assert.deepEqual(model.rows.map((row) => row.productText), ['0.2', '0.105', '0.02', '0.42', '-0.0075']);
    assert.equal(model.dotText, '0.7375');
    assert.equal(model.normAText, '0.934');
    assert.equal(model.normBText, '0.822');
    assert.equal(model.cosText, '0.961');
    assert.equal(model.full, true);
    assert.deepEqual(model.parts, ['vectors', 'products', 'sum', 'lengths', 'result']);
  });

  it('takes the real score and skips the lengths when the vectors are longer than what is shown', () => {
    const model = cosineModel({ ...block, dims: block.dims.slice(0, 3), size: 384, score: '0.83' });
    assert.equal(model.hidden, 381);
    assert.equal(model.cosText, '0.83');
    assert.deepEqual(model.parts, ['vectors', 'products', 'sum', 'result']);
    assert.deepEqual(buildSlides([{ ...block, dims: block.dims.slice(0, 3), size: 384, score: '0.83' }]), [{ kind: 'cosine', block: 0, parts: 4, chapter: 0 }]);
  });

  it('places a cosine on the line from -1 to 1 and trims useless zeros', () => {
    assert.equal(gaugeAt(-1), 0);
    assert.equal(gaugeAt(0), 0.5);
    assert.equal(gaugeAt(2), 1);
    assert.equal(trimmed(0.2, 4), '0.2');
    assert.equal(trimmed(3, 0), '3');
  });
});
