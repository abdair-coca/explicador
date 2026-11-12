// MCP tools. Results are short plain text written for the agent.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Bridge } from './bridge/index.ts';
import { hashFile, SceneCache, topicKey } from './cache/index.ts';
import { buildStandalone, ExportError } from './export/index.ts';
import { appendFinding } from './findings/index.ts';
import { isNotebookPath, readProjectFile } from './files.ts';
import { describeIndex, ensureIndex } from './index/index.ts';
import { lessonHint, needsLesson } from './lessons.ts';
import { describeNotebook } from './notebook.ts';
import type { Navigator } from './navigation.ts';
import { formatErrors, limits, parseExl, parseRefString } from './parser/index.ts';
import { resolveInside, stateDir, writeFileAtomic } from './project.ts';
import { boxesWithoutRange } from './ranges.ts';
import { slideWarnings } from './slides.ts';
import type { Ref } from './scene.ts';
import { withSnippets } from './snippets.ts';
import { buildTour, tourLimits } from './tours.ts';

export interface ToolDeps {
  root: string;
  bridge: Bridge;
  cache: SceneCache;
  navigator: Navigator;
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: 'text', text: value }],
  ...(isError ? { isError } : {}),
});

const MAX_ANSWER_LENGTH = 4000;
const MAX_ANSWER_REFS = 3;

const tourSchema = z.object({
  title: z.string().min(1).max(tourLimits.title).describe("What the tour explains, in the user's language."),
  steps: z
    .array(
      z.object({
        ref: z.string().describe(`"path:start-end": the lines this step highlights (at most ${tourLimits.lines}). Check the numbers.`),
        note: z.string().min(1).max(tourLimits.note).describe("Markdown, in the user's language: what these lines do and why, in 1-3 sentences."),
      }),
    )
    .min(1)
    .max(tourLimits.steps)
    .describe('In reading order. The window opens each file, highlights the lines and shows the note under them.'),
});

const topicSchema = z
  .string()
  .min(1)
  .max(80)
  .describe('Short, stable name of what is explained, e.g. "login" or "checkout flow". Reuse it to hit the cache.');

export const instructions = [
  'Explicador explains software systems with animated diagrams in a local browser tab.',
  'For any explanation: call show_scene first; if it is fresh, answer from it without reading code.',
  'Otherwise call ensure_index, read only the code you need, and call render_scene with an EXL document',
  '(Markdown plus scene tags such as <arch> and <flow>; the explicador skill documents the format).',
  'Notebooks and data or ML code are explained as lessons: <chapter>s with <stats>, <journey>, <trace>, <chart>, <matrix>, <calc>, <threshold> and <quiz> over their real values.',
  'export_scene writes a cached scene as one offline HTML file for sharing.',
  'When the viewer sends a question about a box, reply with answer_question so the answer shows in its panel.',
  'To walk the user through code (a file, a function, a whole flow across files, "show me the code"), call explain_code: the viewer opens a code window and highlights each part with your notes.',
  'Jupyter notebooks (.ipynb): read them with read_notebook, never as raw JSON; refs to them are cell numbers.',
  'Record non-obvious facts worth keeping with add_finding.',
].join(' ');

