import { z } from 'zod';

export const mechanisms = ['wait', 'relaunch', 'channel', 'monitor'] as const;
export type Mechanism = (typeof mechanisms)[number];

export const clickRequestSchema = z.object({
  node: z.string().regex(/^[a-z0-9_-]{1,40}$/i),
  // Single line: the monitor mechanism turns every printed line into a message for Claude.
  label: z.string().regex(/^[^\r\n]{1,80}$/),
  mechanism: z.enum(mechanisms),
});

export type Click = z.infer<typeof clickRequestSchema> & { at: string };

export function describeClick(click: Click): string {
  return (
    `The user clicked node "${click.label}" (id: ${click.node}) in the Explicador viewer at ${click.at}. ` +
    'Reply with one short sentence that names the node.'
  );
}
