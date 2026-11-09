import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after } from 'node:test';

/** Creates a throwaway project with the given files; removed when the test file ends. */
export function tempProject(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'explicador-test-'));
  after(() => rmSync(root, { recursive: true, force: true }));
  writeFiles(root, files);
  return root;
}

export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}
