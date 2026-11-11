# Current Task

Goal: F13c, practice mode (plan in `.dev/PLAN.md`): one place to drill every check and flashcard of a lesson, the ones missed first, with a score.

Spec:
- A "Practice" button (rail, pill strip, end card) when the lesson has checks. It opens a full-screen dialog that asks the checks one at a time, fresh (even solved ones): first those marked "tried" or "Review again", then the unanswered, then the done ones, each group in lesson order.
- Answers also count in the lesson's progress (a right answer is never taken back). "Next" once the check is answered; Esc or Close leaves.
- The end: "n of N right first time" (a flashcard counts when the reader says "Yes"), the missed ones listed, "Practice the missed ones" and "Done".
- Works offline (exports) and by keyboard.

Files: `viewer/src/lesson/practice.ts` (pure), `viewer/src/lesson/Practice.tsx`, `viewer/src/lesson/Lesson.tsx`, tests in `viewer/test/lesson.test.ts`.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 141/141, viewer 79/79. In Chromium on the example lesson at 1440 and 390 px: after a wrong pick on the page, Practice starts with that check, walks all 15 (keyboard picks, flashcards by "Show the answer" + "Yes"), scores 9 / 15 for first answers, lists the missed ones with their chapter, and the practised chapter shows "1 of 1 check" on the page. Fixed while checking: the dialog was trapped inside the transformed `<main>` (now a portal to `body`), and at 390 px the close button of Practice and of the presenter was not at the right edge. Export from file://: Practice, the calculation and the threshold work, no network requests, no errors.
