# Current Task

## F21c. Browser tests

**Goal:** what the viewer shows is tested in a real browser and stays right: every example on the page and in Present, at a desktop and a phone width, with and without motion, as an offline export, and the reader's interactions.

**Files:** `package.json` (`@playwright/test` 1.63.0, `e2e`, `e2e:all`, typecheck of `e2e/`), `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/scenes.spec.ts`, `e2e/interaction.spec.ts`, `e2e/tsconfig.json`, `.gitignore`; fixes in `viewer/src/index.css`, `viewer/src/presentation/Presenter.tsx`, `server/src/files.ts`, `server/src/index.ts`, `server/src/preview.ts`.

**Plan:** an in-process bridge per test serving an example with the built viewer and the project's files; an automatic fixture that fails on console errors and uncaught exceptions; a walk through Present that follows `data-position`; geometry checks on settled states (reduced motion); fix what the tests find.

**Validation:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run e2e`.

**Results:** typecheck 0, lint 0, build OK, server 220/220, viewer 162/162, e2e 37/37 (Chromium). Fixed: trace bars off a phone's screen, a sideways scrollbar flashing as comparison cards entered, an uncaught rejection when a slide move skipped another, and the preview's code window without files.
