// Headline numbers: Titi tiles whose numbers count up; the first one is the hero, in yellow. In Present mode `shown`
// is the last card revealed so far; later cards keep their place, invisible.
import type { StatsBlock } from '../../../server/src/scene.ts';
import { cn } from '@/lib/utils';
import { CountUp } from './CountUp';

export function StatsView({ block, shown }: { block: StatsBlock; shown?: number }) {
  return (
    <section aria-label={block.title ?? 'Headline numbers'} className="space-y-3">
      {block.title && <h2 className="text-lg font-extrabold tracking-tight">{block.title}</h2>}
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        {block.stats.map((stat, i) => {
          const hidden = shown !== undefined && i > shown;
          const value = cn('block font-black leading-tight tracking-tight', i === 0 ? 'text-5xl' : 'text-4xl');
          return (
            <li
              key={`${i}-${hidden}`}
              className={cn(
                hidden ? 'invisible' : 'animate-pop-in',
                'rounded-2xl border-2 px-5 py-4',
                i === 0 ? 'border-primary-dark bg-primary-light shadow-[0_4px_0_var(--primary-dark)]' : 'border-border bg-card shadow-[0_4px_0_var(--border)]',
              )}
              style={shown === undefined ? { animationDelay: `${i * 70}ms` } : undefined}
            >
              {hidden ? <span className={value}>{stat.value}</span> : <CountUp text={stat.value} className={value} />}
              <p className="mt-1.5 text-sm font-bold leading-snug text-muted-foreground">{stat.label}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
