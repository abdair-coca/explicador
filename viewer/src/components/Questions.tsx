// Questions about the open box: the thread of questions and answers, and the box to ask a new one.
// Claude answers through the answer_question tool; the answer arrives over the event stream.
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import type { Question, Ref, Tour } from '../../../server/src/scene.ts';
import type { AskReply } from '../api';
import { CodeCard } from './CodeCard';
import { ArrowRightIcon, CodeIcon, SendIcon } from './icons';
import { Button } from './ui/button';

const MAX_LENGTH = 500;
/** After this long without an answer, the waiting dots give way to a hint. */
const GIVE_UP_MS = 10 * 60 * 1000;

const suggestions = ['What does it do, step by step?', 'Why is it needed?', 'What can go wrong here?'];

export type AskHandler = (text: string) => Promise<AskReply>;

export function QuestionThread(props: {
  questions: Question[];
  onFollow: (id: string) => void;
  /** Absent in exported files and while there is no code window. */
  onTour?: ((tour: Tour) => void) | undefined;
  onOpenCode?: ((ref: Ref) => void) | undefined;
  /** Question to bring into view when the panel opens from the "Claude answered" notice. */
  focus?: string | undefined;
}) {
  const { questions, focus } = props;
  const end = useRef<HTMLLIElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const answered = questions.filter((q) => q.answer).length;
  const seen = useRef(`${questions.length}:${answered}`);

  // Keep the newest question or answer in view, but do not scroll when the panel just opened.
  useEffect(() => {
    const now = `${questions.length}:${answered}`;
    if (now === seen.current) return;
    seen.current = now;
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [questions.length, answered]);

  useEffect(() => {
    if (focus) list.current?.querySelector(`[data-question="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focus]);

  if (questions.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Your questions</h3>
      <ol ref={list} className="space-y-4">
        {questions.map((question, i) => (
          <li key={question.id} ref={i === questions.length - 1 ? end : undefined} data-question={question.id} className="scroll-mt-4 space-y-2">
            <p className="animate-pop-in ml-auto w-fit max-w-[88%] origin-bottom-right rounded-2xl rounded-br-md bg-primary-light px-3.5 py-2 text-sm font-bold leading-snug [overflow-wrap:anywhere]">
              {question.text}
            </p>
            {question.answer ? (
              <div className="animate-pop-in origin-top-left space-y-3 rounded-2xl rounded-tl-md border-2 border-border bg-card px-3.5 py-3">
                <div className="prose-exl prose-panel">
                  <Markdown>{question.answer.text}</Markdown>
                </div>
                {question.answer.codes?.map((code, j) => <CodeCard key={j} code={code} onOpen={props.onOpenCode} />)}
                {question.answer.tour && props.onTour && (
                  <Button size="sm" variant="primary" className="h-auto min-h-9 w-full whitespace-normal py-1.5" onClick={() => props.onTour?.(question.answer?.tour as Tour)}>
                    <CodeIcon size={16} className="shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      Walk through the code · {question.answer.tour.steps.length} {question.answer.tour.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </Button>
                )}
                {question.answer.scene && (
                  <Button size="sm" className="h-auto min-h-9 w-full whitespace-normal py-1.5" onClick={() => props.onFollow(question.id)}>
                    <span className="min-w-0 [overflow-wrap:anywhere]">See it drawn: {question.answer.scene.topic}</span>
                    <ArrowRightIcon size={16} className="shrink-0" />
                  </Button>
                )}
              </div>
            ) : (
              <Waiting askedAt={question.askedAt} />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Waiting({ askedAt }: { askedAt: string }) {
  const [late, setLate] = useState(() => Date.now() - Date.parse(askedAt) > GIVE_UP_MS);
  useEffect(() => {
    if (late) return;
    const timer = setTimeout(() => setLate(true), Math.max(0, GIVE_UP_MS - (Date.now() - Date.parse(askedAt))));
    return () => clearTimeout(timer);
  }, [askedAt, late]);
  if (late) {
    return (
      <p className="rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm font-semibold text-muted-foreground">
        No answer arrived. Check that Claude Code is still running and ask again.
      </p>
    );
  }
  return (
    <p role="status" className="flex w-fit items-center gap-2.5 rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm font-bold text-muted-foreground">
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </span>
      Claude is reading the code…
    </p>
  );
}

/** The input at the bottom of the panel. Enter sends; a failed question stays in the input. */
export function AskBox(props: { label: string; onAsk: AskHandler; showSuggestions: boolean }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const send = (value: string): void => {
    const question = value.trim();
    if (!question || busy) return;
    setBusy(true);
    setError(undefined);
    props.onAsk(question).then(
      (reply) => {
        setBusy(false);
        if (reply.status === 'sent') setText('');
        else {
          setText(question);
          setError(
            reply.status === 'no-monitor'
              ? 'Claude Code is not listening to this tab (the Explicador monitor is not running). Ask it in the terminal instead.'
              : reply.status === 'invalid'
                ? reply.message
                : 'This scene changed in the meantime; click the box again.',
          );
        }
      },
      () => {
        setBusy(false);
        setText(question);
        setError('Could not reach Claude Code. Is it still running?');
      },
    );
  };

  return (
    // Sticks to the bottom of the scrolling panel, over its padding, so asking is always one click away.
    <div className="sticky -bottom-5 -mx-5 -mb-5 space-y-2.5 border-t-2 border-border-soft bg-card px-5 pb-5 pt-3.5">
      {props.showSuggestions && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => send(suggestion)}
              className="rounded-full bg-muted px-3 py-1.5 text-left text-[13px] font-bold transition-all duration-150 hover:bg-primary-light active:scale-[0.96] disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError(undefined);
          }}
          maxLength={MAX_LENGTH}
          enterKeyHint="send"
          autoComplete="off"
          aria-label={`Ask Claude about ${props.label}`}
          placeholder={`Ask about ${props.label}…`}
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-3.5 text-sm font-semibold outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary-dark"
        />
        <Button type="submit" variant="primary" size="icon" disabled={busy || text.trim() === ''} aria-label="Send the question to Claude">
          <SendIcon size={18} />
        </Button>
      </form>
      {error && (
        <p role="alert" className="animate-fade-up text-sm font-bold text-warning-foreground">
          {error}
        </p>
      )}
    </div>
  );
}
