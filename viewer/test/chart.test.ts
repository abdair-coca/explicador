import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChartBlock } from '../../server/src/scene.ts';
import {
  barsGeometry,
  emphasisOf,
  entranceDelay,
  fit,
  hbarsGeometry,
  isDiverging,
  lineGeometry,
  nearestIndex,
  withUnit,
} from '../src/lesson/chartGeometry.ts';
import { heatOf, isNumeric } from '../src/lesson/heat.ts';

const chart = (over: Partial<ChartBlock>): ChartBlock => ({
  type: 'chart',
  id: 'c',
  title: 'T',
  chartType: 'bars',
  series: [],
  rows: [
    { label: 'BoW', values: ['0.84'] },
    { label: 'TF-IDF', values: ['0.86'] },
  ],
  ...over,
});

describe('chart helpers', () => {
  it('appends units: symbols glued, words spaced', () => {
    assert.equal(withUnit('84.6', '%'), '84.6%');
    assert.equal(withUnit('12', 'ms'), '12 ms');
    assert.equal(withUnit('3', undefined), '3');
    assert.equal(withUnit('10.5', '€', 'es'), '10,5 €');
    assert.equal(withUnit('84.6', '%', 'es'), '84,6 %');
    assert.equal(withUnit('1000', undefined, 'es'), '1000');
  });

  it('dims by highlight: a series grays the others, a row dims the other rows', () => {
    const bySeries = chart({ series: ['train', 'test'], highlight: 'test', rows: [{ label: 'a', values: ['1', '2'] }] });
    assert.equal(emphasisOf(bySeries, 0, 0), 'muted');
    assert.equal(emphasisOf(bySeries, 0, 1), 'normal');
    const byRow = chart({ highlight: 'TF-IDF' });
    assert.equal(emphasisOf(byRow, 0, 0), 'dim');
    assert.equal(emphasisOf(byRow, 1, 0), 'normal');
    assert.equal(emphasisOf(chart({}), 0, 0), 'normal');
  });

  it('cuts labels to the room they have', () => {
    assert.equal(fit('short', 100), 'short');
    assert.equal(fit('a very long label', 42), 'a ver…');
  });

  it('snaps to the nearest x and staggers entrances up to 600 ms', () => {
    assert.equal(nearestIndex([10, 50, 90], 62), 1);
    assert.equal(nearestIndex([10, 50, 90], 200), 2);
    assert.equal(entranceDelay(0, 5), 0);
    assert.equal(entranceDelay(4, 5), 600);
    assert.equal(entranceDelay(0, 1), 0);
  });
});

describe('barsGeometry', () => {
  it('grows bars from zero, at most 24 px thick, values on every bar when few', () => {
    const g = barsGeometry(chart({ unit: '%' }), 600);
    assert.equal(g.ticks[0]?.value, 0);
    assert.equal(g.ticks[0]?.text, '0.0%');
    assert.equal(g.zero, g.bottom);
    assert.equal(g.marks.length, 2);
    for (const mark of g.marks) {
      assert.ok(mark.showValue);
      assert.equal(mark.grow, 'grow-up');
      assert.ok(mark.y < g.bottom);
    }
    assert.equal(g.marks[1]?.text, '0.86%');
    // 24 px wide: the path spans x .. x + 24.
    const xs = [...(g.marks[0]?.d.matchAll(/[MHQ ](-?[\d.]+),?/g) ?? [])].map((m) => Number(m[1]));
    assert.ok(Math.max(...xs) - Math.min(...xs) <= 24.01);
  });

  it('labels only the highlighted series when there are many bars', () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ label: `r${i}`, values: [String(i + 1), String(i + 2)] }));
    const g = barsGeometry(chart({ series: ['a', 'b'], rows, highlight: 'b' }), 600);
    assert.ok(g.marks.filter((m) => m.series === 1).every((m) => m.showValue));
    assert.ok(g.marks.filter((m) => m.series === 0).every((m) => !m.showValue && m.color === 'var(--series-muted)'));
  });

  it('keeps grouped value labels from overlapping', () => {
    const rows = [{ label: 'BoW', values: ['91.2', '84.1'] }];
    const plain = barsGeometry(chart({ series: ['train', 'test'], rows, unit: '%' }), 600);
    assert.ok(plain.marks.every((m) => m.showValue));
    assert.ok(Math.abs((plain.marks[0]?.labelY ?? 0) - (plain.marks[1]?.labelY ?? 0)) >= 14, 'labels are a line apart');
    const highlighted = barsGeometry(chart({ series: ['train', 'test'], rows, unit: '%', highlight: 'test' }), 600);
    assert.deepEqual(highlighted.marks.map((m) => m.showValue), [false, true]);
  });

  it('draws negative bars downwards from the zero line', () => {
    const g = barsGeometry(chart({ rows: [{ label: 'a', values: ['-2'] }, { label: 'b', values: ['3'] }] }), 400);
    assert.ok(g.zero !== undefined && g.zero > g.top && g.zero < g.bottom);
    assert.equal(g.marks[0]?.grow, 'grow-down');
  });
});

