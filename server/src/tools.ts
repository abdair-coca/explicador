// MCP tools. Results are short plain text written for the agent.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Bridge } from './bridge/index.ts';
import { SceneCache, topicKey } from './cache/index.ts';
import { buildStandalone, ExportError } from './export/index.ts';
import { appendFinding } from './findings/index.ts';
import { describeIndex, ensureIndex } from './index/index.ts';
import type { Navigator } from './navigation.ts';
import { formatErrors, parseExl } from './parser/index.ts';
import { stateDir, writeFileAtomic } from './project.ts';

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

const topicSchema = z
  .string()
  .min(1)
  .max(80)
  .describe('Short, stable name of what is explained, e.g. "login" or "checkout flow". Reuse it to hit the cache.');

export const instructions = [
  'Explicador explains software systems with animated diagrams in a local browser tab.',
  'For any explanation: call show_scene first; if it is fresh, answer from it without reading code.',
  'Otherwise call ensure_index, read only the code you need, and call render_scene with an EXL document',
  '(Markdown plus <arch>/<flow> tags; the explicador skill documents the format).',
  'export_scene writes a cached scene as one offline HTML file for sharing.',
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
      if (!shown.ok) return text(`The cached scene for "${topic}" no longer parses; regenerate it.\n${shown.errors}`);
      if (lookup.status === 'fresh') {
        return text(
          [
            `Scene "${topic}" is fresh: none of its ${Object.keys(lookup.scene.files).length} referenced files changed since ${lookup.scene.savedAt}.`,
            `Shown at ${bridge.url}`,
            'Answer from this EXL; do not read code or regenerate it unless the user asks for more.',
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
          'Re-read only these files (and the index if files moved), update the EXL below and call render_scene with the same topic.',
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
        exl: z.string().min(1).max(200_000).describe('EXL: Markdown plus <arch> and <flow> tags.'),
      },
    },
    async ({ topic, exl }) => {
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
      navigator.show(saved.scene, 'fresh', []);
      const blocks = parsed.scene.blocks.filter((b) => b.type !== 'markdown').map((b) => `<${b.type} id="${b.id}">`);
      return text(
        [
          `Rendered "${topic}" (${blocks.join(', ')}) at ${bridge.url}`,
          `Cached as .explicador/scenes/${saved.scene.key}.json, tracking ${parsed.refs.length} referenced files.`,
          bridge.viewerBuilt ? '' : 'Warning: the viewer is not built; run "npm run build" in the plugin folder.',
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
          blocks: parsed.scene.blocks,
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
