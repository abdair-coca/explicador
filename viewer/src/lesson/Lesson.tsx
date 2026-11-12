// The lesson layout: the intro, then one section per chapter (number, title, goal, the reader's cells, the chapter's
// blocks and a "Next" button), a sticky rail with progress (a strip of pills on small screens) and an end card.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScenePayload } from '../../../server/src/scene.ts';
import { staticScene } from '../api';
import { BlockView } from '../components/BlockView';
import { ArrowRightIcon, ChatIcon, CheckIcon, FlagIcon, SparkIcon } from '../components/icons';
import { useSelection } from '../components/selection';
import { cn } from '@/lib/utils';
import { ChapterCells } from './ChapterCells';
import { Practice } from './Practice';
import { Backdrop, ThemeGlyph } from '../theme/Backdrop';
import { themeAt, type Theme } from '../theme/themes';
import { chapterAnchor, type Chapter, type LessonPlan } from './chapters';
import { LessonContext } from './context';
import { chapterDone, isDone, lessonSummary, progressKey, type Progress } from './progress';
import { useLessonProgress } from './useProgress';

function scrollToChapter(id: string): void {
  const target = document.getElementById(chapterAnchor(id));
  if (!target) return;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  // Keyboard users land on the chapter, not at the top of the page.
  target.focus({ preventScroll: true });
}

/** The chapter in view, by an observer on the chapter sections; it also marks chapters as seen. */
function useActiveChapter(plan: LessonPlan, onSeen: (id: string) => void): string | undefined {
  const [active, setActive] = useState<string>();
  const seen = useRef(onSeen);
  seen.current = onSeen;
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.chapter;
          if (!id) continue;
          setActive(id);
          seen.current(id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const chapter of plan.chapters) {
      const element = document.getElementById(chapterAnchor(chapter.block.id));
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [plan]);
  return active;
}

type Practise = (() => void) | undefined;

function PracticeButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-xl border-2 border-primary-dark bg-primary-light px-3 text-sm font-bold transition-all duration-150 hover:bg-primary active:scale-[0.96]', className)}
    >
      <SparkIcon size={16} />
      Practice
    </button>
  );
}

