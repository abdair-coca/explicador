import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { formatQuestions, isRight, LETTERS, loadScene, loadTopics, parseAnswers, promptOf, QUESTIONS_PER_TOPIC, repo, score, toNumber, type Question } from '../bench.ts';

const topics = loadTopics();
const plain = (text: string): string => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

describe('the bench', () => {
  it('has the ten topics of the plan', () => {
    assert.deepEqual(
      topics.map((topic) => topic.id),
      ['arboles-binarios', 'contrato-alquiler', 'embudo-ventas', 'fotosintesis', 'imprenta', 'interes-compuesto', 'ley-aprobacion', 'login-tienda', 'pan', 'regresion-resenas'],
    );
  });

  for (const topic of topics) {
    describe(topic.id, () => {
      it('has its sources and its scene on disk and a language', () => {
        assert.ok(topic.title && topic.audience);
        assert.ok(topic.language === 'es' || topic.language === 'en');
        assert.ok(topic.sources.length > 0);
        for (const source of [...topic.sources, topic.scene, topic.root]) assert.ok(existsSync(join(repo, source)), `${source} is missing`);
      });

      it('has five questions whose answer can be graded without a judge', () => {
        assert.equal(topic.questions.length, QUESTIONS_PER_TOPIC);
        for (const question of topic.questions) {
          assert.ok(question.q.trim().length > 10);
          if (question.options) {
            assert.equal(question.options.length, LETTERS.length, question.q);
            assert.equal(new Set(question.options).size, question.options.length, `repeated options: ${question.q}`);
            assert.ok(typeof question.answer === 'string' && (LETTERS as readonly string[]).includes(question.answer), `${question.q}: the answer is not a letter`);
          } else {
            assert.ok(typeof question.answer === 'number' && Number.isFinite(question.answer), `${question.q}: the answer is not a number`);
          }
        }
      });

      it('does not always put the right option in the same place', () => {
        const choices = topic.questions.filter((q) => q.options);
        if (choices.length < 2) return;
        const letters = new Set(choices.map((q) => q.answer));
        assert.ok(letters.size >= 2, `every right option is ${[...letters].join('')}`);
      });

      it('has a scene that parses and does not hand over the answers in its own checks', () => {
        const scene = loadScene(topic);
        assert.ok(scene.components > 0);
        const asked = new Set(topic.questions.map((question) => plain(question.q)));
        for (const block of scene.scene.blocks) if (block.type === 'quiz') assert.ok(!asked.has(plain(block.question)), `the scene's check repeats a bench question: ${block.question}`);
      });
    });
  }
});

describe('scene text', () => {
  it('reads like a page: the cover, the boxes with their steps and the checks, with no ids or refs', () => {
    const topic = topics.find((item) => item.id === 'login-tienda');
    assert.ok(topic);
    const { text } = loadScene(topic);
    assert.match(text, /^# What happens when you log in\?/);
    assert.match(text, /Login form \(browser\): Posts the credentials as JSON/);
    assert.match(text, /Login form → Auth routes \[POST \/api\/login\]: On submit/);
    assert.doesNotMatch(text, /src\/auth\/password\.js/);
    assert.doesNotMatch(text, /login-flow/);
  });

  it('keeps the lines of a derivation and the options of a check with the right one marked', () => {
    const topic = topics.find((item) => item.id === 'interes-compuesto');
    assert.ok(topic);
    const { text } = loadScene(topic);
    assert.match(text, /1\. D = C \\cdot \(1 \+ i\)\^\{n\} — Deuda final igual a capital/);
    assert.match(text, /1 404,93 €, 44,93 € más \(correct\)/);
  });

  it('is the same every time', () => {
    for (const topic of topics) assert.equal(loadScene(topic).text, loadScene(topic).text);
  });
});

describe('the prompt', () => {
  const topic = topics[0];
  assert.ok(topic);

  it('numbers the questions and the options, and asks for numbers only on numeric ones', () => {
    const text = formatQuestions(topic);
    // Arboles opens with a numeric question and follows with a multiple-choice one.
    assert.match(text, /^1\. .*\(reply with a number only\)\n\n2\. .*\n {3}A\) /);
    assert.doesNotMatch(text.split('\n\n')[1] ?? '', /number only/);
  });

  it('carries the scene only in the condition that has one', () => {
    assert.match(promptOf(topic, 'THE SCENE'), /<explanation>\nTHE SCENE\n<\/explanation>/);
    assert.doesNotMatch(promptOf(topic, undefined), /explanation>/);
  });
});

describe('grading', () => {
  const choice: Question = { q: 'x', options: ['a', 'b', 'c', 'd'], answer: 'C' };
  const count: Question = { q: 'y', answer: 54, tolerance: 0.5 };

  it('reads the JSON object a model replies with, even inside a code fence', () => {
    assert.deepEqual(parseAnswers('```json\n{"1": "B", "2": 12.5, "3": "A"}\n```', 5), ['B', 12.5, 'A', undefined, undefined]);
    assert.deepEqual(parseAnswers('no json here', 2), [undefined, undefined]);
    assert.deepEqual(parseAnswers('{"1": ', 2), [undefined, undefined]);
  });

  it('grades a letter, allowing case and a trailing ")"', () => {
    assert.ok(isRight(choice, 'C'));
    assert.ok(isRight(choice, 'c'));
    assert.ok(isRight(choice, 'C) the third'));
    assert.ok(!isRight(choice, 'B'));
    assert.ok(!isRight(choice, 'Cat'));
    assert.ok(!isRight(choice, undefined));
    assert.ok(!isRight(choice, 3));
  });

  it('grades a number within its tolerance, written as a person writes it', () => {
    assert.ok(isRight(count, 54));
    assert.ok(isRight(count, '54'));
    assert.ok(isRight(count, '54,2'));
    assert.ok(!isRight(count, 53));
    assert.ok(!isRight(count, 'unknown'));
    assert.equal(toNumber('1 254,40 €'), 1254.4);
    assert.equal(toNumber('1,254.40'), 1254.4);
    assert.equal(toNumber('1.254,40'), 1254.4);
    assert.equal(toNumber('12 %'), 12);
    assert.ok(Number.isNaN(toNumber('')));
  });

  it('counts right answers; a missing one is wrong', () => {
    const topic = { ...topics[0]!, questions: [choice, count] };
    assert.equal(score(topic, ['C', 54]), 2);
    assert.equal(score(topic, ['C', undefined]), 1);
    assert.equal(score(topic, []), 0);
  });
});
