# Plan: Explicador

Approved by the user on 2026-11-09.

## Scope
- In: Phase 0 (interactivity spike and decision record) in detail; Phases 1 to 4 as outlined in the master prompt. Each phase becomes one task in `TASK.md` and ends at a user checkpoint.
- Out: anything not in the master prompt.

## Decisions

Fixed by the master prompt (change only with user confirmation):
1. Language-agnostic: no tree-sitter or LSP; the model provides understanding.
2. Light project index in `.explicador/index/` (file tree + import grep), read before code.
3. Scene cache in `.explicador/scenes/`, invalidated by hashes of referenced files.
4. Viewer in a local browser tab (localhost).
5. Two animation types: step-by-step flow playback and zoom between levels.
6. Interactive: clicking an element asks the agent to go deeper. It must work without launch flags (user, 2026-11-09).
7. Persistent findings appended to `FINDINGS.md` at the analyzed project's root (renamed from `HALLAZGOS.md` by the user on 2026-11-09).
8. EXL response format: Markdown + closed catalog of JSX-like tags, no embedded JavaScript.

Taken on 2026-11-09:
- **Location:** `C:\Users\abdai\desktop\ia\explicador`.
- **Language:** code, docs and commits in English, including `FINDINGS.md`. The agent always answers in the user's language.
- **Viewer UI:** React + Tailwind + shadcn/ui (`web-design-system` skill). The scene itself is SVG laid out with ELK.js.
- **Phase 0 compares three mechanisms:** (a) blocking tool, (b) headless relaunch, (c) Claude Code channels. After the user ruled out launch flags, (d) plugin monitor was added.
- **Interactivity outcome (F0):** (d) plugin monitor is the mechanism; (a) is the approved fallback, built only if a target environment cannot run plugin monitors; (b) discarded; (c) not built because it needs a launch flag. Details in `docs/decisions/interactivity.md`.
- **Repository:** private GitHub repo `abdair-coca/explicador`. `.dev/` is committed so cloud sessions see the plan (user, 2026-11-09). Project rules for cloud sessions live in `AGENTS.md` (imported by `CLAUDE.md`).
- **Plugin format** (checked against code.claude.com docs on 2026-11-09):
  - Manifest at `.claude-plugin/plugin.json`; only `name` is required.
  - Skills at `skills/<name>/SKILL.md`. Commands are now skills: `/explain` ships as `skills/explain/SKILL.md` and is invoked as `/explicador:explain` (plugin components are namespaced).
  - MCP server declared inline under `mcpServers` in `.claude-plugin/plugin.json` (moved from the root `.mcp.json` by the user on 2026-11-09, F2), started with `node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js`. State goes in the analyzed project (`${CLAUDE_PROJECT_DIR}`), never in the plugin root.
  - Monitors (re-checked 2026-11-09): default file `monitors/monitors.json`; entries are strict objects with `name`, `command`, `description` and optional `when` (`"always"` or `"on-skill-invoke:<skill>"`); `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PROJECT_DIR}` are substituted in `command`; monitors do not start under `claude -p`.
  - Local development: `claude --plugin-dir .`, `/reload-plugins`, `claude plugin validate .`. A local `marketplace.json` is only for installing.
- **Monorepo:** npm workspaces (`server`, `viewer`).
- **Decision record path:** `docs/decisions/interactivity.md` (English form of `docs/decisiones/interactividad.md`).

## Repository layout

```
explicador/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json        # local install
├── monitors/monitors.json      # click feed (interactivity mechanism d)
├── skills/
│   ├── explicador/SKILL.md     # how to explain and write EXL
│   └── explain/SKILL.md        # /explicador:explain <topic>
├── server/                     # MCP server, Node + TS
│   ├── src/{parser,cache,index,findings,bridge,clicks}/
│   └── test/
├── viewer/                     # Vite + React + TS
│   └── src/{layout,animation,components}/
├── examples/                   # sample project (Phase 1)
├── docs/EXL.md, docs/decisions/
├── package.json                # npm workspaces
└── README.md, AGENTS.md
```

## Phases

