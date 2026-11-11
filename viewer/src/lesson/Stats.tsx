// Headline numbers: Titi tiles whose numbers count up; the first one is the hero, in yellow.
import type { StatsBlock } from '../../../server/src/scene.ts';
import { cn } from '@/lib/utils';
import { CountUp } from './CountUp';

export function StatsView({ block }: { block: StatsBlock }) {
  return (
    <section aria-label={block.title ?? 'Headline numbers'} className="space-y-3">
      {block.title && <h2 className="text-lg font-extrabold tracking-tight">{block.title}</h2>}
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        {block.stats.map((stat, i) => (
          <li
            key={i}
            className={cn(
              'animate-pop-in rounded-2xl border-2 px-5 py-4',
              i === 0 ? 'border-primary-dark bg-primary-light shadow-[0_4px_0_var(--primary-dark)]' : 'border-border bg-card shadow-[0_4px_0_var(--border)]',
            )}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <CountUp text={stat.value} className={cn('block font-black leading-tight tracking-tight', i === 0 ? 'text-5xl' : 'text-4xl')} />
            <p className="mt-1.5 text-sm font-bold leading-snug text-muted-foreground">{stat.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
