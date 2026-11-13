// npm run eval:comprension: does a scene make a small model understand the topic? (F22)
//   npm run eval:comprension [-- --topics a,b] [--runs 3] [--concurrency 4] [--out docs/file.md] [--dry] [--print]
// For each topic of evals/bench/, a small model (Haiku) answers the topic's 5 questions twice: with only the text of
// the scene (evals/sceneText.ts) and without any scene, from what it already knows. The score is the gain: right
// answers with the scene minus right answers without it. Answers are letters or numbers, graded without a judge
// (evals/bench.ts). Each condition is asked --runs times and the mean is reported, because a small model varies.
// Every run is a real Claude call on your account. Haiku only: any other model needs --allow-other-models, and you
// must tell the user first (docs/plan.md, "Eval budget"). --dry prints what would be asked and its estimated cost
// at list price without calling anything. --print writes each topic's questions as a person reads them (for
// docs/prueba-humana.md), with the answers apart, and calls nothing either.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { formatQuestions, loadScene, loadTopics, parseAnswers, promptOf, QUESTIONS_PER_TOPIC, repo, score, type LoadedScene, type Topic } from './bench.ts';

const { values } = parseArgs({
  options: {
    topics: { type: 'string' },
    runs: { type: 'string', default: '3' },
    model: { type: 'string', default: 'haiku' },
    concurrency: { type: 'string', default: '4' },
    out: { type: 'string' },
    dry: { type: 'boolean', default: false },
    print: { type: 'boolean', default: false },
    'allow-other-models': { type: 'boolean', default: false },
  },
});
const model = values.model ?? 'haiku';
const runs = Math.max(1, Number(values.runs));
if (model !== 'haiku' && !values['allow-other-models']) {
  console.error(`Only Haiku runs by default. "${model}" costs more: tell the user first, then pass --allow-other-models.`);
  process.exit(2);
}
// List price per million tokens (claude-haiku-5-5, prompts up to 100K tokens), 2026-11-13. Other models: no estimate.
const PRICE = { input: 0.1, output: 0.5 };
/** Right answers (of 5) without any scene from which a topic is too well known for the eval to tell scenes apart. */
const SATURATED = 4;
const SYSTEM = 'You answer questions. Reply with only the JSON object that was asked for, nothing else.';

const wanted = values.topics?.split(',').filter(Boolean);
const topics = loadTopics().filter((topic) => !wanted || wanted.includes(topic.id));
if (topics.length === 0) {
  console.error(`No topic matches ${values.topics}.`);
  process.exit(2);
}
if (values.print) {
  for (const topic of topics) {
    console.log(`# ${topic.title} (${topic.id}, audience: ${topic.audience})

${formatQuestions(topic)}

Answers: ${topic.questions.map((q, i) => `${i + 1}=${q.answer}`).join(', ')}
`);
  }
  process.exit(0);
}
const scenes = new Map<string, LoadedScene>(topics.map((topic) => [topic.id, loadScene(topic)]));

interface Call {
  topic: Topic;
  condition: 'with' | 'without';
  run: number;
}
const calls: Call[] = topics.flatMap((topic) => (['without', 'with'] as const).flatMap((condition) => Array.from({ length: runs }, (_, run) => ({ topic, condition, run }))));
const promptFor = (call: Call): string => promptOf(call.topic, call.condition === 'with' ? scenes.get(call.topic.id)?.text : undefined);

if (values.dry) {
  // About 3.5 characters a token in Spanish and English; the call adds the CLI's own context, which the first real run measures.
  const chars = calls.reduce((sum, call) => sum + promptFor(call).length, 0);
  const tokens = Math.round(chars / 3.5);
  console.log(`${topics.length} topics, ${calls.length} calls (${runs} run(s) × 2 conditions), about ${tokens.toLocaleString('en')} prompt tokens.`);
  const estimate = (tokens * PRICE.input + calls.length * 1500 * PRICE.output) / 1_000_000;
  console.log(`Estimated cost on Haiku at list price: $${estimate.toFixed(3)} (prompts plus ~1 500 output tokens a call), before the CLI's own overhead.`);
  for (const topic of topics) {
    const scene = scenes.get(topic.id);
    console.log(`  ${topic.id}: scene ${scene?.text.length} characters, ${scene?.components} components, ${scene?.warnings.length} warnings`);
  }
  process.exit(0);
}

interface Answer {
  replies: (string | number | undefined)[];
  right: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  error?: string;
}