- [x] **F0. Interactivity spike.** Done 2026-11-09: (d) plugin monitor chosen; see `docs/decisions/interactivity.md`.
  - Setup: root `package.json` (workspaces), `.gitattributes` (`* text=auto eol=lf`), base `tsconfig` (strict), short `README.md` and `AGENTS.md`.
  - Shared base in `spikes/interactivity/`: one stdio MCP server (Node + TS, official MCP SDK) plus a page on 127.0.0.1 (free port, per-launch token, `Origin` check) with a "click node X" button. The mechanism is chosen by a flag.
  - (a) `wait_for_interaction()` blocks until a click and sends a progress notification every 60 s (stdio idle timeout is 30 min). Docs: after 2 min Claude Code moves the call to the background and delivers the result as a task notification. Measure: can the user type while it waits, does a click wake an idle Claude, what happens if it arrives mid-answer.
  - (b) The server runs `claude -p --resume <session-id> "<click prompt>"`. Docs: it appends to the same transcript, but do not say whether the open terminal shows it; `-p` drops `--plugin-dir` and interactive permissions. Measure: visibility, interleaving, latency, tokens per click, how to obtain the session id.
  - (c) The server declares `experimental['claude/channel']` and pushes `notifications/claude/channel`. Constraints from docs: research preview; interactive sessions only; requires `claude --dangerously-load-development-channels server:<name>` (own plugins are not on the allowlist); claude.ai login or Console API key; on Claude Code 2.1.232+ (installed: 2.1.319) may need `MCP_PROTOCOL_NEGOTIATION=legacy`.
  - Comparison criteria: delivered when Claude is idle and when busy; visible in the terminal; latency; tokens per click; startup friction; robustness (timeouts, two open sessions, restarts); security.
  - (a) and (c) need an interactive session: guided manual test by the user, about 10 minutes.
  - Criterion: `docs/decisions/interactivity.md` with the measured table and a recommendation; the user approves it (checkpoint). The spike's typecheck passes.
- [x] **F1. MVP.** Done 2026-11-09 in an unattended cloud session; decisions taken there are listed under "Decisions pending user review".
  - Original scope: EXL parser + validation, `ensure_index`, cache with invalidation, `FINDINGS.md`, viewer with `<arch>` and `<flow>`, development mode, `/explicador:explain`, skill, `docs/EXL.md`, sample project in `examples/`.
  - Criterion: in the sample project, `/explicador:explain login` produces an animated scene; repeating it unchanged serves it from cache without reading code; editing a referenced file marks it stale. Parser tests (valid, invalid, incomplete) and cache-invalidation tests pass; lint passes.
- [x] **F2. Interactivity and zoom.** Done 2026-11-09 except the user's interactive check. `<group>`, `<drill>`, zoom transitions, breadcrumbs, and click delivery through the plugin monitor chosen in F0 (per-session runtime file in `.explicador/`, click messages built from scene data). `spikes/interactivity/` removed.
  - Decisions (user, 2026-11-09): `<group>` zooms locally without Claude; `<drill node topic>` opens a cached fresh scene or asks Claude; clicks on other nodes also ask Claude; MCP config inline in `plugin.json`; monitor `when: "always"`.
  - Criterion: automatic tests (parser, levels, click message from scene data, runtime file, one monitor line per click end to end, cached drill, breadcrumb trail) pass with typecheck and lint; plus a ~5 minute interactive check by the user: in `examples/shop`, `/explicador:explain login`, click a node → Claude renders a deeper scene and the viewer zooms in; breadcrumb back zooms out; clicking a group zooms locally. **Interactive check: pending (user).**
- [x] **F3. Presentation mode.** Done 2026-11-09 except the user's review. Manual advance, visible narration, export a scene as standalone HTML.
  - Decisions (user, 2026-11-09): "Present" shows full-screen slides (each Markdown block, each `<arch>` with group zoom, each `<flow>` step with large narration), manual advance only (→/Space/PageDown, ←/PageUp, Home/End, F full screen, Esc). Export is one self-contained `.html` (JS, CSS, scene inline, CSP with no network) that works from `file://`; from a viewer button (`GET /api/export`) and the `export_scene` tool (`.explicador/exports/<key>.html`).
  - Criterion: slide-order and export tests, `export_scene` end to end, Playwright (keyboard presentation; exported file from `file://` with no requests and no errors), typecheck and lint; plus a ~5 minute review by the user. **User review: pending.**
