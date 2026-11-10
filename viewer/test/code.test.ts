import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Tour } from '../../server/src/scene.ts';
import { codeReducer, initialCode, MAX_TABS, rangeOf, stepDelay, type CodeAction, type CodeState } from '../src/code/state.ts';
import { buildTree, folderChain } from '../src/code/tree.ts';
import { tourFromArch, tourFromFlow } from '../src/code/tourFrom.ts';

const run = (actions: CodeAction[], from: CodeState = initialCode): CodeState => actions.reduce(codeReducer, from);

const tour: Tour = {
  id: 't1',
  title: 'Login',
  steps: [
    { ref: { path: 'src/a.js', start: 2, end: 4 }, note: 'First.' },
    { ref: { path: 'src/b.js', start: 10, end: 10 }, note: 'Second.' },
    { ref: { path: 'src/a.js', start: 20, end: 25 }, note: 'Third.' },
  ],
};

describe('buildTree', () => {
  it('nests folders, puts folders before files and sorts by name', () => {
    const tree = buildTree(['README.md', 'src/b.js', 'src/auth/login.js', 'src/a.js', 'package.json', 'docs/x.md']);
    const names = (nodes: typeof tree): string[] => nodes.map((n) => (n.type === 'folder' ? `${n.name}/` : n.name));
    assert.deepEqual(names(tree), ['docs/', 'src/', 'package.json', 'README.md']);
    const src = tree.find((n) => n.name === 'src');
    assert.ok(src?.type === 'folder');
    assert.deepEqual(names(src.children), ['auth/', 'a.js', 'b.js']);
    const auth = src.children[0];
    assert.ok(auth?.type === 'folder');
    assert.deepEqual(auth.children, [{ type: 'file', name: 'login.js', path: 'src/auth/login.js' }]);
    assert.equal(auth.path, 'src/auth');
  });

  it('handles an empty project and lists the folders that hold a file', () => {
    assert.deepEqual(buildTree([]), []);
    assert.deepEqual(folderChain('src/auth/login.js'), ['src', 'src/auth']);
    assert.deepEqual(folderChain('README.md'), []);
  });
});

describe('code window state', () => {
  it('shows a ref: opens the window on its file with its lines in focus', () => {
    const state = run([{ type: 'show', ref: { path: 'src/a.js', start: 5, end: 9 } }]);
    assert.equal(state.open, true);
    assert.deepEqual(state.tabs, ['src/a.js']);
    assert.equal(state.active, 'src/a.js');
    assert.deepEqual(state.focus, { start: 5, end: 9 });
  });

  it('a ref without lines opens the file with nothing highlighted, and a single line is a range of one', () => {
    assert.equal(run([{ type: 'show', ref: { path: 'a.js' } }]).focus, undefined);
    assert.deepEqual(rangeOf({ path: 'a.js', start: 7 }), { start: 7, end: 7 });
  });

  it('asking for the same lines again changes focusId, so the editor scrolls back to them', () => {
    const ref = { path: 'a.js', start: 1, end: 2 };
    const once = run([{ type: 'show', ref }]);
    const twice = codeReducer(once, { type: 'show', ref });
    assert.notEqual(once.focusId, twice.focusId);
    assert.deepEqual(twice.tabs, ['a.js'], 'no duplicate tab');
  });

  it('keeps at most MAX_TABS tabs and drops the oldest', () => {
    const paths = Array.from({ length: MAX_TABS + 2 }, (_, i) => `f${i}.js`);
    const state = run(paths.map((path): CodeAction => ({ type: 'open-file', path })));
    assert.equal(state.tabs.length, MAX_TABS);
    assert.equal(state.tabs[0], 'f2.js');
    assert.equal(state.active, `f${MAX_TABS + 1}.js`);
  });

  it('closing the active tab activates its neighbour; closing the last tab closes the window', () => {
    let state = run([
      { type: 'open-file', path: 'a.js' },
      { type: 'open-file', path: 'b.js' },
      { type: 'open-file', path: 'c.js' },
      { type: 'activate', path: 'b.js' },
      { type: 'close-tab', path: 'b.js' },
    ]);
    assert.deepEqual(state.tabs, ['a.js', 'c.js']);
    assert.equal(state.active, 'c.js');
    state = run([{ type: 'close-tab', path: 'c.js' }, { type: 'close-tab', path: 'a.js' }], state);
    assert.deepEqual(state.tabs, []);
    assert.equal(state.active, undefined);
    assert.equal(state.open, false);
    assert.equal(codeReducer(state, { type: 'close-tab', path: 'zzz' }), state, 'an unknown tab changes nothing');
  });

  it('closing the window keeps its tabs for the next time', () => {
    const state = run([{ type: 'open-file', path: 'a.js' }, { type: 'close' }]);
    assert.equal(state.open, false);
    assert.deepEqual(state.tabs, ['a.js']);
    assert.equal(codeReducer(state, { type: 'open-file', path: 'a.js' }).open, true);
  });
});

