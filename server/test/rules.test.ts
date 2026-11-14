import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { formatErrors, parseExl } from '../src/parser/index.ts';
import { boxWarnings, codeWarnings, drawingWarnings, exampleWarnings, lessonWarnings, numberWarnings, quizWarnings, sceneWarnings, sectionWarnings, subtitleWarnings, tokens } from '../src/rules.ts';
import type { Block, Scene } from '../src/scene.ts';
import { tempProject } from './helpers.ts';

const repo = join(import.meta.dirname, '..', '..');

const blocksOf = (source: string): Block[] => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene.blocks;
};
const sceneOf = (source: string): Scene => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene;
};
const refsOf = (source: string): string[] => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok);
  return parsed.refs;
};

/** A notebook whose cells print 0.8333333333333334, (18, 70), 49582 and 0.846. */
const notebook = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [
    { cell_type: 'markdown', metadata: {}, source: '# Reviews' },
    { cell_type: 'code', metadata: {}, execution_count: 1, source: 'X.shape', outputs: [{ output_type: 'execute_result', data: { 'text/plain': ['(18, 70)'] }, metadata: {}, execution_count: 1 }] },
    { cell_type: 'code', metadata: {}, execution_count: 2, source: 'print(acc, n, f1)', outputs: [{ output_type: 'stream', name: 'stdout', text: ['0.8333333333333334 49582\n', '0.846\n'] }] },
  ],
});

describe('numberWarnings', () => {
  const root = tempProject({ 'nb/reviews.ipynb': notebook, 'data/sizes.csv': 'rows,cols\n24,2\n' });
  const check = (stats: string, extra = ''): string[] => {
    const source = `<stats>\n${stats}\n</stats>\n${extra}`;
    return numberWarnings(root, blocksOf(source), [...refsOf(source), 'nb/reviews.ipynb']);
  };

  it('accepts numbers as printed, rounded, as a percentage or grouped in thousands', () => {
    assert.deepEqual(check('<stat value="0.833" label="accuracy" />\n<stat value="18 × 70" label="matrix" />'), []);
    assert.deepEqual(check('<stat value="49 582" label="reviews" />\n<stat value="84.6 %" label="F1" />'), []);
    assert.deepEqual(check('<stat value="49,582" label="reviews" />\n<stat value="0.83" label="rounded" />'), []);
  });

  it('names a number no output or cell prints, and the notebook to copy it from', () => {
    const [warning, ...rest] = check('<stat value="0.912" label="accuracy" />\n<stat value="0.833" label="also" />');
    assert.equal(rest.length, 0);
    assert.match(warning ?? '', /<stats> shows 0\.912, which no output or cell of nb\/reviews\.ipynb prints: copy each number from an output/);
  });

  it('reads the data of every component, not its labels', () => {
    const chart = '<chart title="Accuracy" type="bars">\n<row label="Model 7" values="0.833" />\n<row label="Model 9" values="0.777" />\n</chart>';
    const [warning] = numberWarnings(root, blocksOf(chart), ['nb/reviews.ipynb']);
    assert.match(warning ?? '', /<chart> "Accuracy" shows 0\.777,/);
    const derive = '<derive title="Score">\n<line>\\sigma(z) = \\frac{1}{1 + e^{-z}}</line>\n<line>\\sigma(0.846) = 0.700</line>\n</derive>';
    assert.match(numberWarnings(root, blocksOf(derive), ['nb/reviews.ipynb'])[0] ?? '', /shows 0\.700,/, 'formula constants are not checked, decimals are');
  });

  it('counts numbers held by another file the scene refers to', () => {
    const source = '<stats>\n<stat value="24" label="rows" ref="data/sizes.csv" />\n</stats>';
    assert.deepEqual(numberWarnings(root, blocksOf(source), ['data/sizes.csv', 'nb/reviews.ipynb']), []);
  });

  it('checks nothing in a scene that refers to no notebook', () => {
    const source = '<stats>\n<stat value="0.912" label="made up" />\n</stats>';
    assert.deepEqual(numberWarnings(root, blocksOf(source), ['data/sizes.csv']), []);
  });

  it('splits values into numbers', () => {
    assert.deepEqual(tokens('18 × 70').map((token) => token.value), [18, 70]);
    assert.deepEqual(tokens('4 000 × 23 672').map((token) => token.value), [4000, 23672]);
    assert.deepEqual(tokens('0,833').map((token) => token.value), [0.833]);
    assert.equal(tokens('84.6 %')[0]?.percent, true);
    assert.equal(tokens('-1.2e-3')[0]?.value, 0.0012);
  });
});

