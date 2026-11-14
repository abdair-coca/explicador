// What every browser test shares: the example scenes, a bridge that serves one of them with the built viewer, a
// record of the page's errors, and a walk through Present mode.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test as base, type Locator, type Page } from '@playwright/test';
import { Bridge } from '../server/src/bridge/index.ts';
import { formatErrors, parseExl } from '../server/src/parser/index.ts';
import type { ScenePayload } from '../server/src/scene.ts';
import { serveProject } from '../server/src/files.ts';
import { loadTopics } from '../evals/bench.ts';
import { withSnippets } from '../server/src/snippets.ts';

export const repo = fileURLToPath(new URL('..', import.meta.url));
export const viewerDir = fileURLToPath(new URL('../viewer/dist/', import.meta.url));

export interface Example {
  name: string;
  /** The project the scene was written against, under examples/ (or `root`). */
  project: string;
  /** The project's folder, relative to the repository, when it is not examples/<project> (the bench's topics). */
  root?: string;
  /** The scene's EXL; examples/scenes/<name>.exl.md when absent. */
  file?: string;
}

export const examples: Example[] = [
  { name: 'login', project: 'shop' },
  { name: 'data-model', project: 'shop' },
  { name: 'session-states', project: 'shop' },
  { name: 'notebook-lesson', project: 'notebook' },
  { name: 'rag', project: 'rag' },
  { name: 'search-tree', project: 'trees' },
  { name: 'cache-storm', project: 'cache' },
];

/**
 * The scenes of the comprehension bench (F22) that are not examples already: each one is its own project, a Markdown
 * source beside its scene, under evals/bench/<id>/.
 */
export const bench: Example[] = loadTopics()
  .filter((topic) => !topic.scene.startsWith('examples/'))
  .map((topic) => ({ name: `bench-${topic.id}`, project: topic.id, root: topic.root, file: `${repo}${topic.scene}` }));

/** The folder a scene's refs are relative to. */
export const projectOf = (example: Example): string => `${repo}${example.root ?? `examples/${example.project}`}`;

/**
 * The scenes the eval's models wrote, to play like the examples: EXPLICADOR_E2E_SCENES names a folder (npm run eval
 * keeps them in evals/results/<stamp>/runs) whose <project>.<topic>.exl.md files were written over examples/<project>.
 */
export const written: Example[] = scenesIn(process.env.EXPLICADOR_E2E_SCENES);

function scenesIn(dir: string | undefined): Example[] {
  if (!dir) return [];
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(folder, entry.name)) : [join(folder, entry.name)]));
  return walk(dir)
    .filter((file) => file.endsWith('.exl.md'))
    .sort()
    .map((file) => {
      const [, project = '', topic = ''] = /^([\w-]+)\.([\w-]+)\.exl\.md$/.exec(basename(file)) ?? [];
      if (!existsSync(`${repo}examples/${project}`)) throw new Error(`${file}: name it <project>.<topic>.exl.md, with a project under examples/`);
      // The run's folder names the scene: "sonnet-login-scene-1-login".
      return { name: `${basename(dirname(file))}-${topic}`, project, file };
    });
}

export const sizes = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone', viewport: { width: 390, height: 844 } },
] as const;

/** The scene as the server publishes it: parsed, with its key code and chapter cells read from the project. */
export function payloadOf(example: Example): Omit<ScenePayload, 'version'> {
  const parsed = parseExl(readFileSync(example.file ?? `${repo}examples/scenes/${example.name}.exl.md`, 'utf8'));
  if (!parsed.ok) throw new Error(`${example.name}: ${formatErrors(parsed.errors)}`);
  return {
    topic: example.name,
    key: example.name,
    status: 'fresh',
    changes: [],
    savedAt: '2026-11-13T12:00:00.000Z',
    trail: [],
    blocks: withSnippets(projectOf(example), parsed.scene.blocks),
  };
}

/** What a scene shows as headings: the title of each component, the term of a concept, the question of a quiz. */
export function headingsOf(payload: Omit<ScenePayload, 'version'>): string[] {
  return payload.blocks.flatMap((block) => {
    if (block.type === 'concept') return [block.term];
    if (block.type === 'quiz') return [block.question];
    if (block.type === 'markdown' || block.type === 'theme' || block.type === 'stats') return [];
    return 'title' in block && typeof block.title === 'string' ? [block.title] : [];
  });
}

