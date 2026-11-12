import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseExl } from '../src/parser/index.ts';
import { findMath, markMath, MATH_MARK } from '../src/parser/math.ts';

const texs = (text: string): string[] => findMath(text).map((span) => `${span.display ? 'D' : 'I'}:${span.tex}`);

describe('findMath', () => {
  it('finds inline formulas and keeps their LaTeX as written', () => {
    assert.deepEqual(texs('La sigmoide $\\sigma(z) = \\frac{1}{1+e^{-z}}$ da una probabilidad y $p$ también.'), ['I:\\sigma(z) = \\frac{1}{1+e^{-z}}', 'I:p']);
  });

  it('leaves money, escaped dollars and loose dollars as text', () => {
    assert.deepEqual(texs('Cuesta $5 y luego $10.'), []);
    assert.deepEqual(texs('Precio \\$5 y $x$'), ['I:x']);
    assert.deepEqual(texs('Un $ suelto y $ otro $'), []);
    assert.deepEqual(texs('$x$5 no cierra'), []);
  });

  it('never looks inside code spans or fenced code', () => {
    assert.deepEqual(texs('Usa `$x$` o ``a`$y$`` y\n```py\nprint("$z$")\n```\n$w$'), ['I:w']);
  });

  it('reads a $$ block over several lines, a one-line block and display style inside a line', () => {
    assert.deepEqual(texs('Antes\n\n$$\nE = mc^2\n$$\n\nDespués'), ['D:E = mc^2']);
    assert.deepEqual(texs('$$a+b$$'), ['D:a+b']);
    assert.deepEqual(texs('y $$\\sum x$$ z'), ['D:\\sum x']);
    assert.deepEqual(texs('y $$a\nb$$'), []);
  });

  it('does not let an inline formula cross a blank line', () => {
    assert.deepEqual(texs('Uno $a\n\nb$ dos'), []);
    assert.deepEqual(texs('Uno $a\nb$ dos'), ['I:a\nb']);
  });
});

describe('markMath', () => {
  it('turns inline formulas into marked code spans and blocks into math fences', () => {
    assert.equal(markMath('Sin fórmulas.'), 'Sin fórmulas.');
    assert.equal(markMath('Vale $x^2$.'), `Vale \`${MATH_MARK}x^2\`.`);
    assert.equal(markMath('y $$a$$ z'), `y \`${MATH_MARK}${MATH_MARK}a\` z`);
    assert.equal(markMath('Antes\n$$\na\n$$\nDespués'), 'Antes\n\n\n```math\na\n```\n\n\nDespués');
  });

  it('picks a code fence longer than any backtick run in the formula', () => {
    assert.equal(markMath('$a`b$'), `\`\`${MATH_MARK}a\`b\`\``);
  });
});

describe('formulas in a scene', () => {
  const scene = (body: string): string => `${body}\n\n<chapter title="One" />\n`;
  const errorsOf = (source: string): string[] => {
    const result = parseExl(source);
    return result.ok ? [] : result.errors.map((e) => `${e.line}:${e.column} ${e.message}`);
  };

  it('accepts valid formulas in prose, quizzes and answers', () => {
    const source =
      scene('La sigmoide $\\sigma(z) = \\frac{1}{1+e^{-z}}$ y un precio de $5.\n\n$$\n\\text{tf-idf}(t, d) = \\text{tf}(t, d) \\cdot \\log \\frac{N}{\\text{df}(t)}\n$$') +
      '\n<quiz question="¿Cuánto vale $\\sigma(0)$?">\n  <option correct="true" why="Porque $e^0 = 1$.">$\\frac{1}{2}$</option>\n  <option>$1$</option>\n</quiz>\n';
    assert.deepEqual(errorsOf(source), []);
  });

  it('refuses a formula KaTeX cannot parse, pointing at it', () => {
    const errors = errorsOf(scene('Bien $x^2$.\n\nMal $\\frac{1}{2$ aquí.'));
    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? '', /^3:5 Formula "\\frac\{1\}\{2" is not valid LaTeX: /);
  });

  it('refuses a broken formula inside a quiz option', () => {
    const errors = errorsOf(scene('Texto.') + '\n<quiz question="¿Sí?">\n  <option correct="true">$\\frac{$</option>\n  <option>no</option>\n</quiz>\n');
    assert.equal(errors.length, 1);
    assert.match(errors[0] ?? '', /is not valid LaTeX/);
  });
});
