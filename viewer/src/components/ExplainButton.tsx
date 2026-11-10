// "Explain code": asks Claude (through the monitor) for a code tour. The tour arrives by itself and opens in the code
// window, so the button only has to say that the request is on its way, or why it could not be sent.
import { useEffect, useState } from 'react';
import type { ExplainReply } from '../api';
import { SparkIcon } from './icons';
import { cn } from '@/lib/utils';

type State = 'idle' | 'sent' | 'no-monitor' | 'failed';

const messages: Record<Exclude<State, 'idle'>, string> = {
  sent: 'Asked Claude…',
  'no-monitor': 'Claude Code is not listening',
  failed: 'Could not ask. Try again',
};

export function ExplainButton(props: {
  ask: () => Promise<ExplainReply>;
  /** Classes for the button; it brings none of its own look. */
  className: string;
  /** Changes when the answer (a tour) has arrived, which ends the waiting. */
  doneKey?: string | undefined;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>('idle');

  useEffect(() => setState('idle'), [props.doneKey]);
  // A request nobody answers stops looking pending after a while.
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), state === 'sent' ? 25_000 : 6000);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      disabled={state === 'sent'}
      title="Ask Claude for a step-by-step tour of this code"
      className={cn(props.className, state === 'sent' && 'animate-pulse', (state === 'no-monitor' || state === 'failed') && 'ring-2 ring-red-400')}
      onClick={() =>
        props.ask().then(
          (reply) => setState(reply.status === 'sent' ? 'sent' : reply.status === 'no-monitor' ? 'no-monitor' : 'failed'),
          () => setState('failed'),
        )
      }
    >
      {state === 'idle' ? (
        <>
          <SparkIcon size={15} />
          {props.children}
        </>
      ) : (
        <span role="status">{messages[state]}</span>
      )}
    </button>
  );
}
