import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { themeNames, type Block } from '../../server/src/parser/types.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { compose } from '../src/theme/compose.ts';
import { CANVAS, motif, seeded, VARIANTS, type Shape } from '../src/theme/motifs.ts';
import { accents, sceneTheme, themeAt, themes } from '../src/theme/themes.ts';

const drawn = themeNames.filter((name) => name !== 'plain');

/** The box a shape covers, from every coordinate it names. */
function extent(shape: Shape): { xs: number[]; ys: number[] } {
  if (shape.kind === 'dot') return { xs: [shape.x - shape.r, shape.x + shape.r], ys: [shape.y - shape.r, shape.y + shape.r] };
  if (shape.kind === 'box') return { xs: [shape.x, shape.x + shape.w], ys: [shape.y, shape.y + shape.h] };
  // Path commands here are M, L, Q, Z (pairs of x y) and A (rx ry rotation large sweep x y): drop each arc's first five numbers.
  const points = shape.d.replace(/A(\s*-?[\d.]+){5}/g, ' ').match(/-?\d+(\.\d+)?/g) ?? [];
  return { xs: points.filter((_, i) => i % 2 === 0).map(Number), ys: points.filter((_, i) => i % 2 === 1).map(Number) };
}

describe('motif', () => {
  it('has three drawings for every theme but the plain one', () => {
    assert.equal(motif('plain', 'login', 0).length, 0);
    for (const name of drawn) {
      const drawings = Array.from({ length: VARIANTS }, (_, variant) => motif(name, 'login', variant));
      for (const shapes of drawings) assert.ok(shapes.length >= 4, `${name} draws ${shapes.length} shapes`);
      assert.equal(new Set(drawings.map((shapes) => JSON.stringify(shapes))).size, VARIANTS, `${name} has ${VARIANTS} different drawings`);
      assert.deepEqual(motif(name, 'login', VARIANTS), motif(name, 'login', 0));
    }
  });

  it('keeps every drawing inside the canvas, whatever the seed', () => {
    for (const name of drawn) {
      for (let variant = 0; variant < VARIANTS; variant++) {
        for (const seed of ['login', 'checkout', 'reviews:3:lg', 'x', '']) {
          for (const shape of motif(name, seed, variant)) {
            const { xs, ys } = extent(shape);
            const where = `${name} #${variant} "${seed}": ${JSON.stringify(shape)}`;
            for (const x of xs) assert.ok(Number.isFinite(x) && x >= 0 && x <= CANVAS.width, where);
            for (const y of ys) assert.ok(Number.isFinite(y) && y >= 0 && y <= CANVAS.height, where);
          }
        }
      }
    }
  });

  it('uses two tones and flat fills in every drawing', () => {
    for (const name of drawn) {
      for (let variant = 0; variant < VARIANTS; variant++) {
        const shapes = motif(name, 'login', variant);
        assert.ok(shapes.some((shape) => shape.tone === 'b'), `${name} #${variant} has a second tone`);
        assert.ok(shapes.some((shape) => shape.fill !== undefined), `${name} #${variant} has a fill`);
        assert.ok(shapes.some((shape) => shape.tone === undefined), `${name} #${variant} keeps the accent`);
      }
    }
  });

  it('gives the same seed the same drawing and another seed a different one', () => {
    for (const name of drawn) {
      for (let variant = 0; variant < VARIANTS; variant++) {
        assert.deepEqual(motif(name, 'login', variant), motif(name, 'login', variant));
        const others = ['a', 'b', 'c', 'd', 'e', 'f'].map((seed) => JSON.stringify(motif(name, seed, variant)));
        assert.ok(new Set(others).size > 1, `${name} #${variant} varies with the seed`);
      }
    }
  });

  it('seeds a repeatable sequence between 0 and 1', () => {
    const a = seeded('x');
    const b = seeded('x');
    const values = Array.from({ length: 50 }, () => a());
    assert.deepEqual(values, Array.from({ length: 50 }, () => b()));
    assert.ok(values.every((value) => value >= 0 && value < 1));
    assert.ok(new Set(values).size > 45);
  });
});

