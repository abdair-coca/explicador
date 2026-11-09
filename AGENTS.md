# AGENTS.md

Explicador is a Claude Code plugin: an MCP server plus a local web viewer that explains software systems with animated, interactive diagrams.

## Product decisions

Change these only after the user approves:
1. Works with any language: no tree-sitter or LSP; the model provides the understanding.
2. A light index (file tree + import grep) in `.explicador/index/` of the analyzed project is read before code.
3. Scenes are cached in `.explicador/scenes/` and invalidated by hashes of the files they reference.
4. The viewer runs in a local browser tab.
5. Two animation types: step-by-step flow playback and zoom between levels.
6. Clicking an element asks the agent to go deeper.
7. Findings are appended to `FINDINGS.md` at the analyzed project's root.
8. Agent output is EXL: Markdown plus a closed catalog of JSX-like tags, with no embedded JavaScript.

## Conventions

- Write code, docs and commits in English. At runtime the skill makes Claude answer in the user's language.
- Re-check the official docs (code.claude.com/docs) before changing the plugin manifest, skills or MCP config; last verified 2026-11-09.
- `spikes/` holds disposable prototypes; their conclusions live in `docs/decisions/`.
- A change is done when `npm run typecheck` and `npm run lint` exit 0.
- Commit with Conventional Commits, one commit per finished task, without pushing.
