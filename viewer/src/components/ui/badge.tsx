// Titi badges: a solid role color with white text (design.md §2), uppercase and bold.
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide',
  {
    variants: {
      variant: {
        dark: 'bg-foreground text-white',
        success: 'bg-success text-white',
        stale: 'bg-stale text-white',
        step: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: { variant: 'dark' },
  },
);

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
