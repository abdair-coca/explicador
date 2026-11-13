// The scenes of the comprehension bench (F22) in a real browser: every component drawn, no sideways scroll, no console
// error, Present walked to the end and back. The three bench topics that are examples already (login, notebook) are
// covered by scenes.spec.ts.
import { bench, expect, headingsOf, payloadOf, sizes, test, walkPresent } from './fixtures.ts';

for (const example of bench) {
  test.describe(example.name, () => {
    for (const size of sizes) {
      test(`draws every component without errors or sideways scroll (${size.name})`, async ({ page, serve }) => {
        await page.setViewportSize(size.viewport);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(await serve(example));
        for (const heading of headingsOf(payloadOf(example))) {
          await expect(page.getByText(heading, { exact: true }).first(), heading).toBeAttached();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'the page does not scroll sideways').toBeLessThanOrEqual(1);
      });
    }

    test('walks Present to the end and back with reduced motion (desktop)', async ({ page, serve }) => {
      await page.setViewportSize(sizes[0].viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(await serve(example));
      const walk = await walkPresent(page, { fit: true });
      expect(walk.forward.length).toBeGreaterThan(walk.slides - 1);
    });
  });
}
