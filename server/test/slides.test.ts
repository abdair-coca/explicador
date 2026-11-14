import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { formatErrors, parseExl } from '../src/parser/index.ts';
import { slideWarnings } from '../src/slides.ts';

const warningsOf = (source: string): string[] => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return slideWarnings(parsed.scene.blocks);
};

const CONCEPT = '<concept term="Label">\n<define>The answer the model learns.</define>\n</concept>';
const QUIZ = (n: number): string => `<quiz question="Q${n}?">\n<answer>A.</answer>\n</quiz>`;
const COMPARE = (title: string): string => `<compare title="${title}" a="A" b="B">\n<pair label="x" a="1" b="2" />\n<pair label="y" a="3" b="4" />\n</compare>`;

describe('slideWarnings', () => {
  it('says nothing about a themed scene with a cover, components and short titles, however long its prose', () => {
    const prose = Array.from({ length: 6 }, (_, i) => `Paragraph ${i}.`).join('\n\n');
    assert.deepEqual(warningsOf(`# Title\n\n<theme name="ml data" />\n\n${prose}\n\n${CONCEPT}\n\n${QUIZ(1)}`), []);
  });

  it('asks for two or three themes that draw', () => {
    assert.match(warningsOf(`# Title\n\n<theme name="plain" />\n\n${CONCEPT}`)[0] ?? '', /names "plain", which draws nothing/);
    assert.match(warningsOf(`# Title\n\n<theme name="space plain" />\n\n${CONCEPT}`)[0] ?? '', /names "plain"/);
    assert.match(warningsOf(`# Title\n\n<theme name="space" />\n\n${CONCEPT}`)[0] ?? '', /names one theme: name two or three that fit the subject, e\.g\. `<theme name="space science" \/>`/);
    assert.deepEqual(warningsOf(`# Title\n\n<theme name="space science" />\n\n${CONCEPT}`), []);
  });

  it('asks for a theme and for a "#" title as the cover', () => {
    assert.match(warningsOf(`# Title\n\nIntro.\n\n${CONCEPT}`)[0] ?? '', /No <theme>/);
    assert.match(warningsOf(`<theme name="ml data" />\n\nIntro without a title.\n\n${CONCEPT}`)[0] ?? '', /No "# " title at the top/);
    assert.match(warningsOf(`<theme name="ml data" />\n\n<chapter title="One" />\n\n${CONCEPT}`)[0] ?? '', /No "# " title at the top/);
  });

  it('names a chapter without a component, but lets a review of checks and a lesson intro be', () => {
    const scene = `# T\n\n<theme name="ml data" />\n\nIntro.\n\n<chapter title="Words only" />\n\nSome text.\n\n${QUIZ(1)}\n\n<chapter title="Review" />\n\n${QUIZ(2)}\n\n${QUIZ(3)}\n\n<chapter title="Shown" />\n\n${CONCEPT}`;
    assert.deepEqual(warningsOf(scene), ['chapter 1 "Words only" has no component, so Present shows only its title: give its main idea one (<trace>, <flow>, <compare>, <concept>, a chart…).']);
  });

  it('flags a title too long to be the slide sentence', () => {
    const long = 'How the two vectorizers compare on every metric we computed in the notebook';
    assert.deepEqual(warningsOf(`# T\n\n<theme name="ml data" />\n\n${COMPARE(long)}`), [
      `The title "${long}" has 13 words; it is the slide's one sentence, so keep it to 12 (say the rest on the page).`,
    ]);
  });

  it('caps the list', () => {
    const chapters = Array.from({ length: 12 }, (_, i) => `<chapter title="C${i}" />\n\nText ${i}.`).join('\n\n');
    const warnings = warningsOf(`# T\n\n<theme name="ml data" />\n\n${chapters}`);
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
    for (const name of ['login', 'data-model', 'session-states', 'notebook-lesson', 'rag', 'search-tree', 'cache-storm', 'lease']) {
      const source = readFileSync(new URL(`../../examples/scenes/${name}.exl.md`, import.meta.url), 'utf8');
      assert.deepEqual(warningsOf(source), [], name);
    }
  });
});
