import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { highlight, type Token } from '../src/lib/highlight.ts';

/** Compact form: "kind:text" for every non-plain token. */
function marked(tokens: Token[]): string[] {
  return tokens.filter((t) => t.kind !== 'plain').map((t) => `${t.kind}:${t.text}`);
}

describe('highlight', () => {
  it('marks keywords, strings, numbers and line comments in C-like code', () => {
    const [line] = highlight(["const url = 'http://x' + 42; // not a URL: just a comment"], 'src/a.ts');
    assert.deepEqual(marked(line ?? []), ['keyword:const', "string:'http://x'", 'number:42', 'comment:// not a URL: just a comment']);
  });

  it('keeps the text intact', () => {
    const source = '  if (a) return "b\\"c" /* x */ ;';
    const [line] = highlight([source], 'a.js');
    assert.equal((line ?? []).map((t) => t.text).join(''), source);
  });

  it('follows a block comment across lines', () => {
    const lines = highlight(['a /* start', 'still comment', 'end */ return'], 'a.go');
    assert.deepEqual(lines.map(marked), [['comment:/* start'], ['comment:still comment'], ['comment:end */', 'keyword:return']]);
  });

  it('uses # comments for Python and SQL keywords in any case', () => {
    assert.deepEqual(marked(highlight(['def f(x):  # "quoted" in a comment'], 'm.py')[0] ?? []), [
      'keyword:def',
      'comment:# "quoted" in a comment',
    ]);
    assert.deepEqual(marked(highlight(["SELECT id FROM users WHERE name = 'a' -- note"], 'q.sql')[0] ?? []), [
      'keyword:SELECT',
      'keyword:FROM',
      'keyword:WHERE',
      "string:'a'",
      'comment:-- note',
    ]);
  });

  it('does not treat capitalized identifiers as keywords outside SQL', () => {
    assert.deepEqual(marked(highlight(['String Type = new Map()'], 'A.java')[0] ?? []), ['keyword:new']);
  });
});
