// A prose slide revealed part by part. Future parts keep their place, invisible. The current one comes in with its
// effects: a heading rises word by word, numbers count up, bold gets a marker sweep, a callout stamps in and table rows
// cascade. Earlier parts dim, and the current part scrolls into view.
import { createElement, Fragment, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { reducedMotion, staggerIn } from '../animation/reveal';
import { InlineMarkdown, Prose } from '../components/Prose';
import { CountUp } from '../lesson/CountUp';
import { cn } from '@/lib/utils';
import { RisingWords } from './effects';
import { proseSlide, rehypeCountNumbers, type ProseGroup } from './prose';

type Stage = 'past' | 'current' | 'future';

const stageOf = (index: number, part: number): Stage => (index < part ? 'past' : index === part ? 'current' : 'future');

/** Scrolls the part into view when it becomes the current one (not on a slide's first part, which starts at the top). */
function useFollow<T extends HTMLElement>(stage: Stage, part: number) {
  const element = useRef<T>(null);
  useEffect(() => {
    if (stage === 'current' && part > 0) element.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [stage, part]);
  return element;
}

/** Inline Markdown whose numbers count up. */
function LiveInline({ text }: { text: string }) {
  return (
    <Markdown
      rehypePlugins={[rehypeCountNumbers]}
      components={{
        p: ({ children }) => <Fragment>{children}</Fragment>,
        span: ({ className, children }) => (className === 'count' ? <CountUp text={String(children)} /> : <span className={className}>{children}</span>),
      }}
    >
      {text}
    </Markdown>
  );
}

/** Markdown with no inline syntax rises word by word; anything richer fades in whole. */
const plain = (text: string): boolean => !/[*_`[\]<]/.test(text);

function Heading({ depth, text, stage }: { depth: number; text: string; stage: Stage }) {
  const live = stage !== 'future' && plain(text);
  return createElement(
    `h${Math.min(depth, 3)}`,
    { className: cn('slide-part slide-heading', live && 'rising', stage) },
    live ? <RisingWords text={text} /> : <InlineMarkdown text={text} />,
  );
}

function Chunk({ text, stage, part }: { text: string; stage: Stage; part: number }) {
  const element = useFollow<HTMLSpanElement>(stage, part);
  return (
    <span ref={element} className={cn('slide-part', stage)}>
      {stage === 'future' ? <InlineMarkdown text={text} /> : <LiveInline text={text} />}
    </span>
  );
}

function Item({ text, stage, part }: { text: string; stage: Stage; part: number }) {
  const element = useFollow<HTMLLIElement>(stage, part);
  const nested = text.includes('\n');
  return (
    <li ref={element} className={cn('slide-part', stage)}>
      {nested ? <Prose>{text}</Prose> : stage === 'future' ? <InlineMarkdown text={text} /> : <LiveInline text={text} />}
    </li>
  );
}

function Block({ text, callout, stage, part }: { text: string; callout: boolean; stage: Stage; part: number }) {
  const element = useFollow<HTMLDivElement>(stage, part);
  const shown = stage !== 'future';
  useEffect(() => {
    if (shown && element.current) staggerIn(element.current.querySelectorAll('tbody tr'));
  }, [shown, element]);
  return (
    <div ref={element} className={cn('slide-part', callout && 'stamp', stage)}>
      <Prose>{text}</Prose>
    </div>
  );
}

function Group({ group, part }: { group: ProseGroup; part: number }) {
  switch (group.kind) {
    case 'heading':
      return <Heading depth={group.depth} text={group.text} stage={stageOf(group.part, part)} />;
    case 'paragraph':
      return (
        <p>
          {group.chunks.map((chunk, i) => (
            <Fragment key={chunk.part}>
              {i > 0 && ' '}
              <Chunk text={chunk.text} stage={stageOf(chunk.part, part)} part={part} />
            </Fragment>
          ))}
        </p>
      );
    case 'list': {
      const items = group.items.map((item) => <Item key={item.part} text={item.text} stage={stageOf(item.part, part)} part={part} />);
      return group.ordered ? <ol start={group.start}>{items}</ol> : <ul>{items}</ul>;
    }
    case 'block':
      return <Block text={group.text} callout={group.callout} stage={stageOf(group.part, part)} part={part} />;
  }
}

export function SlideProse({ text, part }: { text: string; part: number }) {
  const { groups } = useMemo(() => proseSlide(text), [text]);
  return (
    <div className="prose-exl prose-slide mx-auto max-w-3xl">
      {groups.map((group, i) => (
        <Group key={i} group={group} part={part} />
      ))}
    </div>
  );
}
