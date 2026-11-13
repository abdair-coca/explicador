// What the model reads about EXL must match what the parser accepts: the reference in docs/EXL.md, the skill,
// its presenting guide and the tool descriptions are checked against the parser's catalog.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { catalog, formatErrors, parseExl, topLevelTags } from '../src/parser/index.ts';
import { instructions, sceneTags } from '../src/tools.ts';

const read = (path: string): string => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const reference = read('docs/EXL.md');
const skill = read('skills/explicador/SKILL.md');
const guide = read('skills/explicador/presenting.md');

const tags = Object.keys(catalog);
/** Top-level tags whose `id` is optional: documented once for every block, not tag by tag. */
const blockId = (tag: string, attr: string): boolean => attr === 'id' && topLevelTags.includes(tag) && catalog[tag]?.attrs.id === 'optional';
const components = topLevelTags.filter((tag) => tag !== 'chapter' && tag !== 'theme');
const mentions = (text: string, tag: string): boolean => new RegExp(`<${tag}(?=[\\s>/])`).test(text);

interface Row {
  attrs: Set<string>;
  required: Set<string>;
  content: string;
}

/** The table of docs/EXL.md "## Tags": one row per tag (or several tags sharing a row). */
function referenceRows(): Map<string, Row> {
  const rows = new Map<string, Row>();
  const section = reference.slice(reference.indexOf('## Tags'), reference.indexOf('## Lessons'));
  for (const line of section.split('\n')) {
    const cells = line.split(' | ');
    if (!line.startsWith('| `<') || cells.length !== 3) continue;
    const [names = '', attrCell = '', content = ''] = cells;
    const marker = attrCell.indexOf('(required)');
    const attrs = new Set<string>();
    const required = new Set<string>();
    for (const match of attrCell.matchAll(/`([a-z]+)`/g)) {
      attrs.add(match[1] ?? '');
      if (marker >= 0 && (match.index ?? 0) < marker) required.add(match[1] ?? '');
    }
    for (const match of names.matchAll(/`<([a-z]+)>`/g)) rows.set(match[1] ?? '', { attrs, required, content });
  }
  return rows;
}

/** The fenced ```exl blocks of a Markdown file. */
const exlBlocks = (text: string): string[] => [...text.matchAll(/^```exl\n([\s\S]*?)^```/gm)].map((match) => match[1] ?? '');

describe('the EXL reference (docs/EXL.md)', () => {
  const rows = referenceRows();

  it('has a row for every tag, with exactly its attributes and the required ones marked', () => {
    for (const tag of tags) {
      const row = rows.get(tag);
      assert.ok(row, `docs/EXL.md has no row for <${tag}>`);
      const spec = catalog[tag]?.attrs ?? {};
      assert.deepEqual([...row.attrs].sort(), Object.keys(spec).sort(), `attributes of <${tag}>`);
      const required = Object.entries(spec).filter(([, need]) => need === 'required').map(([name]) => name);
      assert.deepEqual([...row.required].sort(), required.sort(), `required attributes of <${tag}>`);
    }
    for (const tag of rows.keys()) assert.ok(tag in catalog, `docs/EXL.md documents <${tag}>, which the parser does not know`);
  });

  it('names every child a tag accepts', () => {
    for (const tag of tags) {
      for (const child of catalog[tag]?.children ?? []) {
        assert.ok(rows.get(tag)?.content.includes(`<${child}>`), `the row of <${tag}> does not name <${child}>`);
      }
    }
  });

  it('lists every top-level tag', () => {
    const line = reference.split('\n').find((text) => text.startsWith('- Top-level tags:')) ?? '';
    for (const tag of topLevelTags) assert.ok(line.includes(`\`<${tag}>\``), `"Top-level tags" does not list <${tag}>`);
  });
});

describe('the skill (SKILL.md)', () => {
  const lines = skill.split('\n');

  it('names every tag', () => {
    for (const tag of tags) assert.ok(mentions(skill, tag), `SKILL.md never names <${tag}>`);
  });

  it('names every attribute next to its tag', () => {
    for (const tag of tags) {
      for (const attr of Object.keys(catalog[tag]?.attrs ?? {})) {
        if (blockId(tag, attr)) continue;
        const near = lines.some((line) => {
          if (!mentions(line, tag)) return false;
          // Inside the tag's own signature (`<tag a b? c="…">`) or as `attr` on a line about the tag.
          const signatures = [...line.matchAll(new RegExp(`<${tag}(\\s[^<>]*)?>`, 'g'))].map((match) => match[1] ?? '');
          const inSignature = signatures.some((signature) => new RegExp(`(^|\\s)${attr}(?=[=?\\s/]|$)`).test(signature));
          return inSignature || line.includes(`\`${attr}\``);
        });
        assert.ok(near, `SKILL.md does not name "${attr}" of <${tag}> on a line about it`);
      }
    }
  });

  it('says once that every block takes an optional id', () => {
    for (const tag of topLevelTags) assert.equal(catalog[tag]?.attrs.id, tag === 'theme' ? undefined : 'optional', `<${tag}> id`);
    assert.match(skill, /Every top-level tag except `<theme>` takes an optional `id`/);
    assert.match(reference, /Every top-level tag except `<theme>` takes an optional `id`/);
  });
});

describe('the presenting guide (presenting.md)', () => {
  it('has every component in its table "Which component for which question"', () => {
    const start = guide.indexOf('## Which component for which question');
    const table = guide.slice(start, guide.indexOf('\n## ', start + 1));
    for (const tag of components) assert.ok(mentions(table, tag), `presenting.md's table has no <${tag}>`);
  });
});

describe('the EXL examples of the docs', () => {
  it('all parse', () => {
    const examples = [...exlBlocks(skill), ...exlBlocks(guide), ...exlBlocks(reference)];
    assert.ok(examples.length >= 3, 'the skill, its guide and the reference hold EXL examples');
    for (const example of examples) {
      const parsed = parseExl(example);
      assert.ok(parsed.ok, parsed.ok ? '' : `${formatErrors(parsed.errors)}\n---\n${example.slice(0, 200)}`);
    }
  });
});

describe('the tool descriptions', () => {
  it('name every top-level tag', () => {
    for (const tag of topLevelTags) {
      assert.ok(sceneTags.includes(`<${tag}>`), `render_scene's description misses <${tag}>`);
      assert.ok(instructions.includes(`<${tag}>`), `the server instructions miss <${tag}>`);
    }
  });
});
