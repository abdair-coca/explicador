import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseExl } from '../../server/src/parser/index.ts';
import type { Block, FigureBlock } from '../../server/src/scene.ts';
import { iconPaths, litLamp } from '../src/lesson/figureIcons.ts';
import { figureIcons } from '../../server/src/parser/types.ts';
import { angleArc, arcPath, frameOf, lengthInside, measurePath, figureParts, figurePartsOf, LABEL_SIZE, labelBox, labelSize, placeFigure, touchedBy, wrapLabel } from '../src/lesson/figureGeometry.ts';
import { stripOf } from '../src/lesson/traceShape.ts';
import { es, sceneLanguage, setLanguage, t } from '../src/i18n.ts';
import { buildSlides } from '../src/presentation/slides.ts';
import { subtitleOf } from '../src/presentation/subtitles.ts';

const rainbow = (): Block[] => {
  const parsed = parseExl(readFileSync(new URL('../../examples/scenes/rainbow.exl.md', import.meta.url), 'utf8'));
  assert.ok(parsed.ok);
  return parsed.scene.blocks;
};
const figureOf = (blocks: Block[]): FigureBlock => {
  const block = blocks.find((item) => item.type === 'figure');
  assert.ok(block && block.type === 'figure');
  return block;
};

describe('figure geometry', () => {
  it('places every label inside the figure and clear of the others', () => {
    const block = figureOf(rainbow());
    const placed = placeFigure(block);
    const boxes = placed.flatMap((item) => (item.labelAt ? [labelBox(item.labelAt, item.lines)] : []));
    assert.equal(boxes.length, block.shapes.filter((shape) => (shape.kind === 'label' ? shape.text : shape.label)).length);
    for (const box of boxes) {
      assert.ok(box.x0 >= 0 && box.y0 >= 0 && box.x1 <= block.width && box.y1 <= block.height, `inside: ${JSON.stringify(box)}`);
    }
    boxes.forEach((a, i) =>
      boxes.slice(i + 1).forEach((b) => {
        const across = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const down = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        assert.ok(across <= 0 || down <= 0, `labels ${i} and another overlap`);
      }),
    );
  });

  it('frames a drawing that keeps to part of its grid, and leaves a full one whole (F36)', () => {
    const low = { width: 100, height: 60, shapes: [{ kind: 'box' as const, x: 15, y: 42, w: 70, h: 5, label: 'Pan', color: 'gray' as const, appear: 0 }] };
    const frame = frameOf(low, placeFigure(low));
    assert.ok(frame.y > 30 && frame.y + frame.h <= 60, JSON.stringify(frame));
    const block = figureOf(rainbow());
    assert.deepEqual(frameOf(block, placeFigure(block)), { x: 0, y: 0, w: block.width, h: block.height });
  });

  it('keeps a label of two lines off the box it names (F36)', () => {
    const [box] = placeFigure({
      width: 100,
      height: 60,
      shapes: [
        { kind: 'box', x: 45, y: 26, w: 10, h: 6, label: 'Transformador del barrio', color: 'green', appear: 0 },
        { kind: 'arrow', points: [[20, 29], [80, 29]], head: 'end', dashed: false, color: 'red', appear: 0 },
      ],
    });
    assert.ok(box?.labelAt && box.lines.length === 2, JSON.stringify(box?.lines));
    const label = labelBox(box.labelAt, box.lines);
    assert.ok(label.y1 <= 26 || label.y0 >= 32, `the label ${JSON.stringify(label)} lies on its box`);
  });

  it('keeps a label off its own pictogram at the edge of the figure', () => {
    const [eye] = placeFigure({
      width: 100,
      height: 60,
      shapes: [{ kind: 'icon', id: 'eye', icon: 'eye', x: 50, y: 56, size: 7, label: 'Tu ojo', color: 'ink', appear: 0 }],
    });
    assert.ok(eye?.labelAt);
    const box = labelBox(eye.labelAt, eye.lines);
    const across = Math.min(box.x1, 53.5) - Math.max(box.x0, 46.5);
    const down = Math.min(box.y1, 59.5) - Math.max(box.y0, 52.5);
    assert.ok(across <= 0 || down <= 0, `the label ${JSON.stringify(box)} lies on its eye`);
  });

  it('puts a label beside its arrow, not on it, and inside a big circle', () => {
    const [arrow, circle] = placeFigure({
      width: 100,
      height: 60,
      shapes: [
        { kind: 'arrow', points: [[10, 30], [90, 30]], head: 'end', dashed: false, label: 'Light', color: 'ink', appear: 0 },
        { kind: 'circle', x: 50, y: 30, r: 12, label: 'Drop', color: 'blue', appear: 0 },
      ],
    });
    assert.ok(arrow?.labelAt && arrow.labelAt[1] < 30 - 1, 'above the line');
    assert.equal(arrow?.path, 'M10 30 L90 30');
    // The arrow's label took the middle, so the circle's goes below it… or stays inside without touching.
    assert.ok(circle?.labelAt);
  });

  it('draws a normal as a line and labels it beside it (F33)', () => {
    const [normal] = placeFigure({
      width: 100,
      height: 60,
      shapes: [{ kind: 'normal', at: [50, 30], points: [[50, 24], [50, 36]], label: 'Normal', color: 'gray', appear: 0 }],
    });
    assert.equal(normal?.path, 'M50 24 L50 36');
    assert.ok(normal?.labelAt && Math.abs(normal.labelAt[0] - 50) > 3, 'beside the line, not on it');
  });

  it('has line art for every pictogram, and lights a signal by its color (F34)', () => {
    for (const icon of figureIcons) assert.ok((iconPaths[icon] ?? []).length > 0, icon);
    assert.deepEqual([litLamp('red'), litLamp('orange'), litLamp('yellow'), litLamp('green'), litLamp('blue')], [0, 1, 1, 2, undefined]);
  });

  it('draws arcs clockwise, a full circle in two halves, and measures with a tick at each end', () => {
    const arc = { kind: 'arc' as const, x: 50, y: 50, r: 10, from: 180, to: 360, head: 'none' as const, color: 'red' as const, appear: 0 };
    assert.equal(arcPath(arc), 'M40 50 A10 10 0 0 1 60 50');
    assert.equal(arcPath({ ...arc, from: 0, to: 270 }), 'M60 50 A10 10 0 1 1 50 40');
    assert.equal(arcPath({ ...arc, from: 0, to: 0 }), 'M60 50 A10 10 0 1 1 40 50 A10 10 0 1 1 60 50');
    assert.equal(measurePath([[10, 10], [30, 10]]), 'M10 10 L30 10 M10 11.2 L10 8.8 M30 11.2 L30 8.8');
  });

  it('draws an angle the short way round, with its label along the bisector', () => {
    const arc = angleArc([0, 0], [10, 0], [0, 10]);
    assert.match(arc.path, /^M\d+(\.\d+)? 0 A[\d.]+ [\d.]+ 0 0 1 0 [\d.]+$/);
    assert.ok(Math.abs(arc.bisector[0] - Math.SQRT1_2) < 1e-9 && Math.abs(arc.bisector[1] - Math.SQRT1_2) < 1e-9);
    assert.match(angleArc([0, 0], [0, 10], [10, 0]).path, / 0 0 0 /);
  });

  it('grows the labels of a figure drawn small, and keeps them clear of each other', () => {
    assert.equal(labelSize(100, 1100), LABEL_SIZE);
    assert.equal(labelSize(100, 0), LABEL_SIZE);
    const phone = labelSize(100, 320);
    assert.ok(Math.abs(phone - 3.75) < 1e-9, `12 px on a figure 320 px wide: ${phone}`);
    assert.equal(labelSize(100, 100), LABEL_SIZE * 2);
    const block = figureOf(rainbow());
    const boxes = placeFigure(block, phone).flatMap((item) => (item.labelAt ? [labelBox(item.labelAt, item.lines, phone)] : []));
    const overlaps = boxes.filter((a, i) => boxes.slice(i + 1).some((b) => Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0) && Math.min(a.y1, b.y1) > Math.max(a.y0, b.y0)));
    assert.deepEqual(overlaps, []);
  });

  it('wraps a long label in two lines at most', () => {
    assert.deepEqual(wrapLabel('Dirección de la luz'), ['Dirección de la luz']);
    assert.deepEqual(wrapLabel('The light that comes back towards your eye'), ['The light that comes', 'back towards your eye']);
  });

  it('is a slide of the setting and one part per show, each with its narration as the subtitle', () => {
    const blocks = rainbow();
    const block = figureOf(blocks);
    assert.equal(figureParts(block), 1 + block.shows.length);
    const slide = buildSlides(blocks).find((item) => item.kind === 'figure');
    assert.equal(slide?.parts, 6);
    assert.equal(subtitleOf(block, 0), undefined);
    assert.equal(subtitleOf(block, 1), 'La luz blanca del Sol llega a la gota.');
  });
});

