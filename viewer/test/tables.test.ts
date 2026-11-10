import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitRow, splitTables } from '../src/lib/tables.ts';

describe('splitRow', () => {
  it('drops the outer pipes, trims cells and keeps escaped pipes', () => {
    assert.deepEqual(splitRow('| a | b |'), ['a', 'b']);
    assert.deepEqual(splitRow('a | b'), ['a', 'b']);
    assert.deepEqual(splitRow('| a \\| b | c |'), ['a | b', 'c']);
    assert.deepEqual(splitRow('| a | | c |'), ['a', '', 'c']);
  });
});

describe('splitTables', () => {
  it('cuts a table out of the text around it', () => {
    const [before, table, after] = splitTables('Intro\n\n| Modelo | F1 |\n|---|:-:|\n| BoW | 0.84 |\n| TF-IDF | 0.85 |\n\nOutro');
    assert.deepEqual(before, { kind: 'markdown', text: 'Intro\n' });
    assert.deepEqual(table, {
      kind: 'table',
      header: ['Modelo', 'F1'],
      align: [undefined, 'center'],
      rows: [['BoW', '0.84'], ['TF-IDF', '0.85']],
    });
    assert.deepEqual(after, { kind: 'markdown', text: '\nOutro' });
  });

  it('pads short rows and cuts long ones to the header', () => {
    const [table] = splitTables('| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |');
    assert.deepEqual(table?.kind === 'table' ? table.rows : [], [['1', ''], ['1', '2']]);
  });

  it('reads alignment marks', () => {
    const [table] = splitTables('| a | b | c |\n|:--|--:|---|\n| 1 | 2 | 3 |');
    assert.deepEqual(table?.kind === 'table' ? table.align : [], ['left', 'right', undefined]);
  });

  it('leaves text with pipes, and tables inside code fences, alone', () => {
    assert.deepEqual(splitTables('a | b\nplain'), [{ kind: 'markdown', text: 'a | b\nplain' }]);
    const fenced = '```\n| a | b |\n|---|---|\n| 1 | 2 |\n```';
    assert.deepEqual(splitTables(fenced), [{ kind: 'markdown', text: fenced }]);
  });

  it('does not take a header with a different number of columns than its separator', () => {
    assert.equal(splitTables('| a | b |\n|---|---|---|\n| 1 | 2 |').some((s) => s.kind === 'table'), false);
  });
});
