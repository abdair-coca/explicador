// State of the code window: open tabs, the lines in focus and the tour being played.
// A reducer, so every way of opening code (a box, a button, the explorer, a tour) goes through the same rules.
import type { Ref, Tour } from '../../../server/src/scene.ts';

export interface LineRange {
  start: number;
  end: number;
}

export interface CodeState {
  open: boolean;
  tabs: string[];
  active: string | undefined;
  /** Lines to highlight in the active file. */
  focus: LineRange | undefined;
  /** Changes every time the focus is asked for, so the editor scrolls again to the same lines. */
  focusId: number;
  tour: Tour | undefined;
  step: number;
  playing: boolean;
}

export type CodeAction =
  | { type: 'show'; ref: Ref }
  | { type: 'open-file'; path: string }
  | { type: 'activate'; path: string }
  | { type: 'close-tab'; path: string }
  | { type: 'close' }
  | { type: 'tour'; tour: Tour }
  | { type: 'step'; index: number }
  | { type: 'play'; playing: boolean }
  | { type: 'end-tour' };

export const MAX_TABS = 8;

export const initialCode: CodeState = { open: false, tabs: [], active: undefined, focus: undefined, focusId: 0, tour: undefined, step: 0, playing: false };

export function rangeOf(ref: Ref): LineRange | undefined {
  return ref.start === undefined ? undefined : { start: ref.start, end: ref.end ?? ref.start };
}

/** Adds a tab for `path` (at the end), dropping the oldest one that is not the new tab when there are too many. */
function withTab(tabs: string[], path: string): string[] {
  if (tabs.includes(path)) return tabs;
  const next = [...tabs, path];
  return next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
}

function tourStep(state: CodeState, tour: Tour, index: number): CodeState {
  const at = Math.min(Math.max(index, 0), tour.steps.length - 1);
  const step = tour.steps[at];
  if (!step) return state;
  return {
    ...state,
    open: true,
    tour,
    step: at,
    tabs: withTab(state.tabs, step.ref.path),
    active: step.ref.path,
    focus: rangeOf(step.ref),
    focusId: state.focusId + 1,
  };
}

export function codeReducer(state: CodeState, action: CodeAction): CodeState {
  switch (action.type) {
    case 'show':
      // Looking at code of its own ends a tour: the lines in focus would no longer match its notes.
      return {
        ...state,
        open: true,
        tour: undefined,
        step: 0,
        playing: false,
        tabs: withTab(state.tabs, action.ref.path),
        active: action.ref.path,
        focus: rangeOf(action.ref),
        focusId: state.focusId + 1,
      };
    case 'open-file':
    case 'activate': {
      const step = state.tour?.steps[state.step];
      // Back on the file of the current tour step, its lines are in focus again.
      const focus = action.type === 'activate' && step?.ref.path === action.path ? rangeOf(step.ref) : undefined;
      return {
        ...state,
        open: true,
        tabs: withTab(state.tabs, action.path),
        active: action.path,
        focus,
        focusId: state.focusId + 1,
      };
    }
    case 'close-tab': {
      const index = state.tabs.indexOf(action.path);
      if (index === -1) return state;
      const tabs = state.tabs.filter((path) => path !== action.path);
      if (state.active !== action.path) return { ...state, tabs };
      const active = tabs[Math.min(index, tabs.length - 1)];
      return { ...state, tabs, active, focus: undefined, focusId: state.focusId + 1, open: tabs.length > 0 ? state.open : false, playing: tabs.length > 0 ? state.playing : false };
    }
    case 'close':
      return { ...state, open: false, playing: false };
    case 'tour':
      return tourStep({ ...state, playing: false }, action.tour, 0);
    case 'step':
      return state.tour ? tourStep(state, state.tour, action.index) : state;
    case 'play':
      return state.tour ? { ...state, playing: action.playing } : state;
    case 'end-tour':
      return { ...state, tour: undefined, step: 0, playing: false, focus: undefined, focusId: state.focusId + 1 };
  }
}

/** How long autoplay stays on a step: time to read its note. */
export function stepDelay(note: string): number {
  return Math.min(Math.max(3500 + note.length * 35, 4000), 12_000);
}
