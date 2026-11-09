# Current Task

## F3. Presentation mode

### Decisions (user, 2026-11-09)
- "Present" turns the scene into full-screen slides: each Markdown block is a slide, each `<arch>` a slide (groups still zoom), each `<flow>` step a slide with large narration. Manual advance only: →/Space/PageDown next, ←/PageUp back, Home/End, F full screen, Esc to leave.
- Export: one self-contained `.html` (JS, CSS and scene inline) that works from `file://` with no server or network: playback, group zoom and presentation work; clicks to Claude do not. Available from a viewer button and from a new MCP tool `export_scene` that writes `.explicador/exports/<key>.html`.
- Criterion: tests + Playwright + a ~5 minute review by the user.

### Criterion
- Automatic: slide order tests; export tests (single file, assets inlined, scene embedded and escaped, a CSP that forbids network access); `export_scene` end to end over stdio; typecheck, lint, tests pass.
- Playwright: present the login scene with the keyboard; open the exported file from `file://` with no network requests and no console errors.
- Manual (user): present a scene and open an exported file.

### Files
- `viewer/src/presentation/`: slide model and the full-screen presenter.
- `viewer/src/components/scenes.tsx`: flow diagram usable at a given step.
- `viewer/src/api.ts`, `viewer/src/App.tsx`: static mode (embedded scene), Present and Export buttons.
- `server/src/export/`: build the standalone HTML; `GET /api/export`; `export_scene` tool.
- Docs: README, `docs/EXL.md`, skill.

### Plan
1. Slides model + presenter + tests → commit.
2. Export (server + static viewer mode + tool) + tests → commit.
3. Docs, Playwright check, close the phase → commit.

### Results
- Presentation: typecheck 0, lint 0, `npm test` 56 server + 5 viewer pass (slide order, key map). Playwright on `npm run preview` with the login scene: Present opens 10 slides (prose, arch, 7 steps, prose); → moves to the arch, a group still zooms in there; Space/PageDown/→ reach step 4 of 7 with large narration and its ref; End → 10/10, Home → 1/10, Esc closes; no console errors.
