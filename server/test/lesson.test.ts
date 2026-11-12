import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { describeClick, findClickTarget } from '../src/clicks/index.ts';
import {
  formatErrors,
  parseExl,
  type CalcBlock,
  type ThresholdBlock,
  type ChapterBlock,
  type ChartBlock,
  type ConceptBlock,
  type JourneyBlock,
  type MatrixBlock,
  type QuizBlock,
  type StatsBlock,
  type TraceBlock,
} from '../src/parser/index.ts';
import { needsLesson } from '../src/lessons.ts';
import { boxesWithoutRange } from '../src/ranges.ts';
import type { ScenePayload } from '../src/scene.ts';
import { withSnippets } from '../src/snippets.ts';
import { tempProject } from './helpers.ts';

const lesson = `# Can a model tell a good review from a bad one?

<stats id="headline">
  <stat value="84.6 %" label="accuracy on 1 000 test reviews" ref="nb/p2.ipynb:26" />
  <stat value="49 582" label="reviews after removing duplicates" />
</stats>

<journey id="path" title="The data's path">
  <stage id="csv" label="IMDB CSV" value="50 000 reviews" kind="file" ref="nb/p2.ipynb:5">pandas reads the file.</stage>
  <stage id="dedup" label="Without duplicates" value="49 582" op="drop_duplicates()" ref="nb/p2.ipynb:7-7">Copies could leak into the test set.</stage>
  <stage id="model" label="Model" value="F1 0.851" kind="metric" op="LogisticRegression()">The best model.</stage>
  <drill node="dedup" topic="duplicates" />
  <code node="dedup" ref="nb/p2.ipynb:7-7">The line that drops them.</code>
</journey>

<chapter id="clean" title="Cleaning the text" goal="Why \`not\` stays" ref="nb/p2.ipynb:10-16" />

<trace id="prep" title="One review through preprocesar()" ref="nb/p2.ipynb:14">
  <value label="Original">This was NOT   good &lt;br /&gt;</value>
  <value label="Lowercase" code="texto.lower()" note="Not and not become one word.">this was not good &lt;br /&gt;</value>
  <value label="Stopwords" note='"this" and "was" go; "not" stays.' ref="nb/p2.ipynb:12">not good</value>
</trace>

> [!TIP]
> Negations carry the sentiment.

<quiz id="q1" question="What happens to &quot;not good&quot; without the negations?">
  <option why="not is a stopword in NLTK.">It stays the same</option>
  <option correct="true" why="Only good is left, which sounds positive.">It becomes "good"</option>
</quiz>

<chapter title="Results" />

<chart id="metrics" title="BoW vs TF-IDF" type="bars" series="BoW | TF-IDF" highlight="TF-IDF" ref="nb/p2.ipynb:26">
  <row label="Accuracy" values="0.840 | 0.846" />
  <row label="F1" values="0.8431 | 0.8511" />
</chart>

<chart title="Word weights" type="hbars">
  <row label="great" values="4.14" />
  <row label="bad" values="-4.80" />
</chart>

<matrix id="cm" title="Confusion matrix (TF-IDF)" cols="negative | positive" kind="confusion" positive="positive" corner="actual \\ predicted">
  <row label="negative" values="406 | 96" />
  <row label="positive" values="58 | 440" />
  <focus metric="precision" label="Precision">Of 536 predicted positive, 440 were.</focus>
  <focus label="Errors" cells="1,2 2,1">The two kinds of mistakes.</focus>
</matrix>

<matrix title="Bag of words" cols="good | bad | not">
  <row label="review 1" values="1 | 0 | 1" />
  <focus label="Column good" cells="*,1">Where good appears.</focus>
</matrix>

<quiz question="Why fit the vectorizer on train only?">
  <answer>
    So the test set never shapes the vocabulary.

    Otherwise the score is optimistic.
  </answer>
</quiz>
`;

function parsed() {
  const result = parseExl(lesson);
  assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
  return result;
}

function errorsOf(source: string): string[] {
  const result = parseExl(source);
  assert.equal(result.ok, false, 'expected errors');
  return result.ok ? [] : result.errors.map((e) => `${e.line}:${e.column} ${e.message}`);
}