describe('boxWarnings', () => {
  it('asks for a desc on every box, one that does not repeat the label', () => {
    const [missing, repeated] = boxWarnings(
      blocksOf('<arch title="A">\n<node id="a" label="Login form" />\n<node id="b" label="Users" desc="users" />\n<node id="c" label="C" desc="Checks it" />\n</arch>'),
    );
    assert.match(missing ?? '', /These boxes have no desc.*"Login form"/);
    assert.match(repeated ?? '', /The desc of "Users" repeats the label/);
  });

  it('asks to group a crowded level and to split a long flow', () => {
    const nodes = (n: number, group = ''): string => Array.from({ length: n }, (_, i) => `<node id="${group}n${i}" label="N${i}" desc="Does ${i}" />`).join('\n');
    const crowded = boxWarnings(blocksOf(`<arch title="A">\n${nodes(13)}\n</arch>`));
    assert.match(crowded[0] ?? '', /shows 13 boxes at its top level: put related boxes in a <group>/);
    const grouped = boxWarnings(blocksOf(`<arch title="A">\n<group id="g" label="G" desc="Many">\n${nodes(13, 'g')}\n</group>\n<node id="x" label="X" desc="Other" />\n</arch>`));
    assert.match(grouped[0] ?? '', /shows 13 boxes inside the group "G"/);
    assert.deepEqual(boxWarnings(blocksOf(`<arch title="A">\n${nodes(12)}\n</arch>`)), []);
    const steps = Array.from({ length: 13 }, () => '<step from="a" to="b" label="x">Goes.</step>').join('\n');
    const flow = boxWarnings(blocksOf(`<flow title="F">\n<node id="a" label="A" desc="Asks" />\n<node id="b" label="B" desc="Answers" />\n${steps}\n</flow>`));
    assert.match(flow[0] ?? '', /<flow> "F" has 13 steps: keep 4–10 steps/);
  });
});

describe('subtitleWarnings', () => {
  it('names the narration Present cannot show as a subtitle', () => {
    const long = Array.from({ length: 26 }, (_, i) => `w${i}`).join(' ');
    const ok = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    const flow = (narration: string) => `<flow title="F">\n<node id="a" label="A" desc="Asks" />\n<step from="a" label="x">${narration}</step>\n</flow>`;
    assert.match(subtitleWarnings(blocksOf(flow(long)))[0] ?? '', /<flow> "F" step 1 \(26 words\)/);
    assert.deepEqual(subtitleWarnings(blocksOf(flow(ok))), []);
    const trace = `<trace title="T">\n<value label="In">a</value>\n<value label="Out" note="${long}">b</value>\n</trace>`;
    assert.match(subtitleWarnings(blocksOf(trace))[0] ?? '', /<trace> "T" value "Out" \(26 words\)/);
  });
});

