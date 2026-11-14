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
| F31 | Pictures that explain any topic (after the Sonnet/Opus test) | **yes** |
| F32 | `<figure>`: movement and states | **yes** |
| F33 | `<figure>`: anchors instead of numbers, and geometry checks | **yes** |
| F34 | `<figure>`: pictograms, arcs and measures | **yes** |
| F35 | `<figure>`: clearer reading (labels, leaders, cues, details) | **yes** |

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

### Decisions taken in this phase

- **Key words of the misconception**: words of 4 letters or more, compared by their first 5 letters (so "balanced" meets "balance"), without framing words ("believing", "creer", "that"…) and without the words the brief's `question` also has: those name the topic, which every block names, so "the model understands the review" is not taken up just because a block says "model" and "review".
- **A concrete example**: a capitalized word counts as a name only after the first word and not right after `.`, `!`, `?` or `:`, so a sentence's own capital does not pass ("Insertion of values. Then a search" is refused).
- **The parser accepts a scene without a brief**, so scenes cached before F23 still open; `render_scene` refuses to save one, and `show_scene` lists "No <brief>" as a warning that asks to rebuild it.
- **`<brief>` comes before `<theme>`**: the theme's rule is now "before every other tag but `<brief>`".
- The guide's two example briefs are fenced as `xml` (a brief alone is no scene, and every `exl` block of the guide must be a whole scene with no warnings); a test parses them.

### Outcome (2026-11-14)

1. **What changed**: `server/src/parser/brief.ts` (the tag, its fields and the concrete-example check), `scene.brief`, `briefWarnings` in `rules.ts` (`sceneWarnings` takes the scene), the refusal in `render_scene`, the brief in `docs/EXL.md`, `SKILL.md`, `presenting.md` (step 1, two example briefs), `AGENTS.md` and `README.md`; the five example scenes and both templates carry a brief and a check quiz.
2. **How it was tested**: `server/test/brief.test.ts` (17 tests: every field missing, repeated, empty, too long and on two lines; a vague example; an unknown form; a brief after a tag; two briefs; the misconception taken up and not; a check quiz and only flashcards; no brief) and two stdio tests (the refusal with its template; a scene cached without a brief). typecheck, lint, build, `npm test` (server 240, viewer 162, evals 50) and `npm run e2e` (61 in Chromium) pass.
3. **Bench**: the 8 bench scenes written before F23 now count one warning each ("No <brief>"); `login-tienda` and `regresion-resenas` use the example scenes and count none. No eval was run.
4. **Limit**: "taken up" is a word heuristic; a block can share the words and still not correct the idea. F30 measures whether it helps.
5. **Pending**: the per-slide checks (the arc, the question answered, terms defined before use) are F24.

## F24 — Narrative arc and comprehension rules

The brief says what the scene is for; the arc says what each slide does for it. Every component declares its part of the arc, and the server checks the order the principles ask for: the concrete case before the rule, the answer after the example, the misconception corrected on a slide, every term and acronym defined before it is used.

### Scope

1. **`arc` on every component** (every top-level tag except `<brief>`, `<theme>` and `<chapter>`), a closed list:
   | `arc` | The slide… |
   |---|---|
   | `question` | poses the problem: the case or the stakes, before anything is explained |
   | `example` | shows the brief's concrete example |
   | `idea` | draws the rule, the mechanism or the term from the example |
   | `contrast` | puts the misconception against what really happens |
   | `apply` | uses the idea on a new case or shows a consequence |
   | `answer` | answers the brief's question |
   | `check` | asks the reader to predict or work something out |
   | `recap` | sums up or reviews |
   An unknown value is a parser error. Defaults, so the common case needs nothing: a `<concept>` is an `idea`, a `<quiz>` with options a `check`, a flashcard a `recap`. Like `id`, it is documented once for every block.
2. **Arc warnings** (only for a scene with a brief; an older scene already gets "No <brief>"):
   - components that declare no part of the arc, listed;
   - **concrete first**: an `idea` before the first `example`, or an `answer` before the first `example` (the map that shows the result before the case);
   - no `example` slide that shows the brief's example (one of its numbers, quoted values or names);
   - no `contrast` slide;
   - no `answer` slide;
   - the last component is not a `check` or a `recap`.
3. **Comprehension warnings**:
   - **Terms before use** (with a brief): every term of `<terms>` needs a `<concept>` whose `term` names it, and no component before that concept shows the term.
   - **Acronyms** (every scene): a word of 2–6 capital letters (a hyphen may join two: "TF-IDF") shown by a component, which the scene never spells out (`ACR (words)` or `words (ACR)` anywhere in it), no `<concept term>` names, and the brief's `<audience>` does not say the reader knows.
   - **Label titles** (every scene): a component `title` of one or two words ("Weights", "Overview") is a label, not the slide's claim.
4. **Skill and docs**: `presenting.md` (the arc after the brief, its table, the order; the templates declare their arc and satisfy every rule), `SKILL.md`, `docs/EXL.md`, `AGENTS.md`; the example scenes declare their arc and pass every rule; `docs/baseline-f22.md` gets the column of warnings the bench scenes get with the rules of F23 and F24.

### Deviations from the request

