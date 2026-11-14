---
name: explicador
description: Explains any part of this codebase or a notebook as an animated scene in the Explicador viewer (a local browser tab) instead of a text-only answer. Use it whenever the user wants to understand code, a feature, a request flow, an architecture, a data model or a notebook, or asks for a diagram, a walkthrough of the code, a lesson or a presentation.
when_to_use: 'Requests in any language such as "how does X work", "what happens when", "explain the login", "walk me through this code", "show me the code step by step", "explain this notebook", "make a lesson or a presentation of", "explícame cómo funciona", "¿qué pasa cuando…?", "enséñame el código paso a paso", "explícame este notebook". Also every message that starts with "Explicador viewer:" (clicks, questions and code requests from the viewer).'
---

# Explicador

You explain code with **scenes**: an EXL document (Markdown plus a few diagram tags) that the Explicador MCP server validates, caches and plays in a local viewer tab. Always answer the user in their language; write the scene text (titles, labels, narration, prose) in that language too.

Every scene is a page that explains in full and a presentation someone can watch alone: Present shows the `#` title as the cover, then one component per slide with its `title` as its one sentence, and the narration of each part as a subtitle under it (a speaker turns subtitles off with S). By default the audience uses technical vocabulary made easy. When the user wants to understand a whole process well ("how does our RAG work", "explain the checkout end to end", "explícamelo a fondo, de principio a fin"), build a **deep dive**: a `<journey>` map of the whole process in the intro, then one `<chapter stage="…">` per stop with its own picture and the same real example all the way through; never `##` headings in place of chapters. **Before writing any EXL, read [presenting.md](presenting.md)**: the brief every scene opens with, what Present shows, the deep dive, a component for every idea, one example through the whole process, which tag answers which question, templates to copy, LaTeX, and the checklist.

## Workflow

First decide what is asked, because each answer has its own tool:
- **A walk through code** ("show me the code", "step by step", "walk me through", "enséñame el código paso a paso", a file or a function to read along): a tour with `explain_code`, step 9. No scene.
- **A message from the viewer** (it starts with `Explicador viewer:`): steps 7 to 9, as it says.
- **A file to share**: `export_scene`, step 10.
- **Anything else that asks to understand the project**: a scene, steps 1 to 6.
- **A topic that is not code** (a contract, a report, a dataset, a process at work, or a subject with no file at all): a scene too, steps 1 to 6, with the sources of "Topics that are not code" below.

1. **Pick a topic**: a short, stable name for what is explained ("login", "checkout flow"). Reuse the same topic for the same question so the cache hits.
2. **Call `show_scene`** with the topic.
   - **fresh**: the scene is already in the viewer and its EXL is in the result. Do **not** read code or call other tools. Reply with 2–4 sentences summarizing it from the EXL and give the viewer URL.
     Exception: when the result lists `Warning:` lines, the scene breaks rules added since it was cached: fix them in that EXL (read only what a fix needs) and call `render_scene` with the same topic, then answer.
     Exception: a scene about a notebook (or data or ML code) without `<chapter>`s is an old format; rebuild it as a lesson (see "Lessons") under the same topic.
   - **stale**: re-read only the changed files it lists, update the EXL it returned and call `render_scene` with the same topic.
   - **missing**: continue below.
