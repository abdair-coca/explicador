# Current Task

F23 — Mandatory pedagogical brief. Scope and criteria: `docs/plan.md`, "F23".

## Files
- `server/src/parser/{common,types,brief,parse}.ts`: the `<brief>` tag, `scene.brief`, the forms.
- `server/src/rules.ts`: brief warnings; `sceneWarnings` takes the scene.
- `server/src/tools.ts`: `render_scene` refuses a scene without a brief.
- `evals/bench.ts`: new `sceneWarnings` signature.
- Tests: `server/test/brief.test.ts`, stdio test for the refusal.
- Docs: `docs/EXL.md`, `skills/explicador/{SKILL,presenting}.md`, `AGENTS.md`; example scenes gain a brief.

## Validation
- typecheck, lint, build, test, e2e.