export function registerTools(mcp: McpServer, deps: ToolDeps): void {
  const { root, bridge, cache, navigator } = deps;

  mcp.registerTool(
    'ensure_index',
    {
      description:
        'Build or refresh the light project index (file tree + import grep) in .explicador/index/ and return it. ' +
        'Read it before opening code to find the files that matter.',
    },
    async () => text(describeIndex(ensureIndex(root))),
  );

  mcp.registerTool(
    'show_scene',
    {
      description:
        'Look up the cached scene for a topic. Fresh: shows it in the viewer and returns its EXL, so no code needs reading. ' +
        'Stale: shows it marked stale and lists the changed files to re-read. Missing: nothing cached yet.',
      inputSchema: { topic: topicSchema },
    },
    async ({ topic }) => {
      const key = safeKey(topic);
      if (!key) return text(`Topic "${topic}" needs letters or digits.`, true);
      const lookup = cache.lookup(topic);
      if (lookup.status === 'missing') {
        return text(
          `No cached scene for "${topic}" (key ${key}). Call ensure_index, read the relevant code, then call render_scene.`,
        );
      }
      const changes = lookup.status === 'stale' ? lookup.changes : [];
      const shown = navigator.show(lookup.scene, lookup.status, changes);
      if (!shown.ok) {
        // Older scenes can break newer rules (e.g. flow continuity): hand back the EXL so only those lines change.
        return text(
          [
            `The cached scene for "${topic}" no longer passes validation. Fix these lines in the EXL below and call render_scene with the same topic:`,
            shown.errors,
            '',
            lookup.scene.exl,
          ].join('\n'),
        );
      }
      const oldNotebook = needsLesson(shown.blocks, Object.keys(lookup.scene.files));
      if (lookup.status === 'fresh') {
        return text(
          [
            `Scene "${topic}" is fresh: none of its ${Object.keys(lookup.scene.files).length} referenced files changed since ${lookup.scene.savedAt}.`,
            `Shown at ${bridge.url}`,
            oldNotebook ? lessonHint : 'Answer from this EXL; do not read code or regenerate it unless the user asks for more.',
            '',
            lookup.scene.exl,
          ].join('\n'),
        );
      }
      return text(
        [
          `Scene "${topic}" is stale; the viewer shows it with a warning at ${bridge.url}`,
          'Changed files:',
          ...changes.map((c) => `- ${c.path} (${c.change})`),
          oldNotebook
            ? lessonHint
            : 'Re-read only these files (and the index if files moved), update the EXL below and call render_scene with the same topic.',
          '',
          lookup.scene.exl,
        ].join('\n'),
      );
    },
  );

  mcp.registerTool(
    'render_scene',
    {
      description:
        'Validate an EXL document, cache it under the topic with hashes of the files its refs point to, and show it in the viewer. ' +
        'On errors nothing is saved; fix them and call again.',
      inputSchema: {
        topic: topicSchema,
        exl: z
          .string()
          .min(1)
          .max(200_000)
          .describe('EXL: Markdown plus scene tags (<arch>, <flow>, <data>, <state>, and for lessons <chapter>, <stats>, <journey>, <trace>, <chart>, <matrix>, <quiz>, <calc>, <threshold>).'),
        background: z
          .boolean()
          .optional()
          .describe('Cache the scene without showing it. Use it for a scene that supports an answer_question, so the user\'s view does not jump.'),
      },
    },
    async ({ topic, exl, background }) => {
      if (!safeKey(topic)) return text(`Topic "${topic}" needs letters or digits.`, true);
      const parsed = parseExl(exl);
      if (!parsed.ok) return text(`EXL errors, nothing saved:\n${formatErrors(parsed.errors)}`, true);
      const saved = cache.save(topic, exl, parsed.refs);
      if (!saved.ok) {
        return text(
          `These refs do not exist in the project (${root}), nothing saved:\n${saved.missing.map((p) => `- ${p}`).join('\n')}\n` +
            'Use paths relative to the project root, with forward slashes.',
          true,
        );
      }
      // The scene on screen is always refreshed, so the viewer never shows an older copy of it.
      const hidden = background === true && bridge.current?.key !== saved.scene.key;
      if (!hidden) navigator.show(saved.scene, 'fresh', []);
      const blocks = parsed.scene.blocks.filter((b) => b.type !== 'markdown').map((b) => `<${b.type} id="${b.id}">`);
      const unfocused = boxesWithoutRange(root, parsed.scene.blocks);
      const slides = slideWarnings(parsed.scene.blocks);
      return text(
        [
          hidden
            ? `Cached "${topic}" (${blocks.join(', ')}) without showing it. Pass scene "${topic}" to answer_question so the panel links to it.`
            : `Rendered "${topic}" (${blocks.join(', ')}) at ${bridge.url}`,
          `Cached as .explicador/scenes/${saved.scene.key}.json, tracking ${parsed.refs.length} referenced files.`,
          bridge.viewerBuilt ? '' : 'Warning: the viewer is not built; run "npm run build" in the plugin folder.',
          unfocused.length > 0
            ? `Warning: these boxes point at a whole file, so the code window cannot focus their code: ${unfocused.slice(0, 12).join(', ')}${unfocused.length > 12 ? ', …' : ''}. ` +
              'Give each a line range (path:start-end; for a notebook, cell numbers) and render again.'
            : '',
          slides.length > 0
            ? `Warning: the presentation would suffer (see presenting.md in the explicador skill); fix these and render again:\n${slides.map((w) => `- ${w}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    },
  );

  mcp.registerTool(
    'export_scene',
    {
      description:
        'Write a cached scene as one self-contained HTML file (.explicador/exports/<topic>.html) that plays and presents ' +
        'offline, for sharing or teaching. Clicks to Claude do not work in the exported file.',
      inputSchema: { topic: topicSchema },
    },
    async ({ topic }) => {
      if (!safeKey(topic)) return text(`Topic "${topic}" needs letters or digits.`, true);
      const lookup = cache.lookup(topic);
      if (lookup.status === 'missing') return text(`No cached scene for "${topic}"; render it first.`, true);
      const parsed = parseExl(lookup.scene.exl);
      if (!parsed.ok) return text(`The cached scene for "${topic}" no longer parses; regenerate it.`, true);
      const changes = lookup.status === 'stale' ? lookup.changes : [];
      let html: string;
      try {
        html = buildStandalone(bridge.viewerPath, {
          version: 1,
          topic: lookup.scene.topic,
          key: lookup.scene.key,
          status: lookup.status,
          changes,
          savedAt: lookup.scene.savedAt,
          trail: [],
          blocks: withSnippets(root, parsed.scene.blocks),
        });
      } catch (error) {
        if (error instanceof ExportError) return text(error.message, true);
        throw error;
      }
      const path = `${stateDir(root, 'exports', `${lookup.scene.key}.html`)}`;
      writeFileAtomic(path, html);
      return text(
        [
          `Exported "${lookup.scene.topic}" to ${path} (${Math.round(html.length / 1024)} KB). Open it in any browser; it needs no server.`,
          lookup.status === 'stale' ? 'Note: the scene is stale; the export shows the warning. Refresh it first for an up-to-date copy.' : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    },
  );

  mcp.registerTool(
    'answer_question',
    {
      description:
        'Answer a question the user typed in the viewer about a box. The answer appears in that box\'s panel and is saved with the scene. ' +
        'Use the topic and question id from the "Explicador viewer: the user asks about" message.',
      inputSchema: {
        topic: topicSchema.describe('Topic of the scene the question belongs to, as given in the message.'),
        question: z.string().min(1).max(32).describe('Question id, as given in the message.'),
        answer: z
          .string()
          .min(1)
          .max(MAX_ANSWER_LENGTH)
          .describe('Markdown, in the user\'s language: answer first, in 2-6 sentences or a short list. Do not paste code; quote it with refs.'),
        refs: z
          .array(z.string())
          .max(MAX_ANSWER_REFS)
          .optional()
          .describe(`Up to ${MAX_ANSWER_REFS} "path:start-end" line ranges (at most ${limits.codeLines} lines each) that prove the answer; the server copies the lines.`),
        scene: z
          .string()
          .max(80)
          .optional()
          .describe('Topic of a deeper scene you rendered for this question (render_scene with background true); the panel links to it.'),
        tour: tourSchema
          .optional()
          .describe('A code tour when the answer is about how code runs; the panel offers it and the code window plays it. It never opens by itself.'),
      },
    },
    async ({ topic, question, answer, refs, scene, tour }) => {
      const key = safeKey(topic);
      if (!key) return text(`Topic "${topic}" needs letters or digits.`, true);
      const codes: { ref: Ref }[] = [];
      const problems: string[] = [];
      for (const value of refs ?? []) {
        const ref = parseRefString(value);
        if (typeof ref === 'string') problems.push(`- ${value}: ${ref}`);
        else if (ref.start === undefined) problems.push(`- ${value}: give a line range, e.g. "${ref.path}:10-24"`);
        else if ((ref.end ?? ref.start) - ref.start + 1 > limits.codeLines) problems.push(`- ${value}: more than ${limits.codeLines} lines`);
        else if (hashFile(resolveInside(root, ref.path) ?? '') === undefined) problems.push(`- ${value}: the file does not exist in the project`);
        else codes.push({ ref });
      }
      if (problems.length > 0) return text(`Answer not saved, fix these refs:\n${problems.join('\n')}`, true);
      const built = tour && buildTour(root, tour);
      if (built && !built.ok) return text(`Answer not saved, fix the tour:\n${built.problems.join('\n')}`, true);
      let linked: { topic: string; key: string } | undefined;
      if (scene !== undefined) {
        const sceneKey = safeKey(scene);
        const lookup = sceneKey ? cache.lookup(scene) : undefined;
        if (!lookup || lookup.status === 'missing') {
          return text(`Answer not saved: no cached scene for "${scene}". Render it first (render_scene with background true) or omit scene.`, true);
        }
        linked = { topic: lookup.scene.topic, key: lookup.scene.key };
      }
      const result = navigator.answer(key, question, {
        text: answer.trim(),
        ...(codes.length > 0 ? { codes } : {}),
        ...(linked ? { scene: linked } : {}),
        ...(built?.ok ? { tour: built.tour } : {}),
      });
      if (result === 'no-scene') return text(`No cached scene for "${topic}"; the question is gone. Answer in the chat instead.`, true);
      if (result === 'no-question') {
        return text(`The scene "${topic}" has no question "${question}" (it was re-rendered since). Answer in the chat instead.`, true);
      }
      return text(`Answer shown in the panel of the scene "${topic}". Reply in the chat with one sentence.`);
    },
  );

  mcp.registerTool(
    'explain_code',
    {
      description:
        'Walk the user through code in the viewer: it opens a VS Code-like code window, jumps to each step, highlights its lines, dims the rest ' +
        'and shows your note under them, with Previous/Next and autoplay. Use it when the user asks to explain code, a file or a function. ' +
        'The server checks that every file and line exists. Reply in the chat with a short summary; the notes carry the detail.',
      inputSchema: tourSchema.shape,
    },
    async (input) => {
      const built = buildTour(root, input);
      if (!built.ok) return text(`Tour not shown, fix these steps:\n${built.problems.join('\n')}`, true);
      bridge.publishTour(built.tour);
      return text(
        [
          `Tour "${built.tour.title}" (${built.tour.steps.length} steps) is open in the code window at ${bridge.url}`,
          'Reply in the chat with 2-4 sentences summarizing it; do not repeat the notes.',
          bridge.viewerBuilt ? '' : 'Warning: the viewer is not built; run "npm run build" in the plugin folder.',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    },
  );

  mcp.registerTool(
    'read_notebook',
    {
      description:
        'Read a Jupyter notebook (.ipynb) as numbered cells instead of raw JSON. Without cells: an outline (first 200 characters of each cell and its outputs). ' +
        'With cells "3-5": those cells whole. Refs to notebooks (scenes, tours, answers) are cell numbers: "path.ipynb:3-5".',
      inputSchema: {
        path: z.string().min(1).describe('Path of the .ipynb file, relative to the project root, forward slashes.'),
        cells: z.string().regex(/^[0-9]+(-[0-9]+)?$/).optional().describe('Cell range such as "4" or "3-5" (at most 12 cells).'),
      },
    },
    async ({ path, cells }) => {
      if (!isNotebookPath(path)) return text(`"${path}" is not a notebook (.ipynb); read it as a normal file.`, true);
      const file = readProjectFile(root, path);
      if (!file.ok || !('notebook' in file)) {
        return text(`Cannot read the notebook: ${file.ok ? 'not a notebook' : file.reason === 'invalid' ? 'not a valid nbformat 4 notebook' : file.reason}.`, true);
      }
      let range: { start: number; end: number } | undefined;
      if (cells) {
        const [a, b] = cells.split('-').map(Number);
        range = { start: a ?? 1, end: b ?? a ?? 1 };
        if (range.start < 1 || range.end < range.start || range.end - range.start >= 12) {
          return text('Ask for 1 to 12 cells at a time, e.g. "3-5".', true);
        }
      }
      return text(describeNotebook(path, file.notebook, range));
    },
  );

  mcp.registerTool(
    'add_finding',
    {
      description:
        'Append a finding worth keeping (a non-obvious behavior, risk or design fact) to FINDINGS.md at the project root.',
      inputSchema: {
        title: z.string().describe('One line.'),
        body: z.string().describe('A few sentences of Markdown.'),
        topic: z.string().optional().describe('Topic of the scene it came from.'),
        refs: z.array(z.string()).optional().describe('"path", "path:line" or "path:start-end", relative to the project root.'),
      },
    },
    async (finding) => {
      const result = appendFinding(root, finding);
      if (result.status === 'invalid') return text(`Finding not saved:\n${result.errors.join('\n')}`, true);
      if (result.status === 'duplicate') return text(`Already recorded in ${result.path}.`);
      return text(`Appended to ${result.path}.`);
    },
  );
}

function safeKey(topic: string): string | undefined {
  try {
    return topicKey(topic);
  } catch {
    return undefined;
  }
}
