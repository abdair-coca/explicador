import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Windows and macOS ignore case in file names, so there `import … from './Calc'` can open `calc.ts` instead of
// `Calc.tsx`. Linux does not, so the build passes there and fails on Windows. This check fails on every OS.
describe('viewer source file names', () => {
  it('never differ only in case', () => {
    const root = fileURLToPath(new URL('../src', import.meta.url));
    const spellings = new Map<string, Set<string>>();
    for (const path of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(path)) continue;
      const stem = path.replace(/\.tsx?$/, '');
      const key = stem.toLowerCase();
      spellings.set(key, (spellings.get(key) ?? new Set<string>()).add(stem));
    }
    const clashes = [...spellings.values()].filter((names) => names.size > 1).map((names) => [...names].join(' / '));
    assert.deepEqual(clashes, [], `names that differ only in case: ${clashes.join(', ')}`);
  });
});
