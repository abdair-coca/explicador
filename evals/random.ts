// npm run eval:random: Sonnet writes a presentation on topics drawn at random (F36), so the skill is not tuned to a few
// topics only. Topics come from evals/topics.json; the ones already played (evals/random-log.md) are skipped.
//   npm run eval:random [-- --count <n>] [--topic <id>] [--model sonnet]
// Each topic becomes a temporary case evals/zz-<id>/ over the empty project examples/blank, run with evals/run.ts
// (results, traces and the scenes in evals/results/<stamp>/runs/), then removed. A row per topic is added to the log;
// its last column ("after") is for what the round fixed. Every run is a real session on your account: it costs usage
// (about $0.25 a topic on Sonnet at list price).
// To look at every slide of the scenes:
//   EXPLICADOR_E2E_SCENES=evals/results/<stamp>/runs EXPLICADOR_CAPTURE=<folder> npm run e2e -- e2e/capture.spec.ts
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseExl } from '../server/src/parser/index.ts';

const repo = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: { count: { type: 'string', default: '1' }, topic: { type: 'string' }, model: { type: 'string', default: 'sonnet' } } });

interface Topic {
  id: string;
  lang: 'es' | 'en';
  ask: string;
}
const topics = JSON.parse(readFileSync(join(repo, 'evals/topics.json'), 'utf8')) as Topic[];
const logPath = join(repo, 'evals/random-log.md');
const header = [
  '# Random topics on Sonnet (F36)',
  '',
  'One row per topic played by `npm run eval:random`: the score of the deterministic graders, the slides asked, the themes the scene named, its components and what the round changed after looking at every slide.',
  '',
  '| date | topic | lang | slides | score | themes | components | after |',
  '|---|---|---|---|---|---|---|---|',
];
const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : `${header.join('\n')}\n`;
const played = new Set([...log.matchAll(/^\| [\d-]+ \| ([\w-]+) \|/gm)].map((match) => match[1]));

/** A random item; Math.random, on purpose: every round must draw something new. */
const draw = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;
const left = topics.filter((topic) => !played.has(topic.id));
const chosen: Topic[] = [];
if (values.topic) {
  const topic = topics.find((item) => item.id === values.topic);
  if (!topic) throw new Error(`No topic "${values.topic}" in evals/topics.json`);
  chosen.push(topic);
} else {
  const count = Math.min(Number(values.count), left.length);
  while (chosen.length < count) {
    const topic = draw(left.filter((item) => !chosen.includes(item)));
    chosen.push(topic);
  }
}
if (chosen.length === 0) {
  console.error('Every topic of evals/topics.json was played: add more.');
  process.exit(2);
}