describe('lessons: valid documents', () => {
  it('parses every lesson block in order', () => {
    const types = parsed().scene.blocks.map((b) => b.type);
    assert.deepEqual(types, ['markdown', 'stats', 'journey', 'chapter', 'trace', 'markdown', 'quiz', 'chapter', 'chart', 'chart', 'matrix', 'matrix', 'quiz']);
  });

  it('reads chapters, stats and the journey', () => {
    const blocks = parsed().scene.blocks;
    assert.deepEqual(blocks[3] as ChapterBlock, {
      type: 'chapter',
      id: 'clean',
      title: 'Cleaning the text',
      goal: 'Why `not` stays',
      ref: { path: 'nb/p2.ipynb', start: 10, end: 16 },
    });
    assert.equal((blocks[7] as ChapterBlock).id, 'chapter-8', 'a chapter without id is numbered by position');
    assert.deepEqual((blocks[1] as StatsBlock).stats[0], { value: '84.6 %', label: 'accuracy on 1 000 test reviews', ref: { path: 'nb/p2.ipynb', start: 26 } });
    const journey = blocks[2] as JourneyBlock;
    assert.deepEqual(
      journey.stages.map((s) => [s.id, s.kind, s.value, s.op]),
      [
        ['csv', 'file', '50 000 reviews', undefined],
        ['dedup', 'table', '49 582', 'drop_duplicates()'],
        ['model', 'metric', 'F1 0.851', 'LogisticRegression()'],
      ],
    );
    assert.equal(journey.stages[1]?.narration, 'Copies could leak into the test set.');
    assert.deepEqual(journey.drills, [{ node: 'dedup', topic: 'duplicates' }]);
    assert.equal(journey.codes?.[0]?.node, 'dedup');
  });

  it('reads traces with collapsed values, code and notes', () => {
    const trace = parsed().scene.blocks[4] as TraceBlock;
    assert.deepEqual(trace.ref, { path: 'nb/p2.ipynb', start: 14 });
    assert.deepEqual(
      trace.values.map((v) => [v.label, v.text, v.code, v.note]),
      [
        ['Original', 'This was NOT good <br />', undefined, undefined],
        ['Lowercase', 'this was not good <br />', 'texto.lower()', 'Not and not become one word.'],
        ['Stopwords', 'not good', undefined, '"this" and "was" go; "not" stays.'],
      ],
    );
  });

  it('reads a trace whose value changes form: a sentence, a list, a table, bars and a number', () => {
    const source = [
      '<trace title="One review through the model">',
      '<value label="Review">Not good at all</value>',
      '<value kind="list" label="Tokens">not | good</value>',
      '<value kind="table" label="Counts">not=1|good=1</value>',
      '<value kind="bars" label="Weights">not=-0.41|good=+0.52|bias=1e-3</value>',
      '<value kind="number" label="Score">0.11</value>',
      '</trace>',
    ].join('\n');
    const result = parseExl(source);
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const trace = result.scene.blocks[0] as TraceBlock;
    assert.deepEqual(
      trace.values.map((v) => [v.kind, v.items]),
      [
        [undefined, undefined],
        ['list', [{ name: 'not' }, { name: 'good' }]],
        ['table', [{ name: 'not', value: '1' }, { name: 'good', value: '1' }]],
        ['bars', [{ name: 'not', value: '-0.41' }, { name: 'good', value: '+0.52' }, { name: 'bias', value: '1e-3' }]],
        ['number', undefined],
      ],
    );
    assert.equal(trace.values[4]?.text, '0.11');
  });

  it('refuses trace values in the wrong form, with an example', () => {
    const trace = (value: string): string[] => errorsOf(`<trace title="T">\n<value label="A">a</value>\n${value}\n</trace>`);
    assert.match(trace('<value kind="shape" label="B">b</value>')[0] ?? '', /Unknown kind "shape"; use text, list, table, bars, number, vector/);
    assert.match(trace('<value kind="table" label="B">a=1|b</value>')[0] ?? '', /Each table item needs name=value, separated by "\|", e\.g\. <value kind="table"/);
    assert.match(trace('<value kind="list" label="B">a||b</value>')[0] ?? '', /Each list item needs text/);
    assert.match(trace('<value kind="bars" label="B">a=high</value>')[0] ?? '', /Bars need numbers: "a=high" is not one/);
    assert.match(trace('<value kind="number" label="B">a very long sentence that is no number</value>')[0] ?? '', /A number value is at most 24 characters/);
  });

  it('reads a vector: its numbers in order and its real size', () => {
    const result = parseExl('<trace title="T">\n<value label="Chunk">Refunds take 5 days</value>\n<value kind="vector" label="Embedding" dims="768">0.12| -0.05|0.31</value>\n</trace>');
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const vector = (result.scene.blocks[0] as TraceBlock).values[1];
    assert.equal(vector?.kind, 'vector');
    assert.deepEqual(vector?.items, [{ name: '1', value: '0.12' }, { name: '2', value: '-0.05' }, { name: '3', value: '0.31' }]);
    assert.equal(vector?.dims, 768);
  });

  it('refuses a vector with a word, dims smaller than what is shown, and dims on another kind', () => {
    const trace = (value: string): string[] => errorsOf(`<trace title="T">\n<value label="A">a</value>\n${value}\n</trace>`);
    assert.match(trace('<value kind="vector" label="V">0.1|high</value>')[0] ?? '', /"high" is not one/);
    assert.match(trace('<value kind="vector" label="V" dims="2">0.1|0.2|0.3</value>')[0] ?? '', /dims is the vector's real size/);
    assert.match(trace('<value kind="bars" label="V" dims="8">a=1</value>')[0] ?? '', /dims only goes on a <value kind="vector">/);
    assert.match(trace(`<value kind="vector" label="V">${Array.from({ length: 17 }, () => '0.1').join('|')}</value>`)[0] ?? '', /at most 16 numbers/);
  });

  it('reads charts with series, units and highlights, keeping values as written', () => {
    const blocks = parsed().scene.blocks;
    const bars = blocks[8] as ChartBlock;
    assert.equal(bars.chartType, 'bars');
    assert.deepEqual(bars.series, ['BoW', 'TF-IDF']);
    assert.deepEqual(bars.rows[1], { label: 'F1', values: ['0.8431', '0.8511'] });
    assert.equal(bars.highlight, 'TF-IDF');
    const hbars = blocks[9] as ChartBlock;
    assert.deepEqual(hbars.series, [], 'one unnamed series');
    assert.deepEqual(hbars.rows.map((r) => r.values[0]), ['4.14', '-4.80']);
    assert.equal(hbars.unit, undefined);
  });

  it('reads confusion and plain matrices with their focuses', () => {
    const blocks = parsed().scene.blocks;
    const cm = blocks[10] as MatrixBlock;
    assert.equal(cm.kind, 'confusion');
    assert.equal(cm.positive, 1);
    assert.equal(cm.corner, 'actual \\ predicted');
    assert.deepEqual(cm.rows.map((r) => r.values), [['406', '96'], ['58', '440']]);
    assert.deepEqual(cm.focuses, [
      { label: 'Precision', cells: [], metric: 'precision', narration: 'Of 536 predicted positive, 440 were.' },
      { label: 'Errors', cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }], narration: 'The two kinds of mistakes.' },
    ]);
    const bow = blocks[11] as MatrixBlock;
    assert.equal(bow.kind, undefined);
    assert.deepEqual(bow.focuses[0]?.cells, [{ col: 0 }]);
  });

  it('reads multiple-choice quizzes and flashcards', () => {
    const blocks = parsed().scene.blocks;
    const choice = blocks[6] as QuizBlock;
    assert.equal(choice.question, 'What happens to "not good" without the negations?');
    assert.deepEqual(choice.options, [
      { text: 'It stays the same', why: 'not is a stopword in NLTK.' },
      { text: 'It becomes "good"', correct: true, why: 'Only good is left, which sounds positive.' },
    ]);
    const card = blocks[12] as QuizBlock;
    assert.deepEqual(card.options, []);
    assert.equal(card.answer, 'So the test set never shapes the vocabulary.\n\nOtherwise the score is optimistic.');
    assert.equal(card.id, 'quiz-13');
  });

  it('collects the refs of every lesson block', () => {
    assert.deepEqual(parsed().refs, ['nb/p2.ipynb']);
    const other = parseExl('<chapter title="A" ref="a.py:1-3" />\n\n<chart title="C" type="line" ref="b.ipynb:2">\n<row label="1" values="1" />\n<row label="2" values="2" />\n</chart>\n\n<stats><stat value="1" label="one" ref="c.txt" /></stats>');
    assert.ok(other.ok, other.ok ? '' : formatErrors(other.errors));
    assert.deepEqual(other.refs, ['a.py', 'b.ipynb', 'c.txt']);
  });
});