- [x] **F4. More views.** Done 2026-11-09 except the user's review. `<data>` and `<state>`.
  - Decisions (user, 2026-11-09): `<data>` is a data model (entities with typed fields and PK/FK/unique keys, relations with cardinality `1-1`/`1-n`/`n-1`/`n-n`); `<state>` is a state machine (`<status>` with one initial and optional finals, `<transition>` on events) with an optional narrated `<walk>` played like a flow; entities and states take refs and drills and are clickable; both views work in presentation and export.
  - Criterion: parser tests (valid, invalid, incomplete), slides, click targets, render/cache/invalidation end to end, typecheck and lint; Playwright on sample scenes (walk, presentation, export); plus a ~5 minute review by the user. **User review: pending.**

## Decisions pending user review

Taken during the unattended F1 session (2026-11-09) as the most conservative option consistent with this plan. Each can be reverted.

1. **Commits and pushes per part.** The session instructions asked for one commit per finished part (parser, cache, index, findings, viewer + server, plugin + skill, close) pushed to `claude/phase-1-mvp-implementation-aua4cb`, overriding "one commit per phase, no push" for this phase. No attribution lines, per `AGENTS.md`.
2. **EXL catalog for F1.** `<arch title id?>` with `<node>`/`<edge>`; `<flow title id?>` with `<node>`/`<step from to? label? ref?>narration</step>`. A step without `to` is an action inside `from`. Node `kind` is a closed set (`actor, ui, service, module, function, store, external`). Narration is required on every step; `title` is required on blocks. Limits: 60 nodes, 120 edges, 100 steps per block. Spec in `docs/EXL.md`.
3. **Tags only at line start.** Scene tags are recognized at the start of a line outside code fences; any other tag there (including HTML) is an error, while inline `<x>` in prose stays Markdown and is rendered without raw HTML.
4. **Refs must exist.** `render_scene` refuses a scene whose refs point to missing files or outside the project, so the cache never tracks a hallucinated path. `add_finding` applies the same rule. Paths use forward slashes (Windows backslashes are rejected with a message).
5. **Cache key.** Topics are slugged (`Login flow` → `login-flow`, accents removed); the agent is told to reuse short stable topics. Hashes are SHA-256 of raw bytes, so a pure line-ending change marks a scene stale.
6. **Tools.** Four MCP tools: `ensure_index`, `show_scene` (fresh → shown + EXL returned, stale → shown with a warning + changed files + EXL, missing), `render_scene` (validate, cache, show), `add_finding`. `ensure_index` returns the tree and import graph inline (up to ~24k characters) besides writing them to `.explicador/index/`.
7. **Index rules.** Skips dot-folders, common dependency/build folders (`node_modules`, `vendor`, `dist`, `build`, `out`, `target`, `obj`, `coverage`, `__pycache__`, `venv`, …) and simple names/`*.ext` lines from the root `.gitignore`; up to 5000 files; grep only files under 512 KB with a known extension. Relative imports are resolved to project files.
8. **Findings format.** `## YYYY-MM-DD · <topic>: <title>`, optional `Refs:` line, body; a header is added when the file is new; an identical finding is skipped. Findings are written in English (plan language rule); scene text follows the user's language.
9. **"Development mode"** was read as: run from a checkout with `claude --plugin-dir .` against built files (`npm run build`), `npm run dev -w server|viewer` watch builds, `npm run preview -- <file.exl.md>` to serve an EXL file with live reload and no Claude, and Vite dev server proxying `/api` via `EXPLICADOR_SERVER`. The root `dev` script was dropped because npm runs workspace scripts one after another.
10. **Viewer details.** shadcn/ui components were hand-written in shadcn style (`Button`, `Badge`) instead of using the shadcn CLI. The viewer opens a tab only when no tab is connected; later scenes update the open tab over Server-Sent Events. The bridge serves a CSP and `Referrer-Policy: no-referrer`. `EXPLICADOR_NO_BROWSER=1` disables opening tabs. Flow playback autoplays unless the user prefers reduced motion.
11. **Tests without new dependencies.** `npm test` uses `node --test` on the TypeScript sources (type stripping), including an end-to-end stdio test; no Vitest. The viewer has no unit tests yet (checked with a Playwright screenshot during the session).
12. **Node version.** The cloud session had Node 22.23; everything ran there (type stripping is on by default since 22.18). README now says 22.18+ (24+ recommended) instead of 24+.

