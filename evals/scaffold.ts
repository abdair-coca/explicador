// Fills an eval run's empty workspace (the current directory) the way a user's project would look: an example project,
// and optionally a scene already cached, a question waiting in a box's panel, or a file edited after the scene was cached.
// Each case's scaffold.sh calls it; `claude plugin eval --scaffold` runs those scripts (F21e).
//   node evals/scaffold.ts <project> [--scene <file> --topic <topic>] [--ask <block>/<node>=<text>] [--edit <path>=<from>=><to>]
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { SceneCache } from '../server/src/cache/index.ts';
import { formatErrors, parseExl } from '../server/src/parser/index.ts';
import type { Question } from '../server/src/scene.ts';

const repo = fileURLToPath(new URL('..', import.meta.url));
/** "a=b=c" → ["a", "b=c"]: the text after the first separator may hold the separator itself (code often has "="). */
const splitOnce = (text: string, separator: string): [string, string] => {
  const at = text.indexOf(separator);
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + separator.length)];
};
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { scene: { type: 'string' }, topic: { type: 'string' }, ask: { type: 'string' }, edit: { type: 'string' } },
});
const [project] = positionals;
if (!project) throw new Error('Usage: node evals/scaffold.ts <project> [--scene <file> --topic <topic>] [--ask <block>/<node>=<text>] [--edit <path>=<from>=><to>]');
const root = process.cwd();
cpSync(join(repo, 'examples', project), root, { recursive: true, filter: (source) => !/[\\/](node_modules|\.explicador)([\\/]|$)/.test(source) });

if (values.scene && values.topic) {
  const exl = readFileSync(join(repo, 'examples/scenes', values.scene), 'utf8');
  const parsed = parseExl(exl);
  if (!parsed.ok) throw new Error(formatErrors(parsed.errors));
  const cache = new SceneCache(root);
  const saved = cache.save(values.topic, exl, parsed.refs);
  if (!saved.ok) throw new Error(`Missing refs: ${saved.missing.join(', ')}`);
  if (values.ask) {
    const [where, text] = splitOnce(values.ask, '=');
    const [block, node] = splitOnce(where, '/');
    const question: Question = { id: 'q1', block, node, text, askedAt: new Date().toISOString() };
    cache.saveQuestions(saved.scene.key, [question]);
  }
}

if (values.edit) {
  const [path, change] = splitOnce(values.edit, '=');
  const [from, to] = splitOnce(change, '>');
  const full = join(root, path);
  const before = readFileSync(full, 'utf8');
  if (!before.includes(from)) throw new Error(`${path} does not contain ${from}`);
  writeFileSync(full, before.replace(from, to));
}
