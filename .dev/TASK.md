# Current Task

F36 — Random topics on Sonnet, and a look of each presentation's own (scope in `docs/plan.md`).

## Goal
A loop until the user stops it: Sonnet writes a presentation on a random topic with a random visual theme; review, fix, add, commit.

## Files
- `evals/random.ts`, `evals/topics.json`, `evals/random-log.md`, `examples/blank/`, `package.json` (script), `e2e/capture.spec.ts`
- `server/src/parser/{types,lesson,parse}.ts`, `server/src/rules.ts` (theme names list, warnings)
- `viewer/src/theme/{themes,motifs}.ts` (eight themes, random pick)
- `docs/EXL.md`, `skills/explicador/SKILL.md`, `skills/explicador/presenting.md`, `AGENTS.md`

## Plan
1. Themes and random pick, with tests.
2. The random eval and capture.
3. Rounds.

## Validation
- Round 1 (iva, compound-interest-en; Sonnet 1.00 both, $0.47): typecheck 0, lint 0, build OK, server 301, viewer 199, evals 50, e2e 97 in Chromium.
- Round 2 (hipoteca, oferta-demanda; Sonnet 1.00 both, $0.59): typecheck 0, lint 0, server 301, viewer 199, evals 50, e2e 97.
- Round 3 (arcoiris-doble, ciclo-agua; Sonnet 1.00 both, $0.62): typecheck 0, lint 0, server 301, viewer 200, evals 50, e2e 97.
- Round 4 (microondas, wifi, huracan; Sonnet 1.00 all, $0.81): typecheck 0, lint 0, server 301, viewer 201, evals 50, e2e 97.
- Round 5 (recursion, vote-counting 0.57, jet-engine; Sonnet, $0.83): typecheck 0, lint 0, server 301, viewer 201, evals 50 (no viewer change, no e2e).
- Round 7 (music-scale, vacunas, separacion-poderes; Sonnet 1.00 all, $0.86): typecheck 0, lint 0, server 301, viewer 201, evals 50, e2e 97.
- Round 8 (lupa, maillard, batteries; Sonnet 1.00 all, $0.94): typecheck 0, lint 0, server 301, viewer 202, evals 50, e2e 97.
- Round 9 (bolsa, rotonda, coffee-roasting; Sonnet 1.00 all, $0.89): typecheck 0, lint 0, server 301, viewer 202, evals 50, e2e 97.
- Round 10 (dns, supply-demand-en, red-electrica; Sonnet 1.00 all, $0.99): typecheck 0, lint 0, server 301, viewer 203, evals 50, e2e 97.