describe('lessons: invalid documents', () => {
  it('keeps child tags inside their block', () => {
    assert.deepEqual(errorsOf('<stage id="a" label="A">x</stage>'), ['1:1 <stage> must be inside <journey>']);
    assert.deepEqual(errorsOf('<row label="a" values="1" />'), ['1:1 <row> must be inside <chart> or <matrix>']);
    assert.deepEqual(errorsOf('<option>A</option>'), ['1:1 <option> must be inside <quiz>']);
  });

  it('checks chapters', () => {
    assert.match(errorsOf('<chapter title="A"></chapter>')[0] ?? '', /<chapter> is self-closing/);
    assert.match(errorsOf('<chapter title="A" ref="nb.ipynb" />')[0] ?? '', /A chapter's ref is a range/);
    assert.match(errorsOf('<chapter title="A" ref="a.py:1-500" />')[0] ?? '', /at most 120 cells or lines/);
    const many = Array.from({ length: 21 }, (_, i) => `<chapter title="C${i}" />`).join('\n\n');
    assert.deepEqual(errorsOf(many), ['1:1 A lesson has at most 20 chapters']);
  });

  it('checks stats and journeys', () => {
    assert.match(errorsOf('<stats>\n</stats>')[0] ?? '', /<stats> needs at least one <stat>/);
    assert.match(errorsOf('<stats><stat value="a very long value that does not fit" label="x" /></stats>')[0] ?? '', /"value" is longer than 24/);
    const errors = errorsOf(
      [
        '<journey title="J">',
        '  <stage id="a" label="A" kind="cloud">One.</stage>',
        '  <stage id="a" label="B"></stage>',
        '  <drill node="ghost" topic="x" />',
        '</journey>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '2:27 Unknown kind "cloud"; use file, table, text, matrix, split, model, metric',
      '3:3 <stage> needs narration text',
      '3:3 Duplicate stage id "a"',
      '4:10 "node" refers to unknown item "ghost"',
    ]);
    assert.match(errorsOf('<journey title="J">\n<stage id="a" label="A">Only one.</stage>\n</journey>')[0] ?? '', /needs at least two <stage>s/);
  });

  it('checks traces', () => {
    assert.match(errorsOf('<trace title="T">\n<value label="Only">x</value>\n</trace>')[0] ?? '', /needs at least two <value>s/);
    assert.match(errorsOf('<trace title="T">\n<value label="A"></value>\n<value label="B">b</value>\n</trace>')[0] ?? '', /<value> needs the value as text/);
  });

  it('checks charts: type, widths, numbers, highlight, series', () => {
    assert.match(errorsOf('<chart title="C" type="pie">\n<row label="a" values="1" />\n</chart>')[0] ?? '', /Unknown type "pie"; use bars, hbars, line/);
    const errors = errorsOf(
      [
        '<chart title="C" type="bars" series="A | B" highlight="Z">',
        '  <row label="x" values="1" />',
        '  <row label="y" values="1 | 0,846" />',
        '</chart>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '2:18 Row "x" has 1 values; a chart with 2 series needs 2 (separate them with "|")',
      '3:18 Row "y": "0,846" is not a number; write it as the notebook prints it, with a dot for decimals (0.846)',
      '1:45 "highlight" must name a series or a row label: "Z" is neither',
    ]);
    assert.match(errorsOf('<chart title="C" type="line">\n<row label="a" values="1" />\n</chart>')[0] ?? '', /A line chart needs at least two <row>s/);
    assert.match(errorsOf('<chart title="C" type="bars" series="a|b|c|d|e">\n<row label="a" values="1|2|3|4|5" />\n</chart>')[0] ?? '', /at most 4 series/);
  });

  it('checks matrices: widths, confusion rules, focuses', () => {
    const errors = errorsOf(
      [
        '<matrix title="M" cols="neg | pos" kind="confusion" positive="maybe">',
        '  <row label="neg" values="4 | 1.5" />',
        '  <row label="positive" values="1 | 3" />',
        '  <focus label="Bad" cells="3,1">Out of range.</focus>',
        '  <focus metric="speed">Unknown metric.</focus>',
        '</matrix>',
      ].join('\n'),
    );
    assert.deepEqual(errors, [
      '2:20 Row "neg": "1.5" is not a count; a confusion matrix holds whole numbers',
      '1:1 In a confusion matrix the rows (actual) and the columns (predicted) name the same classes in the same order',
      '1:53 "positive" must name one of the classes: neg, pos',
      '4:22 Invalid cells: "3,1" is outside the 2×2 matrix',
      '5:10 Unknown metric "speed"; use accuracy, precision, recall, f1',
    ]);
    assert.match(errorsOf('<matrix title="M" cols="a">\n<row label="r" values="1" />\n<focus metric="f1">x</focus>\n</matrix>')[0] ?? '', /"metric" works only in a <matrix kind="confusion">/);
    assert.match(errorsOf('<matrix title="M" cols="a | b">\n<row label="r" values="1" />\n</matrix>')[0] ?? '', /Row "r" has 1 values; a matrix with 2 columns needs 2/);
  });

  it('checks quizzes', () => {
    assert.match(errorsOf('<quiz question="Q">\n<option>A</option>\n<option>B</option>\n</quiz>')[0] ?? '', /Exactly one <option> is correct="true"/);
    assert.match(errorsOf('<quiz question="Q">\n<option correct="yes">A</option>\n<option>B</option>\n</quiz>')[0] ?? '', /Write correct="true" on the right option/);
    assert.match(errorsOf('<quiz question="Q">\n<option correct="true">A</option>\n</quiz>')[0] ?? '', /A <quiz> has 2 to 5 options/);
    assert.match(
      errorsOf('<quiz question="Q">\n<option correct="true">A</option>\n<option>B</option>\n<answer>C</answer>\n</quiz>')[0] ?? '',
      /either <option>s \(multiple choice\) or one <answer>/,
    );
    assert.match(errorsOf('<quiz question="Q">\n</quiz>')[0] ?? '', /<quiz> needs 2 to 5 <option>s, or one <answer>/);
    assert.match(errorsOf('<quiz question="Q">\n<answer></answer>\n</quiz>')[0] ?? '', /<answer> needs the answer text/);
  });

  it('reports lesson blocks left open', () => {
    assert.deepEqual(errorsOf('Intro\n\n<trace title="T">\n<value label="A">a</value>\n'), ['3:1 Unclosed <trace>: expected </trace>']);
    assert.deepEqual(errorsOf('<quiz question="Q">\n<option correct="true">A\n</quiz>'), ['3:1 Expected </option> but found </quiz>']);
  });
});

/** A two-cell notebook: Markdown, then code with a printed output. */
const notebook = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { language_info: { name: 'python' } },
  cells: [
    { cell_type: 'markdown', metadata: {}, source: ['# Load'] },
    {
      cell_type: 'code',
      metadata: {},
      execution_count: 1,
      source: ['print(len(df))'],
      outputs: [{ output_type: 'stream', name: 'stdout', text: ['49582\n'] }],
    },
  ],
});

