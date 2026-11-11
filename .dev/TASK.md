# Current Task

Goal (unattended backlog 3, accessibility of charts, matrices and quizzes): the chart SVG was `role="img"` with focusable marks inside (assistive tech drops an image's children) and announced every tooltip; confusion cells did not say which axis is which; a check was a region named only "Check".

Files: `viewer/src/lesson/Chart.tsx`, `viewer/src/lesson/Matrix.tsx`, `viewer/src/lesson/Quiz.tsx`, `viewer/src/presentation/Presenter.tsx`.

Plan: the chart is a group (`aria-roledescription="chart"`) whose marks are images named "label, series, value"; ticks, labels, value text and the tooltip are hidden from assistive tech (the marks and the Table view carry them); the presenter's diagram fitting skips charts. Confusion cells read "actual X, predicted Y: n (TP)". A quiz section is labelled by its question.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 135/135, viewer 65/65. In Chromium on the example lesson (Playwright aria snapshots): the weights chart is `group "The strongest weights: 8 rows; …"` with `img "great, 0.892"` and so on; keyboard focus on a bar shows the tooltip; confusion cells read "actual negative, predicted positive: 1 (FP)"; the first check is `region "What does the label 0 mean in this notebook?"`, and Tab + Enter answers it. With reduced motion the journey does not autoplay and bars are at full width.
