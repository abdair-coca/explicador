// Checks: a multiple-choice question (a wrong pick shakes and says why, the right one pops) or a flashcard for the
// final review (show the answer, then "did you know it?"). Progress goes to the lesson when there is one.
import { useState } from 'react';
import type { QuizBlock } from '../../../server/src/scene.ts';
import { CheckIcon, CrossIcon } from '../components/icons';
import { InlineMarkdown, Prose } from '../components/Prose';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import { useLesson } from './context';
import { record as nextState, type CheckState } from './progress';

/** The check's saved state, from the lesson or kept locally. */
function useCheck(id: string): [CheckState | undefined, (state: CheckState) => void] {
  const lesson = useLesson();
  const [local, setLocal] = useState<CheckState>();
  if (lesson) return [lesson.progress.checks[id], (state) => lesson.record(id, state)];
  return [local, (state) => setLocal((current) => nextState({ checks: current ? { [id]: current } : {}, seen: [] }, id, state).checks[id])];
}

const letter = (i: number): string => String.fromCharCode(65 + i);

type CheckProps = { block: QuizBlock; saved: CheckState | undefined; save: (state: CheckState) => void };

function Choice({ block, saved, save }: CheckProps) {
  const right = block.options.findIndex((option) => option.correct);
  const [picked, setPicked] = useState<number | undefined>(saved === 'right' ? right : undefined);
  const [reveal, setReveal] = useState(false);
  const solved = saved === 'right' || picked === right;
  const choose = (i: number): void => {
    setPicked(i);
    save(i === right ? 'right' : 'tried');
  };
  const why = picked !== undefined ? block.options[picked]?.why : undefined;
  return (
    <>
      <ul className="grid gap-2.5" role="list">
        {block.options.map((option, i) => {
          const state = solved ? (i === right ? 'right' : 'faded') : picked === i ? 'wrong' : reveal && i === right ? 'reveal' : undefined;
          return (
            <li key={`${i}-${picked === i ? picked : ''}`}>
              <button
                type="button"
                disabled={solved}
                onClick={() => choose(i)}
                aria-pressed={picked === i}
                className={cn('quiz-option flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold', state)}
              >
                <span className="quiz-letter" aria-hidden="true">
                  {state === 'right' ? <CheckIcon size={16} /> : state === 'wrong' ? <CrossIcon size={16} /> : letter(i)}
                </span>
                <span className="min-w-0 flex-1">
                  <InlineMarkdown text={option.text} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-live="polite" className="space-y-2">
        {why && (
          <p key={picked} className={cn('animate-fade-up rounded-xl px-4 py-3 text-base font-semibold', picked === right ? 'bg-hit/10' : 'bg-miss/10')}>
            <span className={cn('mr-1.5 font-extrabold', picked === right ? 'text-success' : 'text-miss')}>{picked === right ? 'Right.' : 'Not this one.'}</span>
            <InlineMarkdown text={why} />
          </p>
        )}
        {!solved && picked !== undefined && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-muted-foreground">Not quite. Try another option.</p>
            {!reveal && (
              <Button variant="ghost" size="sm" onClick={() => setReveal(true)}>
                Show the answer
              </Button>
            )}
          </div>
        )}
        {solved && picked === right && !why && <p className="animate-fade-up text-base font-extrabold text-success">Right!</p>}
      </div>
    </>
  );
}

function Flashcard({ saved, save, block }: CheckProps) {
  const [open, setOpen] = useState(saved === 'known' || saved === 'review');
  return (
    <>
      {open ? (
        <div className="animate-flip-in space-y-4">
          <div className="prose-exl rounded-xl border-2 border-border bg-card px-4 py-3">
            <Prose>{block.answer ?? ''}</Prose>
          </div>
          <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Did you know it?">
            <span className="text-sm font-extrabold">Did you know it?</span>
            <Button size="sm" variant={saved === 'known' ? 'primary' : 'secondary'} aria-pressed={saved === 'known'} onClick={() => save('known')}>
              <CheckIcon size={16} />
              Yes
            </Button>
            <Button size="sm" variant="secondary" aria-pressed={saved === 'review'} className={cn(saved === 'review' && 'border-foreground')} onClick={() => save('review')}>
              Not yet
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" onClick={() => setOpen(true)}>
          Show the answer
        </Button>
      )}
    </>
  );
}

const badge: Record<CheckState, React.ReactNode> = {
  right: <Badge variant="success">Done</Badge>,
  tried: <Badge variant="muted">Try again</Badge>,
  known: <Badge variant="success">Known</Badge>,
  review: <Badge variant="stale">Review again</Badge>,
};

export function QuizView({ block }: { block: QuizBlock }) {
  const card = block.options.length === 0;
  const [saved, save] = useCheck(block.id);
  return (
    <section
      aria-label={card ? 'Flashcard' : 'Check'}
      className={cn('space-y-4 rounded-2xl border-2 p-5', card ? 'border-dashed border-primary-dark bg-primary-light/40' : 'border-border bg-card shadow-[0_4px_0_var(--border)]')}
    >
      <header className="flex flex-wrap items-start gap-3">
        <span className="flex-1 text-lg font-extrabold leading-snug">
          <InlineMarkdown text={block.question} />
        </span>
        {saved ? badge[saved] : <Badge variant={card ? 'step' : 'dark'}>{card ? 'Review' : 'Check'}</Badge>}
      </header>
      {card ? <Flashcard block={block} saved={saved} save={save} /> : <Choice block={block} saved={saved} save={save} />}
    </section>
  );
}