describe('hbarsGeometry', () => {
  const coefficients = chart({
    chartType: 'hbars',
    rows: [
      { label: 'great', values: ['2.1'] },
      { label: 'not', values: ['-1.7'] },
    ],
  });

  it('diverges a single series with negative values around zero', () => {
    assert.ok(isDiverging(coefficients));
    const g = hbarsGeometry(coefficients, 500);
    assert.equal(g.marks[0]?.color, 'var(--diverge-pos)');
    assert.equal(g.marks[1]?.color, 'var(--diverge-neg)');
    assert.equal(g.marks[1]?.grow, 'grow-left');
    assert.equal(g.marks[1]?.anchor, 'end');
    // Room for the negative value label left of the bar, after the row labels.
    assert.ok((g.marks[1]?.labelX ?? 0) > (g.labels[1]?.x ?? 0));
  });

  it('uses fewer ticks on a narrow screen', () => {
    assert.ok(hbarsGeometry(coefficients, 340).ticks.length < hbarsGeometry(coefficients, 1200).ticks.length);
  });

  it('is not diverging with several series or only positive values', () => {
    assert.equal(isDiverging(chart({ chartType: 'hbars' })), false);
  });
});

describe('lineGeometry', () => {
  it('spaces rows evenly and hides end labels that would collide', () => {
    const rows = [
      { label: '1', values: ['0.80', '0.81'] },
      { label: '2', values: ['0.84', '0.841'] },
    ];
    const g = lineGeometry(chart({ chartType: 'line', series: ['train', 'test'], rows }), 600);
    assert.equal(g.xs?.length, 2);
    assert.equal(g.xs?.[0], g.left);
    assert.equal(g.xs?.[1], g.right);
    assert.equal(g.lines?.length, 2);
    assert.ok(g.lines?.every((line) => line.end === undefined));
    const apart = lineGeometry(chart({ chartType: 'line', series: ['train', 'test'], rows: [rows[0]!, { label: '2', values: ['0.99', '0.60'] }] }), 600);
    assert.ok(apart.lines?.every((line) => line.end !== undefined));
  });

  it('has no end labels for one series', () => {
    const g = lineGeometry(chart({ chartType: 'line' }), 600);
    assert.equal(g.lines?.[0]?.end, undefined);
  });
});

describe('heatOf', () => {
  it('ramps numbers from 6 to 76 percent and leaves text cells alone', () => {
    assert.deepEqual(heatOf([{ values: ['0', '5'] }, { values: ['10', 'n/a'] }]), [
      [6, 41],
      [76, undefined],
    ]);
    assert.deepEqual(heatOf([{ values: ['3', '3'] }]), [[41, 41]]);
    assert.ok(isNumeric('-1.5e3') && !isNumeric('cat'));
  });
});
