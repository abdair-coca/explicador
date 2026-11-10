// Markdown pipe tables. react-markdown without plugins leaves them as plain text, so tables are cut out of the
// text here and drawn as real tables; everything else goes to react-markdown as before.

export type Align = 'left' | 'center' | 'right' | undefined;

export type Segment = { kind: 'markdown'; text: string } | { kind: 'table'; header: string[]; align: Align[]; rows: string[][] };

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** The cells of a table row: no outer pipes, `\|` stays inside a cell. */
export function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? '';
    if (ch === '\\' && line[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (ch === '|') {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  const trimmed = cells.map((c) => c.trim());
  if (line.trim().startsWith('|')) trimmed.shift();
  if (line.trim().endsWith('|') && !line.trim().endsWith('\\|')) trimmed.pop();
  return trimmed;
}

function alignOf(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  return left && right ? 'center' : right ? 'right' : left ? 'left' : undefined;
}

/** Cuts the pipe tables out of Markdown text, outside code fences. */
export function splitTables(text: string): Segment[] {
  const lines = text.split(/\r?\n/);
  const segments: Segment[] = [];
  let buffer: string[] = [];
  let fenced = false;
  const flush = (): void => {
    if (buffer.length > 0) segments.push({ kind: 'markdown', text: buffer.join('\n') });
    buffer = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const next = lines[i + 1];
    if (!fenced && line.includes('|') && next !== undefined && next.includes('-') && SEPARATOR.test(next)) {
      const header = splitRow(line);
      const marks = splitRow(next);
      if (header.length === marks.length && header.length > 1) {
        flush();
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length && (lines[j] ?? '').includes('|') && (lines[j] ?? '').trim() !== '') {
          const cells = splitRow(lines[j] ?? '');
          // Short rows are padded and long ones cut, so every row has the header's columns.
          rows.push(header.map((_, c) => cells[c] ?? ''));
          j += 1;
        }
        segments.push({ kind: 'table', header, align: marks.map(alignOf), rows });
        i = j - 1;
        continue;
      }
    }
    buffer.push(line);
  }
  flush();
  return segments;
}