const tools = ['Read', 'Glob', 'Grep', 'Skill', ...['ensure_index', 'show_scene', 'render_scene', 'answer_question', 'explain_code', 'read_notebook', 'export_scene', 'add_finding'].map((tool) => `mcp__plugin_explicador_explicador__${tool}`)];
const q = (text: string): string => `'${text.replace(/'/g, "''")}'`;
const slides = new Map<string, number>();
for (const topic of chosen) {
  const count = 4 + Math.floor(Math.random() * 4);
  slides.set(topic.id, count);
  const prompt =
    topic.lang === 'es'
      ? `Explícame ${topic.ask}. Usa «${topic.id}» como tema. Quiero una presentación con la portada y exactamente ${count} slides más.`
      : `Explain ${topic.ask}. Use "${topic.id}" as the topic. I want a presentation with the cover and exactly ${count} more slides.`;
  const file = `.explicador/scenes/${topic.id}.json`;
  const fileGrader = (name: string, pattern: string, weight: number, extra: string[] = []): string[] => [
    `  - name: ${q(name)}`, "    type: 'regex'", '    target:', "      source: 'file'", `      path: ${q(file)}`, `    pattern: ${q(pattern)}`, `    weight: ${weight}`, ...extra,
  ];
  const dir = join(repo, 'evals', `zz-${topic.id}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'case.yaml'),
    [
      "schema_version: '1.1'",
      `name: ${q(`zz-${topic.id}`)}`,
      `description: ${q(`A random topic (F36): ${topic.ask}.`)}`,
      'runs: 1',
      'execution:',
      '  max_turns: 60',
      '  timeout_seconds: 1800',
      '  allowed_tools:',
      ...tools.map((tool) => `    - ${q(tool)}`),
      '  env:',
      "    EVAL_EXPLICADOR_NO_BROWSER: '1'",
      `  prompt: ${q(prompt)}`,
      'context:',
      "  scaffold_script: 'scaffold.sh'",
      'graders:',
      "  - name: 'rule-rendered'",
      "    type: 'file_exists'",
      `    path: ${q(file)}`,
      '    weight: 2',
      ...fileGrader('rule-no-warnings', '"warnings"', 3, ["    match: 'not_contains'"]),
      ...fileGrader('rule-themes', '<theme name=\\\\"[a-z]+ [a-z]+', 1),
      ...(topic.lang === 'es' ? fileGrader('rule-spanish', '\\b(?:que|por|para|una|los|las)\\b', 1) : []),
      "  - name: 'rule-reply-url'",
      "    type: 'regex'",
      "    target: 'last_message'",
      `    pattern: ${q('http://127\\.0\\.0\\.1:\\d+/\\?t=[a-f0-9]+')}`,
      '    weight: 1',
      '',
    ].join('\n'),
  );
  writeFileSync(join(dir, 'scaffold.sh'), '#!/usr/bin/env bash\n# Fills the empty workspace of each run (see evals/scaffold.ts).\nset -euo pipefail\nnode "$(dirname "$0")/../scaffold.ts" blank\n', { mode: 0o755 });
}

const before = new Set(existsSync(join(repo, 'evals/results')) ? readdirSync(join(repo, 'evals/results')) : []);
console.log(`Topics: ${chosen.map((topic) => `${topic.id} (${slides.get(topic.id)} slides)`).join(', ')}`);
spawnSync('node', [join(repo, 'evals/run.ts'), '--models', values.model ?? 'sonnet', '--case', chosen.length === 1 ? `zz-${chosen[0]?.id}` : 'zz-*'], { stdio: 'inherit', cwd: repo });
for (const topic of chosen) rmSync(join(repo, 'evals', `zz-${topic.id}`), { recursive: true, force: true });

const stamp = readdirSync(join(repo, 'evals/results')).filter((name) => !before.has(name) && existsSync(join(repo, 'evals/results', name, `${values.model}.json`))).sort().at(-1);
if (!stamp) {
  console.error('The run left no results.');
  process.exit(1);
}
interface Result {
  cases: { name: string; aggregates: { score: number } }[];
}
const result = JSON.parse(readFileSync(join(repo, 'evals/results', stamp, `${values.model}.json`), 'utf8')) as Result;
const runs = join(repo, 'evals/results', stamp, 'runs');
const rows: string[] = [];
for (const topic of chosen) {
  const score = result.cases.find((item) => item.name === `zz-${topic.id}`)?.aggregates.score;
  const folder = join(runs, `${values.model}-zz-${topic.id}-1`);
  const exl = existsSync(join(folder, `blank.${topic.id}.exl.md`)) ? readFileSync(join(folder, `blank.${topic.id}.exl.md`), 'utf8') : '';
  const parsed = exl ? parseExl(exl) : undefined;
  const blocks = parsed?.ok ? parsed.scene.blocks : [];
  const theme = blocks.find((block) => block.type === 'theme');
  const themes = theme?.type === 'theme' ? (theme.choices ?? [theme.name]).join(' ') : '—';
  const components = blocks.filter((block) => block.type !== 'markdown' && block.type !== 'theme' && block.type !== 'chapter').map((block) => block.type);
  rows.push(`| ${new Date().toISOString().slice(0, 10)} | ${topic.id} | ${topic.lang} | ${slides.get(topic.id)} | ${score === undefined ? '—' : score.toFixed(2)} | ${themes} | ${components.join(', ') || '—'} | |`);
}
writeFileSync(logPath, `${log.trimEnd()}\n${rows.join('\n')}\n`);
console.log(`\n${rows.join('\n')}\n\nScenes: ${runs}\nLook at them: EXPLICADOR_E2E_SCENES=${runs} EXPLICADOR_CAPTURE=<folder> npm run e2e -- e2e/capture.spec.ts`);