interface Fixtures {
  /** Console errors and uncaught exceptions of the page; checked empty after every test. */
  errors: string[];
  /** Starts a bridge on the built viewer with the given example and returns the viewer's URL. */
  serve: (example: Example) => Promise<string>;
}

export const test = base.extend<Fixtures>({
  // Automatic: every test fails when its page logged an error, whether or not it reads the list.
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
      await use(errors);
      expect(errors, 'the page logs no error').toEqual([]);
    },
    { auto: true },
  ],
  // Playwright reads a fixture's dependencies from its first argument, which must be a destructuring pattern.
  // oxlint-disable-next-line no-empty-pattern
  serve: async ({}, use) => {
    if (!existsSync(`${viewerDir}index.html`)) throw new Error('The viewer is not built: run "npm run build" first.');
    const bridges: Bridge[] = [];
    await use(async (example) => {
      const bridge = new Bridge({ viewerDir, openUrl: () => {} });
      bridges.push(bridge);
      serveProject(bridge, projectOf(example));
      const url = await bridge.start();
      bridge.publish(payloadOf(example));
      return url;
    });
    await Promise.all(bridges.map((bridge) => bridge.close()));
  },
});

export { expect };

/** Moves one part with the key and waits until the presentation is there; a wipe in progress swallows a key. */
async function step(page: Page, dialog: Locator, key: 'ArrowRight' | 'ArrowLeft'): Promise<string> {
  const before = (await dialog.getAttribute('data-position')) ?? '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press(key);
    try {
      await expect(dialog).not.toHaveAttribute('data-position', before, { timeout: 1500 });
      return (await dialog.getAttribute('data-position')) ?? '';
    } catch {
      // Still covered by a wipe: press again.
    }
  }
  throw new Error(`Present is stuck at ${before} after ${key}`);
}

export interface Walk {
  /** Every position visited going forward, "slide:part". */
  forward: string[];
  slides: number;
}

/**
 * Opens Present and walks every part to the end, then back to the start, calling `visit` at each stop going forward.
 * With `fit`, it also checks that every slide fits the stage sideways: only meaningful once parts are in their final
 * state, as with reduced motion, since entrances may start beside the slide.
 */
export async function walkPresent(page: Page, options: { fit?: boolean; visit?: (position: string) => Promise<void> } = {}): Promise<Walk> {
  await page.getByRole('button', { name: 'Present' }).click();
  const dialog = page.getByRole('dialog', { name: /^Presenting / });
  await expect(dialog).toBeVisible();
  // The footer's buttons: a slide may hold its own "Back" (a zoomed group, a step control).
  const footer = dialog.locator('footer');
  const next = footer.getByRole('button', { name: 'Next', exact: true });
  const back = footer.getByRole('button', { name: 'Back', exact: true });
  const stage = dialog.locator('main.presenter-stage');
  const counter = dialog.locator('header [aria-live="polite"]');
  const total = Number((await counter.textContent())?.split('/')[1]?.trim());
  const check = async (position: string): Promise<void> => {
    if (options.fit) {
      const overflow = await stage.evaluate((element) => element.scrollWidth - element.clientWidth);
      expect(overflow, `slide ${position} fits the stage sideways`).toBeLessThanOrEqual(1);
    }
    await options.visit?.(position);
  };
  const forward = [(await dialog.getAttribute('data-position')) ?? ''];
  await check(forward[0] ?? '');
  for (let moves = 0; !(await next.isDisabled()); moves += 1) {
    if (moves > 2000) throw new Error('Present never reaches its end');
    const position = await step(page, dialog, 'ArrowRight');
    forward.push(position);
    await check(position);
  }
  await expect(counter).toHaveText(`${total} / ${total}`);
  for (let moves = 0; !(await back.isDisabled()); moves += 1) {
    if (moves > 2000) throw new Error('Present never gets back to its start');
    await step(page, dialog, 'ArrowLeft');
  }
  await expect(dialog).toHaveAttribute('data-position', '0:0');
  return { forward, slides: total };
}
