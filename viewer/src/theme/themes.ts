// The closed catalog of themes: what each one is called, its accent color and its glyph, and which theme a scene or
// one of its chapters uses.
import type { AccentName, Block, ThemeName } from '../../../server/src/scene.ts';

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
};

export interface Theme {
  name: ThemeName;
  /** A CSS color. */
  accent: string;
}

/** The scene's theme: its <theme> tag, or the plain one. */
export function sceneTheme(blocks: readonly Block[]): Theme {
  const block = blocks.find((item) => item.type === 'theme');
  const name = block?.type === 'theme' ? block.name : 'plain';
  const accent = block?.type === 'theme' && block.accent ? block.accent : themes[name].accent;
  return { name, accent: accents[accent] };
}

/** The theme of the chapter that holds the block at `index`: the chapter's own when it names one, else the scene's. */
export function themeAt(blocks: readonly Block[], index: number): Theme {
  const scene = sceneTheme(blocks);
  for (let i = Math.min(index, blocks.length - 1); i >= 0; i--) {
    const block = blocks[i];
    if (block?.type !== 'chapter') continue;
    return block.theme ? { name: block.theme, accent: accents[themes[block.theme].accent] } : scene;
  }
  return scene;
}
