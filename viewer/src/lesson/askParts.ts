// Predict, then see (F29): a change or a step with `ask` gets a part of its own before it, which shows the state before
// it and the question; the next part shows the answer. These map a slide's parts to what each one draws.
import type { StructureBlock, SystemBlock } from '../../../server/src/scene.ts';

/** A part of a structure's slide: the state it draws (-1: before the first) and, for a question, what it asks. */
export interface StructurePart {
  state: number;
  ask?: string;
}

export function structureParts(block: Pick<StructureBlock, 'states' | 'changes'>): StructurePart[] {
  return block.states.flatMap((state, i): StructurePart[] => {
    const ask = state.change === undefined ? undefined : block.changes[state.change]?.ask;
    return ask ? [{ state: i - 1, ask }, { state: i }] : [{ state: i }];
  });
}

/** A part of a system's slide: how many steps have played, and, for a question, what it asks before the next one. */
export interface SystemPart {
  played: number;
  ask?: string;
}

export function systemParts(block: Pick<SystemBlock, 'steps'>): SystemPart[] {
  return [{ played: 0 }, ...block.steps.flatMap((step, i): SystemPart[] => (step.ask ? [{ played: i, ask: step.ask }, { played: i + 1 }] : [{ played: i + 1 }]))];
}
