// Events in order along a line. In Present mode (`shown` is the current part) each event is a part: the line reaches
// it and its dot lands; the speaker tells what happened. On the page every event shows, with the narrations in a list.
import type { TimelineBlock } from '../../../server/src/scene.ts';
import { InlineMarkdown } from '../components/Prose';
import { SceneFrame } from '../components/scenes';
import { cn } from '@/lib/utils';

export function TimelineView({ block, shown }: { block: TimelineBlock; shown?: number }) {
  const presenting = shown !== undefined;
  const count = block.events.length;
  const reached = presenting ? shown : count - 1;
  // The line runs between the centers of the first and the last event.
  const fill = count > 1 ? (reached / (count - 1)) * 100 : 100;
  return (
    <div className={cn('timeline', presenting && 'timeline-slide')}>
      <div className="timeline-scroll">
        <ol className="timeline-track" style={{ '--events': count } as React.CSSProperties}>
          <li className="timeline-line" aria-hidden="true">
            <span className="timeline-fill" style={{ width: `${fill}%` }} />
          </li>
          {block.events.map((event, i) => (
            <li
              key={i}
              className={cn('timeline-event', presenting && i === shown && 'current', presenting && i < shown && 'past')}
              aria-current={presenting && i === shown ? 'step' : undefined}
              {...(presenting ? { 'data-part': i, 'data-fx': 'event', 'data-stage': i > shown ? 'future' : 'shown' } : {})}
            >
              <span className="timeline-dot" aria-hidden="true">
                {i + 1}
              </span>
              {event.when && <span className="timeline-when">{event.when}</span>}
              <span className="timeline-label">{event.label}</span>
            </li>
          ))}
        </ol>
      </div>
      {/* In Present the speaker tells each event; the page lists them. */}
      {!presenting && (
        <ol className="plot-notes">
          {block.events.map((event, i) => (
            <li key={i}>
              <strong>{event.label}</strong>
              {event.when && ` (${event.when})`}: <InlineMarkdown text={event.narration} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TimelineScene({ block }: { block: TimelineBlock }) {
  return (
    <SceneFrame kind="Timeline" title={block.title}>
      <div className="p-5">
        <TimelineView block={block} />
      </div>
    </SceneFrame>
  );
}
