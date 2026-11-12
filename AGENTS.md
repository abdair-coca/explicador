# AGENTS.md

Explicador is a Claude Code plugin: an MCP server plus a local web viewer that explains software systems with animated, interactive diagrams.

## Product decisions

Change these only after the user approves:
1. Works with any language: no tree-sitter or LSP; the model provides the understanding.
2. A light index (file tree + import grep) in `.explicador/index/` of the analyzed project is read before code.
3. Scenes are cached in `.explicador/scenes/` and invalidated by hashes of the files they reference.
4. The viewer runs in a local browser tab.
5. Animation types: step-by-step flow playback and zoom between levels, and for lessons (F12, F13) the data's journey, step-by-step value traces, charts that grow, matrices with highlights, worked calculations and a threshold the reader moves. In Present mode (F14) each slide is revealed part by part, slides move in the direction of travel, and each chapter opens with a yellow wipe onto a night-blue card. A concept (F15) opens with its term alone, which then flies to the top while its pieces arrive and its formula assembles symbol by symbol.
6. Clicking an element opens its detail panel (description, key code); its "Go deeper" button asks the agent to go deeper and its question box asks the agent about the element, both delivered by a plugin monitor (`docs/decisions/interactivity.md`); a read-only code window beside it shows the element's code and plays the agent's code tours. It works without launch flags.
7. Findings are appended to `FINDINGS.md` at the analyzed project's root.
8. Agent output is EXL: Markdown plus a closed catalog of JSX-like tags, with no embedded JavaScript. Lessons (F12, F13) added `<chapter>`, `<stats>`, `<journey>`, `<trace>`, `<chart>`, `<matrix>`, `<quiz>`, `<calc>` and `<threshold>` to the catalog. F15 added `<concept>` (a term with its definition, analogy, formula and example); Markdown may hold LaTeX formulas (`$…$`, `$$…$$`), drawn by KaTeX and checked by the parser.

## How to work

- The approved plan and phase status live in `.dev/PLAN.md`. Work one phase at a time:
  1. Write the phase into `.dev/TASK.md` (goal, files, plan, validation) before touching code.
  2. Make the smallest change that meets the phase criterion, reusing what exists.
  3. Run the checks below and record the real results in `TASK.md`.
  4. Reset `TASK.md` to `# Current Task` + `No active task.`, mark the phase in `PLAN.md`, and commit.
  5. Stop at the end of each phase with a summary of what was done, what is pending and how to test it; wait for the user's go-ahead.
- When something is ambiguous, ask the user with multiple-choice options instead of assuming.
- Write code, docs and commits in English; talk to the user in Spanish. At runtime the skill makes Claude answer in the user's language.
- Re-check the official docs (code.claude.com/docs) before changing the plugin manifest, skills, monitors or MCP config; last verified 2026-11-09.
- `spikes/` holds disposable prototypes; their conclusions live in `docs/decisions/`.

## Checks and commits

- A change is done when `npm run typecheck` and `npm run lint` exit 0 (and `npm test` once it exists).
- Commit as `abdair-coca <cocaabdair@gmail.com>` with Conventional Commits, one commit per finished phase, without `Co-Authored-By` or other attribution lines.
