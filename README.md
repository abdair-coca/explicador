# Explicador

Claude Code plugin that explains software systems with animated, interactive diagrams. Ask "explain the login" and Claude answers with short prose plus scenes that play in a local browser tab. Built for developers reading unfamiliar code and for teachers presenting a system step by step.

## Status

- Phase 0 (done): clicks in the viewer reach Claude through a plugin monitor, with no launch flags (`docs/decisions/interactivity.md`).
- Phase 1 (MVP, done): EXL parser, project index, scene cache with hash invalidation, `FINDINGS.md`, viewer with `<arch>` and `<flow>`, the `/explicador:explain` skill and a sample project.
- Phase 2 (interactivity and zoom, done): `<group>` zooms in locally, clicking a node asks Claude to go deeper (or opens a cached `<drill>`), breadcrumbs zoom back out.
- Phase 3 (presentation, done): full-screen slides with manual advance and large narration, and export of a scene as one HTML file that works offline.
- Phase 4 (more views, done pending the user's review): `<data>` data models (entities, fields, relations with cardinality) and `<state>` machines with an optional narrated walk.
- Phase 5 (Titi look, done pending the user's review): the viewer follows SocialNeo's Titi design system (cream and yellow, Nunito, tiles with a hard shadow, playful entrances), edge labels get their own room and stay legible, long chains wrap into rows, and boxes show a one-line `desc`. Next: flows that make sense (F6), a detail panel with key code (F7) and questions about a box (F8). Plan: `.dev/PLAN.md`.

## Use it (from a checkout)

Requires Node 22.18+ (24+ recommended) and Claude Code.

```sh
npm install
npm run build            # server/dist and viewer/dist; the plugin runs the built files
cd examples/shop
claude --plugin-dir ../..
> /explicador:explain login
```

The first run reads the index and the code, then renders the scene and opens the viewer. Asking again with no changes serves the cached scene without reading code. Editing a referenced file marks the scene stale, and the next explanation refreshes it.

**Present** turns the scene into full-screen slides (each prose block, each architecture, each flow step) that only advance when you press →, Space or PageDown; ← goes back, F toggles full screen, Esc leaves.

**Export** downloads the scene as one `.html` file with everything inline. It opens from disk in any browser with no server or network (a CSP blocks all requests); playback, group zoom and presentation work, clicks to Claude do not. Claude can also write it with the `export_scene` tool (to `.explicador/exports/<topic>.html`), e.g. "export the login scene so I can share it".

In the viewer, click a group to zoom into it, or any other node to go deeper: Claude receives the click (through the plugin monitor), explains that part, and the viewer zooms into the new scene. Breadcrumbs at the top go back. Clicks need an interactive session; plugin monitors do not run under `claude -p`.

State lives in the analyzed project: `.explicador/index/` (file tree + imports), `.explicador/scenes/` (cached scenes) and `FINDINGS.md`.

## How it fits together

- `.claude-plugin/plugin.json`: plugin manifest, including the MCP server (`node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js`).
- `monitors/monitors.json`: the click monitor (`server/dist/monitor.js`). It reads `.explicador/runtime/<session id>.json`, written by the MCP server of the same session, and prints one line per click, which Claude Code delivers to Claude.
- `skills/explicador/`: how Claude explains and writes EXL; `skills/explain/`: `/explicador:explain <topic>`.
- `server/`: MCP tools `ensure_index`, `show_scene`, `render_scene`, `export_scene`, `add_finding`, plus a 127.0.0.1 bridge (Host check, per-launch token, Origin check on POST) that serves the viewer, takes clicks and feeds the monitor.
- `viewer/`: Vite + React + Tailwind; scenes are SVG laid out with ELK.js.
- `docs/EXL.md`: the scene format. Views: `<arch>` (parts, with `<group>`), `<flow>` (steps), `<data>` (data model), `<state>` (state machine with a walk).
- `examples/scenes/`: sample scenes for `examples/shop`; try them with `npm run preview -- examples/scenes/session-states.exl.md --project examples/shop`.

## Develop

```sh
npm run typecheck
npm run lint
npm test                 # parser, cache, index, findings, clicks, export, levels, slides, end-to-end over stdio
npm run build
```

Development mode, without Claude:

- `npm run preview -- examples/scenes/login.exl.md --project examples/shop` serves an EXL file in the viewer and reloads it on every save, printing validation errors.
- `npm run dev -w server` and `npm run dev -w viewer` rebuild on change; in Claude Code, `/reload-plugins` picks up the new server.
- `EXPLICADOR_SERVER=http://127.0.0.1:<port> npm run dev:server -w viewer` runs Vite with hot reload against a running bridge; open `http://localhost:5173/?t=<token>` with the token from the bridge URL. To click from the Vite page, start the bridge with `EXPLICADOR_DEV_ORIGIN=http://localhost:5173`.
- `EXPLICADOR_NO_BROWSER=1` stops the server from opening browser tabs.
