// The note of a tour step: a yellow card with the step number, shown under the highlighted lines or cells.
import { forwardRef } from 'react';
import { Prose } from '../components/Prose';
import { cn } from '@/lib/utils';

export interface StepNote {
  index: number;
  of: number;
  text: string;
}

export const StepNoteCard = forwardRef<HTMLDivElement, { note: StepNote; className?: string }>(function StepNoteCard({ note, className }, ref) {
  return (
    <div
      ref={ref}
      aria-live="polite"
      className={cn(
        'animate-pop-in flex origin-top-left gap-3 rounded-xl border-2 border-primary bg-primary-light px-3.5 py-3 font-sans text-foreground shadow-[0_4px_0_var(--primary-dark)]',
        className,
      )}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-black shadow-[0_2px_0_var(--primary-dark)]">{note.index + 1}</span>
      <div className="prose-exl prose-panel min-w-0 flex-1 text-sm font-semibold">
        <Prose>{note.text}</Prose>
      </div>
    </div>
  );
});
