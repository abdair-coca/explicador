// Lines of code copied from the analyzed project by the server, highlighted, with their ref.
import { useMemo } from 'react';
import type { Ref } from '../../../server/src/scene.ts';
import { highlight } from '../lib/highlight';
import { formatRef } from './scenes';

export function CodeCard({ code }: { code: { ref: Ref; note?: string; lines?: string[]; missing?: boolean } }) {
  const lines = useMemo(() => (code.lines ? highlight(code.lines, code.ref.path) : []), [code]);
  const first = code.ref.start ?? 1;
  return (
    <figure className="overflow-hidden rounded-xl border border-border-soft">
      <figcaption className="space-y-1 bg-subtle px-3 py-2.5">
        {code.note && <p className="text-sm font-bold leading-snug">{code.note}</p>}
        <code className="block break-all font-mono text-xs font-semibold text-muted-foreground">{formatRef(code.ref)}</code>
      </figcaption>
      {code.missing || !code.lines ? (
        <p className="px-3 py-2.5 text-sm font-bold text-red-600">These lines are no longer in the file; ask Claude to refresh the scene.</p>
      ) : (
        <pre className="code-block py-3 font-mono text-[12.5px] leading-5">
          <code>
            {lines.map((tokens, i) => (
              <span key={i} className="flex">
                <span className="w-11 shrink-0 select-none pr-3 text-right code-line-number">{first + i}</span>
                {/* Long lines wrap: the panel is narrow and sideways scrolling hides the end of the line. */}
                <span className="min-w-0 whitespace-pre-wrap pr-3 [overflow-wrap:anywhere]">
                  {tokens.length === 0 ? ' ' : tokens.map((t, j) => <span key={j} className={`tok-${t.kind}`}>{t.text}</span>)}
                </span>
              </span>
            ))}
          </code>
        </pre>
      )}
    </figure>
  );
}
