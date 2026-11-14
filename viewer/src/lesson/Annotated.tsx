// A text read part by part (F27): the passage as written, the words each note points at marked and numbered, and the
// notes beside it. In Present mode (`shown` is the current part) the passage arrives first, then each note is a part:
// its words light up and its note rises beside them, the earlier ones staying marked. On the page every note shows.
import type { AnnotatedBlock } from '../../../server/src/scene.ts';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { cn } from '@/lib/utils';
import { passageSpans } from './annotatedSpans';

export function AnnotatedView({ block, shown }: { block: AnnotatedBlock; shown?: number }) {
  const presenting = shown !== undefined;
  /** How many notes are out: all on the page; in Present, part k shows k notes. */
  const out = presenting ? shown : block.notes.length;
  const stage = (note: number): string => (note < out - 1 ? 'past' : note === out - 1 ? (presenting ? 'current' : 'past') : 'future');
  return (
    <div className={cn('annotated', presenting && 'annotated-slide')}>
      <blockquote className="annotated-passage">
        {passageSpans(block).map((span, i) =>
          span.note === undefined ? (
            <span key={i}>{span.text}</span>
          ) : (
            <mark key={i} className={cn('annotated-mark', stage(span.note))} data-note={span.note + 1}>
              {span.text}
              <sup className="annotated-number" aria-hidden="true">
                {span.note + 1}
              </sup>
            </mark>
          ),
        )}
      </blockquote>
      <ol className="annotated-notes">
        {block.notes.map((note, i) => (
          <li
            key={i}
            className={cn('annotated-note', stage(i))}
            {...(presenting ? { 'data-part': i + 1, 'data-fx': 'rise', 'data-stage': i < out ? 'shown' : 'future' } : {})}
          >
            <span className="annotated-note-number">{i + 1}</span>
            <div>
              {note.label && <strong className="annotated-note-label">{note.label}</strong>}
              <InlineMarkdown text={note.narration} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AnnotatedScene({ block }: { block: AnnotatedBlock }) {
  return (
    <SceneFrame kind="Annotated" title={block.title}>
      <div className="p-5">
        <AnnotatedView block={block} />
      </div>
    </SceneFrame>
  );
}
