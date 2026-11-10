// Markdown with tables. Wrap it in `.prose-exl` like plain react-markdown.
import { Fragment } from 'react';
import Markdown from 'react-markdown';
import { splitTables } from '../lib/tables';

/** A table cell is inline Markdown: no paragraph around it. */
function Cell({ text }: { text: string }) {
  return <Markdown components={{ p: ({ children }) => <Fragment>{children}</Fragment> }}>{text}</Markdown>;
}

export function Prose({ children }: { children: string }) {
  return (
    <>
      {splitTables(children).map((segment, i) =>
        segment.kind === 'markdown' ? (
          <Markdown key={i}>{segment.text}</Markdown>
        ) : (
          <div key={i} className="prose-table">
            <table>
              <thead>
                <tr>
                  {segment.header.map((cell, c) => (
                    <th key={c} style={{ textAlign: segment.align[c] }}>
                      <Cell text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {segment.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ textAlign: segment.align[c] }}>
                        <Cell text={cell} />
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
