# Current Task

Goal: F13a, `<calc>` (plan in `.dev/PLAN.md`): show how a model scores one input, part by part, with the viewer doing the arithmetic.

Spec:
- `<calc id? title kind="sum|logistic"? total? classes? threshold? ref?>` with 2–24 `<part label value note? ref? />`. `value` and `total` are numbers as printed. `kind` defaults to `sum`. `classes` (logistic only) names the two classes, default `0|1`; `threshold` (logistic only) in (0, 1), default 0.5.
- The parser refuses a `total` the parts do not add up to beyond rounding (half a unit of the parts' last decimal per part).
- Viewer: a horizontal waterfall (each part a bar from the running total before to after it, blue up, red down, then the total from zero), played part by part with its note; for `logistic` a sigmoid curve with the score's point, the probability (computed) and the decision against the threshold. Presentation: one slide per step. Docs and skill updated; the example lesson gets a chapter over the new cells 18–19.

Files: `server/src/parser/{types,common,lesson,parse}.ts`, `viewer/src/lesson/calc.ts` (pure), `viewer/src/lesson/Calc.tsx`, `BlockView`, `presentation/{slides.ts,Presenter.tsx}`, docs, skill, example, tests.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 139/139, viewer 73/73. The example notebook gained cells 18–21 (the scoring of "worst film year really bad" and the test probabilities, for F13b), executed with nbconvert; the lesson gained chapter 8 with a `<calc kind="logistic">` whose parts and total are all printed by cell 19 (the test that every number comes from an output now covers `<calc>`). In Chromium at 1440 and 390 px: the waterfall chains each part from the running total, the score bar starts at zero, the sigmoid shows 0.608 and the decision "positive"; presentation 72 slides, none blank (10 for the calculation). No console errors.