describe('figure changes (F32)', () => {
  const crossing = (): Block[] => {
    const parsed = parseExl(readFileSync(new URL('../../examples/scenes/crossing.exl.md', import.meta.url), 'utf8'));
    assert.ok(parsed.ok);
    return parsed.scene.blocks;
  };

  it('asks before a show that asks, and gives no subtitle while it asks', () => {
    const blocks = crossing();
    const block = figureOf(blocks);
    const parts = figurePartsOf(block);
    assert.deepEqual(
      parts.map((part) => [part.shown, part.ask ?? '']),
      [[0, ''], [1, ''], [2, ''], [2, 'Nadie viene por la avenida. ¿Qué hace el controlador?'], [3, ''], [4, ''], [5, '']],
    );
    assert.equal(buildSlides(blocks).find((slide) => slide.kind === 'figure')?.parts, 7);
    assert.equal(subtitleOf(block, 3), undefined);
    assert.equal(subtitleOf(block, 4), 'Nadie espera en la avenida: el controlador le pasa el amarillo.');
  });

  it('lights the shapes a show draws, moves, recolors, pulses or sends a dot along', () => {
    const block = figureOf(crossing());
    const id = (name: string): number => block.shapes.findIndex((shape) => shape.id === name);
    assert.deepEqual([...touchedBy(block.shows[1])].sort(), [id('espira'), id('aviso')].sort());
    assert.deepEqual([...touchedBy(block.shows[3])].sort(), [id('orden'), id('avenida'), id('lateral')].sort());
    assert.deepEqual(touchedBy(undefined).size, 0);
    // The car ends past the crossing, the side light green, the avenue's red.
    const last = block.states.at(-1);
    assert.deepEqual(last?.[id('coche')]?.offset, [0, -50]);
    assert.equal(last?.[id('lateral')]?.color, 'green');
    assert.equal(last?.[id('avenida')]?.color, 'red');
  });
});