3. **Call `ensure_index`** and read its file tree and import graph before opening any code. Use it to choose the few files that matter.
4. **Read only what you need** (the entry point and the files on the path you explain). Check line numbers for every `ref` you will write.
5. **Write the brief, then the EXL in the order of the arc, and call `render_scene`**. Every scene opens with a `<brief>` right after its `#` title: for whom, which question, which one example, which misconception and which check, decided before any slide ([presenting.md](presenting.md), step 1); `render_scene` refuses a scene without one. If it returns errors, fix exactly those lines and call it again; nothing is saved until it passes. Then fix every `Warning:` line and render again until it answers "No warnings". Warnings are the server checking this skill's rules (the brief and the arc, terms and acronyms defined before use, a cover and two or three themes, a `<figure>` of the subject itself when the scene is about the world and not about files, a component per chapter, short titles and subtitles, a `desc` on every box, key code, a `<trace>` beside a `<flow>`, checks and a review in lessons, numbers the notebook printed), and each says how to fix it.
6. **Reply in the chat** with a short explanation (3–6 sentences, no list of the scene's steps, no code) and the viewer URL. The scene carries the detail.
7. **Clicks from the viewer**: a message that starts with `Explicador viewer: the user clicked` means the user wants to go deeper into that node. Do what it says: `show_scene` with the given topic, then build the scene if needed, and reply briefly. The new scene becomes the deeper level in the viewer, with breadcrumbs back.
8. **Questions from the viewer**: a message that starts with `Explicador viewer: the user asks about` carries a question the user typed in a box's panel. Read only the code you need (the box's ref, the scene's EXL from `show_scene` if you lost it) and call `answer_question` with the topic and question id from the message:
   - `answer`: Markdown in the user's language, answer first, 2–6 sentences or a short list. Say so when you are unsure.
   - `refs`: up to 3 line ranges (`path:start-end`, at most 40 lines) that prove the answer. The server copies the lines: never paste code into the answer.
   - When the question deserves a diagram (a sequence, a lifecycle, several parts), first call `render_scene` with `background: true` under a new topic, then pass that topic as `scene`; the panel links to it and the user's view does not jump.
   - `tour`: when the answer is about how code runs, add a tour (see step 9); the panel offers it as a button and never opens it by itself.
   - Then reply in the chat with one sentence. Do not re-render the scene the question belongs to: that drops its questions.
9. **Code walkthroughs**: when the user asks you to explain code (a file, a function, "show me the code", "walk me through…"), read it and call `explain_code`. The viewer opens a VS Code-like code window, jumps to each step, highlights its lines, dims the rest and shows your note under them; the user can step, jump and autoplay.
   - A whole flow is one tour: follow the code across files in the order it runs, one step per hop (the route, the service, the query), not one tour per file.
   - `steps`: 3–10 in reading order, each `ref` a line range (`path:start-end`, at most 80 lines, check the numbers) and a `note` of 1–3 sentences in the user's language that says what those lines do and why they matter. Split a long function into steps; do not narrate trivial lines.
   - `title`: what the tour explains. The server checks every file and line; fix what it reports and call again.
   - Then reply in the chat with 2–4 sentences summarizing it. Do not repeat the notes.
   - The window also opens by itself on a box's lines when the user clicks it, so no tool call is needed for that. A message that starts with `Explicador viewer: the user asks you to explain the code` is the "Explain code" button: answer it with `explain_code`.
   - **Notebooks (`.ipynb`)**: never read the raw JSON. Call `read_notebook` (an outline of numbered cells; pass `cells: "3-5"` to read some whole). Refs to a notebook are **cell numbers**: `analysis.ipynb:3-5` is cells 3 to 5 (1-based, Markdown cells count), in scenes, `<code>`, answers and tours. The window shows the notebook as cells with their outputs.
10. **Sharing and teaching**: the viewer's **Present** button shows the scene as slides that advance manually. When the user wants a file to share or present elsewhere, call `export_scene` with the topic and give them the path; the file works offline.
11. **Findings**: when you notice something non-obvious and worth keeping (a risk, a surprising behavior, a design decision), call `add_finding` once, in English, with refs. Do not record trivia.

## Topics that are not code

The same scene, brief and arc explain a document, a dataset or any subject; only the sources change.

- **Documents in the project** (Markdown, text, CSV): `ensure_index` lists them under "Documents" with their headings and lines, and data files with their columns and rows. Read the parts the explanation needs and point at them like code: `lease.md#Deposit` names a section by its heading (with or without its number), `lease.md:9-12` names lines, `rents.csv:2-14` names rows. The server checks the heading exists, and the scene goes stale when the document changes.
- **Files that are not text** (PDF, Word, slides, spreadsheets): read them with your own tools; a ref can only name the whole file, so quote the words you rely on in an `<annotated>` passage or in the prose.
- **No file at all** (a general subject, or what the user said): write the scene without refs, say in the prose what it rests on ("the figures are the example's, not a real loan's"), and keep every number either from a source or clearly marked as the example's. With no refs, no `<code>` is asked for.
- Pick the picture by the brief's form ([presenting.md](presenting.md), "Form → tags"): a document is often `annotated` (an `<annotated>` passage, then the terms and an `<argument>` for the decision it asks for); a dataset `quantity`; a history `timeline`; causes `system`; a physical thing (a raindrop, a crossing, an engine) a `<figure>` that draws it.

## Lessons (notebooks, data and ML code)

When the topic is a Jupyter notebook, or a data or ML script, explain it as a **lesson** for a beginner: chapters that follow the notebook, each concept from zero, the real data on screen, and checks. Full tag reference: "Lessons" in `docs/EXL.md`; a complete example is `examples/scenes/notebook-lesson.exl.md` in the plugin.

1. **Outline first**: `read_notebook` without `cells` gives the numbered cells; then read the cells of each section whole (`cells: "5-9"`), outputs included. Refs are cell numbers.
2. **Intro** (before the first chapter): a `#` title that states the problem as a question ("Can a model tell a good review from a bad one?"), one short paragraph, then `<stats arc="question">` with 2–4 headline numbers about the problem (the size of the data, not the result: that comes once the example has led to it), the case the brief's example names as a component with `arc="example"`, and a `<journey arc="question">` of the data's path: one `<stage>` per big step with its real size as `value` ("24 reviews", "18 × 70", "0.833") and the operation as `op` (`train_test_split()`).
3. **One `<chapter>` per notebook section**, in notebook order: `ref` = the section's cells (a range), a `title` a beginner understands, and a `goal` ("Read a confusion matrix and compute precision from it"). The server attaches the cells with their outputs.
4. **In each chapter**, short blocks, one idea each:
   - **Prose is for the page**: Present shows only components and their narration as subtitles, so everything the audience must see goes into a component whose `title` states the point in at most 12 words, and every step, stage, note and mark gets one short sentence of narration that works as a subtitle (see [presenting.md](presenting.md)). On the page, write one idea per paragraph in at most two sentences, put the key term in **bold** (it gets a marker stroke) and write numbers as digits (they count up).
   - **Each new concept from zero**, as a `<concept term>` card before the code: `<define>` what it is in one sentence, `<analogy>` an everyday comparison (a jury where each word votes; exam answers hidden from the student), `<formula>` only when the notebook really uses one (TF-IDF, the sigmoid, precision), and `<example>` a tiny worked example (a sentence or a 2–3 row Markdown table). One card per idea the reader must be able to name, usually 3–10 per lesson (other technical words become plain words); in Present mode the term fills the slide and the pieces arrive one by one. A bigger worked example goes after the card as a small `<matrix>`.
   - **One example through the notebook**: one `<trace>` follows a real input (a review, a row) from the raw data to the prediction, changing form at each step with `kind` (`text`, `list`, `table`, `bars`, `number`), every value copied from an output. Put it in the chapter where the model predicts, or in the intro when the notebook prints every step for one input.
   - **A function the model uses**: `<plot>` with the function (`<curve fn="sigmoid" />`) and a `<mark>` at each real input the notebook computed, so the reader sees where its numbers fall on the curve; or `<curve points>` for a series the notebook printed (loss per epoch). The viewer computes the heights: never write them yourself.
   - **A formula applied to a real case**: `<derive>`, one change per line: the definition, then the notebook's numbers substituted, then the result the notebook printed. Every number in it comes from an output; do not compute intermediate values the notebook did not print.
   - **How a classifier separates the data**: `<scatter>` only when the notebook has two numeric coordinates per example (two features, or a projection it computed) and printed them; add the `<boundary>` only from coefficients the notebook printed. Never invent coordinates or a boundary to make the picture.
   - **Two options the notebook tried**: `<compare>` (two vectorizers, two models, with and without a step), one `<pair>` per difference that matters and `winner` only where the outputs show one.
   - **The decision and why**: what the notebook chose (keep negations, stratify, max_iter) and what would go wrong otherwise, often as a `> [!IMPORTANT]` callout.
   - **A visual of the real data**: `<trace>` for a transformation of one real value (cleaning text, tokenizing, scaling a row); `<chart>` for comparisons (`bars`), rankings and coefficients (`hbars`; negative values diverge) and trends (`line`); `<matrix kind="confusion">` for a classifier's errors, with a `<focus metric>` per metric you discuss and a `<focus cells>` on the mistakes; a plain `<matrix>` for a document-term matrix or a tiny worked example.
   - **How the model decides**: when the notebook trains a linear or logistic model, show one real prediction with `<calc kind="logistic">` (or `kind="sum"` for a plain linear score): the intercept and each feature's contribution as `<part>`s, and `total` = the score the notebook printed. Pick an interesting input (a mistake is the best teacher). If the notebook does not print the contributions, say which cell would (intercept, `coef_` times the feature values, `decision_function`) instead of computing them yourself.
   - **The threshold as a choice**: when a classifier's probabilities are printed for the test set, add a `<threshold>` with one `<point>` per test input (up to 200) so the reader can see the trade between false positives and false negatives. If they are not printed, name the cell that would print them (`predict_proba(X_test)[:, 1]` with the true labels) rather than inventing them. Warn that a threshold tuned on the test set no longer gets a fair grade from it.
   - **1–2 `<quiz>`** that check understanding, not memory: plausible wrong options, each with a `why` that teaches (do not start it with "Right" or "Wrong": the viewer already says so).
5. **A final chapter "Review"** (the viewer's Practice mode drills every check and card of the lesson, so make each one stand on its own: no "as above") with 5–8 flashcards (`<quiz question><answer>…</answer></quiz>`) of the questions a teacher or reviewer would most likely ask about this notebook (why this preprocessing, why this split, what the metric means, why the model failed on an example), each answered in 2–4 sentences with the real numbers.
6. **Numbers only from the notebook**: every number in the lesson (stats, stage values, chart rows, matrix cells, prose) is copied from a cell output, or from code that actually ran. Never compute metrics yourself: give the confusion counts and the viewer derives accuracy, precision, recall and F1 with their formulas. If an output you need is missing, say so in the prose instead of guessing.
7. Callouts: `> [!NOTE]` for context, `> [!TIP]` for a shortcut or an intuition, `> [!IMPORTANT]` for the key decision, `> [!WARNING]` for a pitfall or a limit of the result, `> [!CAUTION]` for something that would break.

## EXL in short

Full reference: `docs/EXL.md` in the plugin. Tags must start at the beginning of a line; attribute values are always quoted strings; no `{expressions}`, no other HTML. Every top-level tag except `<theme>` and `<brief>` takes an optional `id`. Every component (every top-level tag except `<brief>`, `<theme>` and `<chapter>`) takes an optional `arc`: what it does for the brief's question (`question`, `example`, `idea`, `contrast`, `apply`, `answer`, `check`, `recap`; [presenting.md](presenting.md), "The arc").

```exl
# What happens when you log in?

<brief form="process">
<audience>Developers new to this code; they know HTTP (GET, POST) and JSON</audience>
<question>What happens between typing a password and getting a session cookie?</question>
<example>Ada logs in as "ada@example.com" with the password "lovelace"</example>
<misconception>Believing the server stores the password as the user typed it</misconception>
<check>Predict what the server compares when Ada logs in</check>
<terms>scrypt key</terms>
</brief>

<theme name="security web" />

One short paragraph of context.

<trace id="example" title="Ada's password is checked, never stored" arc="example">
<value label="What the user types">ada@example.com · lovelace</value>
<value kind="table" label="What the form posts" code="JSON.stringify(body)" note="The form sends both fields once, as JSON, to POST /api/login.">email=ada@example.com|password=lovelace</value>
<value kind="table" label="What the check derives" code="scryptAsync(password, salt, 64)" ref="src/auth/password.js:17" note="scrypt runs on what was typed with the stored salt, and gives the stored key back.">salt=5f1d0c7e…|key=2149472b…</value>
<value label="The answer" code="timingSafeEqual(key, expected)" ref="src/auth/password.js:18" note="Both keys match, compared in constant time, so the login succeeds.">true</value>
</trace>

<concept term="Scrypt key" ref="src/auth/password.js:14-19">
<define>What scrypt makes from a password and a random salt: 64 bytes that cannot be turned back into the password.</define>
<analogy>A fingerprint: it proves who you are, but nobody can rebuild your hand from it.</analogy>
</concept>

<compare id="belief" title="The server keeps a key, never the password" a="What one might think" b="What the code does" arc="contrast">
<pair label="What it stores" a="the password as typed" b="a salt and the scrypt key" />
<pair label="What it compares" a="the typed password with the stored one" b="the key of what was typed with the stored key" />
</compare>

<arch id="overview" title="The server checks the password and keeps only a hash" arc="idea">
  <node id="form" label="Login form" desc="Posts the credentials as JSON" kind="ui" ref="src/ui/login-form.js" />
  <node id="api" label="Auth routes" desc="Validate input, set the cookie" kind="service" ref="src/api/auth-routes.js:6-20" />
  <node id="users" label="Users table" desc="Users and password hashes" kind="store" ref="src/db/users.js" />
  <group id="auth" label="Auth core" desc="Checks passwords, opens sessions">
    <node id="service" label="Auth service" desc="Runs the login checks" ref="src/auth/auth-service.js" />
    <node id="password" label="Password check" desc="scrypt, constant time" kind="function" ref="src/auth/password.js">
      Re-derives the key with the stored salt and compares with `timingSafeEqual`, so timing does not leak how much matched.

      Unknown emails are checked against a dummy hash for the same reason.
    </node>
  </group>
  <edge from="form" to="api" label="POST /api/login" />
  <edge from="api" to="service" label="login()" />
  <edge from="service" to="users" label="find by email" />
  <drill node="password" topic="password hashing" />
  <code node="password" ref="src/auth/password.js:14-19">The comparison that keeps timing constant.</code>
</arch>

<flow id="login" title="A right password earns a session cookie" arc="answer">
  <node id="form" label="Login form" desc="Sends the credentials" kind="ui" />
  <node id="api" label="Auth routes" desc="Validate and reply" kind="service" />
  <step from="form" to="api" label="credentials" ref="src/ui/login-form.js:7-11">
    The form sends the email and password as JSON when the user submits.
  </step>
  <step from="api" label="validate">It rejects empty fields with 400, so the service never sees bad input.</step>
  <step from="api" to="form" kind="return" label="session cookie" ref="src/api/auth-routes.js:18-19">
    The route answers with an HttpOnly cookie, so the browser carries the session from now on.
  </step>
</flow>

<quiz question="Does the server store the password the user typed?">
<option why="It keeps only a salt and the scrypt key, so a stolen table gives no password away.">Yes, to compare it at the next login</option>
<option correct="true" why="At login it derives the key again from what was typed, with the stored salt, and compares the keys.">No, only a key derived from it</option>
</quiz>
```

- `<brief form>` comes first, right after the `#` title, and is never shown: `<audience>`, `<question>`, `<example>` (concrete data: numbers, a quoted value or a name), `<misconception>`, `<check>` and `<terms>` (comma-separated, 1–12), each exactly once, one line of at most 300 characters. `form` = `structure`, `process`, `quantity`, `system`, `annotated`, `argument` or `timeline`. How to write it: [presenting.md](presenting.md), step 1. The server warns when no component takes up the misconception and when no `<quiz>` with options asks the check.
- `arc` on every component: the brief's example comes first (`example`), then the rule or term it motivates (`idea`), the misconception corrected (`contrast`), the `answer` to the question, and a `check` or `recap` at the end; a `<concept>` is an `idea`, a `<quiz>` a `check` and a flashcard a `recap` without saying so. Every term of `<terms>` gets a `<concept>` before any slide shows it, and every acronym is spelled out the first time ("time to live (TTL)") unless the `<audience>` knows it.

- `<arch title>`: the static picture: `<node>`s and `<edge from to label?>`s. Use it for "what are the parts".
- `<group id label kind?>` (in `<arch>` only) boxes related nodes; the viewer shows it collapsed and zooms in on click, without asking you. Edges may point at a group.
- `<drill node topic>` marks a node that deserves its own deeper scene, under that topic. Add one for the 1–3 nodes a reader will most likely want next.
- `<data title>`: the data model, for "what is stored and how it relates": `<entity id label ref>` with `<field name type? key?>` rows (`key` = `pk`, `fk`, `unique`) and `<relation from to card label?>` (`card` = `1-1`, `1-n`, `n-1`, `n-n`).
- `<state title>`: a lifecycle, for "what states can X be in": `<status id label role? ref?>` (exactly one `role="initial"`, optional `role="final"`), `<transition from to event ref?>`, and optionally one `<walk>` of `<go event="...">narration</go>` steps that follow transitions from the initial state, like a `<flow>`.
- `<flow title>`: an ordered story: `<node>`s and `<step from to? label? kind? ref?>narration</step>`. A step without `to` is an action inside `from`. Use it for "what happens when".
- `kind` on `<step>` and `<edge>`: `call` (default), `return` (the answer coming back; needs `to`), `async` (queues, events, background jobs). Calls are drawn solid, returns dashed, async dotted.
- `<node id label desc? kind? ref?>`; `kind` is one of `actor`, `ui`, `service`, `module`, `function`, `store`, `external` (default `module`) for software, and `person`, `object`, `place`, `signal`, `step` for anything else (a traffic light's sensors are `object`s, a car's driver a `person`, a radio request a `signal`). A diagram whose boxes are all everyday things gets its line legend in plain words.
- `desc` (on `<node>`, `<group>`, `<entity>`, `<status>`): one line, at most 80 characters, saying what the part does, shown inside the box. Give one to every box; start with a verb or name the responsibility ("Validates the session", "Ranks the 15 candidates"), never repeat the label.
- Long description: text inside `<node>…</node>`, `<entity>` or `<status>` (Markdown, up to 1200 characters, blank line between paragraphs). Clicking the box shows it in the detail panel. Write one for the 2–5 boxes a reader will open: what it does, why it matters, and any gotcha, in 2–6 sentences.
- `<code node ref>why</code>`: the key lines of a box, shown in its panel. `ref` is a line range of at most 40 lines (check the numbers), the text says in one sentence why these lines matter; at most 3 per box, 1–4 per scene. The server copies the lines from the file: never paste code into EXL.
- **Every box that is a function, class, route or block gets a line range** (`path:start-end`), so the code window can focus its code when the user clicks it, and the code follows the flow while it plays. A bare `path` is only for a whole small file, a folder-like module or a data file; `render_scene` warns about the others. For notebooks the range is cells.
- `ref`: `path`, `path:line`, `path:start-end` or, for a document's section, `path#Heading`, relative to the project root, forward slashes. Every ref must exist: the cache hashes these files to know when the scene goes stale, so put a ref on every node that maps to code.
- Write `&lt;` for a literal `<` in narration.
- Lesson tags (attribute lists separated by `|`, numbers as the notebook prints them):
  - `<theme name="ml data" accent? />` once, right after the brief: two or three themes that fit (see "Theme" below).
  - `<chapter id? title goal? ref="nb.ipynb:5-9" theme? stage? />` self-closing; runs until the next chapter. `stage` = the id of a `<journey>` stage: the chapter opens with the journey as a map, that stage lit.
  - `<stats title?>` with 1–6 `<stat value="0.833" label="test accuracy" ref? />`.
  - `<journey title>` with `<stage id label value? kind? op? ref?>narration</stage>` (2–12; `kind` = `file`, `table`, `text`, `matrix`, `split`, `model`, `metric`).
  - `<trace title ref?>` with `<value label kind? code? note? dims? ref?>the value</value>` (2–12; the first is the input; `kind` = `text`, `list` `a|b`, `table` `a=1|b=2`, `bars` `a=-0.3|b=0.5`, `number`, `vector` `0.83|0.56|0.00` with `dims="384"` for the real size when only the first 2–16 numbers are shown).
  - `<chart title type="bars|hbars|line" series="train|test"? unit? highlight? ref?>` with `<row label="BoW" values="1.000|0.833" />` (one value per series, up to 4 series and 40 rows).
  - `<matrix title cols="a|b" kind="confusion"? positive? corner? ref?>` with `<row label="a" values="2|1" />` and `<focus label cells="1,2 2,1">narration</focus>` (1-based, `*` = all) or, in a confusion matrix, `<focus metric="precision">narration</focus>`.
  - `<calc title kind="sum|logistic" total="0.438" classes="negative|positive"? threshold? ref?>` with `<part label="bad" value="-0.332" note? ref? />` (2–24; the parts must add up to `total` within rounding).
  - `<threshold title classes="negative|positive" at="0.5"? ref?>` with `<point score="0.608" actual="negative" label? />` (2–200; `score` is the probability of the second class).
  - `<quiz question>` with 2–5 `<option correct="true"? why?>text</option>` (exactly one correct), or one `<answer>Markdown</answer>` for a flashcard.
  - `<plot title x? y? from? to? ref?>` with 1–4 `<curve fn="sigmoid|tanh|relu|log|linear|quadratic|exp|gaussian" label? />` (parameters as attributes: `slope`, `intercept`, `a`, `b`, `c`, `rate`, `mean`, `std`) or `<curve points="1,0.69 2,0.52" label? />`, and 0–8 `<mark x="0.438" label="our review" curve?>narration</mark>`.
  - `<scatter title classes="negative|positive" x? y? ref?>` with 2–300 `<dot x y class label? />` and at most one `<boundary slope intercept above="positive" />` or `<boundary points="x,y x,y" />`.
  - `<compare title a="Counts" b="TF-IDF" ref?>` with 2–8 `<pair label a b winner="a|b|tie"? />`.
  - `<timeline title ref?>` with 2–12 `<event label when? ref?>narration</event>`.
  - `<space title x? y? k? dims? ref?>` with 2–40 `<item id label x y cluster? score?>narration</item>`, at most one `<query label x y cluster?>narration</query>` and 0 or 2–8 `<cluster id label x y>narration</cluster>` (the index). Without a query it shows the index alone.
  - `<cosine title a b dims? score? ref?>` with 2–12 `<dim a="0.879" b="0.826" label? />`; the viewer multiplies, adds, measures and divides. With `dims` larger than the dims shown, `score` (the real cosine) is required.
  - `<derive title ref?>` with 2–8 `<line note="what changed">LaTeX without $</line>`.
  - `<annotated title ref?>`: a text read part by part (a lease, a law, a page). One `<passage>` (the text as written) and 1–12 `<note quote="words of the passage" label?>narration</note>`; the parser finds each quote.
  - `<argument title ref?>`: a claim weighed point by point. `<claim>` first, then 1–8 `<support label>narration</support>` and `<objection label reply?>narration</objection>`, then an optional `<verdict>` last.
  - `<system title ref?>`: a web of causes and feedback. 2–12 `<factor id label desc? ref? />`, up to 30 `<link from to sign label? />` (`sign` = `same`: more brings more, `opposite`: more brings less), optional `<loop through="a b c" label />` names (the parser finds the loops and whether each reinforces or balances), then one push: `<push factor change="up|down" ask?>narration</push>` and `<effect from to ask?>narration</effect>` steps that follow the links (the parser works out each direction).
  - `<structure title direction? ref?>`: a tree, an organization chart or a file tree drawn as itself, changing state by state. 1–40 `<member id label parent? side? desc? ref? />` (`side="left|right"` for a binary tree; no `parent` = a root) and up to 20 `<change label add? remove? move? mark? ask?>narration</change>` (`add`, `remove`, `mark`: ids separated by spaces; `move="a>b"` puts a under b; `ask` is a question the reader answers before the change shows). Members no change adds are there from the start; the viewer glides each member to its new place. `direction` = `down` (default) or `right`.
  - `<figure title size? ref?>`: a drawing of a physical thing on a grid (100 × 60 unless `size="W H"`; x to the right, y down). Shapes: `<circle id? x y r label? color?>`, `<box id? x y w h label? color?>`, `<arrow id? points="x y x y …" label? color? head="end|none|both"? dashed="yes"?>`, `<angle id? at="x y" from="x y" to="x y" label? color?>`, `<zone id? points label? color?>`, `<normal id? at length? label? color?>` (the dashed normal of a circle's edge or a box's side at `at`, `length` 12 by default), `<icon id? kind x y size? label? color?>` (a pictogram: `sun`, `eye`, `person`, `car`, `drop`, `house`, `tree`, `signal`, `battery`, `magnet`, `cloud`, `factory`, `phone`, `server`, `coin`, `heart`, `leaf`, `bulb`, `clock`, `lock`; a `signal` lights the lamp of its color), `<arc id? x y r from to head? label? color?>` (part of a circle, degrees clockwise from the right: a rainbow, an orbit), `<measure id? from to offset? color?>80 m</measure>` (a dimension line) (a `label` is up to 60 characters; `color` = `ink`, `red`, `orange`, `yellow`, `green`, `blue`, `violet`, `gray`), and `<label id? x y color?>words</label>`. Every shape but `<label>` also takes `desc` (one line, up to 80 characters: what the part is), which the page shows when the reader clicks it; give one to each part a reader will wonder about. Any point may be a place on a shape declared before: `drop.left|right|top|bottom|center`, a box's `.top-left`…, an arrow's `.start|middle|end`, or a circle's edge `drop@200` (degrees, 0 right, 90 down); use them so rays touch what they hit. Up to 40 shapes. Shapes in no `<show>` are there from the start; 1–12 `<show items? move? set? hide? pulse? flow? ask?>narration</show>` play part by part: `items="id id"` draws shapes, `move="car: 47 30 47 2"` moves one through points (`;` between shapes), `set="light: green"` recolors, `hide` fades out, `pulse` makes a shape swell (a sensor firing), `flow="arrow"` sends a dot along an arrow (a call, a ray), and `ask` asks the reader to predict the show first. Show the change as it happens: a light that turns green is `set`, a car that crosses is `move`, never a new shape. Template: [presenting.md](presenting.md), "A physical thing, drawn".
  - `<concept term id? ref?>` with `<define>one sentence</define>` (required), `<analogy>…</analogy>`, `<formula>LaTeX without $</formula>` and `<example>Markdown</example>` (each at most once).

## Vectors, embeddings and search

For embeddings, vector stores, indexes and similarity search (RAG, recommendations, semantic search), use the vector tags with the project's real numbers:

- **Where real numbers come from**: rows already stored (a JSON or CSV export, a `SELECT` of the vector column, a fixture), logs or notebook outputs, or one short run of the project's own code (its embedding function on one chunk and one question, its search with scores) when the user agrees to run it. Never invent a vector, a coordinate or a score; if none can be obtained, say which command would print them.
- **An embedding** is a `<trace>` that ends in `<value kind="vector">`: the chunk's text, its tokens (`list`), then the vector's first numbers with `dims` = its real size.
- **The store** is a `<matrix>` (rows = chunks, columns = dimensions, at most 12 × 12; show the first rows and say how many there are) or a `<data>` entity for its schema.
- **The index and the search** are `<space>`s: positions from a 2-D projection the project computed or that a short script computes from the real vectors (PCA keeps the origin; say "a 2-D view of 384 dimensions" with `dims`), real `score`s for every compared item, the `cluster` the system chose on the `<query>`. One `<space>` without a query shows the index; one with it shows the search.
- **The score** is a `<cosine>` of the question and the best row: all dimensions when they are few, else the first ones with `dims` and the real `score`.

## Theme

Give every scene a `<theme name="…" />` right after its brief, before any other tag: it decorates the page and the slides so each explanation has its own look. Name **two or three** themes that fit the subject, separated by spaces (`<theme name="nature science" />`): the viewer draws one of them at random for each presentation, and a random accent color with it, so no two presentations look alike. For technical subjects: `data` (tables, pipelines, analysis), `ml` (models, training), `math` (formulas, numeric methods), `text` (NLP, parsing, strings, language), `web` (pages, HTTP, front end), `network` (services talking, queues, protocols), `database` (schemas, queries, storage), `security` (auth, permissions, crypto), `code` (compilers, tooling, a library's internals), `hardware` (devices, machines, electronics), `business` (money, billing, orders, markets). For everyday subjects: `nature` (plants, animals, weather, landscapes), `space` (planets, stars, orbits), `science` (physics, chemistry, light, experiments), `history` (the past, eras, inventions, events), `health` (the body, medicine, sport, food for health), `food` (cooking, recipes, drinks), `art` (painting, music, design, literature), `society` (law, politics, cities, people, rules). Never `plain`: it draws nothing. In a lesson, add `theme` (one name) to a `<chapter>` only when that chapter's subject is different (a chapter on the database inside a web lesson). Leave `accent` out unless the user asks for a color.

## Good scenes

- Pick each block because it answers a question the reader has: the table "Which picture for which question" in [presenting.md](presenting.md). Three or four different kinds carry a scene better than ten.
- `<arch>` and `<flow>`: 4–10 visible boxes per level, 4–10 steps. With more parts, put related nodes in `<group>`s.
- Labels say what a part does in words the audience knows, at most 80 characters; narration is one plain sentence of about 20 words per step (never more than 25: Present shows it as a subtitle).
- Formulas are LaTeX (the cheat sheet is in [presenting.md](presenting.md)). Use them for definitions the code really uses (TF-IDF, the sigmoid, precision), never as decoration; numbers inside them come from the outputs like any other number.
- Explain what the code does, not what it might do; if you are unsure, say so in the prose.

## Flows that make sense

- **One story.** After the first step, every step starts at a node the story already reached; the parser rejects jumps. If a part starts working, first show who calls it.
- **Show what comes back** with `kind="return"` when it matters (rows, a token, the 5 sources), so the reader sees how data returns before the next step uses it. Skip trivial acknowledgements.
- **Async** (`kind="async"`) for queues, events, timers and background jobs: nobody waits for them.
- **Checks before the handler** (middleware, guards, feature flags) are steps through each check in order, or one action step inside the route; never a call from the route to the middleware.
- **Labels name what travels**, in one to four words ("credentials", "JWT", "15 candidates"), on steps and on `<arch>` edges alike.
- **Narration says what happens and why it matters**, in one sentence of about 20 words, without repeating the label.
