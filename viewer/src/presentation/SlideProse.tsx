// A prose slide revealed part by part. Future parts keep their place, invisible. Each part names its entrance with
// `data-fx` and `choreo.ts` plays it (and rewinds it on ←): a heading rises word by word, a callout stamps in and
// table rows cascade. Numbers count up, bold gets a marker sweep, earlier parts dim, and the current part scrolls
// into view.
import { createElement, Fragment, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { reducedMotion } from '../animation/motion';
import { markMath } from '../../../server/src/parser/math.ts';
import { inlineComponents, InlineMarkdown, Prose } from '../components/Prose';
import { CountUp } from '../lesson/CountUp';
import { cn } from '@/lib/utils';
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
        ...inlineComponents,
        span: ({ className, children }) => (className === 'count' ? <CountUp text={String(children)} /> : <span className={className}>{children}</span>),
      }}
    >
      {markMath(text)}
    </Markdown>
  );
}

/** Markdown with no inline syntax can be split into words; anything richer comes in whole. */
const plain = (text: string): boolean => !/[*_`[\]<]/.test(text);

function Heading({ depth, text, stage, part }: { depth: number; text: string; stage: Stage; part: number }) {
  return createElement(
    `h${Math.min(depth, 3)}`,
    { className: cn('slide-part slide-heading', stage), 'data-part': part, 'data-fx': plain(text) ? 'split' : 'rise' },
    <InlineMarkdown text={text} />,
  );
}

function Chunk({ text, stage, index, part }: { text: string; stage: Stage; index: number; part: number }) {
  const element = useFollow<HTMLSpanElement>(stage, part);
  return (
    <span ref={element} className={cn('slide-part', stage)} data-part={index} data-fx="fade">
      {stage === 'future' ? <InlineMarkdown text={text} /> : <LiveInline text={text} />}
    </span>
  );
}

function Item({ text, stage, index, part }: { text: string; stage: Stage; index: number; part: number }) {
  const element = useFollow<HTMLLIElement>(stage, part);
  const nested = text.includes('\n');
  return (
    <li ref={element} className={cn('slide-part', stage)} data-part={index} data-fx="rise">
      {nested ? <Prose>{text}</Prose> : stage === 'future' ? <InlineMarkdown text={text} /> : <LiveInline text={text} />}
    </li>
  );
}

function Block({ text, callout, stage, index, part }: { text: string; callout: boolean; stage: Stage; index: number; part: number }) {
  const element = useFollow<HTMLDivElement>(stage, part);
  return (
    <div ref={element} className={cn('slide-part', stage)} data-part={index} data-fx={callout ? 'stamp' : 'rows'}>
      <Prose>{text}</Prose>
    </div>
  );
}

function Group({ group, part }: { group: ProseGroup; part: number }) {
  switch (group.kind) {
    case 'heading':
      return <Heading depth={group.depth} text={group.text} stage={stageOf(group.part, part)} part={group.part} />;
    case 'paragraph':
      return (
        <p>
          {group.chunks.map((chunk, i) => (
            <Fragment key={chunk.part}>
              {i > 0 && ' '}
              <Chunk text={chunk.text} stage={stageOf(chunk.part, part)} index={chunk.part} part={part} />
            </Fragment>
          ))}
        </p>
      );
    case 'list': {
      const items = group.items.map((item) => <Item key={item.part} text={item.text} stage={stageOf(item.part, part)} index={item.part} part={part} />);
      return group.ordered ? <ol start={group.start}>{items}</ol> : <ul>{items}</ul>;
    }
    case 'block':
      return <Block text={group.text} callout={group.callout} stage={stageOf(group.part, part)} index={group.part} part={part} />;
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
