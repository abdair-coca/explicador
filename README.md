# Explicador

Claude Code plugin that explains software systems with animated, interactive diagrams. Ask "explain the login" and Claude answers with short prose plus scenes that play in a local browser tab. Built for developers reading unfamiliar code and for teachers presenting a system step by step.

## Status

- Phase 0 (done): clicks in the viewer reach Claude through a plugin monitor, with no launch flags (`docs/decisions/interactivity.md`).
- Phase 1 (MVP, done): EXL parser, project index, scene cache with hash invalidation, `FINDINGS.md`, viewer with `<arch>` and `<flow>`, the `/explicador:explain` skill and a sample project.
- Phase 2 (interactivity and zoom, done): `<group>` zooms in locally, clicking a node asks Claude to go deeper (or opens a cached `<drill>`), breadcrumbs zoom back out.
- Phase 3 (presentation, done): full-screen slides with manual advance and large narration, and export of a scene as one HTML file that works offline.
- Phase 4 (more views, done pending the user's review): `<data>` data models (entities, fields, relations with cardinality) and `<state>` machines with an optional narrated walk.
- Phase 5 (Titi look, done pending the user's review): the viewer follows SocialNeo's Titi design system (cream and yellow, Nunito, tiles with a hard shadow, playful entrances), edge labels get their own room and stay legible, long chains wrap into rows, and boxes show a one-line `desc`.
- Phase 6 (flows that make sense, done pending the user's review): steps and edges have a `kind` (calls solid, returns dashed, async dotted, with a legend); a flow step can only start where the story already is, so scenes cannot jump; the narration links the step before and after.
- Phase 7 (detail panel, done pending the user's review): clicking a box opens a side panel with its description, a longer explanation and its key code (`<code>`, lines copied from the file by the server, highlighted), plus "Go deeper".
- Phase 8 (questions, done pending the user's review): the panel has a question box; Claude answers in the panel with the `answer_question` tool (Markdown, code lines copied by the server, an optional link to a scene it drew in the background). Questions are saved with the scene.
- Phase 9 (code window, done pending the user's review): clicking a box also opens a VS Code-like read-only window under the diagram (tabs, file explorer, highlighted lines); Claude can walk you through code with the `explain_code` tool, a guided tour that highlights each part with a note, and an answer can carry a tour too. 
- Phase 10 (focus, explain buttons, flows with code, notebooks; done pending the user's review): every box focuses its own lines, a flow or architecture can be walked with its code in one click, "Explain code" asks Claude for a tour, Jupyter notebooks render as cells with outputs, the code window covers the page below the top bar, and Markdown tables render. Plan: `.dev/PLAN.md`.
- Phase 12 (notebook lessons, done pending the user's review): notebooks and data or ML code are explained as lessons by chapters, with the real data animated (the data's journey, value traces, charts, confusion and other matrices), checks per chapter, a final review of flashcards and a progress rail. Example: `examples/scenes/notebook-lesson.exl.md` over `examples/notebook/reviews.ipynb`.
- Phase 13 (play with the model, done pending the user's review): `<calc>` animates how a model scores one input (a waterfall of the intercept and each feature's weight, then the sigmoid, the probability and the decision), `<threshold>` lets the reader move a classifier's threshold over the real test probabilities with the confusion matrix and metrics recomputed live, and Practice mode drills every check of a lesson, missed ones first, with a score.
- Phase 14 (a presentation that grabs attention, done pending the user's review): Present mode gives each block one slide revealed part by part (sentences, list items, callouts, stats cards, journey stages, matrix highlights, a quiz then its answer), with numbers that count up, a marker stroke under bold words, confetti on answers, slides that move in the direction of travel, chapters that open with a yellow wipe onto a night-blue card, a progress bar by chapter, and optional sounds.
- Phase 15 (formulas and concept cards, done pending the user's review): LaTeX formulas (`$…$`, `$$…$$`) render with KaTeX wherever Markdown does and are checked by the parser; `<concept>` shows a new idea as a card (definition, analogy, formula, example), and in Present mode its term fills the slide, flies to the top, and the formula assembles symbol by symbol.
- Phase 16 (rigorous animation and spectacular components, done pending the user's review): the viewer animates with GSAP from one set of motion tokens, and in Present mode a part taken back with ← plays backwards. `<theme>` decorates a scene with line art chosen from what it is about (12 themes; a chapter can take its own). New blocks: `<plot>` (functions or printed points on their axes, with a point that travels to each mark), `<derive>` (a formula changed line by line, its shared symbols gliding between lines), `<scatter>` (points by class with a decision boundary and its mistakes counted), `<compare>` (two things row by row with a tally) and `<timeline>`. Particles flow along the active edge of flows and journeys.
- Phase 18 (presentations any model can make, done pending the user's review): the skill's `presenting.md` teaches a picture for every idea, plain words for a non-technical audience by default, LaTeX and templates to copy, and `render_scene` warns about slides that would be text alone.

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

**Present** turns the scene into full-screen slides for a speaker: the title as the cover, then one per component (prose and narration stay on the page), revealed part by part: each →, Space or PageDown shows the next part (a sentence group, a list item, a flow step, a matrix highlight, a quiz's answer) and then the next slide. ← goes back, Shift+→ skips to the next slide, F toggles full screen (the bars hide while the mouse rests), M turns the sounds on or off (off by default), and Esc leaves.

**Export** downloads the scene as one `.html` file with everything inline. It opens from disk in any browser with no server or network (a CSP blocks all requests); playback, group zoom, presentation and the detail panel (with its key code) work; "Go deeper" and questions do not. Claude can also write it with the `export_scene` tool (to `.explicador/exports/<topic>.html`), e.g. "export the login scene so I can share it".

In the viewer, click a group to zoom into it, or any other box to open its detail panel: what it does, a longer explanation and its key code, read from the file. "Go deeper" in the panel asks Claude (through the plugin monitor) to explain that part, and the viewer zooms into the new scene. Breadcrumbs at the top go back.

**Code window.** Clicking a box with a `ref` also opens a read-only code window like an IDE: it covers the page from under the top bar down (the detail panel stays visible beside it), with tabs, a file explorer of the project, line numbers, colors, and the box's lines highlighted. Esc or the X closes it (it slides away) and clicks stop opening it until you press **View code** in the panel. Below 1024 px it opens only from **View code**. While a flow plays with the window open, the code moves to the lines of the active step.

**Notebooks.** A `.ipynb` file shows as cells: Markdown rendered (HTML banners and tables too), code highlighted with its number, and the outputs (text, errors, simple HTML tables, images). Refs to a notebook are cell numbers (`analysis.ipynb:3-5`). Claude reads notebooks with the `read_notebook` tool instead of the raw JSON. Running cells is not supported yet.

**Tours.** A flow and an architecture have an **Explain with code** button: it walks the code of its steps (or boxes) at once, with their narration as notes, without waiting for Claude. **Explain code** in a box's panel and in the code window asks Claude for a tour of that code, and you can ask in the chat too ("walk me through how a login is checked, from the form to the database"): the window jumps from step to step across files, highlights the lines (or cells), dims the rest and shows a note under them. ← and → move between steps, the dots jump, and the play button advances by itself. An answer to a panel question can come with a tour as well ("Walk through the code"). The window reads files from the project through the local bridge (see Architecture); it is not in exported files.

The box at the bottom of the panel asks Claude a question about that part (Enter sends; three suggestions get you started). The answer appears in the panel a few seconds later, with the lines of code that prove it and, when Claude drew one, a link to a deeper scene; the view never jumps on its own. Boxes you asked about carry a "?" mark, and questions stay with the scene until it is rendered again. Going deeper and asking need an interactive session; plugin monitors do not run under `claude -p`.

State lives in the analyzed project: `.explicador/index/` (file tree + imports), `.explicador/scenes/` (cached scenes with their questions and answers) and `FINDINGS.md`.

## How it fits together

- `.claude-plugin/plugin.json`: plugin manifest, including the MCP server (`node ${CLAUDE_PLUGIN_ROOT}/server/dist/index.js`).
- `monitors/monitors.json`: the click monitor (`server/dist/monitor.js`). It reads `.explicador/runtime/<session id>.json`, written by the MCP server of the same session, and prints one line per click or question, which Claude Code delivers to Claude.
- `skills/explicador/`: how Claude explains and writes EXL; `skills/explain/`: `/explicador:explain <topic>`.
- `server/`: MCP tools `ensure_index`, `show_scene`, `render_scene`, `answer_question`, `explain_code`, `read_notebook`, `export_scene`, `add_finding`, plus a 127.0.0.1 bridge (Host check, per-launch token, Origin check on POST) that serves the viewer, takes clicks, questions and explain requests, feeds the monitor and serves project files to the code window (`GET /api/file`, `/api/tree`: text files up to 512 KB and notebooks up to 8 MB inside the project, never hidden files or folders such as `.env` or `.git`, never through symbolic links out of it).
- `viewer/`: Vite + React + Tailwind; scenes are SVG laid out with ELK.js.
- `docs/EXL.md`: the scene format. Views: `<arch>` (parts, with `<group>`), `<flow>` (steps), `<data>` (data model), `<state>` (state machine with a walk).
- `examples/scenes/`: sample scenes for `examples/shop`; try them with `npm run preview -- examples/scenes/session-states.exl.md --project examples/shop`.

## Develop

```sh
npm run typecheck
npm run lint
npm test                 # parser, cache, index, findings, clicks, questions, export, levels, slides, end-to-end over stdio
npm run build
```

Development mode, without Claude:

- `npm run preview -- examples/scenes/login.exl.md --project examples/shop` serves an EXL file in the viewer and reloads it on every save, printing validation errors.
- `npm run dev -w server` and `npm run dev -w viewer` rebuild on change; in Claude Code, `/reload-plugins` picks up the new server.
- `EXPLICADOR_SERVER=http://127.0.0.1:<port> npm run dev:server -w viewer` runs Vite with hot reload against a running bridge; open `http://localhost:5173/?t=<token>` with the token from the bridge URL. To click from the Vite page, start the bridge with `EXPLICADOR_DEV_ORIGIN=http://localhost:5173`.
- `EXPLICADOR_NO_BROWSER=1` stops the server from opening browser tabs.
