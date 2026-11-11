# Current Task

Goal (backlog 7): checks answered in Present mode were not saved to the lesson's progress (the presenter had no lesson context).

Files: `viewer/src/lesson/store.ts` (new: progress per key in memory, saved on change, with listeners), `viewer/src/lesson/useProgress.ts` (new: `useLessonProgress`), `viewer/src/lesson/Lesson.tsx`, `viewer/src/presentation/Presenter.tsx`, `viewer/test/lesson.test.ts`.

Plan: the page and the presenter read and write the same store through `useSyncExternalStore`; the presenter provides the lesson context to its slides.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 136/136, viewer 66/66. In Chromium on the example lesson: answering the first check on slide 11 of the presentation and pressing Esc leaves the page at "1 of 1 check" for chapter 1 and "1 of 13 checks" in the rail. No console errors.