describe('lessonWarnings', () => {
  const quiz = '<quiz question="Q?">\n<option correct="true" why="Because.">A</option>\n<option why="No reason.">B</option>\n</quiz>';
  const card = (n: number) => `<quiz question="Card ${n}?">\n<answer>A.</answer>\n</quiz>`;
  const trace = '<trace title="T">\n<value label="In">a</value>\n<value label="Out">b</value>\n</trace>';
  const concept = '<concept term="Term">\n<define>What it is.</define>\n</concept>';
  const review = `<chapter title="Review" goal="Practise." />\n\n${card(1)}\n\n${card(2)}\n\n${card(3)}`;
  const map = '<journey title="The path">\n<stage id="a" label="A" value="12">First.</stage>\n<stage id="b" label="B" value="3">Then.</stage>\n</journey>';

  it('says nothing about a lesson with a map, goals, checks, a review, a trace and a concept', () => {
    assert.deepEqual(lessonWarnings(blocksOf(`${map}\n\n<chapter title="One" goal="Learn." stage="a" />\n\n${concept}\n\n${trace}\n\n${quiz}\n\n${review}`)), []);
    assert.deepEqual(lessonWarnings(blocksOf(`${trace}\n\n${concept}`)), [], 'a scene without chapters is no lesson');
  });

  it('asks for what a lesson misses', () => {
    const warnings = lessonWarnings(blocksOf(`<chapter title="One" />\n\n${concept}\n\n<chapter title="Two" goal="Learn." />\n\n${quiz}`));
    assert.match(warnings[0] ?? '', /No map: put a <journey> in the intro/);
    assert.match(warnings[1] ?? '', /Chapters without a goal: "One"/);
    assert.match(warnings[2] ?? '', /Chapters without a check: "One"/);
    assert.match(warnings[3] ?? '', /No final review/);
    assert.match(warnings[4] ?? '', /No <trace>/);
    assert.equal(warnings.length, 5);
    assert.match(lessonWarnings(blocksOf(`${map}\n\n<chapter title="One" goal="Learn." />\n\n${trace}\n\n${quiz}\n\n${review}`))[0] ?? '', /No <concept>/);
  });
});

describe('sectionWarnings', () => {
  it('asks for chapters when a scene is split by "##" headings, not for one or two', () => {
    const scene = (n: number) => `# T\n\n${Array.from({ length: n }, (_, i) => `## Step ${i + 1}\n\nText.`).join('\n\n')}\n\n<stats>\n<stat value="1" label="one" />\n</stats>`;
    assert.deepEqual(sectionWarnings(blocksOf(scene(2))), []);
    assert.match(sectionWarnings(blocksOf(scene(3)))[0] ?? '', /split into 3 sections with "##" headings: make each one a <chapter/);
    assert.deepEqual(sectionWarnings(blocksOf(`${scene(3)}\n\n<chapter title="C" />`)), [], 'chapters already');
  });
});

describe('quizWarnings', () => {
  const quiz = (why: string) => `<quiz question="Q?">\n<option correct="true" why="${why}">A</option>\n<option why="Another reason.">B</option>\n</quiz>`;

  it('catches a why that opens with a verdict, in several languages', () => {
    for (const why of ['Right, because it is.', 'Wrong: it is not.', 'Correcto. Porque sí.', '¡Incorrecto! No es así.', 'No, it does not.']) {
      assert.match(quizWarnings(blocksOf(quiz(why)))[0] ?? '', /open with a verdict/, why);
    }
  });

  it('lets a reason that starts with the same letters be', () => {
    for (const why of ['Rightly ordered words keep their meaning.', 'No word carries the time.', 'No-show rates are not in the data.', 'Si el modelo duda, elige 0.5.']) {
      assert.deepEqual(quizWarnings(blocksOf(quiz(why))), [], why);
    }
  });
});

describe('codeWarnings', () => {
  it('asks a code diagram for key code, and nothing of a lesson', () => {
    const arch = '<arch title="A">\n<node id="a" label="A" desc="Does" ref="a.js:1-2" />\n</arch>';
    assert.match(codeWarnings(blocksOf(arch), ['a.js'])[0] ?? '', /No <code>/);
    assert.deepEqual(codeWarnings(blocksOf(arch.replace('</arch>', '<code node="a" ref="a.js:1-2">Why.</code>\n</arch>')), ['a.js']), []);
    assert.deepEqual(codeWarnings(blocksOf('<stats>\n<stat value="1" label="one" />\n</stats>'), ['a.js']), []);
    // A topic explained without files (F31): there are no lines to show.
    assert.deepEqual(codeWarnings(blocksOf(arch), []), []);
  });
});

