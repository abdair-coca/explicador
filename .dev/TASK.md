# Current Task

Goal (unattended backlog 5): a notebook scene cached before lessons (boxes and flows over cells, no `<chapter>`) came back from `show_scene` as "fresh: answer from this EXL", so the agent kept serving the old format although the skill says to rebuild it.

Files: `server/src/lessons.ts` (new: `needsLesson`, `lessonHint`), `server/src/navigation.ts` (`show` returns the parsed blocks), `server/src/tools.ts`, tests in `server/test/lesson.test.ts` and `server/test/interactivity.test.ts`.

Plan: when a cached scene refers to a `.ipynb` and has no chapter, `show_scene` (fresh or stale) replaces its usual instruction with one that asks for a lesson under the same topic.

## Validation

- 2026-11-11: typecheck 0, lint 0, build OK, server 136/136, viewer 65/65. End to end over stdio: `show_scene` on a cached arch over notebook cells answers "…predates lessons. Rebuild it as a lesson…"; on a scene over `.js` files it does not.
