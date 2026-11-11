// Markdown with tables and callouts. Wrap it in `.prose-exl` like plain react-markdown.
import { Fragment } from 'react';
import Markdown from 'react-markdown';
import { splitCallouts, type CalloutKind } from '../lib/callouts';
import { splitTables } from '../lib/tables';
import { AlertIcon, BulbIcon, InfoIcon, SparkIcon } from './icons';

/** Inline Markdown (code, bold, links) without a paragraph around it: table cells, quiz questions and options. */
export function InlineMarkdown({ text }: { text: string }) {
  return <Markdown components={{ p: ({ children }) => <Fragment>{children}</Fragment> }}>{text}</Markdown>;
}

const calloutIcon: Record<CalloutKind, React.ReactNode> = {
  note: <InfoIcon size={18} />,
  tip: <BulbIcon size={18} />,
  important: <SparkIcon size={18} />,
  warning: <AlertIcon size={18} />,
  caution: <AlertIcon size={18} />,
};

function Tables({ text }: { text: string }) {
  return (
    <>
      {splitTables(text).map((segment, i) =>
        segment.kind === 'markdown' ? (
          <Markdown key={i}>{segment.text}</Markdown>
        ) : (
          <div key={i} className="prose-table">
            <table>
              <thead>
                <tr>
                  {segment.header.map((cell, c) => (
                    <th key={c} style={{ textAlign: segment.align[c] }}>
                      <InlineMarkdown text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segment.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ textAlign: segment.align[c] }}>
                        <InlineMarkdown text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </>
  );
}

export function Prose({ children }: { children: string }) {
  return (
    <>
      {splitCallouts(children).map((segment, i) =>
        segment.kind === 'markdown' ? (
          <Tables key={i} text={segment.text} />
        ) : (
          <aside key={i} className={`callout callout-${segment.type}`}>
            <span className="callout-icon" aria-hidden="true">
              {calloutIcon[segment.type]}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {segment.title && <p className="font-extrabold text-foreground">{segment.title}</p>}
              {segment.body && (
                <div className="prose-exl">
                  <Tables text={segment.body} />
                </div>
              )}
            </div>
          </aside>
        ),
      )}
    </>
  );
}
