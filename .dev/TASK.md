# Current Task

## F4. More views: `<data>` and `<state>`

### Decisions (user, 2026-11-09)
- `<data>` is a data model: `<entity id label ref?>` with `<field name type? key?>` rows (`key` = `pk`, `fk` or `unique`), and `<relation from to card label?>` with `card` = `1-1`, `1-n`, `n-1` or `n-n`. Reveal animation like `<arch>`.
- `<state>` is a state machine: `<status id label role? ref?>` (`role` = `initial` (exactly one) or `final`), `<transition from to event ref?>`, and an optional narrated `<walk>` of `<go event="...">narration</go>` steps that follows transitions from the initial state, played like a `<flow>` and one slide per step in presentation.
- Entities and states take `ref` and `<drill>` and are clickable like nodes; both views work in presentation and export.
- Criterion: tests + Playwright + a ~5 minute review by the user.

### Criterion
- Automatic: parser tests (valid, invalid, incomplete) for both views; slide order; click targets on entities and states; render, cache and invalidation end to end with refs from the new views; typecheck, lint, tests pass.
- Playwright: sample data-model and state scenes for `examples/shop` render; the walk plays; presentation and export include them; no console errors.
- Manual (user): look at both sample scenes in the viewer.

### Files
- `server/src/parser/`: tags, types, validation, refs.
- `server/src/clicks/`: click targets beyond nodes.
- `viewer/src/layout/`, `viewer/src/components/`: entity and state shapes, `DataScene`, `StateScene`; `viewer/src/presentation/slides.ts`.
- `examples/scenes/`: `data-model.exl.md`, `session-states.exl.md`; docs and skill.

### Plan
1. Parser + click targets + tests → commit.
2. Viewer (shapes, scenes, slides) + tests + Playwright → commit.
3. Samples, docs, skill, close the phase → commit.

### Results
- Parser: typecheck 0, lint 0, `npm test` 67 server + 6 viewer pass. `<data>`: entities, fields (pk/fk/unique), relations with cardinality, drills, refs; bad keys, cards, duplicates, unknown entities and an unclosed entity reported. `<state>`: exactly one initial state, final states, transitions, a walk followed from the initial state (ambiguous or impossible events reported), unclosed `<go>`. Click targets cover entities and states; slides cover `<data>` and `<walk>` steps.
- Viewer: typecheck 0, lint 0, `npm test` 68 server + 8 viewer pass (data and state levels; e2e caches both sample scenes and invalidates only the one whose ref changed). Playwright against the built server with `examples/scenes/data-model.exl.md` and `session-states.exl.md` on a copy of the shop: 4 entity tables with PK/FK/UQ badges and cardinality labels; clicking an entity without a monitor shows the "not listening" notice; the cached `<drill>` on Session opens the state scene with breadcrumbs; the walk reaches step 6 of 6 with the transition and both states highlighted, start dot and final ring drawn; Present gives 7 slides (prose + 6 walk steps); the export opens from `file://` with no requests; editing `src/auth/sessions.js` makes both scenes stale; no console errors. ELK breaks cycles by declaration order only in state machines (start dot pinned to the first layer); the Phase 2 login check was re-run with no regressions.
