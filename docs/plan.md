# Plan: from "valid format" to "an explanation that is understood" (F22–F30)

Requested by the user on 2026-11-13. The scenes follow every rule of the server and are still not understood (case: slide 2 of `arboles-binarios`, a map of five boxes with results, undefined acronyms and no tree). The rules and the evals measure structure, and the model optimizes what is measured. This plan adds a teaching engine that does not depend on the topic, a catalog of *forms* (not of topics), and a way to measure whether a scene is understood.

Goal: Explicador explains **any topic** well, technical or not: code, notebooks and architecture, but also finance, science, history, business processes, legal documents or a recipe.

## Principles (not negotiable)

1. Every idea has a form; the scene draws that form with a real example.
2. Concrete first, abstract after. No term, acronym or rule appears before an example that motivates it and its definition.
3. One slide = one idea = one question. The title is that idea's question or claim, not a label.
4. The same anchor example from start to finish. It does not change without saying so.
5. Animate the change of the object, not the arrival of boxes.
6. Decoration never competes with the content. When in doubt, leave it out.
7. No tags per domain. Everything new is a generic form, useful in at least three different domains.

## Working rules

- Before each phase, its exact scope and acceptance criteria are written here. After it, a report of 5 lines: what changed, how it was tested, what is pending.
- **Stops** (wait for the user's review): the end of F22, F25 and F30. In the other phases, continue when the criteria are met.
- **Eval budget**: Haiku only, unless the user authorizes more. **Before any run with a model other than the session's, tell the user and wait for the go-ahead** (for Sonnet or Opus, with the estimated cost at list price). Rule restated by the user on 2026-11-13.
- The EXL syntax in the request is a guide: it adapts to the style of `docs/EXL.md` and the parser, and each deviation is justified in this file.
- F11 is not touched and nothing outside this plan is added.

## Phases

| Phase | What | Stop |
|---|---|---|
| F21f | Close F21 | no |
| F22 | Bench of 10 topics and a comprehension baseline | **yes** |
| F23 | Mandatory pedagogical brief | no |
| F24 | Narrative arc and comprehension rules | no |
| F25 | Form "structure with states": `<structure>` | **yes** |
| F26 | Form "causal system": `<system>` | no |
| F27 | Forms "annotated space" and "argument" | no |
| F28 | Sources beyond code | no |
| F29 | Interactivity that teaches | no |
| F30 | Measure the result | **yes** |

The status of each phase is also in `.dev/PLAN.md`.

## F21f — Close F21 (done 2026-11-13)

README and `AGENTS.md` list the checks F21 added; the browser tests passed again (37/37 in Chromium). Commit 26e7444.

## F22 — Bench of 10 topics and a comprehension baseline

First we measure; after, we improve.

### Scope

1. **Bench** (`evals/bench/<id>/`): 10 deliberately different topics. Each has a `topic.json` (title, audience, language, sources, scene, 5 questions with a checkable answer), its source material and the scene Explicador makes of it today.
   | id | Topic | Source material | Scene |
   |---|---|---|---|
   | `arboles-binarios` | Insertion and classification in a binary search tree | the course practice (`source.md`) | the scene the user's tool produced (the case that started this plan), refs moved to `source.md` |
   | `login-tienda` | The shop's login | `examples/shop` | `examples/scenes/login.exl.md` |
   | `regresion-resenas` | Logistic regression on reviews | `examples/notebook/reviews.ipynb` | `examples/scenes/notebook-lesson.exl.md` |
   | `interes-compuesto` | Compound interest on a loan | `source.md` | `scene.exl.md` |
   | `fotosintesis` | Photosynthesis | `source.md` | `scene.exl.md` |
   | `ley-aprobacion` | How a law is passed (generic, no country) | `source.md` | `scene.exl.md` |
   | `contrato-alquiler` | Key clauses of a (fictional) lease | `source.md` | `scene.exl.md` |
   | `embudo-ventas` | A sales funnel with example numbers | `source.md` | `scene.exl.md` |
   | `imprenta` | Causes of the printing press and its spread | `source.md` | `scene.exl.md` |
   | `pan` | The chemistry of bread | `source.md` | `scene.exl.md` |
2. **Comprehension eval** (`npm run eval:comprension`). A small model (Haiku) answers the 5 questions of each topic **with only the text of the scene** and, apart, **without the scene**. The score is the gain: correct answers with the scene minus correct answers without it. Questions are multiple choice (A–D) or numeric, so they are graded without judges. The scene's text is its reading in Present order (`evals/sceneText.ts`), with no ids, refs or decoration. It prints a table and writes `evals/results/comprehension-<stamp>/`.
3. **Rules per scene**: the server's own warnings (`sceneWarnings`), counted per scene. The rules of F24 join this table when they exist.
4. **Human protocol** (`docs/prueba-humana.md`): how to show a scene to 3 people of the target audience without explaining anything, what to ask them and a template to note where they got lost.
5. **Tests** (`npm test`): every topic has 5 well-formed questions with an answer among the options; every scene parses; each correct answer is in one of the options; scoring and the scene's text are deterministic.

### Decisions taken in this phase

- **Who writes the scenes of the topics with no scene yet (4–10).** The session's model (Sonnet 5.5), following `SKILL.md` and `presenting.md` as they are today and fixing warnings until none is left, with the principles above *not* applied, so the baseline is what the current skill produces. No other model is used to write them. Limit: they are written by a model that knows what this plan will change, so they may be slightly better than what Haiku would produce today.
- **Source material of the non-code topics** is a Markdown file in the bench folder; the scene's `ref`s point at its lines, as they would at a document (F28 generalizes sources).
- **Language**: each topic is in the language of its audience (the three existing scenes keep theirs: Spanish for trees, English for login and the notebook).
- **Runs**: each condition is asked `--runs` times (default 3) and the score is the mean, because a small model's answers vary. The cost of a run is shown before and after. The user authorized one run (`--runs 1`, 20 calls) for the baseline.
- **Questions hinge on what only the explanation says** (taken after the first run, see the outcome below): its example, its rules and its numbers, asked as "in the example of the explanation…", with at most one or two questions of general understanding per topic. Questions that apply general knowledge to data stated in the question are answered by the model with no scene at all.
- **Rules and the browser**: the bench's scenes are played by `e2e/bench.spec.ts` (every component drawn, no sideways scroll, Present walked to the end and back) and `e2e/capture.spec.ts` makes the screenshots of the reports (it does nothing unless `EXPLICADOR_CAPTURE` is set).

### Acceptance criteria

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` and `npm run e2e` pass.
- The 10 topics exist with their sources, scenes and questions; every scene has 0 warnings with today's rules (7 new ones) or its warnings are listed (3 existing ones).
- `npm run eval:comprension` runs on Haiku with the user's go-ahead and prints the baseline table (10 topics × rules × comprehension).
- Screenshots of 3 representative scenes, including the map slide of the trees scene.
- **Stop**: deliver the baseline table and the screenshots; wait for the user.

### Outcome (2026-11-13)

Done. The 10 topics, the eval, the human protocol, 50 tests and 24 browser tests exist; the baseline is in [`baseline-f22.md`](baseline-f22.md).

1. **What changed**: `evals/bench/` (10 topics), `evals/bench.ts`, `evals/sceneText.ts`, `evals/comprehension.ts` (`npm run eval:comprension`), `evals/test/`, `e2e/bench.spec.ts`, `e2e/capture.spec.ts`, `docs/prueba-humana.md`, `docs/baseline-f22.md`, screenshots in `docs/images/f22/`.
2. **How it was tested**: typecheck, lint, build, `npm test` (server 222, viewer 162, evals 50) and `npm run e2e` (61 in Chromium) pass; the eval ran on Haiku twice, 20 calls each, $0.012 each.
3. **Result**: with today's rules all 10 scenes have 0 warnings; Haiku gets 2.4 of 5 without the scene and 4.9 with it. The first set of questions was saturated (4.6 of 5 without the scene) and was rewritten.
4. **Limit found**: the model eval measures content (it caught the 5 % renewal cap missing from the lease scene) but not clarity: a text with the facts scores 5 of 5 whatever its order, picture or hierarchy. Clarity is for the human protocol and the rules of F24.
5. **Pending**: three topics (`imprenta`, `ley-aprobacion`, `login-tienda`) are still answerable from general knowledge (4–5 of 5 without the scene); the baseline has one run per condition; nobody has yet run the human protocol.

## F23 — Mandatory pedagogical brief

Before designing, the model has to think. Every scene opens with a `<brief>` the server checks; `render_scene` refuses a scene whose brief is missing or invalid.

### Scope

1. **`<brief form>`** with the children `<audience>`, `<question>`, `<example>`, `<misconception>`, `<check>` and `<terms>` (a comma-separated list), each required once, one line of text, at most 300 characters (`<terms>`: 1–12 terms of at most 60 characters).
   ```exl
   <brief form="structure">
   <audience>Second-year engineering students; they know what a linked list is</audience>
   <question>How does a binary search tree decide where each value goes, and what shape does it end up with?</question>
   <example>Insert 50, 30, 70, 20 in that order</example>
   <misconception>Believing the tree always stays balanced</misconception>
   <check>Predict where 40 goes and whether the tree becomes full</check>
   <terms>node, child, height (in levels), full tree, degenerate tree</terms>
   </brief>
   ```
2. **Errors** (the parser, so `render_scene` saves nothing): a missing, repeated, empty or too long field; an `<example>` with no concrete data (no digit, no quoted literal and no capitalized name after its first word); a `form` outside the catalog; a `<brief>` that is not the first tag (Markdown, the `#` title, may come before it) or appears twice. `render_scene` refuses a scene without `<brief>`, with a template.
3. **Forms catalog** (closed, `form`): `structure` (parts and how they relate or change: a tree, an organization chart, an architecture), `process` (something goes through steps or states: a request, a law, a recipe), `quantity` (amounts, scale and how they change: interest, a funnel, metrics), `system` (causes and feedback: inflation, an ecosystem, a cache under load), `annotated` (a document, image or code read part by part: a lease, an interface), `argument` (a thesis with evidence and objections, or a decision with options and costs), `timeline` (events in order: a history). F25–F27 add the tags that draw the forms that lack one today; F27 writes the full form → tags table.
4. **Warnings** (rules that never block, like F21's; the skill requires fixing them): the misconception is not taken up by any component, check or concept (at least half of its key words in one block's text); the scene has no `<quiz>` with options, the slide where the reader predicts the `check`; and, for a cached scene from before F23, the brief is missing (so `show_scene` asks to rebuild it with one).
5. **The brief is not shown**: it travels as `scene.brief`, outside `blocks`, so the viewer, the slides, exports and the comprehension eval's scene text ignore it.
6. **Skill and docs**: `presenting.md` makes the brief step 1 and designs every later step from it, with 2 example briefs (one technical, one not); `SKILL.md`, `docs/EXL.md` (reference rows, the forms) and `AGENTS.md` (decision 8). The example scenes and the guide's templates gain a brief.

Taken to the per-slide checks of the request: "every slide declares its part of the arc", "the scene answers the `question`" and "every term is defined before its first use" need the arc of F24 and are built there.

### Deviations from the request

- **Tag form instead of `key: value` lines.** EXL bodies are text or child tags (as in `<concept>`), so the fields are children with English names; their text is in the scene's language. `form` is an attribute because its value is a closed list, like `<theme name>`.
- **Field names in English** (`audience`, `question`, `example`, `misconception`, `check`, `terms`), like every tag and attribute of the catalog; `<example>` is the same tag as in `<concept>`.
- **The cross-checks are warnings, not refusals.** Whether the misconception is taken up is a heuristic over words, and "a check exists" depends on the rest of the scene; since F21 rules of that kind never block a render, but the skill and the evals require a scene with none left.

### Acceptance criteria

- Parser tests: a valid brief; each field missing, repeated, empty, too long; a vague example; an unknown form; a brief after another tag; two briefs. Rule tests: misconception addressed and not; a check quiz and only flashcards; no brief.
- `render_scene` refuses a scene without a brief (stdio test); the example scenes and the guide's templates carry one and render with no warnings.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` and `npm run e2e` pass.