describe('lessons: the server side', () => {
  it('attaches the chapter cells with their outputs, or the lines of a plain file', () => {
    const root = tempProject({ 'nb/a.ipynb': notebook, 'src/b.py': 'one\ntwo\nthree\n' });
    const result = parseExl('<chapter id="c1" title="Load" ref="nb/a.ipynb:1-2" />\n\n<chapter id="c2" title="Script" ref="src/b.py:2-3" />\n\n<chapter id="c3" title="Gone" ref="nb/a.ipynb:5-6" />');
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const [first, second, gone] = withSnippets(root, result.scene.blocks) as ChapterBlock[];
    assert.deepEqual(first?.cells?.map((c) => c.type), ['markdown', 'code']);
    assert.deepEqual(first?.cells?.[1]?.outputs, [{ kind: 'text', stream: 'stdout', text: '49582\n' }], 'chapters keep what the cells printed');
    assert.deepEqual(second?.lines, ['two', 'three']);
    assert.equal(gone?.missing, true);
  });

  it('lets the user click journey stages and chapters, and asks for ranges on stages', () => {
    const root = tempProject({ 'nb/a.ipynb': notebook });
    const result = parseExl(
      [
        '<journey id="j" title="Path">',
        '  <stage id="raw" label="Raw" ref="nb/a.ipynb">Read.</stage>',
        '  <stage id="clean" label="Clean" ref="nb/a.ipynb:2-2">Cleaned.</stage>',
        '  <drill node="clean" topic="cleaning" />',
        '</journey>',
        '',
        '<chapter id="intro" title="Loading the data" ref="nb/a.ipynb:1-2" />',
      ].join('\n'),
    );
    assert.ok(result.ok, result.ok ? '' : formatErrors(result.errors));
    const scene: ScenePayload = { version: 1, topic: 'lesson', key: 'lesson', status: 'fresh', changes: [], savedAt: '', trail: [], blocks: result.scene.blocks };
    const stage = findClickTarget(scene, 'j', 'clean');
    assert.deepEqual([stage?.topic, stage?.drilled, stage?.node.kind], ['cleaning', true, 'stage']);
    const chapter = findClickTarget(scene, 'intro', 'intro');
    assert.ok(chapter);
    assert.deepEqual([chapter.topic, chapter.node.kind, chapter.block.title], ['Loading the data', 'chapter', 'Loading the data']);
    assert.match(describeClick(scene, chapter), /"Loading the data" \(node intro, chapter, nb\/a\.ipynb:1-2\)/);
    assert.equal(findClickTarget(scene, 'intro', 'other'), undefined);
    // A two-cell notebook is short enough to point at whole: no warning.
    assert.deepEqual(boxesWithoutRange(root, result.scene.blocks), []);
    const big = tempProject({ 'nb/a.ipynb': JSON.stringify({ ...JSON.parse(notebook), cells: Array(5).fill(JSON.parse(notebook).cells[1]) }) });
    assert.deepEqual(boxesWithoutRange(big, result.scene.blocks), ['Raw (nb/a.ipynb)']);
  });
});

