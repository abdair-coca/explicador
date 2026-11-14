import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { headingsOf, missingSections, sectionLines, withSections } from '../src/headings.ts';
import { outlineDocuments } from '../src/index/index.ts';
import { formatErrors, parseExl, parseRefString } from '../src/parser/index.ts';
import { boxesWithoutRange } from '../src/ranges.ts';
import type { Block } from '../src/scene.ts';
import { tempProject } from './helpers.ts';

const lease = [
  '# Lease', // 1
  '', // 2
  '## 1. Rent', // 3
  'The rent is 900 euros.', // 4
  '', // 5
  '## 2. Deposit', // 6
  'Two months of rent.', // 7
  '', // 8
  '### How it comes back', // 9
  'Within 30 days.', // 10
  '', // 11
  '```md', // 12
  '## Not a heading', // 13
  '```', // 14
  '', // 15
  '## 3. Renewal', // 16
  'At most 5 %.', // 17
  '', // 18
].join('\n');

const blocksOf = (source: string): Block[] => {
  const parsed = parseExl(source);
  assert.ok(parsed.ok, parsed.ok ? '' : formatErrors(parsed.errors));
  return parsed.scene.blocks;
};

describe('section refs', () => {
  it('parse "path#Heading", alone or with spaces, and refuse a heading with lines', () => {
    assert.deepEqual(parseRefString('docs/lease.md#2. Deposit'), { path: 'docs/lease.md', heading: '2. Deposit' });
    assert.deepEqual(parseRefString('lease.md#Deposit'), { path: 'lease.md', heading: 'Deposit' });
    assert.match(String(parseRefString('lease.md#')), /name the section after "#"/);
    assert.match(String(parseRefString('lease.md:3-4#Deposit')), /either a line range or a heading/);
    assert.match(String(parseRefString('../lease.md#Deposit')), /must stay inside the project/);
  });

  it('find the headings outside code fences, and a section down to the next heading of its level', () => {
    assert.deepEqual(
      headingsOf(lease).map((heading) => [heading.level, heading.text, heading.line]),
      [
        [1, 'Lease', 1],
        [2, '1. Rent', 3],
        [2, '2. Deposit', 6],
        [3, 'How it comes back', 9],
        [2, '3. Renewal', 16],
      ],
    );
    assert.deepEqual(sectionLines(lease, 'Deposit'), { start: 6, end: 14 }, 'without its number, and keeping its subsection');
    assert.deepEqual(sectionLines(lease, '2. deposit'), { start: 6, end: 14 });
    assert.deepEqual(sectionLines(lease, 'How it comes back'), { start: 9, end: 14 });
    assert.deepEqual(sectionLines(lease, '3. Renewal'), { start: 16, end: 17 }, 'trailing blank lines left out');
    assert.equal(sectionLines(lease, 'Not a heading'), undefined);
  });

  it('get their lines when the scene is shown, however deep the ref, and name the missing ones', () => {
    const root = tempProject({ 'lease.md': lease });
    const source = [
      '<timeline title="The lease in the order it is read">',
      '<event label="Rent" ref="lease.md#Rent">The rent.</event>',
      '<event label="Renewal" ref="lease.md#Renewal">The cap.</event>',
      '</timeline>',
      '<annotated title="The deposit clause, read closely" ref="lease.md#2. Deposit">',
      '<passage>Two months of rent.</passage>',
      '<note quote="Two months">How much.</note>',
      '</annotated>',
    ].join('\n');
    const [timeline, annotated] = withSections(root, blocksOf(source));
    assert.ok(timeline?.type === 'timeline' && annotated?.type === 'annotated');
    assert.deepEqual(timeline.events[0]?.ref, { path: 'lease.md', heading: 'Rent', start: 3, end: 4 });
    assert.deepEqual(annotated.ref, { path: 'lease.md', heading: '2. Deposit', start: 6, end: 14 });
    assert.deepEqual(missingSections(root, blocksOf(source)), []);
    const wrong = missingSections(root, blocksOf('<timeline title="The lease in the order it is read">\n<event label="A" ref="lease.md#Pets">A.</event>\n<event label="B" ref="lease.md#Rent">B.</event>\n</timeline>'));
    assert.equal(wrong.length, 1);
    assert.match(wrong[0] ?? '', /^- lease\.md#Pets: no such heading; it has "Lease", "1\. Rent", "2\. Deposit", "How it comes back", "3\. Renewal"/);
  });

  it('count as a range for the code window', () => {
    const root = tempProject({ 'lease.md': `${lease}\n${'filler\n'.repeat(40)}` });
    const blocks = blocksOf('<arch title="The parts of the lease that cost money">\n<node id="a" label="Deposit" desc="Two months" ref="lease.md#Deposit" />\n<node id="b" label="Whole" desc="All of it" ref="lease.md" />\n</arch>');
    assert.deepEqual(boxesWithoutRange(root, blocks), ['Whole (lease.md)']);
  });
});

describe('the index of documents', () => {
  it('outlines headings, data columns and the files that are not text', () => {
    const root = tempProject({ 'docs/lease.md': lease, 'data/rents.csv': 'month,rent\nmarch,900\napril,900\n', 'scan.pdf': '%PDF-1.4' });
    const outline = outlineDocuments(root, ['data/rents.csv', 'docs/lease.md', 'scan.pdf', 'src/app.js'], () => 100);
    assert.equal(
      outline,
      [
        'data/rents.csv: 2 rows; columns month, rent',
        'docs/lease.md (18 lines): # Lease (L1); ## 1. Rent (L3); ## 2. Deposit (L6); ### How it comes back (L9); ## 3. Renewal (L16)',
        'scan.pdf (not text: read it with your own tools; refs can only name the file)',
      ].join('\n'),
    );
  });
});
