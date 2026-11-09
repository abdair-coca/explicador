// Development mode without Claude: serve an EXL file in the viewer and reload it on every save.
//   npm run preview -- <file.exl.md> [--project <dir>] [--port <n>]
// Validation errors are printed; refs are checked against the project folder. Nothing is cached.
import { existsSync, readFileSync, watchFile } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Bridge } from './bridge/index.ts';
import { formatErrors, parseExl } from './parser/index.ts';
import { resolveInside } from './project.ts';
import { withSnippets } from './snippets.ts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { project: { type: 'string' }, port: { type: 'string' } },
});
const file = positionals[0];
if (!file) {
  console.error('Usage: npm run preview -- <file.exl.md> [--project <dir>] [--port <n>]');
  process.exit(2);
}
const path = resolve(file);
const project = resolve(values.project ?? process.cwd());
const bridge = new Bridge();
const url = await bridge.start(values.port ? Number(values.port) : 0);
console.log(`Viewer: ${url}`);

function load(): void {
  const parsed = parseExl(readFileSync(path, 'utf8'));
  if (!parsed.ok) {
    console.error(`${file}: EXL errors\n${formatErrors(parsed.errors)}`);
    return;
  }
  const missing = parsed.refs.filter((ref) => !existsSync(resolveInside(project, ref) ?? ''));
  if (missing.length > 0) console.warn(`Refs not found under ${project}: ${missing.join(', ')}`);
  bridge.publish({
    topic: file ?? 'preview',
    key: 'preview',
    status: 'fresh',
    changes: [],
    savedAt: new Date().toISOString(),
    trail: [],
    blocks: withSnippets(project, parsed.scene.blocks),
  });
  console.log(`${new Date().toLocaleTimeString()} published ${file}`);
}

load();
watchFile(path, { interval: 300 }, load);
