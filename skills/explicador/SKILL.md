---
name: explicador
description: Explains how a software system works (a feature, request flow, module or architecture) with animated diagrams shown in a local browser tab. Use when the user asks how some code works, what happens when X, how parts connect, or asks for a diagram or walkthrough of the codebase.
---

# Explicador

You explain code with **scenes**: an EXL document (Markdown plus a few diagram tags) that the Explicador MCP server validates, caches and plays in a local viewer tab. Always answer the user in their language; write the scene text (titles, labels, narration, prose) in that language too.

## Workflow

1. **Pick a topic**: a short, stable name for what is explained ("login", "checkout flow"). Reuse the same topic for the same question so the cache hits.
2. **Call `show_scene`** with the topic.
   - **fresh**: the scene is already in the viewer and its EXL is in the result. Do **not** read code or call other tools. Reply with 2–4 sentences summarizing it from the EXL and give the viewer URL.
     Exception: a scene about a notebook (or data or ML code) without `<chapter>`s is an old format; rebuild it as a lesson (see "Lessons") under the same topic.
   - **stale**: re-read only the changed files it lists, update the EXL it returned and call `render_scene` with the same topic.
   - **missing**: continue below.
3. **Call `ensure_index`** and read its file tree and import graph before opening any code. Use it to choose the few files that matter.
4. **Read only what you need** (the entry point and the files on the path you explain). Check line numbers for every `ref` you will write.
5. **Write the EXL and call `render_scene`**. If it returns errors, fix exactly those lines and call it again; nothing is saved until it passes.
6. **Reply in the chat** with a short explanation (3–6 sentences) and the viewer URL. The scene carries the detail.
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

## Lessons (notebooks, data and ML code)

When the topic is a Jupyter notebook, or a data or ML script, explain it as a **lesson** for a beginner: chapters that follow the notebook, each concept from zero, the real data on screen, and checks. Full tag reference: "Lessons" in `docs/EXL.md`; a complete example is `examples/scenes/notebook-lesson.exl.md` in the plugin.

1. **Outline first**: `read_notebook` without `cells` gives the numbered cells; then read the cells of each section whole (`cells: "5-9"`), outputs included. Refs are cell numbers.
2. **Intro** (before the first chapter): a `#` title that states the problem as a question ("Can a model tell a good review from a bad one?"), one short paragraph, then `<stats>` with 2–4 headline numbers (the result first) and a `<journey>` of the data's path: one `<stage>` per big step with its real size as `value` ("24 reviews", "18 × 70", "0.833") and the operation as `op` (`train_test_split()`).
3. **One `<chapter>` per notebook section**, in notebook order: `ref` = the section's cells (a range), a `title` a beginner understands, and a `goal` ("Read a confusion matrix and compute precision from it"). The server attaches the cells with their outputs.
4. **In each chapter**, short blocks, one idea each:
   - **Each new concept from zero**: what it is in one sentence, an everyday **analogy** (a jury where each word votes; exam answers hidden from the student), and a **tiny worked example** (a 2–3 row Markdown table, or a small `<matrix>`) before the code.
   - **The decision and why**: what the notebook chose (keep negations, stratify, max_iter) and what would go wrong otherwise, often as a `> [!IMPORTANT]` callout.
   - **A visual of the real data**: `<trace>` for a transformation of one real value (cleaning text, tokenizing, scaling a row); `<chart>` for comparisons (`bars`), rankings and coefficients (`hbars`; negative values diverge) and trends (`line`); `<matrix kind="confusion">` for a classifier's errors, with a `<focus metric>` per metric you discuss and a `<focus cells>` on the mistakes; a plain `<matrix>` for a document-term matrix or a tiny worked example.
   - **How the model decides**: when the notebook trains a linear or logistic model, show one real prediction with `<calc kind="logistic">` (or `kind="sum"` for a plain linear score): the intercept and each feature's contribution as `<part>`s, and `total` = the score the notebook printed. Pick an interesting input (a mistake is the best teacher). If the notebook does not print the contributions, say which cell would (intercept, `coef_` times the feature values, `decision_function`) instead of computing them yourself.
   - **The threshold as a choice**: when a classifier's probabilities are printed for the test set, add a `<threshold>` with one `<point>` per test input (up to 200) so the reader can see the trade between false positives and false negatives. If they are not printed, name the cell that would print them (`predict_proba(X_test)[:, 1]` with the true labels) rather than inventing them. Warn that a threshold tuned on the test set no longer gets a fair grade from it.
   - **1–2 `<quiz>`** that check understanding, not memory: plausible wrong options, each with a `why` that teaches (do not start it with "Right" or "Wrong": the viewer already says so).
