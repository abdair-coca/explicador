import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type ChapterBlock } from '../src/parser/index.ts';

const errorsOf = (source: string): string[] => {
  const result = parseExl(source);
  return result.ok ? [] : result.errors.map((e) => e.message);
};

describe('<theme>', () => {
  it('reads the scene theme, its accent and a chapter theme', () => {
    const parsed = parseExl('# Title\n\n<theme name="ml" accent="green" />\n\nIntro.\n\n<chapter title="One" />\n\n<chapter title="Two" theme="database" />\n');
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.deepEqual(parsed.scene.blocks[1], { type: 'theme', id: 'theme', name: 'ml', accent: 'green' });
    const chapters = parsed.scene.blocks.filter((block): block is ChapterBlock => block.type === 'chapter');
    assert.deepEqual(
      chapters.map((chapter) => chapter.theme),
      [undefined, 'database'],
    );
  });

  it('refuses an unknown name or accent, a second theme, a late one and a theme alone', () => {
    assert.match(errorsOf('<theme name="space" />\n<chapter title="One" />')[0] ?? '', /Unknown name "space"; use plain, data, ml/);
    assert.match(errorsOf('<theme name="ml" accent="gold" />\n<chapter title="One" />')[0] ?? '', /Unknown accent "gold"/);
    assert.match(errorsOf('<theme name="ml" />\n<theme name="data" />\n<chapter title="One" />')[0] ?? '', /Only one <theme> per scene/);
    assert.match(errorsOf('<chapter title="One" />\n<theme name="ml" />')[0] ?? '', /Put <theme> before every other tag/);
    assert.match(errorsOf('<theme name="ml" />')[0] ?? '', /A scene needs at least one scene tag/);
    assert.match(errorsOf('<chapter title="One" theme="space" />')[0] ?? '', /Unknown theme "space"/);
    assert.match(errorsOf('<theme name="ml"></theme>\n<chapter title="One" />')[0] ?? '', /must be self-closing/);
  });
});