- **The arc is per component, not per slide.** A component is one slide or a run of slides of one picture (a flow's steps); its parts share one role. A `<chapter>` card has no arc: it names a section, and its components carry theirs.
- **"The scene answers the question"** is checked as an `answer` slide existing after the example, not by reading the answer: whether a title answers a question is not checkable without a model.
- **Decoration and counters** (principle 6, "three counters at once") are the viewer's, not rules over EXL, and are left for F29.

### Acceptance criteria

- Parser tests: every arc value; an unknown arc; arc on `<chapter>` or `<theme>` refused.
- Rule tests: each warning above, firing and not firing; defaults for `<concept>` and `<quiz>`; acronyms spelled out, named by a concept, known by the audience, and not.
- The example scenes and the guide's templates declare their arc and render with no warnings.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` and `npm run e2e` pass.

### Decisions taken in this phase

- **`arc` is checked like `id`**: one sentence in `docs/EXL.md` and `SKILL.md` documents it for every component; the catalog test treats it as shared, not per tag.
- **Terms before use** counts every component, not chapter cards: a card announces its section ("Read an embedding") and its first component defines the term.
- **Acronyms are checked in order**: spelled out (`ACR (words)` or `words (ACR)`, Markdown emphasis allowed) in the same block or before it, prose included, or named by an earlier `<concept>`. A hyphen joins two acronyms ("TF-IDF") but not a code ("BOOK-1843"); well-formed roman numerals ("XV") are dates. "LCI" is not a roman numeral.
- **The acronym and title rules run on every scene**, so the bench's old scenes are measured too; the arc and terms rules need a brief.
- **The examples were rebuilt, not only annotated**: each opens with its case before any card (Ada's login, Ada's records, Ada's visit, the review the model gets wrong, the customer's question), the intro maps no longer show the result, the lesson gained a "Stop word" card and spells out TP, FP, FN and TF-IDF, and the shop scenes gained cards for their terms and a `<compare>` that sets the misconception against the code.
- **The lesson guidance in `SKILL.md`** said "headline numbers (the result first)"; it now asks for the size of the problem first and the result once the example has led to it.

### Outcome (2026-11-14)

1. **What changed**: `arc` on every component (`componentTags` in `parser/common.ts`, read in `parse.ts`, `arcParts` in `types.ts`); `arcWarnings`, `termWarnings`, `acronymWarnings` and `titleWarnings` in `rules.ts`; "The arc" in `presenting.md` (recipe steps 3–4, a table of parts, the checklist) and `docs/EXL.md`; `SKILL.md`, `AGENTS.md`, `README.md`; the five examples and the three templates follow every rule; the baseline has a column for the new rules.
2. **How it was tested**: `server/test/arc.test.ts` (17 tests: every part, an unknown part, arc refused on a chapter, the theme and the brief, the defaults, each arc warning firing and not, terms defined, missing and late, chapter cards, acronyms spelled out before, after, by a concept, known to the audience, roman numerals and codes, label titles); the stdio and browser tests updated to the rebuilt login. typecheck, lint, build, `npm test` (server 258, viewer 162, evals 50) and `npm run e2e` (61 in Chromium) pass.
3. **Bench**: with the rules of F23–F24 the eight old bench scenes get 1–2 warnings each (mean 1.0 over the ten): "No <brief>", plus ATP used before it is spelled out in `fotosintesis` and a label title in `imprenta`. No eval was run.
4. **Limits**: the arc is declared by the author, so the server checks its order, not whether a slide does what it declares; "the scene answers the question" is an `answer` slide after the example, not a reading of it.
5. **Pending**: decoration and counters are the viewer's (F29); F25 adds `<structure>`, the form that draws a tree or an organization chart as itself.

## F25 — Form "structure with states": `<structure>`

A tree, an organization chart, a file system or the outline of a law is drawn as itself, and when it changes (a value is inserted, a team moves, a node is removed) the scene animates the object changing, not boxes arriving (principle 5). The case that started the plan, the binary search tree drawn as a left-to-right box diagram, becomes a tree that grows value by value.

### Scope

1. **`<structure title direction? ref? arc?>`** with `<member>`s and `<change>`s:
   ```exl
   <structure title="Five values in, a tree three levels deep" arc="example">
   <member id="n50" label="50" />
   <member id="n30" label="30" parent="n50" side="left" />
   <member id="n70" label="70" parent="n50" side="right" />
   <member id="n20" label="20" parent="n30" side="left" />
   <change label="Insert 50" add="n50">50 is the first value, so it becomes the root.</change>
   <change label="Insert 30" add="n30" mark="n50">30 is smaller than 50, so it goes to the left.</change>
   <change label="Insert 70" add="n70" mark="n50">70 is larger than 50, so it goes to the right.</change>
   <change label="Insert 20" add="n20" mark="n50 n30">20 is smaller than 50 and than 30: left, then left again.</change>
   </structure>
   ```
   - `<member id label parent? side? desc? ref?/>`: one part of the structure; `parent` names another member (none: a root; several roots are a forest); `side="left|right"` keeps a binary tree's shape when a child is alone. Up to 40 members.
   - `<change label add? remove? move? mark?>narration</change>`: one step from a state to the next. `add` and `remove` list member ids, separated by spaces; `move="a>b"` gives `a` the parent `b` (`a>b:left` with a side, `a>` makes it a root); `mark` lists the members the step points at (the path compared, the part that changed). Up to 20 changes, each with its narration.
   - Members that no change adds are there from the start. The parser plays the changes and refuses one that adds a member already there, removes or marks one that is not, moves a member under itself or its own descendant, leaves a member without its parent, or puts two children of one parent on the same side; the block carries every state, so the viewer only draws.
   - `direction="down"` (default: the root at the top) or `"right"` (the root at the left, like a file tree).
2. **Viewer**: a tidy tree (each parent centered over its children, a lone child on its `side`), members as boxes and links as lines. Between two states the members glide to their new places, a new member grows out of its parent, a removed one fades, and the marked ones light up; a step taken back with ← plays back. In Present each state is a part with its narration as the subtitle; on the page the same states play with step controls and the narration under the picture. With reduced motion, the states change without movement. Wide trees scroll inside their frame on a phone.
3. **Server and rules**: the tag in the catalog, `componentTags`, refs, the subtitle rule (change narrations), the scene text of the eval, the slide count.
4. **Docs and skill**: `docs/EXL.md` (rows and the section), `SKILL.md`, `presenting.md` (the table: "How does the structure change, step by step?"), `AGENTS.md` decision 5 and 8, `README.md`.
5. **An example** over a small project, `examples/trees` (a binary search tree in Python): `examples/scenes/search-tree.exl.md` follows the brief and the arc and draws the tree growing; it joins the examples the browser tests play.
6. **Screenshots** for the stop: the tree at its first and last state in Present, desktop and phone.

### Acceptance criteria

- Parser tests: a valid structure and its states; every refusal above; limits; `direction`.
- Viewer tests: the layout of a binary tree (a lone left child sits left), a forest, a file tree to the right, positions inside the frame.
- Browser tests: the new example draws, walks Present forward and back with and without motion, and has no sideways scroll.
- The example renders with no warnings.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` and `npm run e2e` pass.
- **Stop**: deliver the screenshots and a summary; wait for the user.

### Decisions taken in this phase

- **Tag names**: `<member>` and `<change>`, because `<node>` (boxes of `<arch>`), `<part>` (`<calc>`), `<item>` (`<space>`), `<state>` and `<step>` already exist and a tag's attributes are the same wherever it appears.
- **The parser keeps every state on the block** (`states`), so the rules, the eval's scene text and the viewer read the same structure and the viewer only lays it out.
- **A change must change something** (`add`, `remove`, `move` or `mark`); a state that only talks is a subtitle with nothing to show.
- **The picture**: boxes in HTML over an SVG of links, positioned in fractions of one frame shared by every state; GSAP animates from the old place to the new one, so a step taken back plays backwards. A new member grows out of its parent's old place; the links into the marked path and into the new member light up; the change's `label` is a chip above the tree. The level height follows the screen's height (`clamp(3.25rem, 8vh, 5.5rem)`), so five levels fit a phone's slide.
- **Bridge**: `close()` now also drops open connections (`closeAllConnections`). A browser's idle keep-alive socket made the browser tests' teardown wait for 3 minutes in 2 of 3 full runs once the suite grew; with it, the suite runs in 1.9 minutes instead of 3.3.
- **`e2e/capture.spec.ts`** takes a part and a phone per screenshot, so the report's pictures can be made again.

### Outcome (2026-11-14)

1. **What changed**: `<structure>` with `<member>` and `<change>` (`server/src/parser/structure.ts`, types, catalog, refs, the subtitle rule, the eval's scene text); `viewer/src/lesson/{Structure.tsx,structureLayout.ts}`, Present and its subtitles, CSS; `examples/trees/bst.py` and `examples/scenes/search-tree.exl.md` (the tree growing from 50, 30, 70, 20, 40, then the same values sorted growing into a line, with a brief and an arc and no warning); the docs; screenshots in `docs/images/f25/`.
2. **How it was tested**: `server/test/structure.test.ts` (6 tests: the states, a start state, moves and removals, a structure without changes, every refusal, bad members, limits, long narrations) and `viewer/test/structure.test.ts` (5: a lone left child, centering and forests, one frame for every state, a tree turned right, Present's parts and subtitles); the new example in every browser test (draw on desktop and phone without sideways scroll, Present forward and back with and without motion, export offline). typecheck, lint, build, `npm test` (server 264, viewer 167, evals 50) and `npm run e2e` (68 in Chromium, twice) pass.
3. **Seen in the browser**: the tree grows value by value on desktop and phone; mid-step, the new value grows out of its parent on its way to its place; the path compared lights up.
4. **Limits**: a structure has up to 40 members and 20 changes; a tree wider than the slide scrolls inside its frame on a phone; the presenter's fit shrinks SVG diagrams, not this frame, which sizes its levels by the screen's height instead.
5. **Pending**: the stop. The user reviews F23–F25; F26 (`<system>`) follows on the go-ahead.

## F26 — Form "causal system": `<system>`

Some ideas are not a structure or a sequence but a web of causes: more traffic means more cache misses, more load, slower answers, more retries, and so more traffic; inflation, an ecosystem, a queue under load. The scene draws the factors, the links between them with their sign, and the loops they close, then plays one push through the web: which factor moves, which way, and what it moves next.

### Scope

1. **`<system title ref? arc?>`** with `<factor>`s, `<link>`s, optional `<loop>` names and the steps of one push:
   ```exl
   <system title="Retries feed the load that causes them" arc="answer">
   <factor id="traffic" label="Requests per second" />
   <factor id="misses" label="Cache misses" />
   <factor id="load" label="Database load" />
   <link from="traffic" to="misses" sign="same" />
   <link from="misses" to="load" sign="same" />
   <link from="load" to="traffic" sign="same" label="retries" />
   <loop through="traffic misses load" label="Retry storm" />
   <push factor="traffic" change="up">A sale sends five times the usual requests.</push>
   <effect from="traffic" to="misses">More requests ask for keys the cache does not hold yet.</effect>
   </system>
   ```
   - `<factor id label desc? ref?/>`: a quantity that can go up or down. 2–12 factors.
   - `<link from to sign label?/>`: `sign="same"` (more of `from` brings more of `to`) or `"opposite"` (more brings less). Up to 30 links; no link from a factor to itself.
   - **Loops are found by the parser**: every cycle of links is a loop, `reinforcing` when it has an even number of `opposite` links and `balancing` when odd. `<loop through label/>` names one; its factors must be a cycle of the system. Up to 8 loops are drawn.
   - `<push factor change="up|down">narration</push>` starts a change; `<effect from to>narration</effect>` follows a link from a factor that already moved, and the parser works out which way the target moves (`same` keeps the direction, `opposite` flips it). An effect that follows no link, or starts at a factor nothing moved yet, is an error. Up to 20 steps; the block carries the state after each.
2. **Viewer**: the factors on a ring, links as curved arrows with their sign (+ or −) at the middle, each loop's badge (R or B, and its name) inside it. Each step is a part: its link draws, the factor it reaches lights up with an arrow up or down, and a factor pushed back the other way shows it. In Present the narration is the subtitle; on the page the steps play with step controls. Present shrinks the picture to fit like other diagrams.
3. **Server and rules**: catalog, `componentTags`, refs, subtitles, scene text, slides.
4. **Docs and skill**: `docs/EXL.md`, `SKILL.md`, `presenting.md` ("What causes what, and what feeds back?"), `AGENTS.md`, `README.md`.
5. **An example** over a small project, `examples/cache` (cache-aside reads and a client that retries at once): `examples/scenes/cache-storm.exl.md` follows the brief and the arc.

### Acceptance criteria

- Parser tests: factors, links, loops found and their kind, a named loop and one that is not a cycle, pushes and effects with their directions (also a push back), every refusal, limits.
- Viewer tests: the ring, link geometry (two opposite links bend apart), loop badges inside the frame, parts and subtitles.
- Browser tests: the new example draws, walks Present forward and back, has no overlapping boxes and no sideways scroll.
- The example renders with no warnings; `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` and `npm run e2e` pass.

### Decisions taken in this phase

- **Tag names**: `<factor>`, `<link>`, `<loop>`, `<push>` and `<effect>`, all new; `sign="same|opposite"` instead of `+`/`−`, because the words say what they mean to a non-technical writer and reader.
- **Loops are found, not declared**: a model can forget a loop or get its kind wrong; the parser lists every cycle (shortest first, at most 64 searched, 8 drawn) and `<loop>` only names one.
- **The first step is a `<push>`**, and an effect changes its target's direction by the link's sign; a factor that turns the other way is marked "pushed back" (`reversed`), which is how a balancing loop shows on screen.
- **The ring follows the longest loop**: the factors go round in that loop's order, and every other factor sits beside the one it shares most links with, so the main loop's arrows run between neighbours and a small loop sits beside its partner (declaration order made the cache's loop cross the whole ring and hide a badge).
- **A drawn link is a solid copy** that draws itself and fades into the link's own style, because drawing a dashed (`opposite`) line directly erased its dashes.
- **`<compare>` names and cells now break long words** (`overflow-wrap: anywhere`): "fetch_with_backoff()" pushed the comparison slide 57 px sideways on a phone.

### Outcome (2026-11-14)

1. **What changed**: `<system>` with `<factor>`, `<link>`, `<loop>`, `<push>` and `<effect>` (`server/src/parser/system.ts`, types, catalog, refs, the subtitle rule, the eval's scene text); `viewer/src/lesson/{System.tsx,systemLayout.ts}`, Present and its subtitles, CSS; `examples/cache/reads.py` and `examples/scenes/cache-storm.exl.md` (a sale on a cold cache: a timeline of the incident, two concept cards, the system with a retry storm and the cache's balancing loop played link by link, the fix as a comparison and a check), with a brief, an arc and no warning; the docs; screenshots in `docs/images/f26/`.
2. **How it was tested**: `server/test/system.test.ts` (6 tests: loops and their kind, a named loop and one that is no loop, a push with its directions and a push back, every refusal, bad factors and links, limits, long narrations) and `viewer/test/system.test.ts` (6: the ring inside the frame without overlaps, opposite links bending apart, arrows starting at the border, loop badges inside and apart, two factors facing, the ring order, Present's parts and subtitles); the new example in every browser test. typecheck, lint, build, `npm test` (server 270, viewer 173, evals 50) and `npm run e2e` (75 in Chromium) pass.
3. **Seen in the browser**: each step draws its link with dots flowing along it and lights the factor it reaches; the cache's loop pushes "Cache misses" back down (red arrow, ringed).
4. **Limits**: on a phone, Present shrinks the ring to the screen's width like other diagrams, so its text is small; the page scrolls it sideways instead. One push per system; a second push is a second `<system>`.
5. **Pending**: F27 (forms "annotated space" and "argument").

## F27 — Forms "annotated space" and "argument"

Two forms of the brief still had no picture: a document read part by part (a lease, a law, a page of an interface) and an argument (a thesis with its reasons and objections). F27 adds a tag for each, and closes the forms catalog with the full form → tags table and a rule that the scene draws its brief's form.

### Scope

1. **`<annotated title ref? arc?>`** with one `<passage>` (the text as written, line breaks kept, up to 3000 characters) and 1–12 `<note quote label?>narration</note>`. Each `quote` is words of the passage (spaces and line breaks match any whitespace); the parser finds it and refuses a quote that is not there or overlaps another note's. The viewer shows the passage with each quoted span marked and numbered; in Present the passage arrives first, then each note is a part: its span lights up and its note appears beside it, the earlier ones staying marked. On the page the notes play with step controls.
2. **`<argument title ref? arc?>`** with one `<claim>` (one line, required), 1–8 `<support label>narration</support>` and `<objection label reply?>narration</objection>` in the order they are weighed, and an optional `<verdict>` (one line). The viewer draws the claim on top, reasons on one side and objections on the other, each objection with its reply; in Present the claim comes first, then each point, then the verdict. Useful for a decision (options and costs), a scientific claim and its evidence, a legal argument.
3. **Form → tags** in `presenting.md` and `docs/EXL.md`, and a warning when the scene has no component of its brief's form: `structure` (`<structure>`, `<arch>`, `<data>`), `process` (`<flow>`, `<state>`, `<journey>`, `<trace>`, `<timeline>`), `quantity` (`<chart>`, `<calc>`, `<plot>`, `<stats>`, `<derive>`, `<matrix>`, `<threshold>`, `<scatter>`, `<space>`, `<cosine>`), `system` (`<system>`), `annotated` (`<annotated>`), `argument` (`<argument>`, `<compare>`), `timeline` (`<timeline>`, `<journey>`).
4. Server (catalog, refs, subtitles, scene text), viewer (Present, page, subtitles, CSS), docs and skill.
5. **An example** that is not code: `examples/lease/lease.md` (a fictional lease) and `examples/scenes/lease.exl.md`, with `<annotated>` and `<argument>`, a brief and an arc.

### Acceptance criteria

- Parser tests for both tags (quotes found across line breaks, missing and overlapping quotes, limits; a claim, points in order, replies, a verdict) and for the form rule.
- Viewer tests: the passage split into marked spans; parts and subtitles of both.
- The example renders with no warnings and plays in every browser test; typecheck, lint, build, `npm test` and `npm run e2e` pass.

### Decisions taken in this phase

- **Tag names**: `<passage>` and `<note quote>` for the text and its notes; `<claim>`, `<support>`, `<objection reply>` and `<verdict>` for the argument. An argument's points keep the order the scene weighs them, so a reason and the objection that answers it can follow each other.
- **A quote is found, not placed**: the parser matches its words with any whitespace between them and keeps their position, so a note never points at words the passage lacks; overlapping notes are refused, so each word belongs to one note at most.
- **A passage quotes its source**: its words do not count when the term and acronym rules look for a term used before its card (a lease names its deposit before the scene can define it); the notes, which are the scene's own words, do.
- **The form rule** uses the form → tags table (in `presenting.md` and `docs/EXL.md`); a scene with a brief and no component of its form gets one warning. The stdio test's sloppy scene now breaks 13 rules, so its 13th warning is checked in the cache, which keeps every warning (the result lists 12).
- **On the page** both tags show everything at once, like `<compare>` and `<timeline>`; the step-by-step reading is Present's.

### Outcome (2026-11-14)

1. **What changed**: `<annotated>` and `<argument>` (`server/src/parser/forms.ts`, types, catalog, refs, subtitles, scene text), `formWarnings` and the form → tags table; `viewer/src/lesson/{Annotated,Argument}.tsx`, `annotatedSpans.ts`, Present and its subtitles, CSS; `examples/lease/lease.md` (a fictional lease) and `examples/scenes/lease.exl.md` (four clauses read note by note, two concept cards, the deposit against a fee, the decision to sign weighed point by point, and a check), with no warning; docs; screenshots in `docs/images/f27/`.
2. **How it was tested**: `server/test/forms.test.ts` (7 tests: quotes across line breaks, missing and overlapping quotes, a missing passage, an argument read in order, its refusals, long narrations, the form rule, terms in a passage) and `viewer/test/forms.test.ts` (3: the passage cut into marked spans, the parts and subtitles of both); the new example in every browser test. typecheck, lint, build, `npm test` (server 277, viewer 176, evals 50) and `npm run e2e` (82 in Chromium) pass.
3. **Seen in the browser**: each note turns its words yellow and rises beside the passage (below it on a phone, where the subtitle carries it); the argument fills its two columns point by point.
4. **Limits**: a passage is plain text (no images or tables) of up to 3000 characters; on a phone a long passage pushes its notes below the slide, and the subtitle tells them.
5. **Pending**: F28 (sources beyond code).

## F28 — Sources beyond code

A scene over a lease, a report or a dataset needs what a scene over code has: a way to find the parts that matter, refs that point at them and stay right when the file changes, and a workflow that does not assume code.

### Scope

1. **Section refs**: `path#Heading` names a section of a Markdown or text document by its heading, with or without its number, case and accents aside. `render_scene` refuses a heading the document lacks and lists its headings; when a scene is shown or exported the server fills in the section's lines, so the code window opens it like a range. It counts as a range for the whole-file warning.
2. **The index outlines documents**: `ensure_index` adds "Documents" (`documents.txt`): each Markdown or text file with its headings and their lines, each CSV or TSV with its columns and rows, and the files that are not text (PDF, Word, slides, spreadsheets), which the agent reads with its own tools.
3. **The skill** gains "Topics that are not code": documents in the project, files that are not text, and subjects with no file at all (no refs, and the prose says what the scene rests on); the server instructions and `ensure_index`'s description name documents and data.
4. **The lease example** gets headings, and its scene points at sections (`lease.md#Deposit`).

### Acceptance criteria

- Tests: parsing section refs; headings outside code fences; a section's lines (with and without its number, with subsections, without trailing blank lines); lines filled in nested refs; missing headings named, also over stdio; the outline of documents.
- typecheck, lint, build, `npm test` and `npm run e2e` pass.

### Decisions taken in this phase

- **Headings, not anchors**: a ref names the heading as written ("3. Deposit" or "Deposit"), compared without case, accents or punctuation, because that is what the agent reads in the index; GitHub-style slugs would be one more thing to get wrong.
- **Resolved when shown, not when saved**: the cache keeps `path#Heading`, so a section that moves inside its file stays right, and the scene goes stale through the file's hash like any other.
- **No new reader for PDF or Word**: the server only reads text; those files are listed in the index for the agent's own tools, and a ref can name them whole. No dependency was added.
- **Product decision 2 in `AGENTS.md`** now says the index also outlines documents: an extension of the light index, flagged for the user's review.
- `SKILL.md`'s frontmatter (`description`, `when_to_use`) was not changed: the official docs were not re-checked in this session, as `AGENTS.md` asks before changing skills' manifests; the body and the server instructions name documents and data.

### Outcome (2026-11-14)

1. **What changed**: `server/src/headings.ts` (headings, sections, `withSections`, `missingSections`), section refs in the parser and `formatRef`, the refusal in `render_scene`, `outlineDocuments` in the index; `SKILL.md` "Topics that are not code", `docs/EXL.md`, `AGENTS.md`, `README.md`; `examples/lease/lease.md` with headings and its scene over sections.
2. **How it was tested**: `server/test/sources.test.ts` (5 tests) and a stdio test of the refusal; typecheck, lint, build, `npm test` (server 282, viewer 176, evals 50) and `npm run e2e` (82 in Chromium) pass.
3. **Limits**: sections need Markdown headings (`#`); text inside PDFs and Word files is out of the server's reach; CSV rows are referred to as lines.
4. **Pending**: F29 (interactivity that teaches).

## F29 — Interactivity that teaches

The reader learns more by predicting before seeing (the principle behind the brief's `check`), and less when the screen counts three things at once.

### Scope

1. **Predict, then see**: `ask="…"` on a `<structure>`'s `<change>` and on a `<system>`'s `<push>` and `<effect>`. A part before that step shows the picture as it was, the step's label and the question under a "Predict" tag, with no subtitle (the narration would give it away); the next part shows the step. On the page, autoplay leaves the question about five seconds before the answer.
2. **One counter**: the "Step N of M" badges of flow, journey and calc slides go, and a trace's badge says "Step N"; the header's counter and the progress bar stay.
3. The examples ask once each (`search-tree`: where 40 goes; `cache-storm`: which way the misses go once the cache fills); docs and skill ("Let the reader predict" in "The arc").

### Acceptance criteria

- Parser tests keep `ask`; viewer tests map a slide's parts with questions in them, with no subtitle on a question.
- typecheck, lint, build, `npm test` and `npm run e2e` pass; the question parts seen in the browser.

### Deviations from the request

- **Decoration was not changed.** Principle 6 (decoration never competes) would mean drawing the theme only on the cover and chapter cards, but product decision 5 says themes decorate every slide (F17); changing it needs the user's approval, so it is proposed at the F30 stop instead.
- **`ask` is on the two forms that animate a change of state**, where a prediction has one answer the next part shows; flows and traces keep their quizzes.

### Outcome (2026-11-14)

1. **What changed**: `ask` in the parser (`<change>`, `<push>`, `<effect>`), `viewer/src/lesson/{askParts.ts,AskCard.tsx}`, the structure and system views, slides and subtitles; step badges removed from Present; examples, docs; screenshots in `docs/images/f29/`.
2. **How it was tested**: 2 parser tests and 2 viewer tests; typecheck, lint, build, `npm test` (server 284, viewer 178, evals 50) and `npm run e2e` (82 in Chromium) pass.
3. **Pending**: F30 (measure the result; stop). Its eval calls Haiku and needs the user's go-ahead.

## F30 — Measure the result

### Scope

1. **Rebuild the bench's eight older scenes** under F23–F29 (a brief, an arc, the forms, terms and acronyms defined before use), written by the session's model from each topic's `source.md` only, without opening its questions; the F22 versions stay beside them as `scene-f22.exl.md`. `login-tienda` and `regresion-resenas` are the example scenes, already rebuilt in F23–F24.
2. **Rules**: every bench scene renders with no warning under every rule.
3. **Comprehension**: `npm run eval:comprension` on Haiku, with the user's go-ahead (about $0.014 per run of 20 calls at list price, estimated from the F22 run and the scenes' text, 13 % longer), compared with the F22 baseline.
4. **Report** in `docs/results-f30.md`: the table before and after, what the numbers can and cannot say, screenshots of the trees scene, and what is left for people (the human protocol of `docs/prueba-humana.md`).
5. **Stop**: deliver the report; wait for the user.

### Rebuilt scenes

- Each opens with its concrete case (the guided example of the trees, the oak leaf, the 1 000 € loan, October's funnel, the 42-line Bible, the school-library law, Pablo's lease, the 500 g loaf), defines its terms on cards before using them, sets its source's "frequent error" against the fact on a contrast slide, answers its question, and ends on a check of its own.
- Forms used: `<structure>` (trees), `<annotated>` and `<argument>` (lease, printing press), `<journey>` and `<timeline>` (photosynthesis, law, bread), charts and `<derive>` (funnel, interest).
- Refs point at the sources' sections (`source.md#Error frecuente`).
- Found while rebuilding: the acronym rule read the capitals of chemical formulas ("CO" in `CO_2`); formulas and derivation lines are now left out of it.

### Outcome (2026-11-14)

Done, stopped for the user's review. The report is [`results-f30.md`](results-f30.md).

1. **What changed**: the eight older bench scenes rebuilt (their F22 versions kept as `scene-f22.exl.md`); the acronym rule leaves formulas out; `e2e/capture.spec.ts` captures the new trees scene; `docs/results-f30.md` and screenshots in `docs/images/f30/`.
2. **How it was tested**: every bench scene renders with no warning; typecheck, lint, build, `npm test` (server 284, viewer 178, evals 50) and `npm run e2e` (82 in Chromium) pass; the comprehension eval ran once on Haiku with the user's go-ahead ($0.015).
3. **Result**: with the scene, 5.0 of 5 in all ten topics (4.9 in F22; the lease scene's missing clause is now there); without it, 2.4 in both runs; gain +2.6 (+2.5). Every old scene breaks 1–2 of the new rules and every rebuilt one none.
4. **Limit**: the model eval measures content and was already near its ceiling; the clarity this plan worked on needs the human protocol, not yet run. The scenes were rebuilt by the model that wrote the rules.
5. **Pending, for the user**: run the human protocol; rewrite the questions of `imprenta`, `ley-aprobacion` and `login-tienda`; let the three models write the bench scenes with `npm run eval` (usage); decide on decoration (product decision 5: draw the theme only on the cover and chapter cards?), on the change to product decision 2 (the index outlines documents) and on `SKILL.md`'s frontmatter naming documents and data.

## F31 — Pictures that explain any topic

Requested by the user on 2026-11-14, after a test in which Sonnet explained a rainbow and Opus a smart traffic light in five slides each: the slides followed the rules but drew nothing that explains a topic that is not code. Four problems were found (a warning no scene without files can fix, a trace whose last slide shows only its last step, software labels on everyday boxes, the viewer's words in English under a Spanish scene) and one gap (nothing draws a physical thing).

### Scope

1. **The key-code warning** applies only when the scene points at files.
2. **A trace as a strip of steps**: the steps already played stay in sight as small cards joined by arrows, the current one larger; change counts only within one form of list, table or bars.
3. **Everyday box kinds** `person`, `object`, `place`, `signal`, `step`, with their icons; a diagram whose boxes are all everyday things gets its line legend and step badges in plain words.
4. **The viewer speaks the scene's language** (Spanish or English), read from its text.
5. **`<figure>`**: circles, boxes, arrows, angles, zones and labels on a grid, revealed by `<show>`; parser, viewer, Present, subtitles, rules, the eval's scene text, docs and skill, and an example.

### Acceptance criteria

- Parser tests for `<figure>` (shapes, parts, grid, every refusal, limits, forms, subtitles, no code asked without files); viewer tests for label placement, angles, the strip, the language; the rule test without files.
- The example `rainbow` renders with no warnings and plays in every browser test.
- The Sonnet and Opus scenes of the test, rendered again, show the strip and the viewer's words in Spanish.
- typecheck, lint, build, `npm test` and `npm run e2e` pass.

### Decisions taken in this phase (user, 2026-11-14, multiple choice)

- **Strip of steps** rather than one step without badges. It keeps the last three past steps (earlier ones fold into "+n"); on a phone only the step just before the current one.
- **Everyday kinds** added to the catalog rather than hiding the kind label; the skill tells the model to use them outside software.
- **`<figure>` in this phase** (product decisions 5 and 8 change). Shapes are a closed list with closed colors, no free paths; the viewer places each label beside its shape, clear of the labels placed before it, and grows the labels on a small screen (never under 12 px).
- **Language detected** from the scene's text (Spanish function words against English ones), not an attribute; aria labels follow the visible words, and the browser tests accept both.

### Outcome (2026-11-14)

1. **What changed**: `codeWarnings` takes the refs; `server/src/parser/figure.ts` and its types, catalog and limits; `viewer/src/lesson/{Figure.tsx,figureGeometry.ts}`, Present, subtitles and slides; the trace strip (`Trace.tsx`, `stripOf` in `traceShape.ts`, CSS); the everyday kinds (types, icons, colors, captions, `isEveryday` legend and badges); `viewer/src/i18n.ts` with the Spanish words of Present, the frames, concepts, quizzes, arguments, traces and diagrams; `examples/scenes/rainbow.exl.md` over `examples/rainbow`; docs (`EXL.md`, `SKILL.md`, `presenting.md` with a template, `AGENTS.md`, `README.md`); screenshots in `docs/images/f31/`.
2. **How it was tested**: `server/test/figure.test.ts` (6), `viewer/test/figure.test.ts` (9), the code rule without files; typecheck, lint, build, `npm test` (server 290, viewer 187, evals 50) and `npm run e2e` (89 in Chromium) pass.
3. **Seen in the browser**: the rainbow's figure draws the light entering the drop, bouncing and leaving at 42° part by part, labels clear of each other on a desktop and a phone; the Sonnet and Opus scenes of the test now keep the whole trace in sight and speak Spanish.
4. **Limits**: the models' scenes of the test were written before the skill knew `<figure>` and the everyday kinds; only a new run shows whether the models use them (it costs usage: the user decides). Labels avoid each other, not the shapes; a crowded figure can still put a label on a line.
5. **Pending, for the user**: review; decide whether to run Sonnet and Opus again on the two topics.

## F32–F35 — `<figure>` as the main component (user, 2026-11-14)

The user wants `<figure>` to become the main component to explain a topic, with drawings that really help the explanation, compared with real explanatory figures. The comparison is [`figures-research.md`](figures-research.md): real figures of the two test topics draw what changes as it changes (a light turning green, a call travelling), true geometry (normals, the antisolar line), recognizable objects, the bow as an arc, several drops each sending one color, and labels next to their parts. The user chose four phases, in this order; each ends with a stop (`AGENTS.md`).

### F32 — Movement and states

**Scope.** A `<show>` may also change shapes already drawn: `move="car: x y x y …"` (the shape travels along the points to the last one; several moves separated by `;`), `set="light: green"` (its color changes), `hide="ids"` (it fades away), `pulse="ids"` (it pulses once, a sensor firing) and `flow="arrow ids"` (a dot travels along an arrow, a call or a ray on its way). `items` becomes optional; a show must do something. `ask` (F29) asks the reader to predict a show before it plays. The parser works out every shape's state after each show and refuses moves out of the grid, changes to shapes not drawn yet or hidden, and unknown ids. An example over a smart crossing (`examples/scenes/crossing.exl.md`), in Spanish, plays a car calling the green.

**Criteria.** Parser tests for each change and refusal; viewer tests for the state at each part and for `ask`; the example renders with no warnings and plays forward and back in the browser tests; typecheck, lint, build, `npm test`, `npm run e2e`.

**Outcome (2026-11-14).**
1. **What changed**: `<show>` takes `move`, `set`, `hide`, `pulse`, `flow` and `ask`, and `items` is optional (`server/src/parser/figure.ts`, `figureAnchor.ts`, types, catalog); the block keeps every shape's state after each show. The viewer draws each shape in a group translated by its offset, plays a move along its points, transitions colors and fading, pulses a shape, runs a dot along a flowing arrow, and puts a question part before a show that asks; the shapes a part touches are thicker (`Figure.tsx`, `figurePartsOf` and `touchedBy` in `figureGeometry.ts`, subtitles, CSS). `examples/scenes/crossing.exl.md` over `examples/crossing`: Lucía's car stops on the loop, the loop pulses and its call travels to the controller, the reader predicts, the avenue turns yellow then red, Lucía's light green, and the car crosses. Docs, skill (with the crossing as a template), `AGENTS.md`, the eval's scene text; screenshots in `docs/images/f32/`; the study in `docs/figures-research.md`.
2. **How it was tested**: 2 more parser tests (changes and states, every refusal) and 2 more viewer tests (question parts, touched shapes, final states); typecheck, lint, build, `npm test` (server 292, viewer 189, evals 50) and `npm run e2e` (96 in Chromium, the crossing walked forward and back with every animation) pass.
3. **Seen in the browser**: each part of the crossing shows the change itself; going back restores the state.
4. **Limits**: a moving shape's label moves with it but may cover a label it passes (F35); a move follows straight segments between its points.
5. **Pending**: F33 (anchors and geometry checks), F34 (pictograms, arcs, measures), F35 (clearer reading).

### F33 — Anchors instead of numbers, and geometry checks

**Scope.** Any point may name a shape instead of numbers: `drop.left`, `drop.top`, `drop.center`, `drop@200` (the point of a circle's edge at 200°, 0° to the right and counting clockwise on screen), `box.bottom`, an arrow's `start` and `end`. `<normal at="drop@200">` draws the normal of a circle at that point. Warnings when shapes cover each other's labels, when an arrow that should touch a shape stops short of it, and when an angle's label says a value its drawing does not show (more than 3° off).

**Outcome (2026-11-14).**
1. **What changed**: every point of a figure (`points`, `at`, `from`, `to`, a `move`) may be a place on a shape declared before it: `id.center|left|right|top|bottom`, a box's corners, an arrow's `start|middle|end`, a circle's edge `id@degrees` (`server/src/parser/figureAnchor.ts`: `pointOn`, `surfaceNormal`; resolved in `figure.ts`); `<normal at length? label? color?>` on a circle's edge or a box's side; `figureWarnings` in `rules.ts` (an arrow end less than 3 from an edge without touching it, an angle more than 3° from its label, a shape hiding a labelled one's middle). The viewer draws normals dashed and labels them like lines. The rainbow is rebuilt on true optics (water 1.331 for red and 1.343 for violet, the ray of least deviation): it enters at `gota@239.5`, reflects at `gota@338.8`, leaves at `gota@78.1` at 42.4° from the light, with the normals at entry and exit; the crossing's arrows end on the loop, the controller and the light. Docs, skill (the rainbow template rebuilt), `AGENTS.md`; screenshots in `docs/images/f33/`.
2. **How it was tested**: 3 more parser tests (places, normals, refusals; the warnings) and 1 viewer test (the normal's label); the new warnings caught three real misses in the F31–F32 examples (the red ray and the light's line short of the eye, the controller's arrow short of the light). typecheck, lint, build, `npm test` (server 295, viewer 190, evals 50) and `npm run e2e` (96 in Chromium) pass.
3. **Limits**: places resolve where shapes are declared, not where a move takes them; a box has no `@degrees`; labels still avoid only other labels (F35).
4. **Pending**: F34 (pictograms, arcs, measures), F35 (clearer reading).

### F34 — Pictograms, arcs and measures

**Scope.** `<icon kind x y size label?>` from a closed set of line pictograms drawn in the viewer's style (Sun, eye, person, car, raindrop, house, tree, traffic signal head, battery, magnet, cloud, factory, phone, server, coin, heart, leaf, bulb, clock, lock), with `color`; `<arc>` (a part of a circle: a rainbow, an orbit, a swing); `<measure from to>label</measure>` (a dimension line with its value).

**Outcome (2026-11-14).**
1. **What changed**: `<icon kind x y size?>` with 20 line pictograms in the viewer's style (`viewer/src/lesson/figureIcons.ts`), a `signal` lighting the lamp of its color so `set` changes the light; `<arc x y r from to head?>` with `@degrees`, start, middle and end places, along which a `flow` may run; `<measure from to offset?>length</measure>` with end ticks. Places, moves, colors, warnings (an icon counts as its box) and label placement for the three. The crossing uses a car and two signal heads that change light; the rainbow uses the Sun and the eye, and a second figure draws the bow as six arcs around the shadow of your head, red outside, with drops on it and its 42° measured. Docs, skill (both templates refreshed), `AGENTS.md`; screenshots in `docs/images/f34/`.
2. **How it was tested**: 2 more parser tests (the three shapes and their places; refusals) and 2 viewer tests (art for every pictogram and the lit lamp; arc and measure paths); typecheck, lint, build, `npm test` (server 297, viewer 192, evals 50) and `npm run e2e` (96 in Chromium) pass.
3. **Limits**: the pictograms are side views (a car seen from above is still the side-view car); a label can still sit on a line ("Su semáforo" on the loop's call), which F35 fixes.
4. **Pending**: F35 (clearer reading).

### F35 — Clearer reading

**Scope.** Labels avoid lines and shapes as well as each other, and get a straight leader ending in a dot when they must sit away; the shapes a part adds or changes are lit and the rest dimmed; on the page, a shape with `desc` opens its description when clicked; the rainbow and crossing examples rebuilt with every convention of the comparison, with screenshots beside it in `figures-research.md`.
