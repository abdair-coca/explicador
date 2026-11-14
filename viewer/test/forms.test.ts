import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AnnotatedBlock, ArgumentBlock } from '../../server/src/scene.ts';
import { passageSpans } from '../src/lesson/annotatedSpans.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { subtitleOf } from '../src/presentation/subtitles.ts';

const passage = 'The rent is 900 euros a month, paid by the 5th day.';
const annotated: AnnotatedBlock = {
  type: 'annotated',
  id: 'a',
  title: 'The rent clause',
  passage,
  notes: [
    { quote: 'paid by the 5th day', start: passage.indexOf('paid'), end: passage.indexOf('paid') + 19, narration: 'The due date.' },
    { quote: '900 euros', start: passage.indexOf('900'), end: passage.indexOf('900') + 9, narration: 'The amount.' },
  ],
};
const argument: ArgumentBlock = {
  type: 'argument',
  id: 'g',
  title: 'Sign as is',
  claim: 'Sign',
  points: [
    { side: 'support', label: 'Capped rent', narration: 'At most 5 %.' },
    { side: 'objection', label: 'High deposit', narration: 'Two months.', reply: 'It comes back.' },
  ],
  verdict: 'Sign it',
};

describe('an annotated passage', () => {
  it('splits into plain and marked spans in reading order, each mark naming its note', () => {
    const spans = passageSpans(annotated);
    assert.equal(spans.map((span) => span.text).join(''), passage, 'nothing lost');
    assert.deepEqual(
      spans.filter((span) => span.note !== undefined).map((span) => [span.text, span.note]),
      [
        ['900 euros', 1],
        ['paid by the 5th day', 0],
      ],
    );
  });

  it('shows the passage, then one part per note with its narration', () => {
    assert.equal(buildSlides([annotated])[0]?.parts, 3);
    assert.equal(subtitleOf(annotated, 0), undefined);
    assert.equal(subtitleOf(annotated, 2), 'The amount.');
  });
});

describe('an argument', () => {
  it('shows the claim, each point, then the verdict', () => {
    assert.equal(buildSlides([argument])[0]?.parts, 4);
    assert.equal(subtitleOf(argument, 2), 'Two months.');
    assert.equal(subtitleOf(argument, 3), undefined);
    assert.equal(buildSlides([{ ...argument, verdict: undefined }])[0]?.parts, 3);
  });
});
