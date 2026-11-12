import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type SpaceBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};
const items =
  '<item id="refund" label="Refunds take 5 days" x="0.9" y="0.3">The closest chunk.</item>\n<item id="ship" label="Shipping is free" x="0.1" y="0.95" />';
const query = '<query label="When do I get my money back?" x="0.8" y="0.4">The question lands near refunds.</query>';
const space = (body = `${items}\n${query}`, attrs = '') => `<space title="The question lands near refunds"${attrs}>\n${body}\n</space>`;

describe('<space>', () => {
  it('reads the items, the query, k, dims and the axes as written', () => {
    const parsed = parseExl(space(undefined, ' x="PC 1" y="PC 2" k="1" dims="384" ref="rag/search.js:4-9"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'space',
      id: 'space-1',
      title: 'The question lands near refunds',
      x: 'PC 1',
      y: 'PC 2',
      k: 1,
      dims: 384,
      clusters: [],
      items: [
        { id: 'refund', label: 'Refunds take 5 days', x: '0.9', y: '0.3', narration: 'The closest chunk.' },
        { id: 'ship', label: 'Shipping is free', x: '0.1', y: '0.95' },
      ],
      query: { label: 'When do I get my money back?', x: '0.8', y: '0.4', narration: 'The question lands near refunds.' },
      ref: { path: 'rag/search.js', start: 4, end: 9 },
    } satisfies SpaceBlock);
  });

  it('reads clusters, the cluster of each item and the one the query is sent to, and real scores', () => {
    const body = [
      '<cluster id="money" label="Money" x="0.8" y="0.3">Only this zone is searched.</cluster>',
      '<cluster id="delivery" label="Delivery" x="0.2" y="0.9" />',
      '<item id="refund" label="Refunds" x="0.9" y="0.3" cluster="money" score="0.91" />',
      '<item id="ship" label="Shipping" x="0.1" y="0.95" cluster="delivery" score="0.12" />',
      '<query label="Money back?" x="0.8" y="0.4" cluster="money" />',
    ].join('\n');
    const parsed = parseExl(space(body, ' k="1"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    const block = parsed.scene.blocks[0] as SpaceBlock;
    assert.deepEqual(
      block.clusters.map((c) => [c.id, c.narration]),
      [
        ['money', 'Only this zone is searched.'],
        ['delivery', undefined],
      ],
    );
    assert.deepEqual(
      block.items.map((item) => [item.cluster, item.score]),
      [
        ['money', '0.91'],
        ['delivery', '0.12'],
      ],
    );
    assert.equal(block.query.cluster, 'money');
  });

  it('defaults k to 3 only when the space holds enough items', () => {
    assert.match(errorsOf(space())[0] ?? '', /"k" is 3 but the space holds 2 items/);
  });

  it('refuses a missing query, unknown or missing clusters, a lone cluster, partial scores and points at 0,0', () => {
    const one = ' k="1"';
    assert.match(errorsOf(space(items, one))[0] ?? '', /exactly one <query>/);
    assert.match(errorsOf(space(`${items}\n<query label="q" x="1" y="0" cluster="money" />`, one))[0] ?? '', /"cluster" needs <cluster>s/);
    assert.match(
      errorsOf(space(`<cluster id="a" label="A" x="1" y="0" />\n${items.replace('/>', 'cluster="a" />')}\n${query}`, one)).join('\n'),
      /at least two <cluster>s/,
    );
    const clustered = `<cluster id="a" label="A" x="1" y="0" />\n<cluster id="b" label="B" x="0" y="1" />\n<item id="i" label="I" x="1" y="0.1" cluster="z" />\n<item id="j" label="J" x="0.1" y="1" />\n${query}`;
    const errors = errorsOf(space(clustered, one)).join('\n');
    assert.match(errors, /Unknown cluster "z"; the clusters are a, b/);
    assert.match(errors, /every <item> names its cluster/);
    assert.match(errorsOf(space(`${items.replace('x="0.9"', 'x="0.9" score="0.9"')}\n${query}`, one))[0] ?? '', /Give every <item> its real "score", or none/);
    assert.match(errorsOf(space(`${items.replace('x="0.9" y="0.3"', 'x="0" y="0"')}\n${query}`, one))[0] ?? '', /at 0,0: it has no direction/);
    assert.match(errorsOf(space(undefined, ' k="0"'))[0] ?? '', /"k" is how many nearest items/);
  });
});