5. **A final chapter "Review"** (the viewer's Practice mode drills every check and card of the lesson, so make each one stand on its own: no "as above") with 5–8 flashcards (`<quiz question><answer>…</answer></quiz>`) of the questions a teacher or reviewer would most likely ask about this notebook (why this preprocessing, why this split, what the metric means, why the model failed on an example), each answered in 2–4 sentences with the real numbers.
6. **Numbers only from the notebook**: every number in the lesson (stats, stage values, chart rows, matrix cells, prose) is copied from a cell output, or from code that actually ran. Never compute metrics yourself: give the confusion counts and the viewer derives accuracy, precision, recall and F1 with their formulas. If an output you need is missing, say so in the prose instead of guessing.
7. Callouts: `> [!NOTE]` for context, `> [!TIP]` for a shortcut or an intuition, `> [!IMPORTANT]` for the key decision, `> [!WARNING]` for a pitfall or a limit of the result, `> [!CAUTION]` for something that would break.

## EXL in short

Full reference: `docs/EXL.md` in the plugin. Tags must start at the beginning of a line; attribute values are always quoted strings; no `{expressions}`, no other HTML.

```
# Title in Markdown

One short paragraph of context.

<arch id="overview" title="Login: the parts involved">
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

<flow id="login" title="Logging in">
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
```

- `<arch title>`: the static picture: `<node>`s and `<edge from to label?>`s. Use it for "what are the parts".
- `<group id label kind?>` (in `<arch>` only) boxes related nodes; the viewer shows it collapsed and zooms in on click, without asking you. Edges may point at a group.
- `<drill node topic>` marks a node that deserves its own deeper scene, under that topic. Add one for the 1–3 nodes a reader will most likely want next.
- `<data title>`: the data model, for "what is stored and how it relates": `<entity id label ref>` with `<field name type? key?>` rows (`key` = `pk`, `fk`, `unique`) and `<relation from to card label?>` (`card` = `1-1`, `1-n`, `n-1`, `n-n`).
- `<state title>`: a lifecycle, for "what states can X be in": `<status id label role? ref?>` (exactly one `role="initial"`, optional `role="final"`), `<transition from to event ref?>`, and optionally one `<walk>` of `<go event="...">narration</go>` steps that follow transitions from the initial state, like a `<flow>`.
- `<flow title>`: an ordered story: `<node>`s and `<step from to? label? kind? ref?>narration</step>`. A step without `to` is an action inside `from`. Use it for "what happens when".
- `kind` on `<step>` and `<edge>`: `call` (default), `return` (the answer coming back; needs `to`), `async` (queues, events, background jobs). Calls are drawn solid, returns dashed, async dotted.
- `<node id label desc? kind? ref?>`; `kind` is one of `actor`, `ui`, `service`, `module`, `function`, `store`, `external` (default `module`).
- `desc` (on `<node>`, `<group>`, `<entity>`, `<status>`): one line, at most 80 characters, saying what the part does, shown inside the box. Give one to every box; start with a verb or name the responsibility ("Validates the session", "Ranks the 15 candidates"), never repeat the label.
- Long description: text inside `<node>…</node>`, `<entity>` or `<status>` (Markdown, up to 1200 characters, blank line between paragraphs). Clicking the box shows it in the detail panel. Write one for the 2–5 boxes a reader will open: what it does, why it matters, and any gotcha, in 2–6 sentences.
- `<code node ref>why</code>`: the key lines of a box, shown in its panel. `ref` is a line range of at most 40 lines (check the numbers), the text says in one sentence why these lines matter; at most 3 per box, 1–4 per scene. The server copies the lines from the file: never paste code into EXL.
- **Every box that is a function, class, route or block gets a line range** (`path:start-end`), so the code window can focus its code when the user clicks it, and the code follows the flow while it plays. A bare `path` is only for a whole small file, a folder-like module or a data file; `render_scene` warns about the others. For notebooks the range is cells.
- `ref`: `path`, `path:line` or `path:start-end`, relative to the project root, forward slashes. Every ref must exist: the cache hashes these files to know when the scene goes stale, so put a ref on every node that maps to code.
- Write `&lt;` for a literal `<` in narration.
- Lesson tags (attribute lists separated by `|`, numbers as the notebook prints them):
  - `<chapter id? title goal? ref="nb.ipynb:5-9" />` self-closing; runs until the next chapter.
  - `<stats><stat value="0.833" label="test accuracy" ref? /></stats>` (1–6).
  - `<journey title>` with `<stage id label value? kind? op? ref?>narration</stage>` (2–12; `kind` = `file`, `table`, `text`, `matrix`, `split`, `model`, `metric`).
  - `<trace title ref?>` with `<value label code? note? ref?>the value</value>` (2–12; the first is the input).
  - `<chart title type="bars|hbars|line" series="train|test"? unit? highlight? ref?>` with `<row label="BoW" values="1.000|0.833" />` (one value per series, up to 4 series and 40 rows).
  - `<matrix title cols="a|b" kind="confusion"? positive? corner? ref?>` with `<row label="a" values="2|1" />` and `<focus label cells="1,2 2,1">narration</focus>` (1-based, `*` = all) or, in a confusion matrix, `<focus metric="precision">narration</focus>`.
  - `<calc title kind="sum|logistic" total="0.438" classes="negative|positive"? threshold? ref?>` with `<part label="bad" value="-0.332" note? ref? />` (2–24; the parts must add up to `total` within rounding).
  - `<threshold title classes="negative|positive" at="0.5"? ref?>` with `<point score="0.608" actual="negative" label? />` (2–200; `score` is the probability of the second class).
  - `<quiz question>` with 2–5 `<option correct="true"? why?>text</option>` (exactly one correct), or one `<answer>Markdown</answer>` for a flashcard.

## Good scenes

- Pick the view that answers the question: `<arch>` for parts, `<flow>` for a sequence, `<data>` for stored data, `<state>` for a lifecycle. One or two per answer is usually enough; 4–10 visible boxes per level, 4–10 steps. With more parts, put related nodes in `<group>`s.
- Labels are names a reader recognizes (file or concept), at most 80 characters; narration is one or two plain sentences per step.
- Markdown tables (`| a | b |` with a `|---|---|` row) are fine in the prose between tags.
- Explain what the code does, not what it might do; if you are unsure, say so in the prose.

## Flows that make sense

- **One story.** After the first step, every step starts at a node the story already reached; the parser rejects jumps. If a part starts working, first show who calls it.
- **Show what comes back** with `kind="return"` when it matters (rows, a token, the 5 sources), so the reader sees how data returns before the next step uses it. Skip trivial acknowledgements.
- **Async** (`kind="async"`) for queues, events, timers and background jobs: nobody waits for them.
- **Checks before the handler** (middleware, guards, feature flags) are steps through each check in order, or one action step inside the route; never a call from the route to the middleware.
- **Labels name what travels**, in one to four words ("credentials", "JWT", "15 candidates"), on steps and on `<arch>` edges alike.
- **Narration says what happens and why it matters**, in one or two sentences, without repeating the label.
