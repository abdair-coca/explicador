import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type PlotBlock } from '../src/parser/index.ts';
import { curveValue, plotDomain } from '../src/parser/plotMath.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};
const plot = (body: string, attrs = '') => `<plot title="The sigmoid"${attrs}>\n${body}\n</plot>`;

describe('<plot>', () => {
  it('reads curves from the closed list or from points, and marks with their narration', () => {
    const parsed = parseExl(
      plot(
        '<curve fn="sigmoid" label="sigmoid" />\n<curve points="-2,0.1 0,0.5 2,0.9" label="measured" />\n<mark x="0.438" label="our review">Just above one half.</mark>\n<mark x="1" label="other" curve="measured" />',
        ' x="score" y="probability" from="-4" to="4" ref="nb/p2.ipynb:9"',
      ),
    );
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'plot',
      id: 'plot-1',
      title: 'The sigmoid',
      x: 'score',
      y: 'probability',
      from: -4,
      to: 4,
      curves: [{ label: 'sigmoid', fn: 'sigmoid' }, { label: 'measured', points: [[-2, 0.1], [0, 0.5], [2, 0.9]] }],
      marks: [{ x: '0.438', label: 'our review', narration: 'Just above one half.' }, { x: '1', label: 'other', curve: 1 }],
      ref: { path: 'nb/p2.ipynb', start: 9 },
    } satisfies PlotBlock);
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
  });

  it('reads the parameters a function takes', () => {
    const parsed = parseExl(plot('<curve fn="linear" slope="2" intercept="-1" />'));
    assert.ok(parsed.ok && (parsed.scene.blocks[0] as PlotBlock).curves[0]?.params?.slope === 2);
  });

  it('refuses a curve without a source or with both, unknown functions and parameters, and bad points', () => {
    assert.match(errorsOf(plot('<curve label="x" />'))[0] ?? '', /either "fn" .* or "points"/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" points="0,1 1,2" />'))[0] ?? '', /either "fn" .* or "points"/);
    assert.match(errorsOf(plot('<curve fn="cubic" />'))[0] ?? '', /Unknown fn "cubic"; use sigmoid, tanh/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" slope="2" />'))[0] ?? '', /fn="sigmoid" takes no parameters/);
    assert.match(errorsOf(plot('<curve fn="linear" mean="2" />'))[0] ?? '', /fn="linear" takes slope, intercept, not "mean"/);
    assert.match(errorsOf(plot('<curve points="0,1 a,2" />'))[0] ?? '', /"a,2" is not an "x,y" pair/);
    assert.match(errorsOf(plot('<curve points="0,1 0,2" />'))[0] ?? '', /from left to right/);
    assert.match(errorsOf(plot('<curve points="0,1" />'))[0] ?? '', /at least 2/);
    assert.match(errorsOf(plot(''))[0] ?? '', /needs at least one <curve>/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" />\n<curve fn="tanh" />'))[0] ?? '', /give each a "label"/);
  });

  it('refuses a mark outside the curve, an unknown curve and a bad domain', () => {
    assert.match(errorsOf(plot('<curve fn="sigmoid" />\n<mark x="9" label="far" />'))[0] ?? '', /x="9" is outside the curve, which runs from -6 to 6/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" />\n<mark x="1" label="a" curve="nope" />'))[0] ?? '', /"curve" must name a curve's label/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" />', ' from="3" to="1"'))[0] ?? '', /"from" must be smaller than "to"/);
    assert.match(errorsOf(plot('<curve fn="log" />', ' from="-1" to="5"'))[0] ?? '', /log curve needs "from" greater than 0/);
    assert.match(errorsOf(plot('<curve fn="sigmoid" />\n<mark x="one" label="a" />'))[0] ?? '', /"x" must be a number/);
  });
});

describe('plot math', () => {
  it('evaluates every function and interpolates points', () => {
    assert.equal(curveValue({ fn: 'sigmoid' }, 0), 0.5);
    assert.equal(curveValue({ fn: 'relu' }, -2), 0);
    assert.equal(curveValue({ fn: 'linear', params: { slope: 2, intercept: -1 } }, 3), 5);
    assert.equal(curveValue({ fn: 'quadratic' }, 3), 9);
    assert.ok(Math.abs(curveValue({ fn: 'gaussian' }, 0) - 0.3989) < 1e-4);
    assert.ok(Number.isNaN(curveValue({ fn: 'log' }, 0)));
    assert.equal(curveValue({ points: [[0, 0], [2, 4]] }, 1), 2);
    assert.ok(Number.isNaN(curveValue({ points: [[0, 0], [2, 4]] }, 3)));
  });

  it('takes the domain from from/to, else from the curves', () => {
    assert.deepEqual(plotDomain({ curves: [{ fn: 'sigmoid' }] }), [-6, 6]);
    assert.deepEqual(plotDomain({ curves: [{ fn: 'sigmoid' }, { points: [[-9, 0], [1, 1]] }] }), [-9, 6]);
    assert.deepEqual(plotDomain({ from: -2, to: 2, curves: [{ fn: 'sigmoid' }] }), [-2, 2]);
    assert.deepEqual(plotDomain({ curves: [{ fn: 'gaussian', params: { mean: 10, std: 2 } }] }), [2, 18]);
  });
});
