// Where each member of a <structure> sits in one state (F25): a tidy tree, each parent centered over its children, a
// lone child of a binary tree on its side, several roots side by side. Positions are fractions of the frame, the same
// frame for every state of the block, so a member that keeps its place does not move and one that changes glides.
import type { StructureBlock, StructurePlace, StructureState } from '../../../server/src/scene.ts';

/** Where a member's center is, from 0 to 1 across and down the frame. */
export interface Spot {
  x: number;
  y: number;
}

export interface StructureLayout {
  /** One map per state: the members there and their spots. */
  states: Map<string, Spot>[];
  /** Leaves side by side at the widest state, and levels at the deepest: what sizes the frame. */
  slots: number;
  levels: number;
}

type Slot = { id: string } | { phantom: true };

/** Children of each member, in order: the left child before the right one; a lone sided child keeps an empty slot. */
function childSlots(members: readonly StructurePlace[]): Map<string, Slot[]> {
  const children = new Map<string, StructurePlace[]>();
  for (const place of members) {
    if (place.parent === undefined) continue;
    children.set(place.parent, [...(children.get(place.parent) ?? []), place]);
  }
  const slots = new Map<string, Slot[]>();
  for (const [parent, kids] of children) {
    const sided = kids.filter((kid) => kid.side);
    if (sided.length === 0) {
      slots.set(parent, kids.map((kid) => ({ id: kid.id })));
      continue;
    }
    const left = kids.find((kid) => kid.side === 'left');
    const right = kids.find((kid) => kid.side === 'right');
    const free = kids.filter((kid) => !kid.side).map((kid): Slot => ({ id: kid.id }));
    slots.set(parent, [left ? { id: left.id } : { phantom: true }, ...free, right ? { id: right.id } : { phantom: true }]);
  }
  return slots;
}

/** Spots of one state in slot units: x is the center among `width` leaf slots, y the depth. */
export function layoutState(state: Pick<StructureState, 'members'>): { spots: Map<string, Spot>; width: number; depth: number } {
  const slots = childSlots(state.members);
  const spots = new Map<string, Spot>();
  const widths = new Map<string, number>();
  const widthOf = (id: string): number => {
    const known = widths.get(id);
    if (known !== undefined) return known;
    const kids = slots.get(id) ?? [];
    const width = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + ('id' in kid ? widthOf(kid.id) : 1), 0);
    widths.set(id, width);
    return width;
  };
  let depth = 0;
  const place = (id: string, level: number, start: number): void => {
    depth = Math.max(depth, level + 1);
    const kids = slots.get(id) ?? [];
    if (kids.length === 0) {
      spots.set(id, { x: start + 0.5, y: level });
      return;
    }
    let at = start;
    const centers: number[] = [];
    for (const kid of kids) {
      const width = 'id' in kid ? widthOf(kid.id) : 1;
      if ('id' in kid) {
        place(kid.id, level + 1, at);
        centers.push(spots.get(kid.id)?.x ?? at + width / 2);
      } else centers.push(at + width / 2);
      at += width;
    }
    spots.set(id, { x: ((centers[0] ?? start) + (centers.at(-1) ?? start)) / 2, y: level });
  };
  let width = 0;
  for (const root of state.members.filter((member) => member.parent === undefined)) {
    place(root.id, 0, width);
    width += widthOf(root.id);
  }
  return { spots, width: Math.max(1, width), depth: Math.max(1, depth) };
}

/** Every state of a block on one frame, centered across it; `right` turns the tree so its root is on the left. */
export function layoutStructure(block: Pick<StructureBlock, 'states' | 'direction'>): StructureLayout {
  const raw = block.states.map(layoutState);
  const slots = Math.max(1, ...raw.map((state) => state.width));
  const levels = Math.max(1, ...raw.map((state) => state.depth));
  const states = raw.map(({ spots, width }) => {
    const shift = (slots - width) / 2;
    const placed = new Map<string, Spot>();
    for (const [id, spot] of spots) {
      const across = (spot.x + shift) / slots;
      const down = (spot.y + 0.5) / levels;
      placed.set(id, block.direction === 'right' ? { x: down, y: across } : { x: across, y: down });
    }
    return placed;
  });
  return { states, slots, levels };
}

/**
 * Where a member is drawn in state `index` even when it is not there: its own spot, else where it was last, else where
 * it will first be, so it fades in place and grows out of nothing far away.
 */
export function spotOf(layout: StructureLayout, id: string, index: number): Spot | undefined {
  const here = layout.states[index]?.get(id);
  if (here) return here;
  for (let i = index - 1; i >= 0; i -= 1) {
    const spot = layout.states[i]?.get(id);
    if (spot) return spot;
  }
  for (let i = index + 1; i < layout.states.length; i += 1) {
    const spot = layout.states[i]?.get(id);
    if (spot) return spot;
  }
  return undefined;
}
