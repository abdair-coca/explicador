// Every example scene, on the page and in Present, at a desktop and a phone width; with EXPLICADOR_E2E_SCENES, the
// scenes the eval's models wrote instead (see fixtures.ts).
import { examples, expect, headingsOf, payloadOf, sizes, test, walkPresent, written } from './fixtures.ts';

for (const example of written.length > 0 ? written : examples) {
  test.describe(`${example.name}`, () => {
    for (const size of sizes) {
      test(`draws every component without errors or sideways scroll (${size.name})`, async ({ page, serve, errors }) => {
        await page.setViewportSize(size.viewport);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(await serve(example));
        for (const heading of headingsOf(payloadOf(example))) {
          await expect(page.getByText(heading, { exact: true }).first(), heading).toBeAttached();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'the page does not scroll sideways').toBeLessThanOrEqual(1);
        expect(errors).toEqual([]);
      });

      test(`walks Present to the end and back with reduced motion (${size.name})`, async ({ page, serve }) => {
        await page.setViewportSize(size.viewport);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(await serve(example));
        const walk = await walkPresent(page, { fit: true });
        expect(walk.forward.length).toBeGreaterThan(walk.slides - 1);
      });
    }

    test('walks Present with every animation, forward and back (desktop)', async ({ page, serve, browserName }) => {
      // WebKit lets a slide's view transition finish before the next one starts, so a long scene takes minutes.
      test.slow(browserName === 'webkit');
      await page.setViewportSize(sizes[0].viewport);
      await page.goto(await serve(example));
      await walkPresent(page);
    });

    test('lays out diagrams without boxes or labels on top of each other', async ({ page, serve }) => {
      await page.setViewportSize(sizes[0].viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(await serve(example));
      const diagrams = page.locator('svg[role="group"]:has(.scene-node)');
      const count = await diagrams.count();
      for (let i = 0; i < count; i += 1) {
        const clashes = await diagrams.nth(i).evaluate((svg) => {
          type Box = { name: string; left: number; top: number; right: number; bottom: number };
          const box = (element: Element, name: string): Box => {
            const rect = element.getBoundingClientRect();
            return { name, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
          };
          const nodes = [...svg.querySelectorAll('.scene-node')].map((node) => box(node.querySelector('rect, ellipse, circle') ?? node, node.getAttribute('data-node-id') ?? '?'));
          const labels = [...svg.querySelectorAll('.edge-label-bg')].map((label) => box(label, `label "${label.parentElement?.textContent ?? ''}"`));
          const overlap = (a: Box, b: Box): boolean => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
          const found: string[] = [];
          nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => overlap(a, b) && found.push(`${a.name} × ${b.name}`)));
          labels.forEach((label) => nodes.forEach((node) => overlap(label, node) && found.push(`${label.name} × ${node.name}`)));
          labels.forEach((a, i) => labels.slice(i + 1).forEach((b) => overlap(a, b) && found.push(`${a.name} × ${b.name}`)));
          return found;
        });
        expect(clashes, `diagram ${i + 1} of ${example.name}`).toEqual([]);
      }
    });
  });
}
