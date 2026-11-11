import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CalcBlock } from '../../server/src/scene.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { calcModel, sigmoid, sigmoidCurve, signed, waterfall } from '../src/lesson/calcMath.ts';

// The parts and the score printed by cell 19 of examples/notebook/reviews.ipynb.
const block: CalcBlock = {
  type: 'calc',
  id: 'score',
  title: 'How the model scores it',
  kind: 'logistic',
  total: '0.438',
  classes: ['negative', 'positive'],
  parts: [
    { label: 'intercept', value: '-0.075' },
    { label: 'bad', value: '-0.332' },
    { label: 'film', value: '+0.011' },
    { label: 'film year', value: '+0.175' },
    { label: 'really', value: '+0.310' },
    { label: 'year', value: '+0.175' },
    { label: 'year really', value: '+0.175' },
  ],
};

describe('calcModel', () => {
  it('runs the totals, keeps the printed score and says when rounding shows', () => {
    const model = calcModel(block);
    assert.equal(model.rows[1]?.before, -0.075);
    assert.ok(Math.abs((model.rows[1]?.after ?? 0) - -0.407) < 1e-9);
    assert.equal(model.sum, 0.439);
    assert.equal(model.totalText, '0.438');
    assert.match(model.roundingNote ?? '', /add up to 0.439; the notebook's exact score is 0.438/);
    assert.equal(model.steps, 7 + 1 + 2);
  });

  it('turns the score into the probability the notebook printed and decides the class', () => {
    const logistic = calcModel(block).logistic;
    assert.equal(logistic?.probabilityText, '0.608');
    assert.equal(logistic?.decided, 1);
    assert.equal(calcModel({ ...block, threshold: 0.7 }).logistic?.decided, 0);
  });

  it('adds a plain sum without a note when it matches', () => {
    const model = calcModel({ type: 'calc', id: 's', title: 'Sum', kind: 'sum', parts: [{ label: 'a', value: '1.5' }, { label: 'b', value: '2' }] });
    assert.equal(model.totalText, '3.5');
    assert.equal(model.roundingNote, undefined);
    assert.equal(model.logistic, undefined);
    assert.equal(model.steps, 3);
  });

  it('signs values and computes the sigmoid', () => {
    assert.equal(signed('0.3'), '+0.3');
    assert.equal(signed('-0.3'), '-0.3');
    assert.equal(sigmoid(0), 0.5);
  });
});

describe('waterfall', () => {
  it('chains each bar from the running total before it and draws the total from zero', () => {
    const w = waterfall(calcModel(block), 700);
    assert.equal(w.bars.length, 8);
    assert.equal(w.bars[0]?.x0, w.zero);
    for (let i = 1; i < 7; i += 1) assert.ok(Math.abs((w.bars[i]?.x0 ?? 0) - (w.bars[i - 1]?.x1 ?? 0)) < 1e-9, `bar ${i} starts where ${i - 1} ends`);
    assert.equal(w.bars[1]?.up, false);
    const total = w.bars.at(-1);
    assert.ok(total?.total && total.x0 === w.zero && total.x1 > w.zero);
    assert.ok(w.ticks.some((tick) => tick.text === '0.0' || tick.text === '0'));
  });

  it('puts the score on the curve', () => {
    const curve = sigmoidCurve(0, 200, 100);
    assert.equal(curve.point.x, 100);
    assert.equal(curve.point.y, 50);
  });
});

describe('calc slides', () => {
  it('gives one slide per step: each part, the score, the probability and the decision', () => {
    const slides = buildSlides([block]);
    assert.equal(slides.length, 10);
    assert.deepEqual(slides[9], { kind: 'calc', block: 0, step: 9, of: 10 });
  });
});
