// Tours built from a scene itself, with no help from Claude: a flow's steps (or an architecture's boxes) that carry
// a ref become the stops, and their narration (or description) becomes the note.
import type { ArchBlock, FlowBlock, Ref, Tour, TourStep } from '../../../server/src/scene.ts';

const MAX_NOTE = 1400;

const clip = (text: string): string => (text.length > MAX_NOTE ? `${text.slice(0, MAX_NOTE)}…` : text);

/** One stop per step that points at code: its own ref, or else the ref of the box it ends at (or acts in). */
export function tourFromFlow(block: FlowBlock): Tour | undefined {
  const refOf = (id: string | undefined): Ref | undefined => block.nodes.find((n) => n.id === id)?.ref;
  const steps: TourStep[] = [];
  for (const step of block.steps) {
    const ref = step.ref ?? refOf(step.to) ?? refOf(step.from);
    if (!ref) continue;
    steps.push({ ref, note: clip(step.label ? `**${step.label}** · ${step.narration}` : step.narration) });
  }
  return steps.length > 0 ? { id: `flow:${block.id}`, title: block.title, steps } : undefined;
}

/** One stop per box that points at code, in the order they are declared. */
export function tourFromArch(block: ArchBlock): Tour | undefined {
  const steps: TourStep[] = [];
  for (const node of block.nodes) {
    if (!node.ref) continue;
    const text = [node.desc ? `**${node.label}** · ${node.desc}` : `**${node.label}**`, node.about].filter(Boolean).join('\n\n');
    steps.push({ ref: node.ref, note: clip(text) });
  }
  return steps.length > 0 ? { id: `arch:${block.id}`, title: block.title, steps } : undefined;
}