describe('compose', () => {
  it('gives every slide a large and a small drawing in different corners, the large one never top left', () => {
    for (let slide = 0; slide < 30; slide++) {
      const [large, small] = compose('lesson', slide);
      assert.deepEqual([large?.size, small?.size], ['lg', 'sm']);
      assert.notEqual(large?.corner, small?.corner);
      assert.notEqual(large?.corner, 'tl');
      assert.notEqual(large?.variant, small?.variant);
    }
  });

  it('never repeats a composition on the next slide', () => {
    for (const seed of ['lesson', 'login', 'x']) {
      for (let slide = 0; slide < 40; slide++) {
        const here = compose(seed, slide);
        const next = compose(seed, slide + 1);
        assert.notEqual(`${here[0]?.corner}${here[1]?.corner}`, `${next[0]?.corner}${next[1]?.corner}`, `${seed} ${slide}`);
        assert.notEqual(here[0]?.variant, next[0]?.variant, `${seed} ${slide}`);
        assert.notEqual(here[0]?.seed, next[0]?.seed);
      }
    }
  });

  it('is repeatable, differs between scenes, and keeps a chapter card\'s large drawing on the right', () => {
    assert.deepEqual(compose('lesson', 7), compose('lesson', 7));
    const order = (seed: string): string => Array.from({ length: 6 }, (_, slide) => compose(seed, slide)[0]?.corner).join(' ');
    assert.ok(new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(order)).size > 1);
    for (let slide = 0; slide < 12; slide++) assert.ok(['tr', 'br'].includes(compose('lesson', slide, true)[0]?.corner ?? ''));
  });
});

describe('themes', () => {
  const blocks: Block[] = [
    { type: 'markdown', text: '# Title' },
    { type: 'theme', id: 'theme', name: 'ml', accent: 'green' },
    { type: 'markdown', text: 'Intro' },
    { type: 'chapter', id: 'a', title: 'A' },
    { type: 'markdown', text: 'In A' },
    { type: 'chapter', id: 'b', title: 'B', theme: 'database' },
    { type: 'markdown', text: 'In B' },
  ];

  it('has a label, an accent and a glyph for every theme', () => {
    for (const name of themeNames) assert.ok(themes[name].label && accents[themes[name].accent] && themes[name].glyph.length > 0, name);
  });

  it('takes the scene theme from <theme>, with its accent override, and plain without one', () => {
    assert.deepEqual(sceneTheme(blocks), { name: 'ml', accent: accents.green });
    assert.deepEqual(sceneTheme([{ type: 'markdown', text: 'x' }]), { name: 'plain', accent: accents.blue });
  });

  it('draws one of the themes named, and an accent, at random per presentation, the same on a reload', () => {
    const named: Block[] = [{ type: 'theme', id: 'theme', name: 'space', choices: ['space', 'science', 'nature'] }];
    const seeds = Array.from({ length: 40 }, (_, i) => `scene:2026-11-14T10:00:${String(i).padStart(2, '0')}Z`);
    const drawn = seeds.map((seed) => sceneTheme(named, seed));
    assert.deepEqual(new Set(drawn.map((theme) => theme.name)), new Set(['space', 'science', 'nature']));
    assert.ok(new Set(drawn.map((theme) => theme.accent)).size >= 4, 'the accent changes too');
    assert.deepEqual(sceneTheme(named, seeds[0]), drawn[0]);
    const pinned: Block[] = [{ type: 'theme', id: 'theme', name: 'space', choices: ['space', 'art'], accent: 'teal' }];
    assert.ok(seeds.every((seed) => sceneTheme(pinned, seed).accent === accents.teal), 'an accent written stays');
    assert.ok(seeds.every((seed) => sceneTheme([{ type: 'theme', id: 'theme', name: 'art' }], seed).accent === accents[themes.art.accent]), 'one theme keeps its color');
  });

  it('lets a chapter take its own theme and gives the others the scene theme', () => {
    assert.equal(themeAt(blocks, 2).name, 'ml');
    assert.equal(themeAt(blocks, 4).name, 'ml');
    assert.deepEqual(themeAt(blocks, 5), { name: 'database', accent: accents.green });
    assert.equal(themeAt(blocks, 6).name, 'database');
  });

  it('makes no slide for the theme', () => {
    assert.deepEqual(
      buildSlides(blocks).map((slide) => slide.block),
      [0, 2, 3, 4, 5, 6],
    );
  });
});
