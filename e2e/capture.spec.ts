// Screenshots of chosen slides in Present, for the reports of the plan (docs/plan.md). Not a check: it does nothing
// unless EXPLICADOR_CAPTURE names a folder (relative to the repository) to write the PNGs into.
//   EXPLICADOR_CAPTURE=docs/images/f22 npm run e2e -- e2e/capture.spec.ts
// Each slide is shown with all its parts revealed, at 1440 × 900 and with reduced motion, so it is the settled picture.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bench, examples, expect, repo, sizes, test, type Example } from './fixtures.ts';

const folder = process.env.EXPLICADOR_CAPTURE;
const everything: Example[] = [...examples, ...bench];

/** The slides to capture by scene name, counted from 0 (the cover): 1 is the counter's "2 / n". */
const wanted: Record<string, number[]> = {
  'bench-arboles-binarios': [1, 5],
  'bench-interes-compuesto': [1, 2],
  login: [1, 2],
};

test.skip(!folder, 'set EXPLICADOR_CAPTURE to a folder to capture slides');

for (const [name, slides] of Object.entries(wanted)) {
  const example = everything.find((item) => item.name === name);
  test(`captures ${name}`, async ({ page, serve }) => {
    test.setTimeout(240_000);
    expect(example, `no scene named ${name}`).toBeDefined();
    if (!example || !folder) return;
    mkdirSync(join(repo, folder), { recursive: true });
    await page.setViewportSize(sizes[0].viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(await serve(example));
    await page.getByRole('button', { name: 'Present' }).click();
    const dialog = page.getByRole('dialog', { name: /^Presenting / });
    await expect(dialog).toBeVisible();
    const slideOf = async (): Promise<number> => Number(((await dialog.getAttribute('data-position')) ?? '0').split(':')[0]);
    const press = async (key: 'ArrowRight' | 'ArrowLeft'): Promise<void> => {
      const before = await dialog.getAttribute('data-position');
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await page.keyboard.press(key);
        try {
          await expect(dialog).not.toHaveAttribute('data-position', before ?? '', { timeout: 1500 });
          return;
        } catch {
          // Still covered by a wipe: press again.
        }
      }
      throw new Error(`stuck at ${before}`);
    };
    for (const slide of slides) {
      // Go to the slide; to show it settled, step to the first part of the next one and one part back (this slide's last).
      while ((await slideOf()) < slide) await press('ArrowRight');
      while ((await slideOf()) > slide) await press('ArrowLeft');
      const last = (await dialog.locator('header [aria-live="polite"]').textContent())?.split('/')[1]?.trim();
      if (Number(last) > slide + 1) {
        await press('ArrowRight');
        while ((await slideOf()) === slide) await press('ArrowRight');
        await press('ArrowLeft');
      }
      await page.waitForTimeout(400);
      await dialog.screenshot({ path: join(repo, folder, `${name.replace(/^bench-/, '')}-slide-${slide + 1}.png`) });
    }
  });
}
