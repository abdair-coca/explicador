// What a slide says under its component, like a video's subtitles: the narration the scene wrote for the part on
// screen (a flow step, a journey stage, a trace note, a highlight, a mark). A reader watching Present alone gets the
// explanation one short line at a time; a speaker turns it off with S. Only text the scene wrote: nothing generated.
import type { Block } from '../../../server/src/scene.ts';
import { matrixFocuses } from '../lesson/focuses.ts';

const KEY = 'explicador.subtitles';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): Store | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The remembered choice: on unless it was turned off (or storage is blocked and nothing says otherwise). */
export function subtitlesRemembered(storage: Pick<Storage, 'getItem'> | undefined = browserStorage()): boolean {
  try {
    return storage?.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function rememberSubtitles(on: boolean, storage: Pick<Storage, 'setItem'> | undefined = browserStorage()): void {
  try {
    storage?.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Blocked storage: the choice lasts until the page closes.
  }
}

const said = (text: string | undefined): string | undefined => {
  const line = text?.trim();
  return line ? line : undefined;
};

/** The subtitle of part `part` of a block's slide, or undefined when that part has none. */
export function subtitleOf(block: Block | undefined, part: number): string | undefined {
  if (!block) return undefined;
  switch (block.type) {
    case 'flow':
      return said(block.steps[part]?.narration);
    case 'state':
      return said(block.walk[part]?.narration);
    case 'journey':
      return said(block.stages[part]?.narration);
    case 'trace':
      return said(block.values[part]?.note);
    case 'calc':
      return said(block.parts[part]?.note);
    case 'matrix':
      return part > 0 ? said(matrixFocuses(block)[part - 1]?.narration) : undefined;
    case 'plot':
      return part > 0 ? said(block.marks[part - 1]?.narration) : undefined;
    case 'derive':
      return said(block.lines[part]?.note);
    case 'timeline':
      return said(block.events[part]?.narration);
    default:
      return undefined;
  }
}
