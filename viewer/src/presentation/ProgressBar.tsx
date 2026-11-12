// The presenter's progress: one segment per chapter (one per slide without chapters) that fills part by part, with a
// playhead on the current one. A click on a segment opens its first slide.
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { segmentFill, segmentsOf, type Position, type Segment, type Slide } from './slides';

export function ProgressBar(props: { slides: Slide[]; at: Position; label: (segment: Segment) => string; onJump: (slide: number) => void }) {
  const { slides, at, label, onJump } = props;
  const segments = useMemo(() => segmentsOf(slides), [slides]);
  const current = segments.findIndex((segment) => at.slide >= segment.first && at.slide < segment.first + segment.count);
  const chaptered = slides.some((slide) => slide.kind === 'chapter');
  const here = segments[current];
  return (
    <nav aria-label="Slides" className="flex min-w-0 flex-1 flex-col gap-0.5">
      {chaptered && here && (
        <p
          key={current}
          className={cn('truncate text-xs font-extrabold uppercase tracking-wide text-muted-foreground', slides[at.slide]?.kind === 'chapter' ? 'animate-fade-up' : 'progress-chapter w-fit max-w-full')}
        >
          {label(here)}
        </p>
      )}
      <ol className="flex items-center gap-1.5">
        {segments.map((segment, i) => {
          const fill = segmentFill(segment, slides, at) * 100;
          const name = label(segment);
          return (
            <li key={segment.first} className="min-w-1 basis-0" style={{ flexGrow: segment.count }}>
              <button
                type="button"
                onClick={() => onJump(segment.first)}
                title={name}
                aria-label={`Go to ${name}`}
                aria-current={i === current ? 'step' : undefined}
                className="group block w-full rounded-full py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary-dark"
              >
                <span
                  className={cn(
                    'relative block rounded-full bg-muted transition-[height] duration-300',
                    i === current ? 'h-3' : 'h-2 group-hover:h-3',
                  )}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out)]"
                    style={{ width: `${fill}%` }}
                  />
                  {i === current && (
                    <span
                      aria-hidden="true"
                      className="animate-pop-in absolute top-1/2 -mt-2 -ml-2 h-4 w-4 rounded-full border-[3px] border-foreground bg-primary transition-[left] duration-500 ease-[var(--ease-out)]"
                      style={{ left: `${fill}%` }}
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