describe('exampleWarnings', () => {
  it('asks a flow for one real input traced through it, and nothing else', () => {
    const flow = '<flow title="F">\n<node id="a" label="A" desc="Does" />\n<node id="b" label="B" desc="Does too" />\n<step from="a" to="b" label="go">Goes.</step>\n</flow>';
    const trace = '<trace title="T">\n<value label="In">a</value>\n<value label="Out">b</value>\n</trace>';
    assert.match(exampleWarnings(blocksOf(flow))[0] ?? '', /No <trace>: follow one real input through the flow/);
    assert.deepEqual(exampleWarnings(blocksOf(`${flow}\n\n${trace}`)), []);
    assert.deepEqual(exampleWarnings(blocksOf('<arch title="A">\n<node id="a" label="A" desc="Does" />\n</arch>')), [], 'an architecture alone');
  });
});

describe('drawingWarnings', () => {
  const brief = (form: string): string => `<brief form="${form}">\n<audience>Adults</audience>\n<question>Why?</question>\n<example>A 200 € sofa sold to Ana</example>\n<misconception>A wrong idea</misconception>\n<check>Predict it</check>\n<terms>term</terms>\n</brief>`;
  const trace = '<trace title="It changes" arc="example">\n<value label="A" note="First.">one</value>\n<value label="B" note="Then.">two</value>\n</trace>';
  const figure = '<figure title="The thing" arc="example">\n<circle id="a" x="5" y="5" r="2" label="A" />\n<circle id="b" x="9" y="5" r="1" label="B" />\n<show items="b">It arrives.</show>\n</figure>';
  it('asks a scene about the world for a figure of the thing itself', () => {
    assert.match(drawingWarnings(sceneOf(`# Why?\n\n${brief('process')}\n\n${trace}`), [])[0] ?? '', /points at no files.*add a <figure> of the brief's example/);
    assert.deepEqual(drawingWarnings(sceneOf(`# Why?\n\n${brief('process')}\n\n${figure}`), []), []);
    assert.deepEqual(drawingWarnings(sceneOf(`# Why?\n\n${brief('process')}\n\n${trace}`), ['src/a.ts']), [], 'a scene over files');
    assert.deepEqual(drawingWarnings(sceneOf(`# Why?\n\n${brief('quantity')}\n\n${trace}`), []), [], 'a quantity');
  });
});

describe('the scenes the skill shows', () => {
  it('break no rule: every example over its project', () => {
    const projects = { login: 'shop', 'data-model': 'shop', 'session-states': 'shop', 'notebook-lesson': 'notebook', rag: 'rag', 'search-tree': 'trees', 'cache-storm': 'cache', lease: 'lease' };
    for (const [name, project] of Object.entries(projects)) {
      const source = readFileSync(join(repo, 'examples/scenes', `${name}.exl.md`), 'utf8');
      assert.deepEqual(sceneWarnings(join(repo, 'examples', project), sceneOf(source), refsOf(source)), [], name);
    }
  });

  it('break no rule: the templates of the guide and the skill', () => {
    for (const file of ['skills/explicador/presenting.md', 'skills/explicador/SKILL.md']) {
      const text = readFileSync(join(repo, file), 'utf8').replace(/\r\n/g, '\n');
      for (const [, template = ''] of text.matchAll(/^```exl\n([\s\S]*?)^```/gm)) {
        assert.deepEqual(sceneWarnings(tempProject(), sceneOf(template), refsOf(template)), [], `${file}: ${template.slice(0, 40)}`);
      }
    }
  });
});