describe('the example lesson', () => {
  const repo = join(import.meta.dirname, '..', '..');
  const project = join(repo, 'examples/notebook');
  const parsed = parseExl(readFileSync(join(repo, 'examples/scenes/notebook-lesson.exl.md'), 'utf8'));

  it('parses, uses every lesson tag and points only at files of examples/notebook', () => {
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    const types = new Set(parsed.scene.blocks.map((block) => block.type));
    for (const type of ['chapter', 'stats', 'journey', 'trace', 'chart', 'matrix', 'quiz', 'calc', 'threshold']) assert.ok(types.has(type as never), type);
    for (const ref of parsed.refs) assert.ok(existsSync(join(project, ref)), ref);
  });

  it('gets its chapters\' cells with their outputs from the notebook', () => {
    assert.ok(parsed.ok);
    const chapters = withSnippets(project, parsed.scene.blocks).filter((block): block is ChapterBlock => block.type === 'chapter');
    const evaluate = chapters.find((chapter) => chapter.id === 'evaluate');
    assert.deepEqual(evaluate?.cells?.map((cell) => cell.n), [14, 15]);
    assert.ok(evaluate?.cells?.[1]?.outputs?.length, 'cell 15 has its output');
  });

  it('shows only numbers the notebook printed', () => {
    assert.ok(parsed.ok);
    const notebook = JSON.parse(readFileSync(join(project, 'reviews.ipynb'), 'utf8')) as { cells: { outputs?: { text?: string[]; data?: Record<string, string[]> }[] }[] };
    const printed = notebook.cells
      .flatMap((cell) => cell.outputs ?? [])
      .map((output) => [...(output.text ?? []), ...(output.data?.['text/plain'] ?? [])].join(''))
      .join('\n');
    const numbers = parsed.scene.blocks.flatMap((block) => {
      if (block.type === 'stats') return block.stats.map((stat) => stat.value);
      if (block.type === 'chart' || block.type === 'matrix') return block.rows.flatMap((row) => row.values);
      // Signs are added when printing (`+.3f`); the number itself must be printed.
      if (block.type === 'threshold') return block.points.map((point) => point.score);
      if (block.type === 'calc') return [...block.parts.map((part) => part.value.replace(/^\+/, '')), ...(block.total ? [block.total] : [])];
      return [];
    });
    assert.ok(numbers.length > 20);
    for (const value of numbers) assert.ok(printed.includes(value), `${value} is not in any output of reviews.ipynb`);
  });
});