function Rail({ plan, progress, active, practise }: { plan: LessonPlan; progress: Progress; active: string | undefined; practise: Practise }) {
  const summary = lessonSummary(plan, progress);
  return (
    <nav aria-label="Chapters" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto lg:block">
      <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Lesson</p>
      <ol className="space-y-0.5">
        {plan.chapters.map((chapter) => {
          const done = chapterDone(chapter, progress);
          return (
            <li key={chapter.block.id}>
              <a
                href={`#${chapterAnchor(chapter.block.id)}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToChapter(chapter.block.id);
                }}
                aria-current={active === chapter.block.id ? 'location' : undefined}
                className={cn('rail-item flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-bold leading-snug', active === chapter.block.id && 'active')}
              >
                <span className={cn('rail-dot', done && 'done')} aria-label={done ? 'done' : undefined}>
                  {done ? <CheckIcon size={13} /> : chapter.number}
                </span>
                <span className="min-w-0">{chapter.block.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
      {summary.total > 0 && (
        <div className="mt-4 space-y-1.5 px-2">
          <p className="text-xs font-bold text-muted-foreground">
            <span className="tabular-nums text-foreground">
              {summary.done} of {summary.total}
            </span>{' '}
            checks
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done} aria-label="Checks done">
            <div className="h-full rounded-full bg-hit transition-[width] duration-500" style={{ width: `${(summary.done / summary.total) * 100}%` }} />
          </div>
          {practise && <PracticeButton onClick={practise} className="mt-3 w-full justify-center" />}
        </div>
      )}
    </nav>
  );
}

/** Small screens: the chapters as a strip of pills at the top of the lesson. */
function Pills({ plan, progress, active, practise }: { plan: LessonPlan; progress: Progress; active: string | undefined; practise: Practise }) {
  return (
    <nav aria-label="Chapters" className="-mx-1 overflow-x-auto px-1 pb-1 lg:hidden">
      <ol className="flex w-max gap-1.5">
        {practise && (
          <li>
            <PracticeButton onClick={practise} className="rounded-full" />
          </li>
        )}
        {plan.chapters.map((chapter) => {
          const done = chapterDone(chapter, progress);
          return (
            <li key={chapter.block.id}>
              <button
                type="button"
                onClick={() => scrollToChapter(chapter.block.id)}
                aria-current={active === chapter.block.id ? 'location' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3 text-sm font-bold',
                  active === chapter.block.id ? 'border-primary-dark bg-primary' : 'border-border bg-card',
                )}
              >
                {done ? <CheckIcon size={14} className="text-success" /> : <span className="tabular-nums">{chapter.number}</span>}
                {chapter.block.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ChapterSection(props: { chapter: Chapter; total: number; next: Chapter | undefined; progress: Progress; version: number; theme: Theme; seed: string }) {
  const { chapter, total, next, progress, theme } = props;
  const selection = useSelection();
  const done = chapterDone(chapter, progress);
  const checks = chapter.checks.length;
  const right = chapter.checks.filter((id) => isDone(progress.checks[id])).length;
  return (
    <section
      id={chapterAnchor(chapter.block.id)}
      data-chapter={chapter.block.id}
      tabIndex={-1}
      aria-labelledby={`${chapterAnchor(chapter.block.id)}-title`}
      className="scroll-mt-24 space-y-6 outline-none"
    >
      <header className="relative isolate space-y-3">
        {/* The chapter's own decoration, beside its title on screens wide enough to leave the text alone. */}
        <Backdrop theme={theme} seed={`${props.seed}:${chapter.block.id}`} variant="band" className="absolute right-0 top-0 -z-10 hidden h-[110px] w-[260px] md:block" />
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg font-black shadow-[0_3px_0_var(--primary-dark)]',
              done ? 'bg-hit text-white shadow-[0_3px_0_color-mix(in_oklab,var(--hit)_70%,black)]' : 'bg-primary',
            )}
            aria-hidden="true"
          >
            {done ? <CheckIcon size={20} /> : chapter.number}
          </span>
          <span className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            {theme.name !== 'plain' && <ThemeGlyph theme={theme} size={15} className="mr-1.5 inline-block align-[-2px]" />}
            Chapter {chapter.number} of {total}
            {done && <span className="ml-2 text-success">· done</span>}
          </span>
        </div>
        <h2 id={`${chapterAnchor(chapter.block.id)}-title`} className="text-3xl font-black leading-tight tracking-tight">
          {chapter.block.title}
        </h2>
        {chapter.block.goal && (
          <p className="flex max-w-3xl items-start gap-2 text-lg font-semibold leading-relaxed text-muted-foreground">
            <FlagIcon size={18} className="mt-1 shrink-0 text-foreground" />
            <span>{chapter.block.goal}</span>
          </p>
        )}
        {/* Offline copies cannot reach Claude. */}
        {selection && staticScene === null && (
          <button
            type="button"
            onClick={(event) => selection.select(chapter.block.id, chapter.block.id, event.currentTarget)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-all duration-150 hover:bg-muted active:scale-[0.96]"
          >
            <ChatIcon size={16} />
            Ask about this chapter
          </button>
        )}
      </header>
      <ChapterCells chapter={chapter.block} />
      {chapter.items.map(({ block, index }) => (
        <BlockView key={`${props.version}-${index}`} block={block} />
      ))}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-border pt-4">
        <span className="text-sm font-bold text-muted-foreground">{checks > 0 ? `${right} of ${checks} ${checks === 1 ? 'check' : 'checks'}` : done ? 'Read' : ''}</span>
        {next && (
          <button
            type="button"
            onClick={() => scrollToChapter(next.block.id)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold shadow-[0_4px_0_var(--primary-dark)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
          >
            Next: {next.block.title}
            <ArrowRightIcon size={16} />
          </button>
        )}
      </footer>
    </section>
  );
}

function EndCard({ plan, progress, practise }: { plan: LessonPlan; progress: Progress; practise: Practise }) {
  const summary = lessonSummary(plan, progress);
  const complete = summary.chapters === plan.chapters.length && summary.done === summary.total;
  return (
    <section
      aria-label="Lesson progress"
      className={cn(
        'rounded-2xl border-2 p-6 text-center',
        complete ? 'animate-celebrate border-hit bg-[color-mix(in_oklab,var(--hit)_10%,white)]' : 'border-border bg-card shadow-[0_4px_0_var(--border)]',
      )}
    >
      <p className="text-2xl font-black">{complete ? 'Lesson complete' : 'End of the lesson'}</p>
      <p className="mt-1 text-base font-semibold text-muted-foreground">
        {summary.chapters} of {plan.chapters.length} chapters done
        {summary.total > 0 && (
          <>
            {' '}
            · {summary.done} of {summary.total} checks
          </>
        )}
      </p>
      {!complete && summary.total > summary.done && <p className="mt-2 text-sm font-bold">Checks marked "Review again" or not answered yet keep their chapter open.</p>}
      {practise && (
        <div className="mt-4 flex justify-center">
          <PracticeButton onClick={practise} />
        </div>
      )}
    </section>
  );
}

export function Lesson({ scene, plan }: { scene: ScenePayload; plan: LessonPlan }) {
  const lesson = useLessonProgress(progressKey(scene.key, scene.savedAt));
  const { progress } = lesson;
  const active = useActiveChapter(plan, lesson.markSeen);
  const [practising, setPractising] = useState(false);
  const hasChecks = plan.introChecks.length + plan.chapters.reduce((n, chapter) => n + chapter.checks.length, 0) > 0;
  const practise: Practise = hasChecks ? () => setPractising(true) : undefined;
  return (
    <LessonContext.Provider value={lesson}>
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden lg:block">
          <Rail plan={plan} progress={progress} active={active} practise={practise} />
        </div>
        <div className="min-w-0 space-y-7">
          {plan.intro.map(({ block, index }) => (
            <BlockView key={`${scene.version}-${index}`} block={block} />
          ))}
          <Pills plan={plan} progress={progress} active={active} practise={practise} />
          {plan.chapters.map((chapter, i) => (
            <ChapterSection key={chapter.block.id} chapter={chapter} total={plan.chapters.length} next={plan.chapters[i + 1]} progress={progress} version={scene.version} theme={themeAt(scene.blocks, chapter.index)} seed={scene.key} />
          ))}
          <EndCard plan={plan} progress={progress} practise={practise} />
        </div>
      </div>
      {/* In a portal: the page's entrance animation transforms <main>, which would trap a fixed dialog inside it. */}
      {practising && createPortal(<Practice scene={scene} plan={plan} lesson={lesson} onClose={() => setPractising(false)} />, document.body)}
    </LessonContext.Provider>
  );
}
