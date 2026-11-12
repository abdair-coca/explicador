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
6. Interactive: clicking an element asks the agent to go deeper. It must work without launch flags (user, 2026-11-09). Changed in F7 with the user's approval of the F5–F8 plan: a click opens the detail panel, and its "Go deeper" button asks the agent.
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

### F5–F8: better explanations and the Titi look (approved by the user on 2026-11-09)

After trying the plugin on a real project (SocialNeo), the user asked to refine the explanations and the look, to ask questions about a specific box, and to see the important code.

Decisions (user, 2026-11-09):
- **Look:** the viewer adopts SocialNeo's "Titi" design system as is (`frontend/design.md`, `motion.md` in that project): cream background, yellow primary, Nunito, flat (no gradients or blur), clickable tiles with `border-2` and a hard bottom shadow that flattens on press, playful entrances with a slight bounce (≤400 ms). No handwriting, no mascot. Animations use CSS and the Web Animations API only (no GSAP). The style is validated in the real viewer, not in more mockups. Mockups: https://claude.ai/artifact/HAtwBi8Y4BurAHqNcBUJZ9 (option C chosen, then "pure Titi").
- **Boxes:** a short description inside each box and a longer one in a side panel.
- **Click:** clicking a box opens a side panel with its description, key code, a question input and a "Go deeper" button (what a click does today). This changes product decision 6 once the plan is approved.
- **Answers:** Claude decides: a short answer in the panel, plus a deeper scene when the question deserves one.
- **Key code:** Claude picks the lines with a tag; the server copies them from the file, so code cannot be invented and the cache tracks it.

Problems seen in the SocialNeo scenes (`rag`, `reranker-de-cloudflare`, `estudiante`): steps start at nodes never reached (`ctx → tutor`), returns are not shown (search → embeddings/Postgres/reranker never come back), calls and returns look the same (`tutor → panel`), middleware is drawn as a call from the route; edge labels are 11 px grey and shrink further when the SVG scales down.

Defaults (approved with the plan):
- Phase order F5 → F8 below; each ends at a user checkpoint.
- Light theme only (Titi has no dark mode). Nunito variable (OFL) is vendored in the viewer, because the CSP blocks Google Fonts, and inlined in exports.
- A small built-in highlighter (comments, strings, numbers, common keywords) instead of highlight.js: no new dependency and it works for any language.
- Flow continuity is a validation error, not a warning.
- Questions and answers are saved with their scene and dropped when that scene is re-rendered.

- [x] **F5. Titi look and legible boxes.** Done 2026-11-09; reviewed by the user from screenshots ("Bello"). The user then asked for the Titi mascot and withdrew it the same day: no mascot. Taken during the phase: edge labels are laid out by ELK (each gets its own room, flow edges reserve room for their longest step label); diagrams never shrink below 85 % and layouts wider than about 1400 px wrap into rows (ELK `MULTI_EDGE`; `SINGLE_EDGE` crashed ELK); the content column widened to `max-w-7xl`; the bridge CSP allows `data:` fonts.
  - Viewer: Titi tokens (cream `#FFFBF0`, white surfaces, text `#1A1A2E`, yellow `#FFD93D`/`#FFC107`/`#FFF3B0`/`#E6B800`, role colors), Nunito, tiles for clickable boxes (white, rounded, `border-2` gray, hard shadow, hover lift with yellow border, press sink), node kinds as solid role chips with stroke SVG icons, edge labels ≥13 px bold on a white pill (the active one yellow), Titi buttons and inputs, yellow focus ring.
  - Motion: tokens 150/300/400 ms and the Titi bounce `cubic-bezier(0.34, 1.56, 0.64, 1)`; boxes pop in staggered, then edges draw; the active boxes pop on each step; zoom ≤400 ms; progress fills in ~700 ms; everything off with reduced motion.
  - EXL: optional `desc` (one line, ≤80 characters) on `<node>`, `<group>`, `<entity>` and `<status>`, shown inside the box; the skill asks for it.
  - Criterion: parser tests for `desc`, viewer tests updated, typecheck, lint and tests pass; the user reviews the SocialNeo scenes in preview mode.
