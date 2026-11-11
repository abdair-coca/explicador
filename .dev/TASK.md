# Current Task

Goal: F13b, `<threshold>` (plan in `.dev/PLAN.md`): a slider over the real test probabilities that recomputes the confusion matrix, accuracy, precision and recall live.

Spec:
- `<threshold id? title classes="negative|positive"? at? ref?>` with 2–200 `<point score actual label? />`. `score` is a probability of the second class in [0, 1], as printed; `actual` names one of `classes` (default `0|1`); `at` is the starting threshold (default 0.5), in (0, 1).
- Viewer: a strip of the points in two lanes (one per actual class) along 0–1, each dot green when the threshold classifies it right and red when wrong, a vertical threshold line; a range input (keyboard: arrows move 0.01) and "Back to 0.5"; beside it the live confusion matrix (the existing grid) and accuracy, precision, recall computed by the existing metric code; the count of points that changed class against the starting threshold.
- Presentation: one slide, interactive. Docs, skill, example chapter over cells 20–21.

Files: `server/src/parser/{types,common,lesson,parse}.ts`, `viewer/src/lesson/threshold.ts` (pure), `viewer/src/lesson/Threshold.tsx`, `BlockView`, `presentation/{slides.ts,Presenter.tsx}`, docs, skill, example, tests.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 141/141, viewer 77/77. Example lesson chapter 9 over cells 20–21 (6 test probabilities printed by cell 21; the number test covers `<threshold>`). In Chromium: arrow keys to 0.62 give accuracy, precision and recall 1 and "1 input is called differently than at 0.5"; to 0.70 recall 0.6667 with "good fun start finish" red. At 390 px the threshold label overlapped a tick and a side label: ticks near the threshold and side labels without room are now hidden, and the lane labels' margin follows their length. Presentation 77 slides, none blank. No console errors.
