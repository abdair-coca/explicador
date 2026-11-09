# Current Task

## F2. Interactivity and zoom

### Decisions (user, 2026-11-09)
- `<group>` groups nodes inside `<arch>`: shown collapsed as one box; clicking it zooms in locally, without Claude.
- `<drill node="x" topic="..."/>` marks a node with a deeper scene: cached and fresh → opened with a zoom; otherwise the click asks Claude to build it. Clicking any other node also asks Claude to go deeper.
- Criterion: automatic tests plus a ~5 minute interactive check by the user (monitors do not run under `claude -p`).
- Plugin MCP config moves inline into `.claude-plugin/plugin.json`; the root `.mcp.json` goes away.
- The click monitor runs with `when: "always"`.

### Criterion
- Automatic: parser tests for `<group>`/`<drill>`; level collapse tests; click message built from scene data (not page text); per-session runtime file written and removed; the monitor process prints exactly one line per click (end to end over stdio + HTTP); opening a cached drill or breadcrumb ancestor publishes it with the right trail; typecheck, lint, tests pass; `spikes/interactivity/` removed.
- Manual (user, interactive `claude --plugin-dir ../..` in `examples/shop`): `/explicador:explain login`, click a node → Claude renders a deeper scene and the viewer zooms in; breadcrumb back zooms out; clicking a `<group>` zooms locally.

### Files
- `server/src/parser/`: `<group>`, `<drill>`.
- `server/src/clicks/`: click message, runtime file, monitor (`monitor.ts`).
- `server/src/bridge/`, `server/src/tools.ts`, `server/src/scene.ts`: `/api/click`, `/api/open`, `/api/clicks` feed, scene trail.
- `viewer/src/layout/levels.ts`, `viewer/src/components/*`, `viewer/src/App.tsx`: group levels, clickable nodes, zoom transitions, breadcrumbs, pending state.
- `monitors/monitors.json`, `.claude-plugin/plugin.json`, skills, `docs/EXL.md`, README, sample scene.

### Plan
1. Parser `<group>`/`<drill>` + tests → commit.
2. Click delivery: runtime file, feed, monitor, click/open endpoints, trail + tests → commit.
3. Viewer: levels, zoom, breadcrumbs, clicks → commit.
4. Plugin config, docs, skill, sample, remove spike → commit; close the phase.

### Results
- Parser: typecheck 0, lint 0, `npm test` 46/46 pass (groups nest, edges may target groups, drills validated; bad groups and drills rejected).
