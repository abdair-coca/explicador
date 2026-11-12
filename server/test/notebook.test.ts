import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readProjectFile, serveFile } from '../src/files.ts';
import { describeNotebook, notebookLimits, parseNotebook, quoteCells } from '../src/notebook.ts';
import { parseExl } from '../src/parser/index.ts';
import { boxesWithoutRange } from '../src/ranges.ts';
import { buildTour } from '../src/tours.ts';
import { withSnippets } from '../src/snippets.ts';
import { tempProject } from './helpers.ts';

const png = 'iVBORw0KGgo=';

/** A small notebook as Jupyter writes it: sources as arrays of lines, outputs of every kind. */
export const notebookJson = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { language: 'python', name: 'python3' }, language_info: { name: 'python' } },
  cells: [
    { cell_type: 'markdown', id: 'a', metadata: {}, source: ['# Title\n', 'Some **text**.'] },
    {
      cell_type: 'code',
      id: 'b',
      metadata: {},
      execution_count: 3,
      source: ['import pandas as pd\n', 'df = pd.read_csv("x.csv")\n', 'df.head()'],
      outputs: [
        { output_type: 'stream', name: 'stdout', text: ['loaded\n', '\u001b[31m5 rows\u001b[0m\n'] },
        { output_type: 'execute_result', execution_count: 3, metadata: {}, data: { 'text/html': ['<table><tr><td>1</td></tr></table>'], 'text/plain': ['   a\n0  1'] } },
        { output_type: 'display_data', metadata: {}, data: { 'image/png': png, 'text/plain': ['<Figure>'] } },
      ],
    },
    {
      cell_type: 'code',
      id: 'c',
      metadata: {},
      execution_count: null,
      source: 'plot()',
      outputs: [
        { output_type: 'display_data', metadata: {}, data: { 'text/html': ['<script>alert(1)</script><div>widget</div>'], 'text/plain': ['<Widget>'] } },
        { output_type: 'display_data', metadata: {}, data: { 'application/vnd.jupyter.widget-view+json': { model_id: 'x' } } },
        { output_type: 'error', ename: 'ValueError', evalue: 'bad', traceback: ['\u001b[0;31mValueError\u001b[0m: bad'] },
      ],
    },
    { cell_type: 'raw', id: 'd', metadata: {}, source: 'raw text' },
  ],
});

describe('parseNotebook', () => {
  it('numbers the cells from 1 and joins their source', () => {
    const notebook = parseNotebook(notebookJson);
    assert.ok(notebook);
    assert.equal(notebook.language, 'python');
    assert.deepEqual(notebook.cells.map((c) => [c.n, c.type]), [[1, 'markdown'], [2, 'code'], [3, 'code'], [4, 'raw']]);
    assert.equal(notebook.cells[0]?.source, '# Title\nSome **text**.');
    assert.equal(notebook.cells[1]?.count, 3);
    assert.equal(notebook.cells[2]?.count, undefined, 'a cell that never ran has no count');
  });

  it('keeps safe outputs: text without ANSI, simple HTML, images', () => {
    const [, code] = parseNotebook(notebookJson)?.cells ?? [];
    assert.deepEqual(code?.outputs, [
      { kind: 'text', stream: 'stdout', text: 'loaded\n5 rows\n' },
      { kind: 'html', html: '<table><tr><td>1</td></tr></table>', text: '   a\n0  1' },
      { kind: 'image', mime: 'image/png', data: png },
    ]);
  });

  it('drops scripts and widgets, and keeps errors', () => {
    const cell = parseNotebook(notebookJson)?.cells[2];
    assert.deepEqual(cell?.outputs, [
      { kind: 'text', stream: 'result', text: '<Widget>' },
      { kind: 'omitted', label: 'application/vnd.jupyter.widget-view+json' },
      { kind: 'text', stream: 'error', text: 'ValueError: bad' },
    ]);
  });

  it('omits an image that is too big instead of sending it', () => {
    const big = JSON.stringify({ nbformat: 4, cells: [{ cell_type: 'code', source: '', outputs: [{ output_type: 'display_data', data: { 'image/png': 'A'.repeat(notebookLimits.imageChars + 1) } }] }] });
    const output = parseNotebook(big)?.cells[0]?.outputs?.[0];
    assert.equal(output?.kind, 'omitted');
  });

  it('refuses what is not a notebook of format 4', () => {
    assert.equal(parseNotebook('not json'), undefined);
    assert.equal(parseNotebook('{"cells": []}'), undefined);
    assert.equal(parseNotebook('{"nbformat": 3, "worksheets": []}'), undefined);
    assert.equal(parseNotebook('[]'), undefined);
  });
});

