// The card that opens a chapter in Present mode, on the night surface: the number rolls in, a yellow rule draws, the
// title rises word by word and the goal follows.
import type { ChapterBlock } from '../../../server/src/scene.ts';
import { FlagIcon } from '../components/icons';
import { RisingWords, RollingNumber } from './effects';

export function ChapterCard({ block, number, of }: { block: ChapterBlock; number: number; of: number }) {
  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <span className="chapter-number">
          <RollingNumber value={String(number).padStart(2, '0')} delay={60} />
        </span>
        <span className="animate-fade-up pb-[0.9em] text-sm font-extrabold uppercase tracking-[0.18em] text-muted-foreground" style={{ animationDelay: '220ms' }}>
          Chapter {number} of {of}
        </span>
      </div>
      <span className="chapter-rule mt-4 block h-2 w-28 rounded-full bg-primary" aria-hidden="true" />
      <h2 className="mt-8 text-[clamp(2.4rem,6vw,4.75rem)] font-black leading-[1.05] tracking-tight text-foreground">
        <RisingWords text={block.title} delay={140} />
      </h2>
      {block.goal && (
        <p
          className="animate-fade-up mt-6 flex max-w-3xl items-start gap-3 text-[clamp(1.15rem,2.2vw,1.65rem)] font-semibold leading-snug text-muted-foreground"
          style={{ animationDelay: '320ms' }}
        >
          <FlagIcon size={26} className="mt-1 shrink-0 text-primary" />
          {block.goal}
        </p>
      )}
    </div>
  );
}
