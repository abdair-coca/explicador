// Practice mode: every check and flashcard of the lesson, one at a time and fresh, the missed ones first, then a
// score. Answers also count in the lesson's progress, so practising can finish a chapter.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { QuizBlock, ScenePayload } from '../../../server/src/scene.ts';
import { ArrowRightIcon, CheckIcon, CloseIcon, ReplayIcon } from '../components/icons';
import { Button } from '../components/ui/button';
import { cn } from '@/lib/utils';
import type { LessonPlan } from './chapters';
import { LessonContext, type Lesson } from './context';
import { firstAnswer, practiceOrder, practiceScore, type FirstAnswers } from './practice';
import { emptyProgress, isDone, record, type CheckState, type Progress } from './progress';
import { QuizView } from './Quiz';

export function Practice(props: { scene: ScenePayload; plan: LessonPlan; lesson: Lesson; onClose: () => void }) {
  const { scene, plan, lesson, onClose } = props;
  const quizzes = useMemo(() => new Map(scene.blocks.flatMap((block) => (block.type === 'quiz' ? [[block.id, block] as [string, QuizBlock]] : []))), [scene.blocks]);
  const chapterOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const chapter of plan.chapters) for (const id of chapter.checks) map.set(id, `Chapter ${chapter.number}: ${chapter.block.title}`);
    return map;
  }, [plan]);
  const allIds = useMemo(() => [...plan.introChecks, ...plan.chapters.flatMap((chapter) => chapter.checks)], [plan]);
  // The order is fixed when a round starts, so answering does not reshuffle it.
  const [round, setRound] = useState(() => ({ n: 0, ids: practiceOrder(allIds, lesson.progress) }));
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<Progress>(emptyProgress);
  const [first, setFirst] = useState<FirstAnswers>({});
  const root = useRef<HTMLDivElement>(null);

  const close = useRef(onClose);
  close.current = onClose;
  // Focus once, on opening; the latest onClose is read through a ref so re-renders do not move the focus.
  useEffect(() => {
    root.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<Lesson>(
    () => ({
      progress: session,
      record: (id: string, state: CheckState) => {
        setSession((current) => record(current, id, state));
        setFirst((current) => firstAnswer(current, id, state));
        lesson.record(id, state);
      },
    }),
    [session, lesson],
  );

  const ids = round.ids;
  const done = index >= ids.length;
  const id = ids[index];
  const quiz = id ? quizzes.get(id) : undefined;
  const answered = id !== undefined && session.checks[id] !== undefined && session.checks[id] !== 'tried';
  const score = practiceScore(ids, first);
  const restart = (next: string[]): void => {
    setRound((current) => ({ n: current.n + 1, ids: next }));
    setIndex(0);
    setSession(emptyProgress);
    setFirst({});
  };

  return (
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Practice" className="fixed inset-0 z-50 flex flex-col bg-background outline-none">
      <header className="flex items-center gap-3 border-b border-border-soft bg-card px-4 py-2.5 text-sm sm:px-6">
        <span className="font-black">Practice</span>
        <span className="font-bold tabular-nums text-muted-foreground" aria-live="polite">
          {done ? 'Finished' : `${index + 1} of ${ids.length}`}
        </span>
        <span className="flex-1 sm:hidden" aria-hidden="true" />
        <span className="ml-auto hidden font-semibold text-muted-foreground sm:inline">Esc to leave</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Leave practice">
          <CloseIcon size={16} />
        </Button>
      </header>
      <div className="flex gap-1 bg-card px-4 pb-2.5 sm:px-6" aria-hidden="true">
        {ids.map((check, i) => (
          <span
            key={check}
            className={cn(
              'h-2 flex-1 rounded-full transition-colors duration-300',
              i === index ? 'bg-primary-dark' : first[check] === undefined ? 'bg-muted' : isDone(first[check]) ? 'bg-hit' : 'bg-miss',
            )}
          />
        ))}
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-6 sm:px-6">
        <div className="m-auto w-full max-w-3xl space-y-5">
          {done ? (
            <section className="animate-pop-in space-y-5 rounded-2xl border-2 border-border bg-card p-6 text-center shadow-[0_4px_0_var(--border)]">
              <p className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Your score</p>
              <p className="text-6xl font-black tabular-nums">
                {score.right}
                <span className="text-3xl text-muted-foreground"> / {score.total}</span>
              </p>
              <p className="text-lg font-bold">{score.missed.length === 0 ? 'All right first time.' : 'right first time'}</p>
              {score.missed.length > 0 && (
                <ul className="mx-auto max-w-xl space-y-1.5 text-left">
                  {score.missed.map((missed) => (
                    <li key={missed} className="rounded-xl bg-miss/10 px-3 py-2 text-sm font-semibold">
                      {quizzes.get(missed)?.question}
                      <span className="block text-xs font-bold text-muted-foreground">{chapterOf.get(missed) ?? 'Introduction'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                {score.missed.length > 0 && (
                  <Button variant="primary" onClick={() => restart(score.missed)}>
                    <ReplayIcon size={16} />
                    Practice the missed ones
                  </Button>
                )}
                <Button onClick={onClose}>
                  <CheckIcon size={16} />
                  Done
                </Button>
              </div>
            </section>
          ) : (
            quiz && (
              <>
                <p className="text-sm font-bold text-muted-foreground">{chapterOf.get(quiz.id) ?? 'Introduction'}</p>
                <LessonContext.Provider value={value}>
                  <QuizView key={`${round.n}-${quiz.id}`} block={quiz} />
                </LessonContext.Provider>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => setIndex((i) => i + 1)} disabled={!answered}>
                    {index + 1 === ids.length ? 'See my score' : 'Next'}
                    <ArrowRightIcon size={16} />
                  </Button>
                </div>
              </>
            )
          )}
        </div>
      </main>
    </div>
  );
}
