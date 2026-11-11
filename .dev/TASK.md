# Current Task

Goal (unattended backlog 1, bugs from the browser check): journey stage tiles broke code mid-word ("train_test_spl it()", "CountVectorize r()") and a lone stage on the last row stretched across the card.

Files: `viewer/src/lesson/breaks.ts` (new, `codeBreaks`), `viewer/src/lesson/Journey.tsx`, `viewer/test/lesson.test.ts`.

Plan: break `op` only after `_ . ( , =` and inside camelCase (`<wbr>`), keep the arrow glued to the code (no-break space); cap a tile at 22rem.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 135/135, viewer 65/65. Example lesson in Chromium: at 1440 px "train_test_ / split()" and "Count / Vectorizer()", the last tile keeps its size; at 390 px each op fits on one line.
