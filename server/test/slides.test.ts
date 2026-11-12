import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { formatErrors, parseExl } from '../src/parser/index.ts';
import { proseIdeas, slideWarnings } from '../src/slides.ts';

const warningsOf = (source: string): string[] => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return slideWarnings(parsed.scene.blocks);
};

const CONCEPT = '<concept term="Label">\n<define>The answer the model learns.</define>\n</concept>';
const QUIZ = (n: number): string => `<quiz question="Q${n}?">\n<answer>A.</answer>\n</quiz>`;

describe('proseIdeas', () => {
  it('counts paragraphs, list items, callouts, tables and blocks, not headings', () => {
    assert.equal(proseIdeas('# Title\n\nOne paragraph\nstill the same one.'), 1);
    assert.equal(proseIdeas('Intro:\n- one\n- two\n\n1. three'), 4);
    assert.equal(proseIdeas('> [!NOTE]\n> A note\n> on two lines.\n\n| a | b |\n|---|---|\n| 1 | 2 |'), 2);
    assert.equal(proseIdeas('$$\nx = 1\n\ny = 2\n$$\n\n```\ncode\n\nmore\n```'), 2);
    assert.equal(proseIdeas('## Only a heading'), 0);
  });
});

describe('slideWarnings', () => {
  it('says nothing about a themed scene whose prose sits next to its pictures', () => {
    assert.deepEqual(warningsOf(`# Title\n\n<theme name="ml" />\n\nShort intro.\n\n${CONCEPT}\n\nWhat it means.\n\n${QUIZ(1)}`), []);
  });

  it('asks for a theme', () => {
    assert.match(warningsOf(`# Title\n\nIntro.\n\n${CONCEPT}`)[0] ?? '', /No <theme>/);
  });

  it('names a chapter with text but no picture, but lets a review of checks be', () => {
    const scene = `# T\n\n<theme name="ml" />\n\n${CONCEPT}\n\n<chapter title="Words only" />\n\nSome text.\n\n${QUIZ(1)}\n\n<chapter title="Review" />\n\nCheck yourself.\n\n${QUIZ(2)}\n\n${QUIZ(3)}`;
    assert.deepEqual(warningsOf(scene), ['chapter 1 "Words only" has text but no picture: give its main idea a visual (<concept>, <compare>, <flow>, a chart…).']);
  });

  it('flags a wall of text and prose far from any picture', () => {
    const wall = warningsOf(`# T\n\n<theme name="ml" />\n\nOne.\n\nTwo.\n\n- three\n- four\n\n${CONCEPT}`);
    assert.equal(wall.length, 1);
    assert.match(wall[0] ?? '', /the scene, "One\.": 4 paragraphs, items or callouts on one text slide; keep at most 3/);
    const far = warningsOf(`# T\n\n<theme name="ml" />\n\n${CONCEPT}\n\n${QUIZ(1)}\n\nLonely **text**.\n\n${QUIZ(2)}`);
    assert.deepEqual(far, ['the scene, "Lonely text.": text with no picture before or after it; put it right before the visual it introduces.']);
  });

  it('caps the list', () => {
    const chapters = Array.from({ length: 12 }, (_, i) => `<chapter title="C${i}" />\n\nText ${i}.`).join('\n\n');
    const warnings = warningsOf(`# T\n\n<theme name="ml" />\n\n${chapters}`);
    assert.equal(warnings.length, 9);
    assert.equal(warnings.at(-1), '…and 4 more.');
  });

  it('finds nothing to fix in the templates of the skill guide', () => {
    const guide = readFileSync(new URL('../../skills/explicador/presenting.md', import.meta.url), 'utf8');
    const templates = [...guide.matchAll(/^```exl\r?\n([\s\S]*?)^```/gm)].map((match) => match[1] ?? '');
    assert.equal(templates.length, 2);
    for (const template of templates) assert.deepEqual(warningsOf(template), []);
  });

  it('finds nothing to fix in the example scenes', () => {
    for (const name of ['login', 'data-model', 'session-states', 'notebook-lesson']) {
      const source = readFileSync(new URL(`../../examples/scenes/${name}.exl.md`, import.meta.url), 'utf8');
      assert.deepEqual(warningsOf(source), [], name);
    }
  });
});
