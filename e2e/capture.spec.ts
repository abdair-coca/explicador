// Screenshots of chosen slides in Present, for the reports of the plan (docs/plan.md). Not a check: it does nothing
// unless EXPLICADOR_CAPTURE names a folder (relative to the repository) to write the PNGs into.
//   EXPLICADOR_CAPTURE=docs/images/f22 npm run e2e -- e2e/capture.spec.ts
// Each slide is shown with all its parts revealed (or at the part asked for), at 1440 × 900 or on a phone, with reduced
// motion, so it is the settled picture.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bench, examples, expect, repo, sizes, test, written, type Example } from './fixtures.ts';

const folder = process.env.EXPLICADOR_CAPTURE;
const everything: Example[] = [...examples, ...bench];

/** A slide counted from 0 (the cover: 1 is the counter's "2 / n"), at its last part unless `part` says, on a desktop unless `phone`. */
type Shot = number | { slide: number; part?: number; phone?: boolean };

/** The slides to capture by scene name. */
const wanted: Record<string, Shot[]> = {
  'bench-arboles-binarios': [{ slide: 1, part: 3 }, 1, 8, 9, { slide: 1, phone: true }],
  'bench-interes-compuesto': [1, 2],
  login: [1, 2],
  'search-tree': [{ slide: 1, part: 4 }, { slide: 1, part: 0 }, 1, { slide: 1, part: 0, phone: true }, { slide: 1, phone: true }, 6, { slide: 6, phone: true }],
  lease: [{ slide: 1, part: 3 }, 5, { slide: 1, part: 3, phone: true }],
  crossing: [{ slide: 2, part: 0 }, { slide: 2, part: 1 }, { slide: 2, part: 2 }, { slide: 2, part: 3 }, { slide: 2, part: 4 }, { slide: 2, part: 5 }, 2, { slide: 2, phone: true }],
  rainbow: [1, { slide: 3, part: 2 }, { slide: 3, part: 4 }, 3, { slide: 4, part: 1 }, 4, { slide: 1, phone: true }, { slide: 3, phone: true }, { slide: 4, phone: true }],
  'cache-storm': [{ slide: 4, part: 8 }, { slide: 4, part: 0 }, { slide: 4, part: 5 }, 4, { slide: 4, part: 5, phone: true }],
};

test.skip(!folder, 'set EXPLICADOR_CAPTURE to a folder to capture slides');

// The scenes a model wrote (EXPLICADOR_E2E_SCENES, F36): every slide at its last part, on a desktop and, with
// EXPLICADOR_CAPTURE_PHONE=1, on a phone, to review a round of the random-topic eval.
for (const example of written) {
  for (const phone of process.env.EXPLICADOR_CAPTURE_PHONE ? [false, true] : [false]) {
    test(`captures every slide of ${example.name}${phone ? ' on a phone' : ''}`, async ({ page, serve }) => {
      test.setTimeout(300_000);
      if (!folder) return;
      mkdirSync(join(repo, folder), { recursive: true });
      await page.setViewportSize(sizes[phone ? 1 : 0].viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(await serve(example));
      await page.getByRole('button', { name: /^(Present|Presentar)$/ }).click();
      const dialog = page.getByRole('dialog', { name: /^(Presenting|Presentando) / });
      await expect(dialog).toBeVisible();
      const next = dialog.locator('footer').getByRole('button', { name: /^(Next|Siguiente)$/ });
      const position = async (): Promise<string> => (await dialog.getAttribute('data-position')) ?? '0:0';
      const shoot = async (at: string): Promise<void> => {
        await page.waitForTimeout(400);
        const slide = Number(at.split(':')[0]) + 1;
        await dialog.screenshot({ path: join(repo, folder, `${example.name}-slide-${String(slide).padStart(2, '0')}${phone ? '-phone' : ''}.png`) });
      };
      for (let moves = 0; moves < 2000; moves += 1) {
        const at = await position();
        if (await next.isDisabled()) {
          await shoot(at);
          break;
        }
        await page.keyboard.press('ArrowRight');
        try {
          await expect(dialog).not.toHaveAttribute('data-position', at, { timeout: 1500 });
        } catch {
          continue;
        }
        const now = await position();
        if (now.split(':')[0] !== at.split(':')[0]) {
          // Moved to the next slide: go back to this one's last part and shoot it settled, then on.
          await page.keyboard.press('ArrowLeft');
          await expect(dialog).toHaveAttribute('data-position', at, { timeout: 5000 });
          await shoot(at);
          await page.keyboard.press('ArrowRight');
          await expect(dialog).toHaveAttribute('data-position', now, { timeout: 5000 });
        }
      }
    });
  }
}

for (const [name, shots] of written.length > 0 ? [] : Object.entries(wanted)) {
  const example = everything.find((item) => item.name === name);
  for (const phone of [false, true]) {
    const slides = shots.flatMap((shot) => {
      const { slide, part, phone: small } = typeof shot === 'number' ? { slide: shot, part: undefined, phone: false } : shot;
      return Boolean(small) === phone ? [{ slide, part }] : [];
    });
    if (slides.length === 0) continue;
    test(`captures ${name}${phone ? ' on a phone' : ''}`, async ({ page, serve }) => {
      test.setTimeout(240_000);
      expect(example, `no scene named ${name}`).toBeDefined();
      if (!example || !folder) return;
      mkdirSync(join(repo, folder), { recursive: true });
      await page.setViewportSize(sizes[phone ? 1 : 0].viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(await serve(example));
      await page.getByRole('button', { name: /^(Present|Presentar)$/ }).click();
      const dialog = page.getByRole('dialog', { name: /^(Presenting|Presentando) / });
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
      const partOf = async (): Promise<number> => Number(((await dialog.getAttribute('data-position')) ?? '0:0').split(':')[1]);
      for (const { slide, part } of slides) {
        // Go to the slide; to show it settled, step to the first part of the next one and one part back (this slide's last).
        while ((await slideOf()) < slide) await press('ArrowRight');
        while ((await slideOf()) > slide) await press('ArrowLeft');
        if (part !== undefined) {
          while ((await partOf()) > part) await press('ArrowLeft');
          while ((await partOf()) < part) await press('ArrowRight');
        } else {
          const last = (await dialog.locator('header [aria-live="polite"]').textContent())?.split('/')[1]?.trim();
          if (Number(last) > slide + 1) {
            await press('ArrowRight');
            while ((await slideOf()) === slide) await press('ArrowRight');
            await press('ArrowLeft');
          }
        }
        await page.waitForTimeout(400);
        const suffix = `${part !== undefined ? `-part-${part + 1}` : ''}${phone ? '-phone' : ''}`;
        await dialog.screenshot({ path: join(repo, folder, `${name.replace(/^bench-/, '')}-slide-${slide + 1}${suffix}.png`) });
      }
    });
  }
}
