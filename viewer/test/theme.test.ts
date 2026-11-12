import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { themeNames, type Block } from '../../server/src/parser/types.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { motif, seeded, type Shape } from '../src/theme/motifs.ts';
import { accents, sceneTheme, themeAt, themes } from '../src/theme/themes.ts';

const box = { x: 100, y: 50, w: 400, h: 240 };

/** Every coordinate a shape names. */
function numbers(shape: Shape): number[] {
  if (shape.kind === 'path') return (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  return shape.kind === 'dot' ? [shape.x, shape.y, shape.r] : [shape.x, shape.y, shape.w, shape.h];
}

describe('motif', () => {
  it('draws something for every theme but the plain one, with finite numbers', () => {
    for (const name of themeNames) {
      const shapes = motif(name, 'login', box);
      if (name === 'plain') assert.equal(shapes.length, 0);
      else assert.ok(shapes.length >= 5, `${name} draws ${shapes.length} shapes`);
      for (const shape of shapes) for (const value of numbers(shape)) assert.ok(Number.isFinite(value), `${name}: ${JSON.stringify(shape)}`);
    }
  });

  it('gives the same scene the same drawing and another scene a different one', () => {
    for (const name of themeNames.filter((theme) => theme !== 'plain')) {
      assert.deepEqual(motif(name, 'login', box), motif(name, 'login', box));
      assert.notDeepEqual(motif(name, 'login', box), motif(name, 'checkout', box), name);
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
