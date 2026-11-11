// Boxes whose ref names a whole file: the code window has nothing to highlight for them.
import { isNotebookPath, readProjectFile, sizeOf } from './files.ts';
import type { Block, Ref } from './scene.ts';

/** Files this short are read whole, so a ref without a range is fine. */
const SHORT_FILE_LINES = 30;
const SHORT_NOTEBOOK_CELLS = 2;

/** `Label (path)` for every node, entity, state or stage whose ref has no line (or cell) range, short files excepted. */
export function boxesWithoutRange(root: string, blocks: Block[]): string[] {
  const found: string[] = [];
  const sizes = new Map<string, number | undefined>();
  const check = (label: string, ref: Ref | undefined): void => {
    if (!ref || ref.start !== undefined) return;
    if (!sizes.has(ref.path)) {
      const file = readProjectFile(root, ref.path);
      sizes.set(ref.path, file.ok ? sizeOf(file) : undefined);
    }
    const size = sizes.get(ref.path);
    if (size === undefined || size <= (isNotebookPath(ref.path) ? SHORT_NOTEBOOK_CELLS : SHORT_FILE_LINES)) return;
    found.push(`${label} (${ref.path})`);
  };
  for (const block of blocks) {
    if (block.type === 'arch' || block.type === 'flow') block.nodes.forEach((node) => check(node.label, node.ref));
    else if (block.type === 'data') block.entities.forEach((entity) => check(entity.label, entity.ref));
    else if (block.type === 'state') block.states.forEach((status) => check(status.label, status.ref));
    else if (block.type === 'journey') block.stages.forEach((stage) => check(stage.label, stage.ref));
  }
  return [...new Set(found)];
}
