import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PlotBlock } from '../../server/src/scene.ts';
import { formatY, PLOT, plotModel } from '../src/lesson/plotGeometry.ts';
import { buildSlides } from '../src/presentation/slides.ts';

const block: PlotBlock = {
  type: 'plot',
  id: 'p',
  title: 'Sigmoid',
  curves: [{ fn: 'sigmoid' }],
  marks: [{ x: '0', label: 'zero' }, { x: '0.438', label: 'our review', narration: 'Above one half.' }],
};

describe('plotModel', () => {
  const model = plotModel(block);

  it('maps the domain onto the drawing area', () => {
    assert.deepEqual(model.domain, [-6, 6]);
    assert.equal(model.sx(-6), PLOT.left);
    assert.equal(model.sx(6), PLOT.width - PLOT.right);
    assert.equal(model.sy(0), PLOT.height - PLOT.bottom);
    assert.equal(model.sy(1), PLOT.top);
    assert.equal(model.zeroX, model.sx(0));
    assert.equal(model.zeroY, model.sy(0));
  });

  it('gives round ticks inside the domain', () => {
    assert.deepEqual(model.xTicks.map((tick) => tick.text), ['-6', '-4', '-2', '0', '2', '4', '6']);
    assert.equal(model.yTicks[0]?.text, '0.0');
    assert.equal(model.yTicks.at(-1)?.text, '1.0');
  });

  it('samples the curve from end to end', () => {
    const d = model.curves[0]?.d ?? '';
    assert.ok(d.startsWith(`M${PLOT.left} `));
    assert.equal(d.split('L').length, 161);
    assert.ok(d.includes(` L${model.sx(0)} ${model.sy(0.5)} `));
  });

  it('places each mark on its curve and formats its reading', () => {
    assert.deepEqual(
      model.marks.map((mark) => [mark.px, mark.py, mark.xText, mark.yText]),
      [
        [model.sx(0), model.sy(0.5), '0', '0.5'],
        [model.sx(0.438), model.sy(1 / (1 + Math.exp(-0.438))), '0.438', '0.608'],
      ],
    );
    assert.equal(model.marks[1]?.narration, 'Above one half.');
  });

  it('formats readings with three decimals, dropping trailing zeros', () => {
    assert.equal(formatY(0.5), '0.5');
    assert.equal(formatY(0.6078), '0.608');
    assert.equal(formatY(2), '2');
    assert.equal(formatY(0), '0');
    assert.equal(formatY(1234.56), '1234.6');
    assert.equal(formatY(0.00012), '1.20e-4');
  });

  it('is one slide: the curves, then one part per mark', () => {
    assert.equal(buildSlides([block])[0]?.parts, 3);
  });
});
