// What a reader does beyond watching: open a box's details and its code, and open a scene exported to one file.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildStandalone } from '../server/src/export/index.ts';
import { examples, expect, headingsOf, payloadOf, sizes, test, viewerDir, walkPresent } from './fixtures.ts';

const login = examples.find((example) => example.name === 'login')!;

test('a box opens its details with key code copied from the file, and the code window on its lines', async ({ page, serve }) => {
  await page.setViewportSize(sizes[0].viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(await serve(login));
  // The session store of the flow: its key code is the <code> of the flow.
  await page.getByRole('group', { name: /^Flow diagram/ }).locator('[data-node-id="sessions"]').click();
  const panel = page.getByRole('complementary', { name: 'Details: Session store' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Random ids that expire in one hour')).toBeVisible();
  // The key code is the project's own lines, not text the scene wrote.
  await expect(panel.getByText(/randomBytes\(24\)/).first()).toBeVisible();
  const code = page.getByRole('region', { name: 'Code' });
  await expect(code).toBeVisible();
  await expect(code.getByRole('tab', { name: /sessions\.js/ })).toBeVisible();
  await expect(code.locator('[data-line="8"]')).toContainText('randomBytes(24)');
  await page.keyboard.press('Escape');
  await expect(code).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

for (const example of examples) {
  test(`${example.name} exported to one file opens offline, without a single request`, async ({ page, browserName }) => {
    const dir = mkdtempSync(join(tmpdir(), 'explicador-export-'));
    try {
      const file = join(dir, `${example.name}.html`);
      writeFileSync(file, buildStandalone(viewerDir, { version: 1, ...payloadOf(example) }));
      const requests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith('data:') && url !== pathToFileURL(file).href) requests.push(url);
      });
      await page.setViewportSize(sizes[0].viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(pathToFileURL(file).href);
      for (const heading of headingsOf(payloadOf(example)).slice(0, 3)) {
        await expect(page.getByText(heading, { exact: true }).first(), heading).toBeAttached();
      }
      // Presenting works offline too; a lesson is long, so its walk is left to the scene tests.
      if (example.name === 'login' || example.name === 'session-states' || browserName === 'chromium') await walkPresent(page, { fit: true });
      expect(requests, 'the file loads nothing').toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

const lesson = examples.find((example) => example.name === 'notebook-lesson')!;

test('a lesson answers its checks, moves its threshold and drills the checks in practice', async ({ page, serve }) => {
  await page.setViewportSize(sizes[0].viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(await serve(lesson));
  const quiz = payloadOf(lesson).blocks.find((block) => block.type === 'quiz' && block.options.length > 0);
  if (quiz?.type !== 'quiz') throw new Error('the lesson has a multiple-choice check');
  const wrong = quiz.options.find((option) => !option.correct)!;
  const right = quiz.options.find((option) => option.correct)!;
  const check = page.getByRole('region', { name: quiz.question });
  await check.getByRole('button', { name: wrong.text }).click();
  await expect(check.getByText('Not this one.')).toBeVisible();
  await check.getByRole('button', { name: right.text }).click();
  await expect(check.getByText('Right.', { exact: true })).toBeVisible();

  // The threshold recomputes the matrix and the metrics as the reader moves it.
  const slider = page.getByRole('slider', { name: 'Threshold' });
  await expect(slider).toHaveValue('0.5');
  const valueText = await slider.getAttribute('aria-valuetext');
  await slider.focus();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('0.6');
  expect(await slider.getAttribute('aria-valuetext')).not.toBe(valueText);
  await page.getByRole('button', { name: 'Back to 0.5' }).click();
  await expect(slider).toHaveValue('0.5');

  // Practice asks every check again, one at a time.
  await page.getByRole('button', { name: 'Practice' }).first().click();
  const practice = page.getByRole('dialog', { name: 'Practice' });
  await expect(practice).toBeVisible();
  await expect(practice.getByText(/^1 of \d+$/)).toBeVisible();
  await practice.getByRole('button', { name: 'Leave practice' }).click();
  await expect(practice).toBeHidden();
});