describe('needsLesson', () => {
  it('asks for a lesson only for a notebook scene without chapters', () => {
    const arch = parseExl('<arch title="A">\n<node id="n" label="N" ref="a.ipynb:1-2" />\n</arch>');
    const lessonScene = parseExl('<chapter title="C" ref="a.ipynb:1-2" />\n\n<quiz question="Q?">\n<answer>A.</answer>\n</quiz>');
    assert.ok(arch.ok && lessonScene.ok);
    assert.equal(needsLesson(arch.scene.blocks, ['a.ipynb']), true);
    assert.equal(needsLesson(arch.scene.blocks, ['a.py']), false);
    assert.equal(needsLesson(lessonScene.scene.blocks, ['a.ipynb']), false);
  });
});

describe('<calc>', () => {
  const calc = (attrs: string, parts: string) => `<calc title="How the model scores it"${attrs}>\n${parts}\n</calc>`;
  const parts = '<part label="intercept" value="-0.075" />\n<part label="bad" value="-0.332" note="a negative word" ref="nb/p2.ipynb:3" />\n<part label="really" value="+0.310" />';

  it('reads parts, the printed total and the logistic options', () => {
    const parsed = parseExl(calc(' kind="logistic" total="-0.097" classes="negative|positive" threshold="0.6" ref="nb/p2.ipynb:4"', parts));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    const block = parsed.scene.blocks[0] as CalcBlock;
    assert.equal(block.kind, 'logistic');
    assert.deepEqual(block.parts.map((part) => part.value), ['-0.075', '-0.332', '+0.310']);
    assert.equal(block.parts[1]?.note, 'a negative word');
    assert.equal(block.total, '-0.097');
    assert.deepEqual(block.classes, ['negative', 'positive']);
    assert.equal(block.threshold, 0.6);
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
  });

  it('accepts a total off by rounding and refuses one the parts do not add up to', () => {
    // -0.097 exactly; -0.095 is within 3 × 0.0005 + 0.0005 of it, -0.090 is not.
    assert.ok(parseExl(calc(' total="-0.095"', parts)).ok);
    assert.match(errorsOf(calc(' total="-0.090"', parts))[0] ?? '', /The parts add up to -0.097, not -0.090/);
  });

  it('refuses bad numbers, too few parts and logistic options on a sum', () => {
    assert.match(errorsOf(calc('', '<part label="a" value="0,5" />\n<part label="b" value="1" />'))[0] ?? '', /"0,5" is not a number/);
    assert.match(errorsOf(calc('', '<part label="a" value="1" />'))[0] ?? '', /at least two <part>s/);
    assert.match(errorsOf(calc(' classes="a|b"', parts))[0] ?? '', /"classes" works only in a <calc kind="logistic">/);
    assert.match(errorsOf(calc(' kind="logistic" threshold="1.5"', parts))[0] ?? '', /between 0 and 1/);
    assert.match(errorsOf(calc(' kind="logistic" classes="a"', parts))[0] ?? '', /names the two classes/);
  });
});