Taken during F2 (2026-11-09), within the user's choices:
13. **Answer to a click.** After a click is sent to Claude, the next scene rendered within 15 minutes is treated as its answer and gets the clicked scene as its parent in the trail, whatever topic Claude used. Re-rendering the same scene keeps its trail; any other unprompted scene starts a new trail.
14. **Context nodes.** Inside a group, edges that leave it end in faded, non-clickable boxes named after the outside node; merged edges keep a label only when all of them share it.
15. **No monitor.** When no monitor is connected (for example under `claude -p`), the viewer says so and suggests `/explicador:explain <topic>`; the click is not queued.
16. **Development origin.** `EXPLICADOR_DEV_ORIGIN` lets the Vite dev page post clicks; unset by default.

Taken during F3 (2026-11-09), within the user's choices:
17. **Offline copies** show no click-to-Claude affordances and their breadcrumbs are plain text; drill marks (↘) still show which nodes have a deeper scene.
18. **Export size.** The file inlines the whole viewer bundle (about 1.8 MB, mostly ELK); no minification beyond Vite's default.
19. **Presentation keys.** Enter and Space activate a focused button or node (e.g. a group) instead of advancing; Backspace also goes back.
20. **`EXPLICADOR_VIEWER_DIR`** overrides the viewer folder the server serves and exports; used by tests.

Taken during F4 (2026-11-09), within the user's choices:
21. **Tag names.** States are `<status>` (not `<state>`, which is the block), walk steps are `<go event>`, and roles are an attribute (`role="initial|final"`) because EXL has no boolean attributes.
22. **Walk validation.** The parser simulates the walk: each `<go event>` must match exactly one transition leaving the current state; the walk starts at the initial state.
23. **Relations are undirected** in the drawing (no arrowheads); the cardinality is in the label (`owns (1 : 1)`), not crow's-foot markers.
24. **Layout.** In state machines only, ELK breaks cycles by declaration order and pins the start dot to the first layer; other views keep ELK's defaults (declaration order drew a reversed-looking edge in the login architecture).
25. **Limits.** Up to 40 fields per entity; entities and states count against the 60-node limit, relations and transitions against the 120-edge limit, walk steps against the 100-step limit.

Open points:
- Resolved in F2: the plugin's MCP config moved inline into `plugin.json`, so this repo no longer offers a broken project server.
- Installing from a marketplace is not supported yet: `server/dist`, `viewer/dist` and `node_modules` are not committed, so an installed copy would need a build or dependency step (e.g. a SessionStart hook into `${CLAUDE_PLUGIN_DATA}`). `claude plugin validate .` warns that the README has no install line.
- Plugin docs were not re-fetched in this session: the plan records them as verified on 2026-11-09, the same day.

## Commit rules
- One commit per finished phase with `my-commit` (author abdair-coca, no `Co-Authored-By`), no push.
- Before committing: tests and lint of the touched area pass, `TASK.md` reset, `git status` reviewed, phase files staged by name.
- `.dev/` is committed with the phase so cloud sessions can continue the plan.
- End of each phase: summary of what was done, what is pending and how to test it.

## Status
| Phase | Status |
|---|---|
| F0 | done (2026-11-09) |
| F1 | done (2026-11-09), decisions pending user review |
| F2 | done (2026-11-09); user gave the go-ahead to continue |
| F3 | done (2026-11-09); user gave the go-ahead to continue |
| F4 | done (2026-11-09), user review pending |
