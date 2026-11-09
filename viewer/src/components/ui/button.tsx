// Titi buttons (SocialNeo design.md §5.1): primary yellow and secondary white, both with a hard
// bottom shadow that flattens on press; ghost for quiet actions. Every button sinks when pressed.
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-dark)] hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_6px_0_var(--primary-dark)] active:translate-y-1 active:shadow-none',
        secondary:
          'border-2 border-border bg-card text-foreground shadow-[0_4px_0_var(--border)] hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_6px_0_var(--border)] active:translate-y-1 active:shadow-none',
        ghost: 'text-foreground hover:bg-muted active:scale-[0.96]',
      },
      size: {
        default: 'h-11 px-5 text-sm',
        sm: 'h-9 px-3.5 text-sm',
        icon: 'h-11 w-11',
        'icon-sm': 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'default' },
  },
);

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
