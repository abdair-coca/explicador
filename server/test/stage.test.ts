import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatErrors, parseExl, type ChapterBlock } from '../src/parser/index.ts';

const journey = [
  '<journey title="From a document to an answer">',
  '<stage id="embed" label="Embed" kind="text">Each chunk becomes a vector.</stage>',
  '<stage id="search" label="Search" kind="model">The question finds its neighbours.</stage>',
  '</journey>',
].join('\n');

describe('<chapter stage>', () => {
  it('names a stage of the journey', () => {
    const parsed = parseExl(`# Q\n\n${journey}\n\n<chapter title="Embedding" stage="embed" />\n\nText.`);
    assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
    assert.equal((parsed.scene.blocks.find((block) => block.type === 'chapter') as ChapterBlock).stage, 'embed');
  });

  it('refuses a stage no journey has, and a stage without a journey', () => {
    const missing = parseExl(`${journey}\n\n<chapter title="Indexing" stage="index" />`);
    assert.ok(!missing.ok);
    assert.match(missing.errors[0]?.message ?? '', /names stage="index", which no <journey> has; the stages are embed, search/);
    const alone = parseExl('<chapter title="Indexing" stage="index" />');
    assert.ok(!alone.ok);
    assert.match(alone.errors[0]?.message ?? '', /the scene has no <journey>/);
  });
});
