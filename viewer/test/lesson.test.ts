import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Block, MatrixBlock } from '../../server/src/scene.ts';
import { splitCallouts } from '../src/lib/callouts.ts';
import { codeBreaks } from '../src/lesson/breaks.ts';
import { planLesson } from '../src/lesson/chapters.ts';
import { cellOutcome, computeMetric, counts, covers, formatRatio, outcomes } from '../src/lesson/confusion.ts';
import { changeCounts, diffLetters, diffWords } from '../src/lesson/diff.ts';
import { matrixFocuses } from '../src/lesson/focuses.ts';
import { formatLike, splitNumbers, textAt } from '../src/lesson/numbers.ts';
import { chapterDone, emptyProgress, lessonSummary, markSeen, record } from '../src/lesson/progress.ts';
import { barTicks, formatTick, lineTicks, linear, niceTicks } from '../src/lesson/scale.ts';
import { firstAnswer, practiceOrder, practiceScore } from '../src/lesson/practiceSession.ts';
import { getProgress, subscribeProgress, updateProgress } from '../src/lesson/store.ts';
import { buildSlides } from '../src/presentation/slides.ts';

const quiz = (id: string): Block => ({ type: 'quiz', id, question: 'Q?', options: [], answer: 'A.' });

const blocks: Block[] = [
  { type: 'markdown', text: '# Lesson' },
  quiz('warmup'),
  { type: 'chapter', id: 'load', title: 'Loading' },
  { type: 'markdown', text: 'Read the CSV.' },
  quiz('q1'),
  quiz('q2'),
  { type: 'chapter', id: 'end', title: 'Wrap-up' },
  { type: 'markdown', text: 'Done.' },
];

describe('planLesson', () => {
  it('splits the intro and the chapters, numbering them and listing their checks', () => {
    const plan = planLesson(blocks);
    assert.ok(plan);
    assert.deepEqual(plan.intro.map((p) => p.index), [0, 1]);
    assert.deepEqual(plan.introChecks, ['warmup']);
    assert.deepEqual(
      plan.chapters.map((c) => [c.block.id, c.number, c.index, c.items.map((p) => p.index), c.checks]),
      [
        ['load', 1, 2, [3, 4, 5], ['q1', 'q2']],
        ['end', 2, 6, [7], []],
      ],
    );
  });

  it('leaves scenes without chapters alone', () => {
    assert.equal(planLesson([{ type: 'markdown', text: 'x' }]), undefined);
  });
});

describe('progress', () => {
  it('counts done checks and chapters, and never takes back a right answer', () => {
    const plan = planLesson(blocks);
    assert.ok(plan);
    let progress = record(emptyProgress, 'q1', 'tried');
    progress = record(progress, 'q1', 'right');
    progress = record(progress, 'q1', 'tried');
    assert.equal(progress.checks.q1, 'right');
    progress = record(progress, 'q2', 'review');
    assert.deepEqual(lessonSummary(plan, progress), { done: 1, total: 3, chapters: 0 });
    progress = record(progress, 'q2', 'known');
    assert.equal(chapterDone(plan.chapters[0]!, progress), true);
    assert.equal(chapterDone(plan.chapters[1]!, progress), false, 'a chapter without checks needs a visit');
    progress = markSeen(progress, 'end');
    assert.equal(markSeen(progress, 'end'), progress, 'seen twice changes nothing');
    assert.deepEqual(lessonSummary(plan, progress), { done: 2, total: 3, chapters: 2 });
  });
});

describe('diffWords', () => {
  it('marks removed words and keeps the rest', () => {
    const tokens = diffWords('this was not good', 'not good');
    assert.deepEqual(tokens.map((t) => [t.kind, t.text]), [['removed', 'this'], ['removed', 'was'], ['same', 'not'], ['same', 'good']]);
    assert.deepEqual(changeCounts(tokens), { removed: 2, added: 0, changed: 0 });
  });

  it('pairs look-alike words as changes, with the changed letters', () => {
    const stems = diffWords('a horrible attempt', 'a horribl attempt');
    assert.deepEqual(stems[1], { kind: 'changed', text: 'horribl', from: 'horrible', parts: [{ kind: 'same', text: 'horribl' }, { kind: 'removed', text: 'e' }] });
    const lower = diffWords('This was NOT good', 'this was not good');
    assert.deepEqual(lower.map((t) => t.kind), ['changed', 'same', 'changed', 'same']);
    const punctuation = diffWords('"Soul Plane" is', 'soul plane is');
    assert.deepEqual(punctuation.map((t) => (t.kind === 'changed' ? `${t.from}→${t.text}` : t.text)), ['"Soul→soul', 'Plane"→plane', 'is']);
  });

  it('pairs the most alike word of a run and drops the others', () => {
    const html = diffWords('pawns. <br /><br />The plot', 'pawns. the plot');
    assert.deepEqual(html.map((t) => [t.kind, t.text]), [['same', 'pawns.'], ['removed', '<br'], ['removed', '/><br'], ['changed', 'the'], ['same', 'plot']]);
  });

  it('diffs letters of one word', () => {
    assert.deepEqual(diffLetters('Soul', 'soul'), [{ kind: 'removed', text: 'S' }, { kind: 'added', text: 's' }, { kind: 'same', text: 'oul' }]);
  });
});

