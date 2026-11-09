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
}

export const SelectionContext = createContext<Selection | undefined>(undefined);

export function useSelection(): Selection | undefined {
  return useContext(SelectionContext);
}

/** Id of the selected node in `block`, if any. */
export function selectedIn(selection: Selection | undefined, block: string): string | undefined {
  return selection?.selected?.block === block ? selection.selected.node : undefined;
}