describe('notebooks as files, refs and tours', () => {
  const root = tempProject({ 'nb/a.ipynb': notebookJson, 'nb/bad.ipynb': '{', 'src/long.py': Array.from({ length: 40 }, (_, i) => `x${i} = ${i}`).join('\n') });

  it('serves the notebook as cells, and reports an invalid one', () => {
    const file = readProjectFile(root, 'nb/a.ipynb');
    assert.ok(file.ok && 'notebook' in file && file.notebook.cells.length === 4);
    assert.equal(serveFile(root, 'nb/a.ipynb').status, 200);
    assert.deepEqual(serveFile(root, 'nb/bad.ipynb'), { status: 415, body: { error: 'invalid' } });
  });

  it('counts cells in tour refs', () => {
    const ok = buildTour(root, { title: 'Notebook', steps: [{ ref: 'nb/a.ipynb:2-3', note: 'The loading and the plot.' }] });
    assert.ok(ok.ok);
    const bad = buildTour(root, { title: 'Notebook', steps: [{ ref: 'nb/a.ipynb:3-9', note: 'x' }, { ref: 'nb/a.ipynb', note: 'y' }] });
    assert.ok(!bad.ok);
    assert.match(bad.problems.join('\n'), /step 1 .*the notebook has 4 cells/);
    assert.match(bad.problems.join('\n'), /step 2 .*give a cell range/);
  });

  it('quotes cells (source only, no outputs) for key code', () => {
    const parsed = parseExl('<arch id="a" title="A">\n<node id="n" label="Load" ref="nb/a.ipynb:2" />\n<code node="n" ref="nb/a.ipynb:2-3">Loads the data.</code>\n</arch>');
    assert.ok(parsed.ok);
    const [flow] = withSnippets(root, parsed.scene.blocks);
    const cells = flow?.type === 'arch' ? flow.codes?.[0]?.cells : undefined;
    assert.deepEqual(cells?.map((c) => c.n), [2, 3]);
    assert.equal(cells?.[0]?.source, 'import pandas as pd\ndf = pd.read_csv("x.csv")\ndf.head()');
    assert.ok(cells?.every((c) => c.outputs === undefined));
    assert.deepEqual(quoteCells(parseNotebook(notebookJson)!, 9, 9), []);
  });

  it('warns about boxes that point at a whole big file or notebook, not at ranges or short files', () => {
    const exl = [
      '<arch id="a" title="A">',
      '<node id="long" label="Long file" ref="src/long.py" />',
      '<node id="ranged" label="With range" ref="src/long.py:3-5" />',
      '<node id="nb" label="Notebook" ref="nb/a.ipynb" />',
      '<node id="nbr" label="Notebook cells" ref="nb/a.ipynb:2" />',
      '</arch>',
    ].join('\n');
    const parsed = parseExl(exl);
    assert.ok(parsed.ok);
    assert.deepEqual(boxesWithoutRange(root, parsed.scene.blocks), ['Long file (src/long.py)', 'Notebook (nb/a.ipynb)']);
  });
});

describe('describeNotebook', () => {
  const notebook = parseNotebook(notebookJson)!;

  it('outlines the cells with their numbers and outputs', () => {
    const text = describeNotebook('nb/a.ipynb', notebook);
    assert.match(text, /Notebook nb\/a\.ipynb: python, 4 cells/);
    assert.match(text, /\[1\] markdown: # Title Some \*\*text\*\*\./);
    assert.match(text, /\[2\] code In\[3\]: import pandas as pd df = pd\.read_csv\("x\.csv"\) df\.head\(\)  => stdout: loaded 5 rows \| table\/html \| image/);
  });

  it('returns a range of cells whole', () => {
    const text = describeNotebook('nb/a.ipynb', notebook, { start: 2, end: 2 });
    assert.match(text, /--- \[2\] code In\[3\]\nimport pandas as pd\ndf = pd\.read_csv/);
    // Outputs whole, one per line, and a table as its plain text, so every printed number can be copied.
    assert.match(text, /=> stdout: loaded\n5 rows\ntable:\n {3}a\n0 {2}1\nimage/);
  });

  it('reads a long printed output whole, not clipped like the outline', () => {
    const weights = Array.from({ length: 30 }, (_, i) => `word${i} ${(i / 10).toFixed(3)}`).join('\n');
    const long = parseNotebook(
      JSON.stringify({
        nbformat: 4,
        nbformat_minor: 5,
        metadata: { kernelspec: { language: 'python' } },
        cells: [{ cell_type: 'code', metadata: {}, execution_count: 1, source: ['print(weights)'], outputs: [{ output_type: 'stream', name: 'stdout', text: [weights] }] }],
      }),
    )!;
    assert.match(describeNotebook('w.ipynb', long, { start: 1, end: 1 }), /word29 2\.900/);
    assert.doesNotMatch(describeNotebook('w.ipynb', long), /word29/);
    assert.match(describeNotebook('nb/a.ipynb', notebook, { start: 9, end: 9 }), /No cells in 9-9/);
  });
});
