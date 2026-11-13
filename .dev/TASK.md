# Current Task

## F21e. Evals

**Goal:** a suite that measures whether real models follow the skill and use the viewer well, run on Haiku, Sonnet and Opus until the targets hold (every case ≥ 0.8 on Haiku, ≥ 0.95 on Sonnet and Opus, every `rule-…` grader passing).

**Files:** `evals/*/case.yaml` and `scaffold.sh` (8 cases), `evals/scaffold.ts`, `evals/run.ts`, `package.json` (`eval`), `.gitignore` (`evals/results/`); `server/src/bridge/index.ts` (`EVAL_EXPLICADOR_NO_BROWSER`); fixes from the runs in `server/src/rules.ts`, `server/src/tools.ts`, `skills/`, `docs/EXL.md`, `examples/scenes/`.

**Plan:** `claude plugin eval` with scaffold scripts that copy an example project (and a cached scene, a waiting question or an edited file); deterministic graders only (user: no LLM judges): tools and their order, the scene saved with no warning, the components each case needs, at-least counts, the facts and numbers of each example, Spanish text, and the reply. Check the graders on the example scenes (free), then run Haiku, Sonnet and Opus, read each failure, fix the skill, the guide and the server's messages, and run again. A first calibration with Opus judges found the examples behind the guide: label titles, two-sentence notes, missing concept cards and a wrong count; fixed in the three examples.

**Validation:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run e2e`, `npm run eval`.

**Results:** pending.