/** One call to the model as a bare session: no tools, no skills, no MCP servers, no settings, nothing kept. */
function ask(prompt: string, cwd: string): Promise<{ text: string; costUsd: number; inputTokens: number; outputTokens: number; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      'claude',
      ['-p', '--model', model, '--tools', '', '--disable-slash-commands', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence', '--output-format', 'json', '--system-prompt', SYSTEM],
      { cwd, stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk: Buffer) => (out += chunk));
    child.stderr.on('data', (chunk: Buffer) => (err += chunk));
    child.on('error', (error) => resolve({ text: '', costUsd: 0, inputTokens: 0, outputTokens: 0, error: error.message }));
    child.on('close', () => {
      try {
        const result = JSON.parse(out) as { result?: string; is_error?: boolean; total_cost_usd?: number; usage?: { input_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; output_tokens?: number } };
        const usage = result.usage ?? {};
        resolve({
          text: result.result ?? '',
          costUsd: result.total_cost_usd ?? 0,
          inputTokens: (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0),
          outputTokens: usage.output_tokens ?? 0,
          error: result.is_error ? (result.result ?? 'error') : undefined,
        });
      } catch {
        resolve({ text: '', costUsd: 0, inputTokens: 0, outputTokens: 0, error: `unreadable output: ${(out || err).slice(0, 300)}` });
      }
    });
    child.stdin.end(prompt);
  });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = join(repo, 'evals/results', `comprehension-${stamp}`);
mkdirSync(dir, { recursive: true });
const cwd = mkdtempSync(join(tmpdir(), 'explicador-comprension-'));
const answers = new Map<Call, Answer>();
let next = 0;
let done = 0;

async function worker(): Promise<void> {
  while (next < calls.length) {
    const call = calls[next++];
    if (!call) return;
    const reply = await ask(promptFor(call), cwd);
    const replies = parseAnswers(reply.text, QUESTIONS_PER_TOPIC);
    answers.set(call, { replies, right: score(call.topic, replies), costUsd: reply.costUsd, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, error: reply.error });
    done++;
    process.stdout.write(`\r${done}/${calls.length} calls`);
  }
}
await Promise.all(Array.from({ length: Math.max(1, Number(values.concurrency)) }, worker));
rmSync(cwd, { recursive: true, force: true });
console.log();

const mean = (numbers: number[]): number => (numbers.length === 0 ? Number.NaN : numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
const fixed = (n: number): string => (Number.isNaN(n) ? '—' : n.toFixed(1));
const rows = topics.map((topic) => {
  const of = (condition: Call['condition']): Answer[] => calls.filter((call) => call.topic === topic && call.condition === condition).flatMap((call) => answers.get(call) ?? []);
  const without = of('without');
  const withScene = of('with');
  const scene = scenes.get(topic.id);
  return {
    topic,
    components: scene?.components ?? 0,
    warnings: scene?.warnings.length ?? 0,
    without: mean(without.filter((a) => !a.error).map((a) => a.right)),
    with: mean(withScene.filter((a) => !a.error).map((a) => a.right)),
    errors: [...without, ...withScene].filter((a) => a.error).length,
  };
});
const all = [...answers.values()];
const cost = all.reduce((sum, a) => sum + a.costUsd, 0);
const lines = [
  `| Topic | Components | Rule warnings | Without the scene | With the scene | Gain |`,
  `|---|---|---|---|---|---|`,
  ...rows.map((row) => `| ${row.topic.id}${row.without >= SATURATED ? ' ⚠' : ''} | ${row.components} | ${row.warnings} | ${fixed(row.without)} / ${QUESTIONS_PER_TOPIC} | ${fixed(row.with)} / ${QUESTIONS_PER_TOPIC} | ${row.with - row.without >= 0 ? '+' : ''}${fixed(row.with - row.without)}${row.errors ? ` (${row.errors} failed call(s))` : ''} |`),
  `| **Mean** | ${fixed(mean(rows.map((row) => row.components)))} | ${fixed(mean(rows.map((row) => row.warnings)))} | ${fixed(mean(rows.map((row) => row.without)))} / ${QUESTIONS_PER_TOPIC} | ${fixed(mean(rows.map((row) => row.with)))} / ${QUESTIONS_PER_TOPIC} | ${fixed(mean(rows.map((row) => row.with - row.without)))} |`,
];
const summary = [
  `# Comprehension eval ${stamp}`,
  '',
  `Model: ${model}. ${runs} run(s) per condition; each cell is the mean of right answers out of ${QUESTIONS_PER_TOPIC}. Gain = with the scene minus without it.`,
  '',
  ...lines,
  '',
  `⚠ = the model gets ${SATURATED} or more of ${QUESTIONS_PER_TOPIC} right without the scene: the questions are answerable from general knowledge and the gain cannot tell scenes apart; rewrite them around what only this explanation says.`,
  '',
  `${all.length} calls, ${all.reduce((sum, a) => sum + a.inputTokens, 0).toLocaleString('en')} input and ${all.reduce((sum, a) => sum + a.outputTokens, 0).toLocaleString('en')} output tokens, $${cost.toFixed(3)} (as reported by the CLI).`,
  '',
].join('\n');
writeFileSync(join(dir, 'summary.md'), summary);
writeFileSync(
  join(dir, 'results.json'),
  JSON.stringify(
    calls.map((call) => ({ topic: call.topic.id, condition: call.condition, run: call.run, ...answers.get(call) })),
    null,
    2,
  ),
);
if (values.out) writeFileSync(join(repo, values.out), summary);
console.log(`\n${summary}\nWritten to ${dir}`);
const failed = all.filter((a) => a.error);
if (failed.length > 0) {
  console.error(`${failed.length} call(s) failed; the first: ${failed[0]?.error}`);
  process.exit(1);
}
