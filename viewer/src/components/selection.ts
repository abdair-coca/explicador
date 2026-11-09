// The box whose details are open in the side panel. Scenes read it to highlight the box and to
// open the panel on click; presentation mode has no provider, so boxes there only zoom groups.
import { createContext, useContext } from 'react';

export interface Selected {
  block: string;
  node: string;
}

export interface Selection {
  selected: Selected | undefined;
  select(block: string, node: string, element: Element): void;
  /** Boxes the user asked about, as `block:node` → whether an answer is still pending. */
  asked: ReadonlyMap<string, boolean>;
}

export const SelectionContext = createContext<Selection | undefined>(undefined);

export function useSelection(): Selection | undefined {
  return useContext(SelectionContext);
}

/** Ids of the boxes in `block` the user asked about → whether an answer is still pending. */
export function askedIn(selection: Selection | undefined, block: string): ReadonlyMap<string, boolean> | undefined {
  if (!selection || selection.asked.size === 0) return undefined;
  const prefix = `${block}:`;
  const found = new Map<string, boolean>();
  for (const [id, waiting] of selection.asked) if (id.startsWith(prefix)) found.set(id.slice(prefix.length), waiting);
  return found.size > 0 ? found : undefined;
}

/** Id of the selected node in `block`, if any. */
export function selectedIn(selection: Selection | undefined, block: string): string | undefined {
  return selection?.selected?.block === block ? selection.selected.node : undefined;
}