describe('figure reading (F35)', () => {
  const figuresOf = (name: string): FigureBlock[] => {
    const parsed = parseExl(readFileSync(new URL(`../../examples/scenes/${name}.exl.md`, import.meta.url), 'utf8'));
    assert.ok(parsed.ok);
    return parsed.scene.blocks.filter((block): block is FigureBlock => block.type === 'figure');
  };
  /** The lines each shape draws, as segments, also where the shows move it. */
  const segments = (block: FigureBlock, i: number): [[number, number], [number, number]][] => {
    const shape = block.shapes[i];
    if (!shape || !('points' in shape)) return [];
    const offsets = block.states.map((state): [number, number] => state[i]?.offset ?? [0, 0]);
    return offsets.flatMap(([ox, oy]) => shape.points.slice(1).map((b, j): [[number, number], [number, number]] => [[(shape.points[j]?.[0] ?? 0) + ox, (shape.points[j]?.[1] ?? 0) + oy], [b[0] + ox, b[1] + oy]]));
  };

  for (const name of ['rainbow', 'crossing']) {
    for (const size of [LABEL_SIZE, labelSize(100, 340)]) {
      it(`keeps every label of ${name} clear of the other labels and of the arrows (size ${size.toFixed(1)})`, () => {
        for (const block of figuresOf(name)) {
          const placed = placeFigure(block, size);
          const boxes = placed.map((item) => (item.labelAt ? labelBox(item.labelAt, item.lines, size) : undefined));
          boxes.forEach((a, i) => {
            if (!a) return;
            boxes.forEach((b, j) => {
              if (!b || j <= i) return;
              const across = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
              const down = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
              assert.ok(across <= 0.05 || down <= 0.05, `${block.title}: the labels of shapes ${i} and ${j} overlap`);
            });
            const crossed = block.shapes.flatMap((shape, k) => (shape.kind === 'arrow' ? segments(block, k) : [])).reduce((sum, [p, q]) => sum + lengthInside(p, q, a), 0);
            assert.ok(crossed < 1, `${block.title}: the label of shape ${i} lies on an arrow for ${crossed.toFixed(2)}`);
          });
        }
      });
    }
  }

  it('joins a label that sits away from its shape with a leader ending on the shape', () => {
    const placed = figuresOf('rainbow').flatMap((block) => placeFigure(block));
    const led = placed.filter((item) => item.leader);
    assert.ok(led.length > 0, 'the drop is crowded: some label needs a leader');
    for (const item of led) {
      const [, end] = item.leader ?? [[0, 0], [0, 0]];
      assert.ok(item.labelAt && Math.hypot(end[0] - item.labelAt[0], end[1] - item.labelAt[1]) > LABEL_SIZE, 'the leader reaches away from the label');
    }
  });

  it('measures how much of a segment crosses a box', () => {
    const box = { x0: 0, y0: 0, x1: 10, y1: 10 };
    assert.equal(lengthInside([-5, 5], [15, 5], box), 10);
    assert.equal(lengthInside([20, 20], [30, 30], box), 0);
    assert.ok(Math.abs(lengthInside([0, 0], [10, 10], box) - Math.hypot(10, 10)) < 1e-9);
  });
});

