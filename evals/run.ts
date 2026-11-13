// npm run eval: the eval suite on Haiku, Sonnet and Opus, each against its target (F21e).
//   npm run eval [-- --models haiku,opus] [--case <glob>] [--runs <n>] [--concurrency <n>] [--keep-temp]
// Every run is a real Claude session on your account, so it costs money. Build first (`npm run build`): the runs start
// the plugin's own MCP server. Results go to evals/results/: one JSON per model and summary.md.
// Targets (user, 2026-11-13): Haiku very good (every case ≥ 0.8), Sonnet and Opus excellent (≥ 0.95); on all three every
// grader named rule-… passes in every run, because those are the skill's rules. Every grader is deterministic (no LLM
// judge, user, 2026-11-13): the runs are the only cost.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repo = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({
  options: {
    models: { type: 'string', default: 'haiku,sonnet,opus' },
    case: { type: 'string' },
    runs: { type: 'string' },
    concurrency: { type: 'string', default: '4' },
    'keep-temp': { type: 'boolean', default: false },
  },
});
const targets: Record<string, number> = { haiku: 0.8, sonnet: 0.95, opus: 0.95 };
const models = (values.models ?? '').split(',').filter(Boolean);
if (!existsSync(join(repo, 'server/dist/index.js')) || !existsSync(join(repo, 'viewer/dist/index.html'))) {
  console.error('Build the plugin first: npm run build');
  process.exit(2);
}

interface Grade {
  name: string;
  passed: boolean;
  explanation: string;
}
interface Run {
  score: number;
  error: string | null;
  costUsd?: number;
  graders: Grade[];
}
interface Result {
  costUsd: number;
  durationSeconds: number;
  cases: { name: string; aggregates: { score: number }; arms: { with: Run[] } }[];
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join(repo, 'evals/results', stamp);
mkdirSync(dir, { recursive: true });
const results = new Map<string, Result>();
for (const model of models) {
  const target = targets[model] ?? 0.95;
  const out = join(dir, `${model}.json`);
  const args = [
    'plugin', 'eval', repo,
    '--model', model,
    '--ablation', 'none',
    '--scaffold',
    '--allow-real-servers',
    '--allow-tools', 'mcp__plugin_explicador_explicador__*',
    '--trust-plugin',
    '--no-publish',
    '--threshold', String(target),
    '--concurrency', values.concurrency ?? '4',
    '--json', out,
    ...(values.case ? ['--case', values.case] : []),
    ...(values.runs ? ['--runs', values.runs] : []),
    ...(values['keep-temp'] ? ['--keep-temp'] : []),
  ];
  console.log(`\n== ${model} (target ${target}) ==`);
  // Runs pass only EVAL_* variables to the plugin's server; this one keeps it from opening browser tabs.
  spawnSync('claude', args, { stdio: 'inherit', env: { ...process.env, EVAL_EXPLICADOR_NO_BROWSER: '1' } });
  if (existsSync(out)) results.set(model, JSON.parse(readFileSync(out, 'utf8')) as Result);
}

const lines = [`# Eval results ${stamp}`, '', `| case | ${models.map((model) => `${model} (≥ ${targets[model] ?? 0.95})`).join(' | ')} |`, `|---|${models.map(() => '---').join('|')}|`];
const names = [...new Set([...results.values()].flatMap((result) => result.cases.map((item) => item.name)))].sort();
const failures: string[] = [];
for (const name of names) {
  const cells = models.map((model) => {
    const item = results.get(model)?.cases.find((entry) => entry.name === name);
    if (!item) return '—';
    const target = targets[model] ?? 0.95;
    const runs = item.arms.with;
    const broken = runs.flatMap((run) => run.graders.filter((grade) => grade.name.startsWith('rule-') && !grade.passed).map((grade) => grade.name));
    const errors = runs.filter((run) => run.error).length;
    const ok = item.aggregates.score >= target && broken.length === 0 && errors === 0;
    if (!ok) {
      const missed = runs.flatMap((run) => run.graders.filter((grade) => !grade.passed).map((grade) => `${grade.name}: ${grade.explanation.replace(/\s+/g, ' ').slice(0, 300)}`));
      failures.push(`- ${model} / ${name}: score ${item.aggregates.score.toFixed(2)}${errors ? `, ${errors} run error(s): ${runs.map((run) => run.error).filter(Boolean).join('; ')}` : ''}\n${[...new Set(missed)].map((miss) => `  - ${miss}`).join('\n')}`);
    }
    return `${ok ? '✓' : '✗'} ${item.aggregates.score.toFixed(2)}`;
  });
  lines.push(`| ${name} | ${cells.join(' | ')} |`);
}
const cost = [...results.values()].reduce((sum, result) => sum + (result.costUsd ?? 0), 0);
lines.push('', `Cost: $${cost.toFixed(2)} (list price). ✓ = at or above the target with every rule-… grader passing in every run.`);
if (failures.length > 0) lines.push('', '## Below target', '', ...failures);
writeFileSync(join(dir, 'summary.md'), `${lines.join('\n')}\n`);
console.log(`\n${lines.join('\n')}\n\nWritten to ${join(dir, 'summary.md')}`);
process.exit(failures.length > 0 || results.size < models.length ? 1 : 0);
