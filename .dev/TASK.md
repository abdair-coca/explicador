# Current Task

## F1. MVP

### Goal
`/explicador:explain login` on the sample project produces an animated scene in the local viewer; asking again with no changes serves it from cache without reading code; editing a referenced file marks the scene stale.

### Files
- `server/` (workspace `@explicador/server`): MCP server, Node + TS, built to `server/dist/`.
  - `src/parser/`: EXL tokenizer, parser and validator (`<arch>`, `<flow>`, `<node>`, `<edge>`, `<step>`).
  - `src/cache/`: scene store in `.explicador/scenes/`, SHA-256 of referenced files, fresh/stale/missing.
  - `src/index/`: `ensure_index` builds `.explicador/index/` (file tree + import grep), incremental by mtime/size.
  - `src/findings/`: appends to `FINDINGS.md` at the project root.
  - `src/bridge/`: local HTTP server (127.0.0.1, Host check, per-launch token) that serves the built viewer and the current scene.
  - `src/index.ts`: MCP tools `ensure_index`, `show_scene`, `render_scene`, `add_finding`.
  - `test/`: `node --test` suites for parser (valid, invalid, incomplete), cache invalidation, index, findings and an end-to-end stdio run.
- `viewer/` (workspace `@explicador/viewer`): Vite + React + Tailwind, SVG scene laid out with ELK.js; `<arch>` reveal animation and `<flow>` step playback.
- Plugin: `.claude-plugin/plugin.json`, `.mcp.json`, `skills/explicador/SKILL.md`, `skills/explain/SKILL.md`.
- `docs/EXL.md`, `examples/shop/` (sample project with a login), README update.

### Plan
1. Parser + tests → commit.
2. Cache + tests → commit.
3. Index + tests → commit.
4. Findings + tests → commit.
5. Bridge, MCP server, viewer, e2e test → commit.
6. Plugin manifest, skills, `docs/EXL.md`, sample project → commit.
7. Close the phase: reset this file, mark F1 in `PLAN.md` → commit.

### Validation
- `npm run typecheck`, `npm run lint`, `npm test` exit 0.
- End-to-end stdio test on a copy of `examples/shop`: render → fresh from cache → edit a ref → stale.
- Viewer smoke check with the pre-installed Playwright Chromium (screenshot of `<arch>` and `<flow>`).
- Not runnable here: an interactive Claude Code session running `/explicador:explain login` (no interactive terminal or login in this cloud session).

### Results
(filled in as parts finish; environment: Node 22.23.4 in the cloud session, npm 10.9.9)
- Parser: typecheck 0, lint 0, `npm test` 17/17 pass (valid, invalid, incomplete suites); `npm run build -w server` emits `server/dist/`.
- Cache: typecheck 0, lint 0, `npm test` 26/26 pass (fresh, modified, deleted, restored, unrelated change, missing refs, corrupted entry).
- Index: typecheck 0, lint 0, `npm test` 33/33 pass (import grep for JS/TS, Python, Go, Rust, Java, C, Ruby; relative resolution; ignore rules; incremental rebuild).
- Findings: typecheck 0, lint 0, `npm test` 37/37 pass (create with header, keep hand-written content, skip duplicates, validation).
- Server + viewer: typecheck 0 (server, viewer, spike), lint 0, `npm test` 43/43 pass, including the stdio end-to-end run on a copy of `examples/shop` (index → missing → render → fresh from cache with the EXL returned → edit `src/auth/sessions.js` → stale with the changed file; bridge refuses a bad or missing token; invalid EXL and missing refs save nothing; finding appended). `npm run build` builds `server/dist` and `viewer/dist`.
- Viewer smoke check: `npm run preview -- examples/scenes/login.exl.md --project examples/shop` + Playwright Chromium. 13 scene nodes rendered, step 5 of 7 highlighted with its narration and ref, no console errors under the CSP, bad token → 403. Screenshot inspected by the agent only.

- Plugin + skills: `claude plugin validate .` passes with one warning (README has no marketplace install line; no marketplace yet). Built server checked over stdio from `server/dist/index.js` (render + viewer index 200).
- Criterion, headless (`claude -p --plugin-dir`, Claude Code 2.1.319, on a copy of `examples/shop`, allowed tools: the four Explicador tools + Read/Grep/Glob):
  - Run 1: `show_scene` missing → `ensure_index` → read code → `render_scene` (one EXL error fixed by the agent) → cached, 9 refs; one finding appended. 11 turns, $0.40.
  - Run 2, unchanged: `show_scene` fresh, answered from the EXL with no code reads. 5 turns, $0.15.
  - Run 3, after appending a comment to `src/auth/sessions.js`: `show_scene` stale listing that file; the agent re-read only it and re-rendered. 7 turns, $0.23.
- Not run: an interactive session watching the scene animate in a real browser tab (no display or interactive terminal in the cloud session; `xdg-open` is absent, so the server ran with `EXPLICADOR_NO_BROWSER=1`). Covered partly by the Playwright screenshot above.