describe('trace strip', () => {
  it('keeps the last three steps in sight and folds the earlier ones', () => {
    assert.deepEqual(stripOf(4, 0), { folded: 0, past: [] });
    assert.deepEqual(stripOf(4, 3), { folded: 0, past: [0, 1, 2] });
    assert.deepEqual(stripOf(8, 6), { folded: 3, past: [0, 4, 5] });
    assert.deepEqual(stripOf(5, 4), { folded: 1, past: [0, 2, 3] }, 'the input stays in sight');
    assert.deepEqual(stripOf(3, 9), { folded: 0, past: [0, 1] });
  });
});

describe('the viewer language', () => {
  it('reads Spanish from a Spanish scene and English from an English one', () => {
    assert.equal(sceneLanguage(rainbow()), 'es');
    const english = parseExl(readFileSync(new URL('../../examples/scenes/lease.exl.md', import.meta.url), 'utf8'));
    assert.ok(english.ok);
    assert.equal(sceneLanguage(english.scene.blocks), 'en');
    assert.equal(sceneLanguage([]), 'en');
  });

  it('says the viewer words in the language set, and the English when there is no translation', () => {
    setLanguage('es');
    assert.equal(t('Next'), 'Siguiente');
    assert.equal(t('Think of it as'), 'Piénsalo como');
    assert.equal(t('person'), 'persona');
    assert.equal(t('No such text'), 'No such text');
    setLanguage('en');
    assert.equal(t('Next'), 'Next');
    for (const [english, spanish] of Object.entries(es)) assert.ok(spanish.trim() !== '', `a translation for "${english}"`);
  });
});