describe('<concept>', () => {
  const concept = (body: string, attrs = '') => `<concept term="Sigmoid"${attrs}>\n${body}\n</concept>`;
  const define = '<define>Squashes any score into a probability between **0** and **1**.</define>';

  it('reads the term and its pieces, keeping the line breaks of the example', () => {
    const parsed = parseExl(
      concept(
        `  ${define}\n  <analogy>A dimmer: however hard you push, the light stays between off and on.</analogy>\n` +
          '  <formula>\\sigma(z) = \\frac{1}{1+e^{-z}}</formula>\n  <example>\n    | z | p |\n    |---|---|\n    | 0 | 0.5 |\n  </example>',
        ' id="sigmoid" ref="nb/p2.ipynb:9"',
      ),
    );
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[0], {
      type: 'concept',
      id: 'sigmoid',
      term: 'Sigmoid',
      define: 'Squashes any score into a probability between **0** and **1**.',
      analogy: 'A dimmer: however hard you push, the light stays between off and on.',
      formula: '\\sigma(z) = \\frac{1}{1+e^{-z}}',
      example: '| z | p |\n|---|---|\n| 0 | 0.5 |',
      ref: { path: 'nb/p2.ipynb', start: 9 },
    } satisfies ConceptBlock);
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
    const short = parseExl(concept(define));
    assert.ok(short.ok && (short.scene.blocks[0] as ConceptBlock).id === 'concept-1');
  });

  it('refuses a missing <define>, an unknown child, a duplicate and a piece that is too long', () => {
    assert.match(errorsOf(concept('<analogy>A dimmer.</analogy>'))[0] ?? '', /<concept> needs a <define>/);
    assert.match(errorsOf(concept(`${define}\n<note>x</note>`))[0] ?? '', /<note> is not allowed inside <concept>; use <define>, <analogy>, <formula>, <example>/);
    assert.match(errorsOf(concept(`${define}\n${define}`))[0] ?? '', /Only one <define> per <concept>/);
    assert.match(errorsOf(concept(`<define>${'a'.repeat(301)}</define>`))[0] ?? '', /<define> is longer than 300 characters/);
    assert.match(errorsOf('<concept term="Sigmoid" />')[0] ?? '', /<concept> needs a <define>/);
  });

  it('refuses a formula that is not LaTeX or that keeps its dollars', () => {
    assert.match(errorsOf(concept(`${define}\n<formula>\\frac{1}{</formula>`))[0] ?? '', /<formula> is not valid LaTeX/);
    assert.match(errorsOf(concept(`${define}\n<formula>$x^2$</formula>`))[0] ?? '', /without "\$"/);
    assert.match(errorsOf(concept('<define>Bad $\\frac{$ here.</define>'))[0] ?? '', /is not valid LaTeX/);
  });
});

