export { catalog, limits, parseExl, parseRefString, topLevelTags } from './parse.ts';
export * from './types.ts';
export { briefTemplate, isConcrete } from './brief.ts';

import type { ExlError } from './types.ts';

/** One error per line, as the agent sees them in a tool result. */
export function formatErrors(errors: ExlError[]): string {
  return errors.map((e) => `line ${e.line}, column ${e.column}: ${e.message}`).join('\n');
}