describe('code tour state', () => {
  it('starts on the first step: its file, its lines, not playing', () => {
    const state = run([{ type: 'tour', tour }]);
    assert.equal(state.tour, tour);
    assert.equal(state.step, 0);
    assert.equal(state.active, 'src/a.js');
    assert.deepEqual(state.focus, { start: 2, end: 4 });
    assert.equal(state.playing, false);
    assert.equal(state.open, true);
  });

  it('moves between steps, across files, and never past either end', () => {
    let state = run([{ type: 'tour', tour }, { type: 'step', index: 1 }]);
    assert.equal(state.active, 'src/b.js');
    assert.deepEqual(state.tabs, ['src/a.js', 'src/b.js']);
    assert.deepEqual(state.focus, { start: 10, end: 10 });
    state = run([{ type: 'step', index: 99 }], state);
    assert.equal(state.step, 2);
    assert.deepEqual(state.focus, { start: 20, end: 25 });
    state = run([{ type: 'step', index: -4 }], state);
    assert.equal(state.step, 0);
  });

  it('coming back to the file of the current step puts its lines in focus; other files show none', () => {
    const state = run([{ type: 'tour', tour }, { type: 'open-file', path: 'src/c.js' }]);
    assert.equal(state.focus, undefined);
    assert.deepEqual(codeReducer(state, { type: 'activate', path: 'src/a.js' }).focus, { start: 2, end: 4 });
    assert.equal(codeReducer(state, { type: 'activate', path: 'src/b.js' }).focus, undefined);
  });

  it('showing code of its own ends the tour', () => {
    const state = run([{ type: 'tour', tour }, { type: 'play', playing: true }, { type: 'show', ref: { path: 'x.js', start: 1 } }]);
    assert.equal(state.tour, undefined);
    assert.equal(state.playing, false);
    assert.equal(state.active, 'x.js');
  });

  it('play and end-tour only mean something while a tour is running', () => {
    assert.equal(run([{ type: 'play', playing: true }]).playing, false);
    assert.equal(run([{ type: 'step', index: 1 }]), initialCode);
    const state = run([{ type: 'tour', tour }, { type: 'play', playing: true }]);
    assert.equal(state.playing, true);
    const ended = codeReducer(state, { type: 'end-tour' });
    assert.equal(ended.tour, undefined);
    assert.equal(ended.playing, false);
    assert.equal(ended.focus, undefined);
    assert.equal(ended.open, true, 'the window stays open on the file');
  });

  it('autoplay waits longer on longer notes, within limits', () => {
    assert.equal(stepDelay('Hi'), 4000);
    assert.ok(stepDelay('x'.repeat(100)) > stepDelay('x'.repeat(50)));
    assert.equal(stepDelay('x'.repeat(5000)), 12_000);
  });
});

describe('tours built from a scene', () => {
  const nodes = [
    { id: 'form', label: 'Form', kind: 'ui' as const, ref: { path: 'ui/form.js', start: 1, end: 9 } },
    { id: 'api', label: 'API', kind: 'service' as const, desc: 'Validates.', about: 'Long **text**.', ref: { path: 'api/routes.js', start: 6, end: 14 } },
    { id: 'db', label: 'DB', kind: 'store' as const },
  ];

  it('a flow becomes one stop per step that points at code, falling back to the box it reaches, then the one it starts from', () => {
    const tour = tourFromFlow({
      type: 'flow',
      id: 'login',
      title: 'Login',
      nodes,
      drills: [],
      steps: [
        { from: 'form', to: 'api', label: 'credentials', ref: { path: 'ui/form.js', start: 3, end: 5 }, narration: 'Posts them.' },
        { from: 'form', to: 'api', narration: 'Arrives.' },
        { from: 'api', to: 'db', narration: 'The store has no code.' },
        { from: 'db', narration: 'Nothing to show.' },
      ],
    });
    assert.deepEqual(tour?.steps, [
      { ref: { path: 'ui/form.js', start: 3, end: 5 }, note: '**credentials** · Posts them.' },
      { ref: { path: 'api/routes.js', start: 6, end: 14 }, note: 'Arrives.' },
      // The store has no code, so the step shows the code of the box it starts from.
      { ref: { path: 'api/routes.js', start: 6, end: 14 }, note: 'The store has no code.' },
    ]);
    assert.equal(tour?.title, 'Login');
  });

  it('an architecture becomes one stop per box with code, with its description and long text', () => {
    const tour = tourFromArch({ type: 'arch', id: 'overview', title: 'Parts', nodes, groups: [], edges: [], drills: [] });
    assert.deepEqual(tour?.steps.map((s) => s.note), ['**Form**', '**API** · Validates.\n\nLong **text**.']);
  });

  it('gives nothing when no step or box points at code', () => {
    assert.equal(tourFromFlow({ type: 'flow', id: 'f', title: 'F', nodes: [{ id: 'a', label: 'A', kind: 'module' }], drills: [], steps: [{ from: 'a', narration: 'x' }] }), undefined);
    assert.equal(tourFromArch({ type: 'arch', id: 'a', title: 'A', nodes: [], groups: [], edges: [], drills: [] }), undefined);
  });
});
