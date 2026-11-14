import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type SystemBlock, type WithArc } from '../src/parser/index.ts';
import { subtitleWarnings } from '../src/rules.ts';

const factors = [
  '<factor id="traffic" label="Requests per second" />',
  '<factor id="misses" label="Cache misses" />',
  '<factor id="load" label="Database load" />',
  '<factor id="cached" label="Keys in the cache" />',
].join('\n');
const links = [
  '<link from="traffic" to="misses" sign="same" />',
  '<link from="misses" to="load" sign="same" />',
  '<link from="load" to="traffic" sign="same" label="retries" />',
  '<link from="misses" to="cached" sign="same" />',
  '<link from="cached" to="misses" sign="opposite" />',
].join('\n');
const system = (rest = '', head = `${factors}\n${links}`): string => `<system title="Retries feed the load that causes them" arc="answer">\n${head}\n${rest}\n</system>`;

const blockOf = (source: string): SystemBlock & WithArc => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  const block = parsed.scene.blocks.find((item) => item.type === 'system');
  assert.ok(block && block.type === 'system');
  return block;
};
const errorsOf = (source: string): string => {
  const parsed = parseExl(source);
  assert.equal(parsed.ok, false, 'expected errors');
  return parsed.ok ? '' : formatErrors(parsed.errors);
};

describe('<system>', () => {
  it('finds every loop of links and its kind, shortest first', () => {
    const block = blockOf(system());
    assert.equal(block.arc, 'answer');
    assert.deepEqual(
      block.loops.map((loop) => [loop.through.join(' '), loop.kind]),
      [
        ['misses cached', 'balancing'],
        ['traffic misses load', 'reinforcing'],
      ],
    );
    assert.deepEqual(block.loops[1]?.links, [0, 1, 2]);
    assert.equal(block.links[2]?.label, 'retries');
  });

  it('names a loop, and refuses a name for factors that close no loop', () => {
    const named = blockOf(system('<loop through="load traffic misses" label="Retry storm" />'));
    assert.equal(named.loops.find((loop) => loop.kind === 'reinforcing')?.label, 'Retry storm');
    assert.match(errorsOf(system('<loop through="traffic load" label="Not a loop" />')), /"traffic load" is not a loop of links; the loops are "misses cached", "traffic misses load"/);
  });

  it('plays a push through the links, working out each direction, and marks a factor pushed back', () => {
    const steps = [
      '<push factor="traffic" change="up">A sale sends five times the usual requests.</push>',
      '<effect from="traffic" to="misses">More requests ask for keys the cache lacks.</effect>',
      '<effect from="misses" to="cached">Every miss stores its key.</effect>',
      '<effect from="cached" to="misses">A fuller cache misses less.</effect>',
    ].join('\n');
    const block = blockOf(system(steps));
    assert.deepEqual(
      block.steps.map((step) => [step.kind, step.factor, step.change, step.link, step.reversed]),
      [
        ['push', 'traffic', 'up', undefined, undefined],
        ['effect', 'misses', 'up', 0, undefined],
        ['effect', 'cached', 'up', 3, undefined],
        ['effect', 'misses', 'down', 4, true],
      ],
    );
    assert.deepEqual(block.moved[3], { traffic: 'up', misses: 'down', cached: 'up' });
    assert.deepEqual(block.moved[0], { traffic: 'up' });
  });

  it('refuses effects the links do not carry', () => {
    assert.match(errorsOf(system('<push factor="traffic" change="up">Up.</push>\n<effect from="traffic" to="load">Skips a factor.</effect>')), /No <link> runs from "traffic" to "load"/);
    assert.match(errorsOf(system('<push factor="traffic" change="up">Up.</push>\n<effect from="misses" to="load">Too early.</effect>')), /"misses" has not moved yet/);
    assert.match(errorsOf(system('<effect from="traffic" to="misses">No push.</effect>')), /"traffic" has not moved yet/);
    assert.match(errorsOf(system('<push factor="traffic" change="sideways">Up.</push>')), /Unknown change "sideways"; use up, down/);
    assert.match(errorsOf(system('<push factor="ghost" change="up">Up.</push>')), /"factor" refers to unknown factor "ghost"/);
  });

  it('refuses bad factors and links', () => {
    assert.match(errorsOf(system('', `${factors}\n<factor id="load" label="Again" />\n${links}`)), /Duplicate factor id "load"/);
    assert.match(errorsOf(system('', `${factors}\n${links}\n<link from="load" to="load" sign="same" />`)), /A factor cannot act on itself/);
    assert.match(errorsOf(system('', `${factors}\n${links}\n<link from="traffic" to="misses" sign="opposite" />`)), /There is already a <link> from "traffic" to "misses"/);
    assert.match(errorsOf(system('', `${factors}\n<link from="traffic" to="misses" sign="more" />`)), /Unknown sign "more"; use same, opposite/);
    assert.match(errorsOf(system('', `${factors}\n<link from="traffic" to="nowhere" sign="same" />`)), /"to" refers to unknown factor "nowhere"/);
    assert.match(errorsOf(system('', '<factor id="a" label="A" />\n<link from="a" to="a" sign="same" />')), /needs at least two <factor>s/);
    assert.match(errorsOf(system('', factors)), /<system> needs at least one <link>/);
    const many = Array.from({ length: 13 }, (_, i) => `<factor id="f${i}" label="F${i}" />`).join('\n');
    assert.match(errorsOf(system('', `${many}\n<link from="f0" to="f1" sign="same" />`)), /more than 12 factors/);
  });

  it('warns about long step narrations like any subtitle', () => {
    const long = 'word '.repeat(30).trim();
    const block = blockOf(system(`<push factor="traffic" change="up">${long}</push>`));
    assert.match(subtitleWarnings([block])[0] ?? '', /step 1 \(30 words\)/);
  });
});

describe('ask on a system step', () => {
  it('keeps the question on a push or an effect', () => {
    const block = blockOf(system('<push factor="traffic" change="up" ask="What does a sale do?">Up.</push>\n<effect from="traffic" to="misses" ask="And the misses?">More.</effect>'));
    assert.deepEqual(block.steps.map((step) => step.ask), ['What does a sale do?', 'And the misses?']);
  });
});