describe('<threshold>', () => {
  const points = '<point score="0.156" actual="negative" label="bad music" />\n<point score="0.608" actual="negative" />\n<point score="0.652" actual="positive" />';
  const threshold = (attrs: string, body = points) => `<threshold title="Moving the threshold"${attrs}>\n${body}\n</threshold>`;

  it('reads the classes, the starting threshold and the points', () => {
    const parsed = parseExl(threshold(' classes="negative|positive" at="0.6" ref="nb/p2.ipynb:9"'));
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    const block = parsed.scene.blocks[0] as ThresholdBlock;
    assert.deepEqual(block.classes, ['negative', 'positive']);
    assert.equal(block.at, 0.6);
    assert.deepEqual(block.points[0], { score: '0.156', actual: 'negative', label: 'bad music' });
    assert.deepEqual(parsed.refs, ['nb/p2.ipynb']);
    const plain = parseExl(threshold('', '<point score="0.2" actual="0" />\n<point score="0.9" actual="1" />'));
    assert.ok(plain.ok && (plain.scene.blocks[0] as ThresholdBlock).at === 0.5);
  });

  it('refuses scores outside 0–1, unknown classes and a bad threshold', () => {
    assert.match(errorsOf(threshold(' classes="negative|positive"', '<point score="1.2" actual="negative" />\n<point score="0.3" actual="positive" />'))[0] ?? '', /"1.2" is not a probability/);
    assert.match(errorsOf(threshold(''))[0] ?? '', /"actual" must name one of the classes: 0, 1/);
    assert.match(errorsOf(threshold(' classes="negative|positive" at="1"'))[0] ?? '', /starting threshold, between 0 and 1/);
    assert.match(errorsOf(threshold(' classes="a|a"'))[0] ?? '', /two different classes/);
    assert.match(errorsOf(threshold(' classes="negative|positive"', '<point score="0.2" actual="negative" />'))[0] ?? '', /at least two <point>s/);
  });
});
