// The closed catalog of themes: what each one is called, its accent color and its glyph, and which theme a scene or
// one of its chapters uses.
import type { AccentName, Block, ThemeName } from '../../../server/src/scene.ts';
import { seeded } from './motifs.ts';

export const accents: Record<AccentName, string> = {
  blue: '#2a78d6',
  green: '#1b9e6b',
  purple: '#8b5cf6',
  red: '#d9483b',
  orange: '#e8742c',
  teal: '#0e9aa7',
  pink: '#d6409f',
};

interface ThemeSpec {
  label: string;
  accent: AccentName;
  /** A 24×24 stroke icon, as path data. */
  glyph: string[];
}

export const themes: Record<ThemeName, ThemeSpec> = {
  plain: { label: 'Scene', accent: 'blue', glyph: ['M12 3l2.6 5.6L21 9.5l-4.6 4.3L17.6 20 12 16.9 6.4 20l1.2-6.2L3 9.5l6.4-.9z'] },
  data: { label: 'Data', accent: 'blue', glyph: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'] },
  ml: { label: 'Machine learning', accent: 'purple', glyph: ['M5 6h.01M5 18h.01M12 12h.01M19 6h.01M19 18h.01', 'M5 6l7 6 7-6', 'M5 18l7-6 7 6'] },
  math: { label: 'Math', accent: 'teal', glyph: ['M4 4v16h16', 'M6 17c4 0 5-10 12-10'] },
  text: { label: 'Text', accent: 'orange', glyph: ['M4 6h16', 'M4 12h10', 'M4 18h13'] },
  web: { label: 'Web', accent: 'blue', glyph: ['M3 5h18v14H3z', 'M3 9h18', 'M9 13l-2 2 2 2', 'M15 13l2 2-2 2'] },
  network: { label: 'Network', accent: 'teal', glyph: ['M12 5h.01M5 18h.01M19 18h.01', 'M12 5L5 18h14z'] },
  database: { label: 'Database', accent: 'green', glyph: ['M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'] },
  security: { label: 'Security', accent: 'red', glyph: ['M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z', 'M12 10v4'] },
  code: { label: 'Code', accent: 'purple', glyph: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M14 4l-4 16'] },
  hardware: { label: 'Hardware', accent: 'green', glyph: ['M7 7h10v10H7z', 'M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4'] },
  business: { label: 'Business', accent: 'orange', glyph: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'] },
  nature: { label: 'Nature', accent: 'green', glyph: ['M5 21c0-9 6-15 15-16-1 9-7 15-15 16z', 'M5 21l8-8'] },
  space: { label: 'Space', accent: 'purple', glyph: ['M12 12h.01', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M3 15c3-4 15-10 18-6'] },
  science: { label: 'Science', accent: 'teal', glyph: ['M9 3h6', 'M10 3v6l-5 10c-.5 1 .2 2 1.3 2h11.4c1.1 0 1.8-1 1.3-2l-5-10V3', 'M7 15h10'] },
  history: { label: 'History', accent: 'orange', glyph: ['M3 21h18', 'M4 8h16L12 3z', 'M6 8v13M10 8v13M14 8v13M18 8v13'] },
  health: { label: 'Health', accent: 'red', glyph: ['M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z', 'M7 12h3l1-2 2 4 1-2h3'] },
  food: { label: 'Food', accent: 'orange', glyph: ['M3 11h18', 'M4 11a8 8 0 0 0 16 0', 'M9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4'] },
  art: { label: 'Art', accent: 'pink', glyph: ['M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z', 'M7.5 11h.01M10 7h.01M15 7h.01'] },
  society: { label: 'Society', accent: 'blue', glyph: ['M12 3v18', 'M5 7h14', 'M5 7l-3 7h6z', 'M19 7l-3 7h6z', 'M8 21h8'] },
};

/** The accents a scene may draw at random: every one. */
const accentList = Object.keys(accents) as AccentName[];

export interface Theme {
  name: ThemeName;
  /** A CSS color. */
  accent: string;
}

/** What a scene's look is drawn from: its key and when it was saved, so a reload keeps the look and a new render may change it. */
export const lookSeed = (scene: { key: string; savedAt: string }): string => `${scene.key}:${scene.savedAt}`;

/**
 * The scene's theme: its <theme> tag, or the plain one. When the tag names two or three themes, one of them is drawn at
 * random, and without `accent` so is the color (F36): `seed` (the scene's key and when it was saved) keeps the draw
 * the same on a reload, while a new render of the scene may draw another.
 */
export function sceneTheme(blocks: readonly Block[], seed = ''): Theme {
  const block = blocks.find((item) => item.type === 'theme');
  if (block?.type !== 'theme') return { name: 'plain', accent: accents[themes.plain.accent] };
  const random = seeded(`${seed}:theme`);
  const choices = block.choices ?? [block.name];
  const name = choices[Math.floor(random() * choices.length)] ?? block.name;
  const drawn = accentList[Math.floor(random() * accentList.length)] ?? themes[name].accent;
  // A scene that names one theme keeps its own color, so a chosen look stays as it was.
  const accent = block.accent ?? (block.choices ? drawn : themes[name].accent);
  return { name, accent: accents[accent] };
}

/** The theme of the chapter that holds the block at `index`: the chapter's own when it names one, else the scene's. */
export function themeAt(blocks: readonly Block[], index: number, seed = ''): Theme {
  const scene = sceneTheme(blocks, seed);
  for (let i = Math.min(index, blocks.length - 1); i >= 0; i--) {
    const block = blocks[i];
    if (block?.type !== 'chapter') continue;
    return block.theme ? { name: block.theme, accent: accents[themes[block.theme].accent] } : scene;
  }
  return scene;
}
