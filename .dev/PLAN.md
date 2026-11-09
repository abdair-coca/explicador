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
  - MCP server declared in the root `.mcp.json`, started with `node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js`. State goes in the analyzed project (`${CLAUDE_PROJECT_DIR}`), never in the plugin root.
  - Local development: `claude --plugin-dir .`, `/reload-plugins`, `claude plugin validate .`. A local `marketplace.json` is only for installing.
- **Monorepo:** npm workspaces (`server`, `viewer`).
- **Decision record path:** `docs/decisions/interactivity.md` (English form of `docs/decisiones/interactividad.md`).

## Repository layout

```
explicador/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json        # local install
├── .mcp.json
├── monitors/monitors.json      # click feed (interactivity mechanism d)
├── skills/
│   ├── explicador/SKILL.md     # how to explain and write EXL
│   └── explain/SKILL.md        # /explicador:explain <topic>
├── server/                     # MCP server, Node + TS
│   ├── src/{parser,cache,index,findings,bridge}/
│   └── test/
├── viewer/                     # Vite + React + TS
│   └── src/{layout,animation,components}/
├── spikes/interactivity/       # Phase 0 only; removed once Phase 2 reimplements the winner
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
- [ ] **F1. MVP.** EXL parser + validation, `ensure_index`, cache with invalidation, `FINDINGS.md`, viewer with `<arch>` and `<flow>`, development mode, `/explicador:explain`, skill, `docs/EXL.md`, sample project in `examples/`.
  - Criterion: in the sample project, `/explicador:explain login` produces an animated scene; repeating it unchanged serves it from cache without reading code; editing a referenced file marks it stale. Parser tests (valid, invalid, incomplete) and cache-invalidation tests pass; lint passes.
- [ ] **F2. Interactivity and zoom.** `<group>`, `<drill>`, zoom transitions, breadcrumbs, and click delivery through the plugin monitor chosen in F0 (per-session runtime file in `.explicador/`, click messages built from scene data). Remove `spikes/interactivity/` once this works.
  - Criterion: defined when F2 starts, from the F0 decision.
- [ ] **F3. Presentation mode.** Manual advance, visible narration, export a scene as standalone HTML.
  - Criterion: defined when F3 starts.
- [ ] **F4. More views.** `<data>` and `<state>`.
  - Criterion: defined when F4 starts.

## Commit rules
- One commit per finished phase with `my-commit` (author abdair-coca, no `Co-Authored-By`), no push.
- Before committing: tests and lint of the touched area pass, `TASK.md` reset, `git status` reviewed, phase files staged by name.
- `.dev/` is committed with the phase so cloud sessions can continue the plan.
- End of each phase: summary of what was done, what is pending and how to test it.

## Status
| Phase | Status |
|---|---|
| F0 | done (2026-11-09) |
| F1 | pending |
| F2 | pending |
| F3 | pending |
| F4 | pending |