const confusion: MatrixBlock = {
  type: 'matrix',
  id: 'cm',
  title: 'TF-IDF',
  cols: ['negative', 'positive'],
  rows: [
    { label: 'negative', values: ['406', '96'] },
    { label: 'positive', values: ['58', '440'] },
  ],
  kind: 'confusion',
  focuses: [
    { label: 'Precisión', cells: [], metric: 'precision', narration: 'De 536 predichas positivas, 440 lo eran.' },
    { label: 'Errores', cells: [{ row: 0, col: 1 }], narration: 'Falsos positivos.' },
  ],
};

describe('confusion metrics', () => {
  it('derives the outcomes and the four metrics with their worked formulas', () => {
    const matrix = counts(confusion.rows);
    assert.deepEqual(outcomes(matrix, 1), { tp: 440, fp: 96, fn: 58, tn: 406, total: 1000 });
    assert.equal(computeMetric(matrix, 'accuracy', 1).worked, '(406 + 440) / 1000 = 0.846');
    assert.equal(computeMetric(matrix, 'precision', 1).worked, '440 / (440 + 96) = 0.8209');
    assert.equal(computeMetric(matrix, 'recall', 1).worked, '440 / (440 + 58) = 0.8835');
    assert.equal(computeMetric(matrix, 'f1', 1).worked, '2 · 0.8209 · 0.8835 / (0.8209 + 0.8835) = 0.8511');
    assert.deepEqual(computeMetric(matrix, 'precision', 1).cells, [{ col: 1 }]);
    assert.equal(formatRatio(computeMetric([[0, 0], [5, 0]], 'precision', 1).value), '—', 'nothing predicted positive');
  });

  it('names the outcome of each cell and which cells a pick covers', () => {
    assert.deepEqual([cellOutcome(2, 1, 1, 1), cellOutcome(2, 1, 0, 1), cellOutcome(2, 1, 1, 0), cellOutcome(2, 1, 0, 0)], ['TP', 'FP', 'FN', 'TN']);
    assert.equal(cellOutcome(3, 0, 2, 2), 'hit');
    assert.equal(covers({ col: 1 }, 0, 1), true);
    assert.equal(covers({ row: 0, col: 0 }, 0, 1), false);
  });

  it('offers the four metrics first, with the agent\'s words when it wrote them', () => {
    const focuses = matrixFocuses(confusion);
    assert.deepEqual(focuses.map((f) => f.label), ['Accuracy', 'Precisión', 'Recall', 'F1', 'Errores']);
    assert.equal(focuses[1]?.narration, 'De 536 predichas positivas, 440 lo eran.');
    assert.equal(focuses[1]?.metric?.worked, '440 / (440 + 96) = 0.8209');
    assert.equal(matrixFocuses({ ...confusion, kind: undefined }).length, 1, 'a plain matrix offers only its own focuses');
  });
});

describe('chart scales', () => {
  it('finds round ticks and keeps bars anchored at zero', () => {
    assert.deepEqual(niceTicks(0, 0.846).values, [0, 0.2, 0.4, 0.6, 0.8, 1]);
    assert.deepEqual(barTicks([-4.8, 4.14]).values, [-6, -4, -2, 0, 2, 4, 6]);
    const line = lineTicks([0.833, 0.852]);
    assert.ok(line.min <= 0.833 && line.max >= 0.852 && line.min > 0.8, `${line.min}..${line.max}`);
    assert.equal(formatTick(0.825, 0.005), '0.825');
    assert.equal(formatTick(4, 2), '4');
    assert.equal(linear([0, 10], [0, 100])(2.5), 25);
  });
});

describe('numbers in display strings', () => {
  it('finds grouped and decimal numbers, but not digits inside words', () => {
    const parts = splitNumbers('F1 0.851 · 4 000 × 23 672 · 84.6 %');
    assert.deepEqual(
      parts.filter((p) => p.kind === 'number').map((p) => p.text),
      ['0.851', '4 000', '23 672', '84.6'],
    );
    assert.equal(textAt(parts, 1), 'F1 0.851 · 4 000 × 23 672 · 84.6 %');
    assert.equal(textAt(parts, 0), 'F1 0.000 · 0 × 0 · 0.0 %');
    const grouped = splitNumbers('49 582').find((p) => p.kind === 'number');
    assert.ok(grouped && grouped.kind === 'number');
    assert.equal(formatLike(grouped, 24791), '24 791');
    assert.deepEqual(splitNumbers('0,846').map((p) => p.text), ['0', ',846'], 'a decimal comma is not a thousands group');
  });
});