- [x] **F6. Flows that make sense.** Done 2026-11-09 except the user's review. Taken during the phase: `kind` is stored only when it is not `call`, so older scenes parse to the same data; a `return` step needs `to`; edges of different kinds between the same pair are separate (ids `a->b:return`); a cached scene that breaks the new rules comes back from `show_scene` with its errors and its EXL (SocialNeo's `estudiante` fails at step 7, `ctx → tutor`; `rag` and `reranker-de-cloudflare` still pass); the sample login flow now shows both returns.
  - EXL: `kind` on `<step>` and `<edge>`: `call` (default, solid), `return` (dashed), `async` (dotted, for queues and events).
  - Continuity: a step may start only at a node already in play (the first step's `from`, or any earlier `from`/`to`); otherwise the parser reports which step jumps and from where.
  - Viewer: the narration says where the step comes from and what follows.
  - Skill: show returns when the data that comes back matters, edge and step labels name what travels, middleware appears as steps before the handler, every step says why.
  - Criterion: parser tests (kinds, continuity valid and invalid), viewer drawing, the SocialNeo scenes re-rendered; user review.
- [x] **F7. Detail panel and key code.** Done 2026-11-09 except the user's review. Taken during the phase: the long description is called `about` (Markdown, 1200 characters, paragraphs kept); `<code>` needs a line range of at most 40 lines and a note, at most 3 per item, and only error-free snippets count; the server copies the lines whenever a scene is published (navigator, export, preview), cutting lines over 400 characters and marking missing ones; blocks carry `codes` only when they have some; clicking the open box again closes the panel; the panel sits beside the scene from `lg` up (the page widens to 1720 px) and is a bottom sheet below; code wraps instead of scrolling and ligatures are off. The app root uses `overflow-x-clip` (`hidden` broke the sticky panel). The bottom sheet was not checked on a small screen.
  - Clicking a node, entity or state opens a side panel without asking Claude: kind, label, ref, short and long description, key code, and "Go deeper" (cached drill or ask Claude, as today). Groups keep zooming in.
  - EXL: optional body text in `<node>`, `<entity>` and `<status>` as the long description; `<code ref="path:start-end" node="id">why it matters</code>`, up to about 30 lines; the server reads the lines and hashes the file like any ref.
  - Exports show the panel read-only (no "Go deeper", no questions). `AGENTS.md` decision 6 is updated.
  - Criterion: parser and server tests (body, `<code>`, snippet reading, invalidation), panel behavior, export; user review.
- [x] **F8. Questions about a box.** Done 2026-11-09 except the user's review. Taken during the phase:
  - `answer_question` takes the question id from the monitor line instead of the node, so several waiting questions pair exactly.
  - Questions travel apart from the scene (`questions` event, `GET /api/questions`), so an answer does not restart the scene's animations; they live in the scene's cache file and are not in the scene payload, so exports carry none.
  - "No automatic jump": `render_scene` takes `background: true` (cache without showing; the scene on screen is still refreshed) and `answer_question` takes that topic as `scene`; `POST /api/follow` opens it one level below the current scene.
  - With no monitor connected a question is not saved and stays in the input. Answers: Markdown up to 4000 characters, up to 3 line-range refs of at most 40 lines (checked to exist, not hashed into the scene). At most 50 questions per scene; the oldest are dropped.
  - Viewer: thread and input in the detail panel (the input sticks to the bottom), three suggested questions for a box with none, waiting dots that give up after 10 minutes, a "?" mark on boxes with questions (blinking while waiting), and a notice with "Show the answer" when the box is closed. `prose-exl` code no longer uses ligatures.
  - Checked in Chrome against a stand-in monitor and agent (ask, wait, answer with code, notice, link to the drawn scene); not checked with a real Claude session, on a small screen, or by Playwright.
  - The panel input posts to `/api/ask` (token and Origin checks; one line, ≤500 characters); the monitor prints one line with the box and the question; Claude answers with a new MCP tool `answer_question` (topic, node, Markdown answer, optional code refs read by the server) and may also render a deeper scene.
  - Viewer: a waiting indicator, the answer pops in, and a link to the scene Claude drew, if any (no automatic jump).
  - Questions and answers are saved with the scene and shown again when it reopens; not available in exports.
  - Criterion: end-to-end test (ask → monitor line → `answer_question` → viewer update), persistence; user review.

### F9: code window (requested by the user on 2026-11-09, after F8)

The user asked that clicking a box also opens a VS Code-like window with the code, and that Claude can explain code from the chat, highlighting each part. Choices made through a quiz the same day: panel docked under the diagram; read-only viewer with tabs and an explorer; guided tour as the way to highlight; triggers are any chat request, a tour inside an answer, and a "View code" button. This extends product decision 6 (`AGENTS.md` updated).

- [x] **F9. Code window.** Done 2026-11-09 except the user's review. Taken during the phase:
  - Server: `GET /api/file?path=` (text files up to 512 KB; refuses paths with a dot segment such as `.env`/`.git`/`.explicador`, paths outside the project and links out of it, binary files) and `GET /api/tree` (the index's file list), behind the bridge's token and Host check. New MCP tool `explain_code` (title, 1–12 steps of `ref` line range ≤ 80 lines + note ≤ 600 characters, all checked against the files) and `answer_question` takes `tour`. A tour travels as an SSE `tour` event (replayed to a tab that connects later); a tour in an answer is saved with the question and never opens by itself.
  - Viewer (`viewer/src/code/`): dock with tabs (max 8), explorer, breadcrumb, status bar, resizable (drag or arrow keys, remembered), highlighted lines, rows off screen are not laid out. Tour bar: dots, previous/next, autoplay (time grows with the note's length), ← → keys, "End tour"; the other lines dim and the note sits under the highlighted lines. Clicking a box with a `ref` opens the window on it at `lg` and up; closing the window stops that until "View code" is pressed (remembered in this browser). Code cards and answers have an "open in the code window" button. Not in exported files.
  - Checked in Chrome against a stand-in agent (click, View code, tabs, explorer, tour steps across files, autoplay, keys, answer with tour); not checked on a real small screen (the browser window could not be shrunk), with a real Claude session, or by Playwright.
  - Criterion: server tests (file reading and refusals, tour validation, `explain_code` over the stream, tour in an answer), viewer tests (tree, window and tour state), typecheck, lint; user review.

### F10: focus, explain buttons, flows with code and notebooks (requested by the user on 2026-11-09, after trying F9)

The user tried the plugin on a real project and asked: every box focuses its own code; an "Explain code" button; tours of whole flows, not one box; notebooks (`.ipynb`) that render as cells (they showed as raw JSON); the code window covering everything below the top bar; better open/close animations; and, later in the session, running notebook cells and a fix for Markdown tables (shown as plain text). Choices through a quiz: notebook refs are cells; full cells with outputs; flows get a local instant tour plus Claude for depth; line ranges asked in the skill and warned about by the server; the code follows the flow. Running cells is **F11**, not F10.

- [x] **F10.** Done 2026-11-09 except the user's review. Taken during the phase:
  - Notebooks: `server/src/notebook.ts` reduces nbformat 4 to numbered cells; outputs kept: text (ANSI removed), errors, HTML without scripts/iframes (shown in an iframe with `sandbox="allow-same-origin"`, no scripts), PNG/JPEG up to 400 KB each and 4 MB per notebook; the rest is "omitted". Notebook files up to 8 MB. HTML-only Markdown cells (banners) go in the same sandboxed frame; mixed Markdown/HTML cells drop their raw HTML. Refs count cells in scenes, `<code>`, answers and tours; `read_notebook` gives Claude the cells (outline or a range of up to 12). Quoted cells carry their source only.
  - Focus: `render_scene` warns (does not fail) about boxes whose ref has no range, except files of up to 30 lines or notebooks of up to 2 cells; the skill asks for ranges. With the window open, a playing flow moves the code to the active step (its `ref`, else the box it reaches, else the one it starts from).
  - Explain: "Explain with code" on flows and architectures builds a tour locally from refs and narration (no Claude). "Explain code" in the panel and in the code window posts `/api/explain` (a box, or a file with optional lines), which the monitor delivers as one line asking for `explain_code`; the button shows "Asked Claude…" until the tour arrives.
  - Window: a fixed layer from under the top bar to the bottom, stopping before the detail panel when it is open at `lg` and up (the old resizable height is gone); it rises with a fade and sinks away before unmounting; Esc closes it first, then the panel.
  - Markdown tables (`| a | b |` with a separator row) were drawn as plain text because react-markdown has no table support without a plugin. `viewer/src/lib/tables.ts` cuts pipe tables out of the text and `Prose` draws them, with no new dependency; used in scenes, panel, answers, tour notes, notebooks and presentations.
  - Checked in Chrome against a stand-in agent with a sample notebook (cells, outputs, banner, table, image, tour across a notebook and a script, flow tour button, window next to the panel, code following the flow, Explain button, Esc animation); not checked with a real Claude session, on a small screen, or by Playwright.
  - Criterion: server tests (notebook parsing, files, tours and quotes in cells, ranges warning, `read_notebook`, `/api/explain`), viewer tests (tables, tours from scenes), typecheck, lint; user review.

- [ ] **F11. Run notebook cells** (planned; approved by the user on 2026-11-09). Jupyter kernel through `python -m ipykernel` if installed (no new dependency for Explicador); a Run button per cell, only on an explicit click and with a warning the first time in each session; 60 s limit, Stop and restart; results shown in the code window and never written to the `.ipynb`; it needs a design pass on security (the bridge would start processes), so it gets its own task, tests and review.

### F12: notebook lessons (requested by the user on 2026-11-10, before F11)

The user said Explicador explains big systems well but not a notebook, using their ML exam notebook (`INF672/evaluaciones/SegundoParcial/Coca_Abdair_P2_INF672.ipynb`, sentiment analysis with logistic regression): they need to understand it, and want explanations that are clear, beautiful, intuitive and engaging. The scenes cached there show why: `<arch>`/`<flow>` boxes ("Preprocessing → Split → Vectorizers → LogisticRegression") never show a real review, the document-term matrix, the confusion matrix or the coefficients, and the user's panel questions ("what is the vectorizer for?", "does this work like a RAG?", "what are BoW and TF-IDF?") were concept questions answered with text only.

Choices through a quiz (user, 2026-11-10): a **lesson by chapters** (a hero with the result, one chapter per notebook section with visuals of the real data, the decisions and the cells beside, a side rail with progress; Present turns it into slides); four visual pieces: **data journey**, **step-by-step transformation**, **animated charts**, **interactive matrices**; **checks per chapter plus a final review** for the defense; concepts explained **from zero** (an analogy and a tiny worked example before the code). This extends product decision 5 (more animation types) and grows the closed EXL catalog of decision 8; `AGENTS.md` is updated with the phase.

Defaults (approved by the user with the plan on 2026-11-10):
- A lesson is a plain EXL document with new blocks, so cache, refs, questions, presentation and export keep working. The tags are general (any scene may use them); the skill uses the lesson format for notebooks and data or ML scripts.
- `<chapter id? title goal? ref? />` (top level, self-closing) starts a chapter that runs until the next one. With chapters the viewer switches to the lesson layout: the intro, a sticky chapter rail (a strip of pills on small screens) with ✓ per chapter and overall progress, chapter headers with number, goal, "Your cells" (the chapter's cells with their outputs, inline and collapsible, also openable in the code window) and "Ask about this chapter", and a "Next chapter" button. The server attaches the chapter's cells (with outputs, within the notebook limits) or lines when it publishes the scene.
- `<stats>` with `<stat value label ref? />` (1–6): the headline numbers, counting up.
- `<journey title>` with `<stage id label value? kind? op? ref?>narration</stage>` (2–12): the data's path with its real sizes. It plays like a flow (active stage, the operation on the connector, the value counting up, narration, the code window follows); stages are clickable (panel, questions, go deeper). Stage `kind`: file, table, text, matrix, split, model, metric.
- `<trace title ref?>` with `<value label code? ref? note?>text</value>` (2–12): one real value through each operation. The viewer computes a word diff (removed words struck out, changed words with the changed letters marked, word count) and animates it step by step.
- `<chart title type series? unit? highlight? ref?>` with `<row label values />`: `type` is `bars` (grouped, from zero), `hbars` (horizontal, diverging around zero) or `line`; up to 4 series and 40 rows; numbers are written as the notebook prints them and shown as written; bars grow and lines draw.
- `<matrix title cols kind? corner? positive? ref?>` with `<row label values />` and `<focus label cells>narration</focus>`: a grid with heat colors; a focus highlights cells (`r,c`, `r,*`, `*,c`) and narrates. With `kind="confusion"` the viewer colors hits and errors and derives accuracy, precision, recall and F1 from the counts itself, showing each formula with the real numbers, so the agent does no arithmetic.
- `<quiz question>` with 2–5 `<option correct? why?>` (exactly one `correct="true"`), or one `<answer>` for a flashcard (the defense review). A right answer pops, a wrong one shakes, and the why shows; cards reveal on request and ask "did you know it?". Progress is kept per scene in the browser (localStorage, reset when the scene is re-rendered), also in exports.
- Markdown callouts `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` render as colored boxes; a leading `**bold**` line is their title.
- Presentation: one slide per chapter title, journey stage, trace value, chart, matrix and focus, quiz and stats block.
- Skill: a lesson recipe for notebooks (outline with `read_notebook`; the problem as a question; stats and journey; one chapter per section; each concept from zero with an analogy and a tiny example; the decision and its justification; a visual of the real data; 1–2 checks; a final review with defense cards), and the rule that numbers come from the outputs or from a computation that actually ran. A cached notebook scene without chapters is rebuilt as a lesson.
- The viewer chrome stays in English like the rest of the viewer; localizing it would be its own phase.
- A small synthetic notebook executed with Jupyter (`examples/notebook/`) and its lesson (`examples/scenes/`) serve as example and test data; the user's notebook is only read.

- [x] **F12. Notebook lessons.** Done 2026-11-11 in the unattended cloud session except the user's review and the check with the user's own notebook. Example: `examples/scenes/notebook-lesson.exl.md` over `examples/notebook/reviews.ipynb`.
  - Criterion: parser tests for every new tag (valid, invalid, incomplete), refs and cache invalidation, chapter cells attached with outputs, clicks on stages and chapters, the ranges warning; viewer tests (word diff, chapter split, confusion metrics, chart scales, slides, progress); typecheck, lint and tests pass; the example lesson checked in a browser (rail, journey, trace, charts, matrices, quizzes, cells, panel, presentation, export). The check with the user's own notebook and the user's review happen when the user is back.

### F13: lessons that let the reader play with the model (user, 2026-11-11)

The user asked for features that take the project to the next level and, offered five options, said "choose yourself". Chosen, in this order: **A** `<calc>`, a worked calculation of how a model scores one input (parts added one by one in a waterfall; for `kind="logistic"` the sigmoid, the probability and the decision), the viewer doing the arithmetic and the parser refusing parts that do not add up to the notebook's printed total; **B** `<threshold>`, a slider over the real test probabilities that recomputes the confusion matrix, precision and recall live; **C** practice mode, a viewer-only "Practice" view that asks every check and flashcard of a lesson, missed ones first, with a score. Not chosen now: a glossary tag; F11 stays planned. This grows the closed EXL catalog (decision 8) and the animation types (decision 5) with the user's go-ahead.

- [x] **F13a. `<calc>`.** Done 2026-11-11: parser (rounding check against the printed total), waterfall and sigmoid in the viewer, slides, docs, skill, example chapter 8 over the new cells 18–19.
- [x] **F13b. `<threshold>`.** Done 2026-11-11: parser, strip with lanes, slider, live confusion matrix and metrics (reusing the matrix grid and metric code), slide, docs, skill, example chapter 9 over the new cells 20–21.
- [x] **F13c. Practice mode.** Done 2026-11-11: "Practice" in the rail, pills and end card; missed first, fresh questions, score of first answers, repeat the missed; answers count in the lesson's progress; works in exports.

### F14: a presentation that grabs attention (user, 2026-11-11)

The user presented the lesson of their exam notebook and found Present mode boring. Their screenshots show a title with a 334-character paragraph and three still stat cards. That lesson gives 73 slides: 19 prose slides of up to 876 characters, 16 matrix, 12 quiz, 8 chart, 8 journey stage, 7 chapter, 2 trace and 1 stats. Every slide appears whole with the same 300 ms pop, and each step of a block (a journey stage, a matrix focus, a trace value) remounts the whole slide. The footer is 73 identical dots. The user asked for animations and micro-interactions that make the presentation spectacular.

Choices through a quiz (user, 2026-11-11):
- **Mixed look.** Each chapter enters as a full-screen night-blue card with a giant number and a yellow wipe. Content stays cream and yellow and enters in parts.
- **Parts on →.** Each → reveals the next part of the slide, which animates by itself. With no parts left, → moves to the next slide.
- **Subtle sounds.** A pop on each part, a whoosh on a chapter change and a ding on a right answer. They are off by default, with a toggle.
- Not chosen: laser pointer, slide overview, presenter view.

This grows product decision 5 and relaxes two Titi rules in Present mode only: a dark surface for chapter cards, and transitions longer than 400 ms. `AGENTS.md` is updated with the phase.

Defaults (approved by the user with the plan on 2026-11-11, who then asked for the INF672 session to recreate the lesson once it is done):
- **One slide per block, its steps as parts.** Flow and walk steps, journey stages, trace values, calc steps and matrix focuses become parts of one slide. The block stays on screen and its own step animations play. The exam lesson goes from 73 slides to 51. ← from a slide's first part shows the previous slide fully built, and Shift+→ skips the remaining parts.
- **Prose in parts.** The viewer splits a Markdown block into headings, paragraphs, list items, callouts, tables and code blocks. Paragraphs over about 200 characters split at sentence ends, never inside code or bold.
  - A heading rises word by word, and numbers count up to the value as written.
  - Bold words get a yellow marker sweep, and callouts stamp in.
  - Earlier parts dim.
  - No EXL or agent change, so cached lessons benefit.
- **Other blocks.**
  - Stats: one card per part, counting up.
  - Chart: the bars grow. With `highlight`, a second part dims the other rows.
  - Matrix: the cells cascade in, then there is one part per focus. The other cells dim and the note crossfades.
  - Quiz: first the question and its options, then a part that reveals the right answer and its why, with flat confetti. A flashcard flips. A click on an option still counts in the lesson's progress; a reveal by → does not.
- **Transitions.** Slides move in the direction of travel (≤500 ms). Entering a chapter takes ≤900 ms: a yellow wipe crosses the screen and uncovers a `#1A1A2E` card, where the number rolls in, the title rises word by word and the goal fades in. Flat: no gradients or blur.
- **Chrome.**
  - The bar has one progress segment per chapter instead of one dot per slide; scenes without chapters get one segment per slide.
  - It shows the current chapter's title, a playhead that glides and a thin fill for the parts of the current slide. A click on a segment opens that chapter.
  - In full screen the header and footer hide after 2.5 s without the mouse moving.
  - Labels stay in English like the rest of the viewer.
- **Sounds.** Synthesized with the Web Audio API: no audio files and no dependency. A speaker button and the M key toggle them, the browser remembers the choice, and they also work in exports.
- **Reduced motion:** no moves, wipes or confetti. Parts still come one by one, in their final state.
- **Skill:** lesson prose is written for slides: one idea per paragraph, at most two sentences, the key term in bold.

- [x] **F14a. Stage and pace.** Slides with parts, navigation, directional transitions, chapter cards with the wipe, the chapter progress bar, and chrome that hides in full screen.
  - Done 2026-11-11.
    - Slide moves use View Transitions; browsers without them cut.
    - The wipe is a skewed yellow panel driven by the Web Animations API (260 ms in, 340 ms out), and keys are ignored while it runs.
    - Two key presses within one frame of a slide move count once.
  - Checked:
    - In the user's Chrome on the example lesson: parts, chapter cards, the wipe and view transitions sampled in the page.
    - In a separate headless Chrome: 390 px, reduced motion, and an exported file opened from disk.
    - On the user's lesson read in place: 51 slides, 72 parts.
  - Not checked: real full screen (simulated in the page: idle after 2.5 s, back on a pointer move, the CSS hides the bars).
  - On phones a journey's narration sits below the stacked stages and needs scrolling, as before.
  - Criterion:
    - Unit tests for slides with parts (every block kind) and for navigation: next and back across parts, Shift+→, Home and End.
    - Typecheck, lint, test and build pass.
    - Checked in Chrome at 1440 and 390 px, with reduced motion and in an exported file. Both on the example lesson and on the user's lesson, read in place and not copied into the repo.
- [x] **F14b. Parts that come alive.** Prose parts, stats, chart highlight, matrix cascade and focuses, quiz reveal with confetti and flashcard flip, and the skill note.
  - Done 2026-11-11. The user's lesson has 51 slides and 111 parts.
  - Taken during the part:
    - Only numbers with decimals or of 100 and up count, so cell numbers stay still.
    - A heading with inline Markdown fades in whole instead of rising word by word.
    - Confetti lives in `animation/` and bursts only while presenting, when the answer becomes known, not when a slide opens already answered.
  - Checked in a separate headless Chrome on the user's lesson read in place: title and paragraph parts with counting numbers, stats card by card, dimmed earlier parts with the marker, a quiz reveal with confetti, a matrix focus and a flashcard flip; with reduced motion numbers show at once and no confetti appears.
  - Criterion: unit tests for the prose splitter (sentences, bold, code, lists, callouts, tables) and for the parts of each block; the same checks and browser walk-through as F14a.
- [x] **F14c. Sounds.** Pop, whoosh and ding; the toggle and M; the remembered choice; silent when off or without Web Audio.
  - Done 2026-11-11.
    - Turning sound on plays a pop as feedback.
    - Pops play on forward moves only; a wipe whooshes in both directions.
    - The choice is kept in `localStorage` under `explicador.sound`.
  - Checked in a separate headless Chrome by counting oscillators and noise sources:
    - Nothing plays while sound is off.
    - With sound on: one pop per part or slide, a whoosh per chapter, and a two-note ding on a quiz reveal.
    - The stored choice follows the toggle.
  - Not heard by a person yet.
  - Criterion: tests for the sound switch (silent without Web Audio, remembered choice); the same checks; heard in Chrome.
- One commit per part, like F13. The user reviews at the end of F14.

### F15: formulas and concept cards (user, 2026-11-11)

After F14 the user asked for LaTeX formulas and for the concepts on the slides to look spectacular. Their exam lesson has no formula: concepts such as TF-IDF or logistic regression are bold words inside paragraphs.

Choices through a quiz (user, 2026-11-11):
- **KaTeX renders the formulas.** It is a new dependency, approved: about 0.6 MB more in the viewer and in each export. Its woff2 fonts are inlined like Nunito, so exports still load nothing.
- **A `<concept>` tag.** The agent marks each new concept with its term, a one-sentence definition, an analogy, an optional formula and an optional example. This grows the closed EXL catalog (decision 8), and lessons are regenerated to use it.
- **Term hero in Present mode.** The term appears giant in the center with a yellow flash, then rises to the top. The definition, the analogy, the formula (assembled symbol by symbol) and the example then arrive one per →.

Defaults (taken with the plan):
- **Math syntax**, as in Pandoc, outside code:
  - `$…$` is inline math. An opening `$` is followed by a non-space; a closing `$` follows a non-space and is not followed by a digit, so "$5 and $10" stay text.
  - `\$` is a literal dollar.
  - A line starting with `$$` opens a display block until the next `$$`. A `$$…$$` inside a line is display math too.
  - Math works wherever Markdown does: prose, callouts, lists, tables, quiz questions, options, whys and answers, and concept fields.
- **One shared reader for math.** It lives in the server's parser and the viewer imports it, so both agree on where a formula starts and ends.
- **Formulas are checked.** `render_scene` refuses a scene whose formula KaTeX cannot parse, quoting the formula and KaTeX's message, so KaTeX also goes into the server.
- **`<` inside a tag.** It must be written `\lt` or `&lt;`, because the EXL reader takes `<` as the start of a tag.
- **`<concept term ref?>`** (top level) holds `<define>` (required, ≤ 300 characters), `<analogy>` (≤ 300), `<formula>` (LaTeX, ≤ 500) and `<example>` (Markdown, ≤ 1200). Each appears at most once, and they show in that order.
- **Lesson page:** a concept card with the term, the definition, an analogy bubble, a formula card and the example.
- **Present mode:** one slide per concept, one part per piece.
  - The term moves from the center to the top with a FLIP animation.
  - The formula's atoms pop in left to right, the analogy card swings in, and the example fades up.
  - Reduced motion shows the final states.
- **Skill:**
  - A `<concept>` for each new idea of the recipe's "Each new concept from zero".
  - Formulas only for definitions the notebook uses (TF-IDF, the sigmoid, precision).
  - Numbers in formulas follow "numbers only from the notebook".
- **Docs:** `docs/EXL.md` and the example lesson gain math and concepts.

- [x] **F15a. Formulas.** KaTeX in the viewer and the server, the shared math reader, rendering in all Markdown, parser checks, docs and skill.
  - Done 2026-11-12.
    - The component is `viewer/src/components/Tex.tsx` (a file named `Math` would shadow the global).
    - A Vite plugin drops KaTeX's woff and ttf sources, so only the inlined woff2 remain and the build emits no font file. The CSS grew from about 90 KB to 487 KB.
    - A table cell, quiz option or question that is one formula alone is drawn in display style, because inline fractions are tiny.
    - A formula in a quiz or a long description is reported at its tag, not at its own column; in prose the error points at the formula.
  - Checked in a separate headless Chrome: 12 formulas on the page with no KaTeX error and "$5 … $10" kept as text; Present mode (list item, quiz reveal); the export opened from disk draws all 12 with no font file referenced.
  - Criterion:
    - Tests of the math reader: inline, display, dollars as money, escapes, code.
    - Parser tests: a valid formula and a broken one.
    - Typecheck, lint, test and build pass.
    - Formulas checked in Chrome on the page, in Present mode and in an export opened from disk.
- [x] **F15b. Concept cards.** Parser, types, the page card, the Present slide (term hero), slide parts, skill, docs and the example lesson.
  - Done 2026-11-12.
    - `term` holds up to 60 characters. `<example>` keeps its line breaks (common indentation removed), so it can hold a small table; the other pieces are one paragraph.
    - `<formula>` holds the LaTeX alone; one wrapped in `$` is refused with an example.
    - A formula wider than its card shrinks to fit (down to 45 %) instead of scrolling.
    - KaTeX 0.19 names its layout rows `katex-base`, so the atoms are the children of each row of `.katex-html`; they are inline blocks so they can move, which did not change the formula's width (measured).
    - Earlier pieces of a concept slide do not dim, unlike prose parts: the card is read as a whole.
    - The example lesson has two concepts: logistic regression (chapter 5) and the sigmoid with its formula (chapter 8).
  - Checked in a separate headless Chrome at 1440 and 390 px and with reduced motion: the page card, the hero, the term in flight, the pieces one per part, 28 atoms animating, and back to the hero with ←. Not checked: a concept inside an exported file, and a real Claude session writing concepts from the skill.
  - Criterion:
    - Parser tests: valid, missing `<define>`, unknown child, duplicate, too long.
    - Slide-part tests.
    - The same checks as F15a, and the hero walk-through checked in Chrome.
- One commit per part. The user reviews at the end of F15, then the INF672 session regenerates the lesson.

### F16: rigorous animation and spectacular components (user, 2026-11-12)

While F15 was in progress the user asked again for more spectacular presentations: concepts that look spectacular, animations "much more rigorous", and more impressive visual components.

Choices through a quiz (user, 2026-11-12):
- **Order:** finish F15 as approved, then F16.
- **Rigor means both:** a film-like choreography (one motion system, physical springs, exact timings and staggers, elements that turn into one another between slides) and animations faithful to the math (curves drawn on their axes, a point that travels the function, formulas that change step by step with each term tied to the real data).
- **New components, all four offered:** an animated function plot; a formula that is derived step by step; a scatter plot with a decision boundary; comparison cards ("A against B") and a timeline or pipeline with flowing particles.
- **Decorative components** (the user's own words): decoration chosen by the topic or by the context of the system or part being explained, so that every presentation and every diagram has its own distinction.
- **Animation library:** "add the best there is in animation". Confirmed by the user on 2026-11-12: **GSAP** (3.15.1 on npm, standard no-charge license, all plugins included), which reverses F5's "no GSAP". Used: the core timelines, Flip, SplitText, DrawSVG, MorphSVG and MotionPath.
- **Who chooses the decoration:** confirmed the same day: the agent picks a theme from a closed catalog.

Detailed plan (written 2026-11-12; approved by the user the same day with "complete all of F16", so the parts run one after another without stopping at F16b):

Defaults:
- **GSAP only in the viewer.** It is bundled, so exports still load nothing; they grow by about 0.15 MB (measured in F16a). The Web Animations code that works stays until its part is migrated.
- **Every part is a timeline.** → plays the part's timeline; ← plays it backwards instead of cutting; Shift+→ jumps to its end. Reduced motion sets every timeline to its end state.
- **Motion tokens** in one file (`viewer/src/animation/motion.ts`): durations, eases, springs and stagger rules, used by every block. No animation defines its own numbers.
- **The flat Titi look stays:** no gradients and no blur; decoration is flat line art and solid shapes. Yellow stays the primary color; a theme adds one accent color.
- **Numbers still come from the notebook.** The agent writes data as printed; the viewer does the geometry and the arithmetic. No embedded JavaScript and no free expressions: functions come from a closed list.
- New tags grow the closed catalog (decision 8) and the animation types (decision 5); `AGENTS.md` is updated with each part.

Parts, one commit each:

- [x] **F16a. Motion system.** GSAP, the tokens, and Present mode moved onto timelines.
  - Done 2026-11-12.
    - `viewer/src/animation/motion.ts` registers GSAP and holds the tokens. `presentation/partPlan.ts` decides which parts play or rewind after a move; `presentation/choreo.ts` plays them. An element names its part with `data-part` and its entrance with `data-fx` (rise, fade, pop, stamp, swing, split, rows, formula, chapter).
    - On timelines, both ways: prose parts, stats cards, the chapter card and the concept's pieces; the concept's term flies with GSAP Flip. A quiz's answer is not in the page until it is revealed, so it only plays forward. Flows, journeys, traces, matrices, charts and calcs keep their own step animations.
    - Headings split by words, not letters: letters as separate boxes lose their kerning and the heading wrapped differently while it moved.
    - Elements shared by two slides use shared view-transition names instead of Flip, because the slide change already is a view transition: a chapter's title flies into the progress bar's label, and a slide's title (or a concept's term) glides into the next slide's title. A concept's term does not look for the next slide that names it.
    - The viewer's script grew from 2272 KB to 2402 KB (+130 KB); exports grow by the same.
  - Checked in a separate headless Chrome on the example lesson: frames in the middle of each timeline, a rewind with ←, the chapter title in flight, 390 px, and reduced motion (no inline transforms, parts in their final state). Not checked: an export opened from disk (checked once at the end of F16).
  - Slide parts, the chapter card, stats, quiz reveal and the concept hero become timelines that play both ways.
  - Elements shared by two slides move from one to the other (Flip): a chapter's number and title into the progress header, a concept's term into the next slide that names it, a block's title when the next slide keeps it.
  - Headings split by SplitText (characters for short titles, words otherwise) replace the word-rise effect.
  - Criterion: tests for the timeline controller (forward, backward, skip, reduced motion); typecheck, lint, test and build; Chrome at 1440 and 390 px, reduced motion and an export; export size recorded.
- [x] **F16b. Themes and decoration.**
  - Done 2026-11-12.
    - `<theme>` travels as a block of type `theme` (the scene payload did not change); the page, the lesson plan and the slides skip it. It must be the first tag; Markdown may come before it.
    - `accent` is a closed list of seven colors, not a free color.
    - Motifs are generated in code (`viewer/src/theme/motifs.ts`) from a random source seeded with the scene's key, so every scene gets its own arrangement and keeps it. In Present mode the seed also takes the chapter, so each chapter redraws.
    - Where it shows: the top right of the page (from 1024 px), a band beside each chapter header (from 768 px), two corners of the presenter behind the slide, and larger on the night chapter card with the theme's glyph and name. Under 640 px only the chapter card keeps its drawing.
    - Not done from the plan: the themed divider, and a separate icon set per theme for chips (each theme has one glyph, shown on chapter headers and cards).
    - Text over a motif: the lines are the accent at 26 % over the cream background. Computed: the worst case is body text over the red accent's line, at 7.0 : 1 (10.0 : 1 over the bare background).
  - Checked in a separate headless Chrome on a gallery scene with one chapter per theme: the page, slides and chapter cards at 1000 and 390 px, no console errors.
  - `<theme name accent? />`, top level, at most once, before the first block. `<chapter theme="…">` overrides it for that chapter, so a part of the system can look different.
  - Closed catalog of names: `data`, `ml`, `math`, `text`, `web`, `network`, `database`, `security`, `code`, `hardware`, `business`, `plain` (default, today's look).
  - Each theme gives: an accent color, a background motif that draws itself in (dot grid, graph of nodes, circuit traces, axes and curves, rows of tokens…), an illustration on chapter cards, corner ornaments on slides, a divider, and the icon set of chips.
  - It applies to lessons, to plain diagrams (`<arch>`, `<flow>`, `<data>`, `<state>`) and to exports. Decoration never sits behind text at more than a faint contrast, and it is still under reduced motion.
  - Skill: pick the theme from what the code is about; override per chapter only when the subject changes.
  - Criterion: parser tests (valid, unknown name, twice, late); each theme checked in Chrome on the page and in Present mode; contrast of text over motifs measured.
- [ ] **F16c. `<plot>`: a function drawn on its axes.**
  - `<plot title x? y? ref?>` with 1–4 `<curve>` and 0–8 `<mark>`.
  - `<curve fn label? />` with `fn` from a closed list (`sigmoid`, `tanh`, `relu`, `linear`, `quadratic`, `exp`, `log`, `gaussian`) and its parameters as attributes (`slope`, `intercept`, `mean`, `std`…), or `<curve points="x,y x,y …" />` for values the notebook printed (a loss per epoch).
  - `<mark x label>narration</mark>`: a real input. The viewer computes `y` on the curve.
  - Parts: the axes draw and the ticks count in; each curve is traced (DrawSVG); then one part per mark, a point travelling along the curve (MotionPath) to it, with guide lines and its value.
  - The sigmoid inside `<calc kind="logistic">` reuses the same drawing.
  - Criterion: parser tests; geometry tests (scales, sampled curve, mark positions); slides; the checks of F16a.
- [ ] **F16d. `<derive>`: a formula that changes step by step.**
  - `<derive title ref?>` with 2–8 `<line note?>LaTeX</line>`, each checked with KaTeX.
  - Between two lines the symbols they share glide to their new place (Flip), new ones pop in and removed ones fade; the note explains the step. The match reuses the trace's diff over KaTeX's atoms.
  - The last lines may substitute the notebook's numbers; the skill's rule on numbers applies.
  - Criterion: parser tests; tests for the atom match; slides; the checks of F16a.
- [ ] **F16e. `<scatter>`: points and a decision boundary.**
  - `<scatter title x? y? classes ref?>` with 2–300 `<dot x y class label? />` and an optional `<boundary slope intercept />` or `<boundary points="…" />`, all as the notebook prints them (for text models, a 2-D projection the notebook computed).
  - Parts: axes; the dots land class by class; the boundary draws and the two sides tint; the dots on the wrong side pulse and are counted.
  - Criterion: parser tests; geometry and side-of-line tests; slides; the checks of F16a.
- [ ] **F16f. `<compare>`, `<timeline>` and particles.**
  - `<compare title a b>` with 2–8 `<row label a b winner? />`: two cards face each other, rows arrive in pairs, the winner of each row is marked and a tally closes it.
  - `<timeline title>` with 2–12 `<event label when?>narration</event>`: a line that draws, events that land on it, one part per event.
  - Particles flow along the active edge of flows and journeys, in the direction of the data.
  - Criterion: parser tests; slides; the checks of F16a.
- [ ] **F16g. Skill, docs and examples.** The recipe says when each component fits, `docs/EXL.md` documents every tag, and the example lesson uses a theme, a plot, a derivation and a comparison (a scatter only if the example notebook gains a projection cell). Then the INF672 session regenerates the user's lesson.

Checkpoints: the user reviews after F16b (the look and the motion) and at the end of F16.

### Unattended mode (user, 2026-11-10)

The user asked to push the work and continue it in a cloud session without their laptop, as a loop that adds features and fixes errors on its own, without supervision but with a clear objective. Choices through a quiz the same day: objective "F12 and continuous improvement"; publish straight to `main`; one long cloud session started now (not a recurring schedule). This overrides, for this mode only, "stop at the end of each phase and wait for the go-ahead" in `AGENTS.md`.

- **Objective (fixed):** Explicador explains Jupyter notebooks (data science, ML) as lessons that are correct, easy for a beginner, beautiful and engaging: chapters with the real data animated (journey, trace, charts, matrices), checks per chapter and a final review, as approved in F12.
- **Loop:** finish F12 (`.dev/TASK.md`, A to H); then repeat: take the most valuable item of the backlog below (bugs first), write it into `TASK.md`, make the smallest change with tests, run typecheck, lint, test and build, commit (Conventional Commits, author from `AGENTS.md`, no attribution lines) and push to `main`, update the backlog. Add what you discover. Stop when nothing left clearly serves the objective or the session ends, always leaving `main` green and `TASK.md` accurate.
- **Never:** push a commit whose checks fail; force-push or rewrite history; add dependencies to any `package.json`; start F11 or touch the bridge's security (token, Origin/Host checks, file access rules) or weaken validation; use or add the user's private files (their notebook is not in the repo; use `examples/notebook/`). Anything that needs one of these, or a product decision, goes to "Pending user decisions" below.
- **Quality checklist** for a lesson (review `examples/scenes/notebook-lesson.exl.md` in the viewer against it): every number on screen comes from a notebook output or a computation that ran; each concept has an analogy and a tiny example before the code; one idea per block; charts follow the dataviz rules (legend for 2+ series, labels, table view, bars from zero, no dual axis); everything works by keyboard and at 390 px wide; reduced motion shows final states; presentation and export cover every lesson block; the agent-facing skill and `docs/EXL.md` match what the parser accepts.
- **Backlog after F12** (in priority order; edit as you learn):
  1. ~~Bugs found while checking the example lesson in a browser~~ (2026-11-11: journey ops broke mid-word; "Ask about this chapter" showed in offline exports; "Your cells" header crushed at 390 px; grouped bar labels overlapped; all fixed). Keep checking new lessons the same way.
  2. Skill quality: the example lesson was written by following the skill's recipe; next, have a fresh agent write a lesson for `examples/notebook/reviews.ipynb` strictly from the skill and fix the skill where the result misses the checklist. A first attempt (2026-11-11) with a background agent was lost when the session restarted; still to do, now including `<calc>` and `<threshold>`.
  3. ~~Accessibility of charts, matrices and quizzes~~ (2026-11-11: chart marks reachable and named, confusion cells say actual/predicted, checks labelled by their question). Open: a matrix focus is announced through the live note only; chart marks are one Tab stop each (up to 160 on a big chart): consider arrow-key navigation inside a chart.
  4. Long notebooks: chapter cells and their outputs already render only when "Your cells" is opened; measure a lesson with 15+ chapters and a big HTML output before changing anything.
  5. ~~`show_scene` telling the agent to rebuild old notebook scenes as lessons~~ (2026-11-11). Open: examples in more `render_scene` error messages for lesson tags.
  6. ~~Small-screen top bar~~ (2026-11-11). Open: the chapter pill strip scrolls away on phones (sticky would cost another 45 px); the detail panel over a lesson on phones was not checked.
  7. ~~Checks answered in Present mode are not saved to the lesson's progress~~ (2026-11-11: a shared progress store).
  8. New: a lone journey stage on the last row is capped at 22rem, but rows of 2–3 stages still stretch; a grid with fixed columns may look calmer.

Notes for later sessions:
- On Linux run `npm run build` before `npm test`: two interactivity tests fail with "the viewer is not built" otherwise.
- Example notebook: regenerate by executing it with `jupyter nbconvert --to notebook --execute --inplace` (scikit-learn, pandas, nbconvert, ipykernel installed in the sandbox only) and drop the cells' `execution` timing metadata; a server test checks that every number of the example lesson appears in its outputs.
- Windows and macOS ignore case in file names, so no two viewer source files may differ only in case. On 2026-11-11, `Calc.tsx` next to `calc.ts` (also Chart, Practice and Threshold) made `./Calc` open `calc.ts` and broke the Windows build while Linux passed. The logic modules are now `calcMath.ts`, `chartGeometry.ts`, `practiceSession.ts` and `thresholdMetrics.ts`, and `viewer/test/filenames.test.ts` checks the rule on every OS.

Session summary (2026-11-11, unattended cloud session):
- Done: F12 letters A–H (charts, matrices, quizzes and flashcards, chapter cells, lesson layout with rail and progress, presentation slides, docs and skill recipe, example notebook and lesson), F12 closed; then backlog fixes for journey wrapping, accessibility of lesson blocks, the old-notebook-scene hint in `show_scene`, and the phone top bar. Every commit pushed to `main` with typecheck, lint, build and tests green (server 136, viewer 65).
- Problems: the baseline `files.test.ts` expected a Windows drive path to be denied on Linux; the test now expects `missing` off Windows and the code is unchanged (see "Pending user decisions"). Interactivity tests need the viewer built first.
- Not checked: a lesson for the user's own notebook; Claude actually writing a lesson from the skill (no Claude session with the plugin here); Safari and Firefox (Chromium only).

Session summary (2026-11-11, with the user):
- Done: checks answered while presenting now count; F13 (chosen by the user with "choose yourself"): `<calc>` (F13a), `<threshold>` (F13b) and Practice mode (F13c), each with parser and viewer tests, docs, skill, slides and an example chapter over new executed cells 18–21 of `examples/notebook/reviews.ipynb`; checked in Chromium at 1440 and 390 px, in Present mode and in an exported file. Final run from clean `dist/`: typecheck 0, lint 0, build OK, server 141/141, viewer 79/79.
- Pending: the skill-quality check (backlog 2), the user's review of F12 and F13, and a lesson of the user's own notebook.

Pending user decisions:
- Check a lesson of the user's real notebook (INF672 exam) on their machine, and the F12 review.
- Viewer chrome in the user's language (it is English, like the rest of the viewer).
- `readProjectFile` denies drive paths (`C:/…`) only on Windows; on Linux and macOS such a path is a relative folder named `C:` inside the project (harmless, but different). The test now expects that; deny drive paths everywhere? (2026-11-11, file access rules are off-limits in unattended mode.)

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
| F5 | done (2026-11-09), reviewed by the user |
| F6 | done (2026-11-09), user review pending |
| F7 | done (2026-11-09), user review pending |
| F8 | done (2026-11-09), user review pending |
| F9 | done (2026-11-09), user review pending |
| F10 | done (2026-11-09), user review pending |
| F11 | planned (approved 2026-11-09) |
| F12 | done (2026-11-11, unattended), user review and the check with the user's notebook pending |
| F13 | done (2026-11-11), user review pending |
| F14 | done (2026-11-11), user review pending |
| F15 | done (2026-11-12), user review pending; then the INF672 session regenerates the lesson |
| F16 | in progress (plan approved 2026-11-12); F16a and F16b done |
