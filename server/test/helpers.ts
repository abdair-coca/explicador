import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after } from 'node:test';

/** Creates a throwaway project with the given files; removed when the test file ends. */
export function tempProject(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'explicador-test-'));
  after(() => rmSync(root, { recursive: true, force: true }));
  writeFiles(root, files);
  return root;
}

export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

/** A minimal built viewer: index.html plus one script and one stylesheet with tricky content. */
export const fakeViewer = {
  'index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <link rel="icon" href="data:," />',
    '    <title>Explicador</title>',
    '    <script type="module" crossorigin src="/assets/index-abc.js"></script>',
    '    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '  </body>',
    '</html>',
  ].join('\n'),
  'assets/index-abc.js': 'const s = "</script>"; const r = "$&$1"; document.title = s + r;',
  'assets/index-abc.css': 'body{color:red}/* </style> */',
};

/** A brief for the scenes tests render: every scene opens with one (F23). */
export const testBrief = [
  '<brief form="process">',
  '<audience>Developers new to the shop</audience>',
  '<question>How does the shop log a user in?</question>',
  '<example>Ada logs in as "ada@example.com"</example>',
  '<misconception>Believing the password is stored as typed</misconception>',
  '<check>Predict what the server compares</check>',
  '<terms>hash, session</terms>',
  '</brief>',
].join('\n');
