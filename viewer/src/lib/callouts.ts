// GitHub-style callouts in Markdown: a blockquote that starts with [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or
// [!CAUTION] becomes a colored box. Text after the marker, or a first line that is all **bold**, is its title.

export const calloutKinds = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutKind = (typeof calloutKinds)[number];

export type CalloutSegment = { kind: 'markdown'; text: string } | { kind: 'callout'; type: CalloutKind; title?: string; body: string };

const MARKER = /^ {0,3}>\s?\[!(note|tip|important|warning|caution)\][ \t]*(.*)$/i;
const QUOTED = /^ {0,3}>\s?(.*)$/;
const BOLD_LINE = /^\*\*(.+)\*\*$/;

export function splitCallouts(text: string): CalloutSegment[] {
  const lines = text.split('\n');
  const segments: CalloutSegment[] = [];
  let plain: string[] = [];
  const flush = (): void => {
    const joined = plain.join('\n');
    if (joined.trim()) segments.push({ kind: 'markdown', text: joined });
    plain = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const marker = MARKER.exec(lines[i] ?? '');
    if (!marker) {
      plain.push(lines[i] ?? '');
      continue;
    }
    flush();
    const body: string[] = [];
    while (i + 1 < lines.length) {
      const quoted = QUOTED.exec(lines[i + 1] ?? '');
      if (!quoted) break;
      body.push(quoted[1] ?? '');
      i += 1;
    }
    let title = (marker[2] ?? '').trim();
    const first = body[0]?.trim() ?? '';
    const bold = BOLD_LINE.exec(first);
    if (!title && bold) {
      title = bold[1] ?? '';
      body.shift();
    }
    segments.push({
      kind: 'callout',
      type: (marker[1] ?? 'note').toLowerCase() as CalloutKind,
      ...(title ? { title } : {}),
      body: body.join('\n').trim(),
    });
  }
  flush();
  return segments;
}
