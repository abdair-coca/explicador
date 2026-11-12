import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type DeriveBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};
const derive = (body: string) => `<derive title="From score to probability" ref="nb/p2.ipynb:9">\n${body}\n</derive>`;

describe('<derive>', () => {
  it('reads the lines with their notes', () => {
    const parsed = parseExl(derive('<line>p = \\sigma(z)</line>\n<line note="The definition of $\\sigma$.">p = \\frac{1}{1 + e^{-z}}</line>\n<line note="Our score.">p = \\frac{1}{1 + e^{-0.438}}</line>'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'derive',
      id: 'derive-1',
      title: 'From score to probability',
      lines: [{ tex: 'p = \\sigma(z)' }, { tex: 'p = \\frac{1}{1 + e^{-z}}', note: 'The definition of $\\sigma$.' }, { tex: 'p = \\frac{1}{1 + e^{-0.438}}', note: 'Our score.' }],
      ref: { path: 'nb/p2.ipynb', start: 9 },
    } satisfies DeriveBlock);
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
  });

  it('refuses one line, an empty line, broken LaTeX, dollars and too many lines', () => {
    assert.match(errorsOf(derive('<line>x</line>'))[0] ?? '', /at least two <line>s/);
    assert.match(errorsOf(derive('<line>x</line>\n<line></line>'))[0] ?? '', /<line> needs its formula/);
    assert.match(errorsOf(derive('<line>x</line>\n<line>\\frac{1}{</line>'))[0] ?? '', /<line> is not valid LaTeX/);
    assert.match(errorsOf(derive('<line>x</line>\n<line>$y$</line>'))[0] ?? '', /without "\$"/);
    assert.match(errorsOf(derive(Array.from({ length: 9 }, (_, i) => `<line>x_${i}</line>`).join('\n')))[0] ?? '', /more than 8 lines/);
    assert.match(errorsOf(derive('<line>x</line>\n<line note="Bad $\\frac{$ note">y</line>'))[0] ?? '', /is not valid LaTeX/);
  });
});