describe('callouts', () => {
  it('turns marked blockquotes into callouts with an optional title', () => {
    const segments = splitCallouts('Intro\n\n> [!TIP]\n> **Idea clave**\n> Keep `not`.\n\n> [!WARNING] Ojo\n> Leakage.\n\n> Just a quote.');
    assert.deepEqual(segments, [
      { kind: 'markdown', text: 'Intro\n' },
      { kind: 'callout', type: 'tip', title: 'Idea clave', body: 'Keep `not`.' },
      { kind: 'callout', type: 'warning', title: 'Ojo', body: 'Leakage.' },
      { kind: 'markdown', text: '\n> Just a quote.' },
    ]);
  });
});

describe('buildSlides for lessons', () => {
  it('gives each lesson block a slide, with stages, trace values, matrix highlights and the quiz answer as parts', () => {
    const lesson: Block[] = [
      { type: 'stats', id: 's', stats: [{ value: '1', label: 'one' }] },
      { type: 'chapter', id: 'c1', title: 'One' },
      {
        type: 'journey',
        id: 'j',
        title: 'J',
        stages: [
          { id: 'a', label: 'A', kind: 'file', narration: 'a' },
          { id: 'b', label: 'B', kind: 'table', narration: 'b' },
        ],
        drills: [],
      },
      { type: 'trace', id: 't', title: 'T', values: [{ label: 'in', text: 'x' }, { label: 'out', text: 'y' }] },
      { type: 'chapter', id: 'c2', title: 'Two' },
      { type: 'chart', id: 'k', title: 'K', chartType: 'bars', series: [], rows: [{ label: 'a', values: ['1'] }] },
      confusion,
      quiz('q'),
    ];
    assert.deepEqual(buildSlides(lesson), [
      { kind: 'stats', block: 0, parts: 1, chapter: 0 },
      { kind: 'chapter', block: 1, parts: 1, chapter: 1 },
      { kind: 'journey', block: 2, parts: 2, chapter: 1 },
      { kind: 'trace', block: 3, parts: 2, chapter: 1 },
      { kind: 'chapter', block: 4, parts: 1, chapter: 2 },
      { kind: 'chart', block: 5, parts: 1, chapter: 2 },
      { kind: 'matrix', block: 6, parts: 6, chapter: 2 },
      { kind: 'quiz', block: 7, parts: 2, chapter: 2 },
    ]);
  });
});

describe('codeBreaks', () => {
  it('cuts code after _ . ( , = and keeps every character', () => {
    assert.deepEqual(codeBreaks('train_test_split()'), ['train_', 'test_', 'split(', ')']);
    assert.deepEqual(codeBreaks('df.drop_duplicates()'), ['df.', 'drop_', 'duplicates(', ')']);
    assert.deepEqual(codeBreaks('fit'), ['fit']);
    assert.deepEqual(codeBreaks('CountVectorizer()'), ['Count', 'Vectorizer(', ')']);
    assert.equal(codeBreaks('a=1, b=2').join(''), 'a=1, b=2');
  });
});

describe('progress store', () => {
  it('shares one lesson\'s progress between readers and tells them about real changes only', () => {
    const key = 'test.store.a';
    let heard = 0;
    const stop = subscribeProgress(key, () => (heard += 1));
    updateProgress(key, (current) => record(current, 'q1', 'right'));
    assert.equal(getProgress(key).checks.q1, 'right');
    updateProgress(key, (current) => record(current, 'q1', 'tried'));
    assert.equal(getProgress(key).checks.q1, 'right', 'a right answer stays right');
    assert.equal(heard, 1);
    assert.deepEqual(getProgress('test.store.b'), emptyProgress, 'other lessons are apart');
    stop();
    updateProgress(key, (current) => markSeen(current, 'c1'));
    assert.equal(heard, 1);
  });
});

describe('practice', () => {
  it('asks the missed checks first, then the new ones, then the done ones', () => {
    const progress = { checks: { a: 'right', b: 'tried', d: 'review', e: 'known' } as const, seen: [] };
    assert.deepEqual(practiceOrder(['a', 'b', 'c', 'd', 'e', 'f'], progress), ['b', 'd', 'c', 'f', 'a', 'e']);
  });

  it('scores the first answer of each check only', () => {
    let answers = firstAnswer({}, 'q1', 'tried');
    answers = firstAnswer(answers, 'q1', 'right');
    answers = firstAnswer(answers, 'q2', 'right');
    answers = firstAnswer(answers, 'card', 'known');
    assert.deepEqual(practiceScore(['q1', 'q2', 'card', 'skipped'], answers), { right: 2, total: 4, missed: ['q1', 'skipped'] });
  });
});
