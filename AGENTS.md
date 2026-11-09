# AGENTS.md

Explicador is a Claude Code plugin: an MCP server plus a local web viewer that explains software systems with animated, interactive diagrams.

## Product decisions

Change these only after the user approves:
1. Works with any language: no tree-sitter or LSP; the model provides the understanding.
2. A light index (file tree + import grep) in `.explicador/index/` of the analyzed project is read before code.
3. Scenes are cached in `.explicador/scenes/` and invalidated by hashes of the files they reference.
4. The viewer runs in a local browser tab.
5. Two animation types: step-by-step flow playback and zoom between levels.
6. Clicking an element asks the agent to go deeper, delivered by a plugin monitor (`docs/decisions/interactivity.md`). It works without launch flags.
7. Findings are appended to `FINDINGS.md` at the analyzed project's root.
8. Agent output is EXL: Markdown plus a closed catalog of JSX-like tags, with no embedded JavaScript.

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
