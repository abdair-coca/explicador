# Current Task

## F21b. Rules the server checks

**Goal:** the skill's rules that today depend on the model alone are checked by the server. `render_scene` lists every failure as a `Warning:` line with how to fix it, stores them with the cached scene (so evals can read them), and `show_scene` asks to fix pending warnings before answering from a cached scene. Warnings never block a render (user's choice: warn and require the fix).

**Files:**
- `server/src/rules.ts` (new): the rules and `sceneWarnings(root, blocks, refs)`, which also gathers the existing range and slide warnings.
- `server/src/tools.ts`: `render_scene` and `show_scene` use it; one `Warning:` line per warning.
- `server/src/cache/index.ts`: `warnings` stored with the scene when there are any.
- `server/test/rules.test.ts` (new), `server/test/e2e.test.ts`, `server/test/slides.test.ts`, `server/test/interactivity.test.ts`: tests.
- `examples/scenes/*.exl.md`: the examples follow every rule.
- `skills/explicador/SKILL.md`, `skills/explicador/presenting.md`, `docs/EXL.md`: the rules and their limits, said the same way.

**Rules (all warnings):**
1. Numbers: in a scene that refers to a notebook, every number in a component's data (stat and stage values, chart and matrix rows, calc parts and total, threshold scores, trace numbers, bars, table values and vectors, plot marks, curve points and parameters, scatter dots and boundary, space positions and scores, cosine dimensions and score, compare cells, decimals in derivations) appears, as printed or rounded from a printed number, in an output or a cell of the referred notebooks or in another referred file. A percentage may be a printed fraction × 100.
2. Boxes (`<node>`, `<group>`, `<entity>`, `<status>`): a `desc`, not equal to the label.
3. Size: at most 12 boxes per level of an `<arch>` (top level or inside a group) and 12 steps per `<flow>`.
4. Subtitles (narration and notes that Present shows under a part): at most 25 words.
5. Lessons (scenes with `<chapter>`): every chapter has a `goal` and a `<quiz>`, the last chapter is a review of at least 3 flashcards, and the lesson has a `<trace>` and a `<concept>`.
6. Quizzes: a `why` does not open with a verdict ("Right,", "Wrong:", "Correcto.", …): the viewer already says it.
7. Code diagrams (`<arch>`, `<flow>`, `<data>`, `<state>`): at least one `<code>`.

**Validation:** rule tests (each passes and fails), the example scenes give no warning, `render_scene` stores warnings and `show_scene` asks to fix them (e2e); `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`.

**Results:** typecheck 0, lint 0, build OK, server 220/220 (16 new in `rules.test.ts`, 1 new e2e), viewer 162/162. The five example scenes, the guide's two templates and the skill's example give no warning.
