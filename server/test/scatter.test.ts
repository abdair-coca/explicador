import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type ScatterBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};
const dots = '<dot x="0.2" y="1.5" class="positive" label="great film" />\n<dot x="-0.4" y="-1.1" class="negative" />';
const scatter = (body = dots, attrs = ' classes="negative|positive"') => `<scatter title="Reviews in two dimensions"${attrs}>\n${body}\n</scatter>`;

describe('<scatter>', () => {
  it('reads the classes, the dots as written and a straight boundary', () => {
    const parsed = parseExl(scatter(`${dots}\n<boundary slope="-1.2" intercept="0.4" above="positive" />`, ' classes="negative|positive" x="PC 1" y="PC 2" ref="nb/p2.ipynb:9"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'scatter',
      id: 'scatter-1',
      title: 'Reviews in two dimensions',
      x: 'PC 1',
      y: 'PC 2',
      classes: ['negative', 'positive'],
      dots: [{ x: '0.2', y: '1.5', class: 'positive', label: 'great film' }, { x: '-0.4', y: '-1.1', class: 'negative' }],
      boundary: { slope: -1.2, intercept: 0.4, above: 'positive' },
      ref: { path: 'nb/p2.ipynb', start: 9 },
    } satisfies ScatterBlock);
  });

  it('reads a boundary given as points', () => {
    const parsed = parseExl(scatter(`${dots}\n<boundary points="-1,2 0,0.5 1,-1" />`));
    assert.ok(parsed.ok && (parsed.scene.blocks[0] as ScatterBlock).boundary?.points?.length === 3);
  });

  it('refuses bad classes, dots and boundaries', () => {
    assert.match(errorsOf(scatter(dots, ' classes="one"'))[0] ?? '', /"classes" names 2 to 4 different classes/);
    assert.match(errorsOf(scatter(dots, ' classes="a|a"'))[0] ?? '', /"classes" names 2 to 4 different classes/);
    assert.match(errorsOf(scatter('<dot x="0" y="0" class="other" />\n<dot x="1" y="1" class="positive" />'))[0] ?? '', /"class" must name one of the classes: negative, positive/);
    assert.match(errorsOf(scatter('<dot x="left" y="0" class="positive" />\n<dot x="1" y="1" class="positive" />'))[0] ?? '', /"x" must be a number/);
    assert.match(errorsOf(scatter('<dot x="1" y="1" class="positive" />'))[0] ?? '', /at least two <dot>s/);
    assert.match(errorsOf(scatter(`${dots}\n<boundary slope="1" />`))[0] ?? '', /takes "slope", "intercept" and "above"/);
    assert.match(errorsOf(scatter(`${dots}\n<boundary slope="1" intercept="0" above="maybe" />`))[0] ?? '', /"above" must name one of the classes/);
    assert.match(errorsOf(scatter(`${dots}\n<boundary slope="1" intercept="0" above="a" />`, ' classes="a|negative|positive"'))[0] ?? '', /separates two classes/);
    assert.match(errorsOf(scatter(`${dots}\n<boundary points="0,0 1,1" slope="2" />`))[0] ?? '', /leave it out with "points"/);
    assert.match(errorsOf(scatter(`${dots}\n<boundary points="0,0 1,1" />\n<boundary points="0,0 1,1" />`))[0] ?? '', /Only one <boundary>/);
  });
});
