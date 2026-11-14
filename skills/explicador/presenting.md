# Presenting: one picture per slide, with subtitles

Every scene is two things. The **page** explains in full, for someone reading alone: prose, narration, notes. **Present** is a video the reader steps through: the title as the cover, then one component per slide, each saying one short sentence, its `title`, while the narration of the part on screen shows as a **subtitle** under it. Prose paragraphs never reach the slides; a speaker turns the subtitles off with S. Tag syntax: "EXL in short" in `SKILL.md` and `docs/EXL.md` in the plugin; lesson rules: "Lessons" in `SKILL.md`.

## What Present shows

- **The cover**: the `#` title at the top of the scene, alone and large. Then chapter cards and components, in order.
- **One slide per component**, its pieces arriving one per click: flow steps (every `<step>`, with or without `to`), the states of a `<structure>`, the steps of a `<system>`, the `<show>`s of a `<figure>`, journey stages, trace values (the steps already played stay in sight as a strip), concept pieces, plot marks, derivation lines, comparison rows, timeline events, calc parts, matrix highlights, scatter classes.
- **On the slide**: titles, labels, values, boxes, arrows, bars, numbers, concept cards and quizzes.
- **As the subtitle of each part**: the narration of flow and walk steps, structure changes, system steps, figure shows, journey stages, timeline events and plot marks; the `note` of trace values, derivation lines and calc parts; the narration of matrix highlights; the narration of a `<space>`'s query, chosen cluster and compared items.
- **Only on the page**: Markdown prose and callouts.
- So what the audience must **see** goes into a component, what they must **hear** goes into narration (one short sentence per part: a subtitle is read in a few seconds), and the longer explanation goes into prose.
- **A component** is every tag except `<chapter>`, `<quiz>` and `<theme>` (so `<stats>` is one). A quiz checks the slide before it; it never replaces one.

## Audience

- By default, **technical vocabulary made easy**: use the real terms (the reader meets them in exams, docs and code), and introduce each one the first time with a `<concept>` card and its everyday `<analogy>`; after that, use it plainly.
- When the user says the audience is not technical, use plain words instead of the terms ("word counts", not "bag of words"). When they say it is expert, skip the analogies for the basics.
- Labels say what a part does ("Checks the password"); code names go in `desc`, `ref` and `<code>`, which open on click.
- Give numbers a comparison the reader feels: "5 of the 6 hidden reviews", "one hour, then you log in again".

## Deep dive: when the user wants to understand a process well

"How does our RAG work", "explain the checkout end to end", "what really happens when I deploy": the answer is a lesson whose parts complete each other.

1. **The map.** In the intro, a `<journey>` with one `<stage>` per stop of the process (3–7), each with its real size as `value` and the operation as `op`.
2. **One chapter per stop**, in order, with `stage="…"` naming its stage: the chapter opens with the map and that stop lit, so the reader always knows where they are and what comes next.
3. **Each chapter its own picture**, the one that answers that stop's question (the table below): a `<trace>` for how one thing changes, a `<matrix>` or `<data>` for what is stored, a `<space>` for vectors, a `<flow>` for who calls whom, a `<cosine>` or `<calc>` or `<derive>` for a number worked out.
4. **One example through every chapter**: the same input (one chunk and one question, one order, one request) in every chapter, with its real values, so each chapter picks it up where the last one left it.
5. **A concept card** for each new term, the first time it appears, and a quiz per chapter; a review chapter at the end.

For vectors (embeddings, stores, indexes, similarity search) the pictures are: the embedding as a `<trace>` ending in `<value kind="vector">`, the store as a `<matrix>`, the index as a `<space>` with `<cluster>`s and no query, the search as a `<space>` with the `<query>`, and the score as a `<cosine>`. Where their real numbers come from: "Vectors, embeddings and search" in `SKILL.md`. A complete example is `examples/scenes/rag.exl.md` in the plugin, over `examples/rag`.

## Recipe

1. **The brief.** Before any slide, decide what the scene is for and write it as a `<brief form="…">` right after the `#` title, one line per field (the examples are below):
   - `<audience>`: who reads it and what they already know.
   - `<question>`: the one question the scene answers.
   - `<example>`: one concrete case with its real data (numbers, a quoted value, a name), followed from the first slide to the last.
   - `<misconception>`: the wrong idea the reader most likely brings.
   - `<check>`: what the reader predicts or works out at the end to show they understood.
   - `<terms>`: the terms they will meet, separated by commas (1–12).
   - `form`: the shape of the idea, which picks the picture: `structure` (parts and how they relate or change), `process` (steps or states), `quantity` (amounts and how they change), `system` (causes and feedback), `annotated` (a document or code read part by part), `argument` (a thesis with evidence, or a decision with options) or `timeline` (events in order).

   Every later step comes from the brief: the title is its question, the example is the one the `<trace>` follows, each term gets a `<concept>` card the first time it appears, one slide corrects the misconception with its own words (a `<quiz>` option and its why, a `<compare>`, a `<concept>`, or the narration of the step that disproves it), and the last `<quiz>` asks the check. Done when every field names something concrete; `render_scene` refuses a scene without a brief.
2. **The question.** The `#` title is the brief's question in at most 12 words ("What happens when you log in?"); then `<brief>`, then `<theme>`. Done when the title has at most 12 words.
3. **The ideas, in the order of the arc.** List for yourself 3 to 7 ideas, each one sentence, and give each its part of the arc (below): first the brief's example, then the idea it motivates, the misconception set against the fact, the answer to the question, and the check. Done when each one could be a slide and the first one is the example.
4. **A component per idea.** Pick it from the table below and write its part as `arc="…"`. Done when every idea, and every chapter, has its component, and every component its `arc`.
5. **One example through everything.** Take the brief's example and follow it with a `<trace>` through the whole process, changing form at each step: the raw input as `text`, then `list`, `table`, `bars`, `number`. Done when its first value is the real input, its last one the real output, and every value comes from the code or its outputs. In `table` and `bars`, each item's name is what the slide shows and what glides from step to step, so keep the same names along the trace; a `number` is one value, so show a sum as `bars` of its parts, then its total as a `number`. The `label` and `code` of a value show on the slide, and its `note` as the subtitle of its step.
6. **Titles that say the point.** Each component's `title` is the takeaway as a claim of at most 12 words: "Only *bad* pulls towards negative", not "Weights". Done when a slide says its point with the title alone.
7. **The page and the subtitles.** Around each component, write for a reader alone: 1–3 short paragraphs. Give every step, stage, event, mark and value its narration or `note`: one sentence of about 20 words (the server warns above 25), with the real number when there is one, that says what this part shows. Done when the page makes sense without a speaker, and Present makes sense with the subtitles alone.
8. **Render.** Call `render_scene`. Fix every `EXL errors` line; then every `Warning:` line, and render again. Done when it answers "No warnings". The warnings are the server checking this guide's rules: a misconception the scene takes up and a `<quiz>` that asks the check, the arc in order, terms and acronyms defined before use, titles that are claims, a cover and a theme, a component per chapter, short titles and subtitles, a `desc` on every box, key `<code>` in code diagrams, a `<trace>` beside every `<flow>`, a `<journey>` map, a check per chapter and a final review in lessons, one `<trace>` and a `<concept>` in a lesson, chapters instead of `##` sections, whys that do not open with a verdict, and numbers the notebook printed. Each tag's exact attributes and nesting (`<field>` inside `<entity>`, `<concept>` takes only `term`, `id` and `ref`) are in "EXL in short" in `SKILL.md`; when `render_scene` says `Unknown attribute`, it lists the allowed ones.
9. **Check** against the checklist at the end. Done when every line is true.

### The arc

Every component says what it does for the brief's question with `arc`. The order is the principle "concrete first": the reader meets the case before the rule, and the answer after the case.

| `arc` | The slide… | Often |
|---|---|---|
| `question` | poses the problem: the case or the stakes, before anything is explained | `<stats>` of the data's size, a `<journey>` map without the results |
| `example` | shows the brief's example with its real data | `<trace>`, `<timeline>`, a small `<matrix>` |
| `idea` | draws the rule, the mechanism or the term from the example | `<concept>` (its default), `<arch>`, `<chart>` |
| `contrast` | puts the misconception against what really happens | `<compare>` of the belief and the fact, the `<calc>` that disproves it |
| `apply` | uses the idea on a new case or shows a consequence | `<plot>`, `<derive>`, `<threshold>` |
| `answer` | answers the brief's question | the `<flow>`, `<state>` or `<data>` that shows the whole mechanism |
| `check` | asks the reader to predict | `<quiz>` with options (its default) |
| `recap` | sums up | flashcards (their default), a last `<stats>` |

- **Concrete first.** The first `example` comes before any `idea` and any `answer`; it shows one of the brief's numbers, quoted values or names. A map or a headline that shows the result before the case is an `answer` too early: show the size of the problem there, and the result once the example has led to it.
- **Terms after the case.** Every term of `<terms>` gets a `<concept>` before any slide shows it, so the first example says what happens in plain words ("a pass for one hour") and the card names it next. A chapter card may name the term its section defines.
- **Acronyms spelled out.** The first time, write the words and the acronym after them: "time to live (TTL)". Leave out only those the `<audience>` says the reader knows.
- **One `contrast`, one `answer`, an end.** One slide sets the misconception against the fact; one answers the question; the last is a `check` or a `recap`. In a lesson, each chapter repeats example → idea → check, and the review is the recap.
- **Titles are claims.** A title of one or two words ("Weights") is a label: say the slide's point.
- **Let the reader predict.** Before the step that carries the idea (where the new value lands, which way a factor turns), add `ask="…"` to that `<change>` or `<effect>`: Present shows the picture as it was and the question, and the next → shows the answer. One or two per scene; the brief's `check` stays the closing `<quiz>`.

### Form → tags

The brief's `form` picks the scene's main picture; `render_scene` warns when no component draws it.

| Form (`<brief form>`) | The idea is… | Draw it with |
|---|---|---|
| `structure` | parts and how they relate or change | `<structure>`, `<arch>`, `<data>`, `<figure>` |
| `process` | something going through steps or states | `<flow>`, `<state>`, `<journey>`, `<trace>`, `<timeline>`, `<figure>` |
| `quantity` | amounts, scale and how they change | `<chart>`, `<calc>`, `<plot>`, `<stats>`, `<derive>`, `<matrix>`, `<threshold>`, `<scatter>`, `<space>`, `<cosine>` |
| `system` | causes and feedback | `<system>` |
| `annotated` | a document read part by part | `<annotated>` |
| `argument` | a thesis with reasons and objections, or a decision | `<argument>`, `<compare>` |
| `timeline` | events in order | `<timeline>`, `<journey>` |

### Two briefs

A technical one, for a structure:

```xml
<brief form="structure">
<audience>Second-year engineering students; they know what a linked list is</audience>
<question>How does a binary search tree decide where each value goes, and what shape does it end up with?</question>
<example>Insert 50, 30, 70, 20 in that order</example>
<misconception>Believing the tree always stays balanced</misconception>
<check>Predict where 40 goes and whether the tree becomes full</check>
<terms>node, child, height (in levels), full tree, degenerate tree</terms>
</brief>
```

A non-technical one, for a quantity:

```xml
<brief form="quantity">
<audience>Adults taking their first loan; they know percentages, not finance</audience>
<question>Why does a loan at 5 % a year cost more than 5 % a year of what you borrowed?</question>
<example>Borrow 1 000 € at 5 % a year for 3 years, the interest added at the end of each year</example>
<misconception>Believing the interest is always 5 % of the first 1 000 €</misconception>
<check>Predict whether the third year's interest is more than, less than or exactly 50 €</check>
<terms>principal, interest rate, compound interest</terms>
</brief>
```

The fields are written in the user's language, like the rest of the scene.

## Which component for which question

| The reader asks | Use | On the slide |
|---|---|---|
| How does one real example change along the whole process? | `<trace>` with `kind` per value | a strip of steps: each step stays in sight as a card, the current one larger; surviving pieces glide to their new place |
| What does the thing look like, and what happens in it? (a raindrop and its rays, a crossing and its lights, a lever, a heart's chambers) | `<figure>` with `<show>`s | the drawing itself: the setting first, then each `<show>` draws its arrows and angles, grows its shapes, moves them, recolors them, pulses them or sends a dot along an arrow |
| What are the parts and how do they connect? | `<arch>` (`<group>` for many parts) | boxes appear, then the arrows |
| What does this text say, part by part? (a lease, a law, a page of an interface) | `<annotated>` with a `<note>` per part | the passage, each quoted part turning yellow as its note rises beside it |
| Should we, or is it true? What speaks for it and against it? | `<argument>` | the claim, then each reason and objection with its reply, then the verdict |
| What causes what, and what feeds back? (load and retries, prices and demand, an ecosystem) | `<system>` with a `<push>` and its `<effect>`s | factors on a ring, the loops marked R or B; each step draws its link and lights the factor it moves up or down |
| How is it built, and how does it change, step by step? (a tree, an organization chart, a file tree) | `<structure>` with `<change>`s | the structure itself: each member glides to its new place, a new one grows out of its parent |
| What happens, step by step? | `<flow>` | a token travels each arrow, step by step |
| What is stored, and how does it relate? | `<data>` | tables and their links |
| What states can it be in, and what moves it? | `<state>` with a `<walk>` | the walk lights each transition |
| What is this idea? | `<concept>` | the term alone, then each piece arrives |
| How does the data change shape? | `<journey>` | stage by stage, with sizes |
| Which is bigger, what ranks first, how did it trend? | `<chart>` | bars grow, lines draw |
| What is in this grid, where are the mistakes? | `<matrix>` | cells cascade, then each highlight |
| How did the model score this one case? | `<calc>` | a waterfall, part by part |
| What if we moved the cut-off? | `<threshold>` | a slider the speaker drags |
| Where does this number fall on the curve? | `<plot>` with `<mark>`s | a point travels to each mark |
| How do I get from the formula to the result? | `<derive>` | shared symbols glide line to line |
| How are the groups separated? | `<scatter>` | each group lands, the boundary is traced |
| Which of two options, and in what? | `<compare>` | row by row, then the tally |
| In what order did things happen? | `<timeline>` | the line reaches each event |
| What are the key numbers? | `<stats>` | numbers count up |
| What does this text look like as numbers? | `<trace>` ending in `<value kind="vector">` | the words become a strip of numbers, colored by sign |
| Where do the stored items sit, and how does the index group them? | `<space>` with `<cluster>`s, no query | the items land in their zones |
| Which items does the question find, and why those? | `<space>` with a `<query>` | the question lands, goes to its zone, each angle opens with its cosine, the k best are ranked |
| How is the similarity worked out? | `<cosine>` | each pair is multiplied, summed, measured, divided, and lands on −1…1 |
| Where are we in the whole process? | `<journey>` + `<chapter stage>` | each chapter opens with the map, its stop lit |
| Did I understand? | `<quiz>` | options, then the answer |

**When the topic is a physical thing, draw the thing.** A rainbow is a drop and its rays, a traffic light is a crossing with its lights and its sensors, a pulley is a wheel and its rope: the `<figure>` that draws it explains more than any box diagram. Boxes (`<arch>`, `<flow>`) are for parts that talk to each other; outside software, give each box an everyday `kind` (`person`, `object`, `place`, `signal`, `step`) so its label says what it is, never `ui` or `service`.

A list of more than 3 bullets is almost always one of these: steps in order → `<flow>` or `<timeline>`; pros and cons → `<compare>`; parts → `<arch>`; quantities → `<chart>`; one thing being transformed → `<trace>`.

## Template: explaining code

```exl
# What happens when you log in?

<brief form="process">
<audience>Shop customers; they know what a password is, not what a hash is</audience>
<question>What does the shop do with your password when you log in?</question>
<example>Ana logs in as "ana@shop.com" with the password "hunter2"</example>
<misconception>Believing the shop keeps your password and could email it back to you</misconception>
<check>Explain why the shop cannot email you your password</check>
<terms>password hash</terms>
</brief>

<theme name="security" />

Ana types her email and her password, and the shop lets her in. What happens to her password in between?

<trace title="Ana types her password once and gets a pass for one hour" arc="example">
<value label="What Ana types">ana@shop.com hunter2</value>
<value kind="table" label="What the page sends" code="JSON.stringify({ email, password })" note="The page sends both, once, over a secure connection.">email=ana@shop.com|password=hunter2</value>
<value label="What she gets back" note="Her browser shows the pass on every visit, so she does not type her password again.">a pass for one hour</value>
</trace>

The shop never compares what Ana typed with a stored password. It keeps a **hash**, and compares hashes.

<concept term="Password hash">
<define>A scrambled version of the password that cannot be turned back into it.</define>
<analogy>Like a fingerprint: it proves who you are, but nobody can rebuild your hand from it.</analogy>
<example>hunter2 always gives `9f2c…e71a`; any other password gives something else.</example>
</concept>

<compare title="The shop keeps a hash, never your password" a="What you might think" b="What the shop does" arc="contrast">
<pair label="What it keeps" a="hunter2" b="its hash, 9f2c…e71a" />
<pair label="What it compares" a="what you typed with hunter2" b="the hash of what you typed with the stored hash" />
</compare>

<arch title="Four parts take part in a login" arc="idea">
  <node id="you" label="You" desc="Type your email and password" kind="actor" />
  <node id="page" label="Login page" desc="Sends what you typed" kind="ui" ref="src/ui/login-page.js:4-15" />
  <node id="check" label="Password check" desc="Compares hashes, never passwords" kind="function" ref="src/auth/password.js:14-19" />
  <node id="list" label="List of users" desc="Keeps each user's hash" kind="store" ref="src/db/users.js:2-10" />
  <edge from="you" to="page" label="email + password" />
  <edge from="page" to="check" label="check this" />
  <edge from="check" to="list" label="find the hash" />
  <code node="check" ref="src/auth/password.js:14-19">The comparison takes the same time whether the hashes match or not, so timing gives nothing away.</code>
</arch>

<flow title="The shop hashes what you type and compares hashes" arc="answer">
  <node id="page" label="Login page" desc="Sends what you typed" kind="ui" ref="src/ui/login-page.js:4-15" />
  <node id="check" label="Password check" desc="Compares hashes, never passwords" kind="function" ref="src/auth/password.js:14-19" />
  <step from="page" to="check" label="email + password" ref="src/ui/login-page.js:9-12">The page sends what you typed, once, over a secure connection.</step>
  <step from="check" label="compare hashes" ref="src/auth/password.js:14-19">It hashes what you typed the same way and compares it with the stored hash.</step>
  <step from="check" to="page" kind="return" label="pass for one hour" ref="src/auth/sessions.js:7-11">If they match, your browser gets a pass that keeps you logged in for one hour.</step>
</flow>

> [!TIP]
> This is why the shop can never email you your password: it does not have it.

<quiz question="Why can't the shop email you your password?">
<option why="It could keep it; it chooses not to.">It forgot it</option>
<option correct="true" why="It only keeps a hash, and a hash cannot be turned back into the password.">It only keeps a hash</option>
</quiz>
```

With your project's code, every value of the trace comes from the code or a log, every node and step gets a `ref` with a real line range (check the numbers), every box a `desc`, and 1–4 `<code>` blocks open on click.

## Template: a lesson chapter

```exl
# Can a model tell a good review from a bad one?

<brief form="process">
<audience>Beginners who have never trained a model; they know what a probability is</audience>
<question>How does the model turn a review into a probability of being positive?</question>
<example>The review "a great film, really great" gets the score 0.438 and the probability 0.608</example>
<misconception>Believing the score is already a probability</misconception>
<check>Predict the probability the model gives to a score of 0</check>
<terms>sigmoid</terms>
</brief>

<theme name="ml" />

<journey title="A review becomes a verdict in three steps" arc="question">
<stage id="review" label="Review" value="1 review" kind="text">The review, as its author wrote it.</stage>
<stage id="score" label="Score" value="0.438" kind="model" op="decision_function()">The model adds up what each word weighs.</stage>
<stage id="probability" label="Probability" value="0.608" kind="metric" op="predict_proba()">A function squeezes the score between 0 and 1.</stage>
</journey>

<chapter title="A score becomes a probability" goal="Read a score as a probability between 0 and 1." stage="probability" />

The model gives each review a **score**, which can be any number. Follow one review first.

<trace title="Our review becomes 0.608" arc="example">
<value label="The review">a great film, really great</value>
<value kind="number" label="Its score" code="model.decision_function(X)" note="Above 0, so it leans positive.">0.438</value>
<value kind="number" label="Its probability" code="model.predict_proba(X)[:, 1]" note="A function squeezes the score between 0 and 1.">0.608</value>
</trace>

The function that turns 0.438 into 0.608 is the **sigmoid**.

<concept term="Sigmoid">
<define>A function that squeezes any number into a value between 0 and 1.</define>
<analogy>A dimmer switch: however far you turn the knob, the light stays between off and full.</analogy>
<formula>\sigma(z) = \frac{1}{1 + e^{-z}}</formula>
</concept>

<plot title="A score just above 0 gives just over one half" x="score" y="probability of positive" arc="contrast">
<curve fn="sigmoid" />
<mark x="0.438" label="our review">A score of 0.438 is not a probability: on the curve it becomes 0.608, a little above one half.</mark>
</plot>

<derive title="0.438 becomes 0.608" arc="answer">
<line note="The definition.">\sigma(z) = \frac{1}{1 + e^{-z}}</line>
<line note="Our review's score, as the notebook prints it.">\sigma(0.438) = \frac{1}{1 + e^{-0.438}}</line>
<line note="The probability the notebook prints.">\sigma(0.438) = 0.608</line>
</derive>

<quiz question="A review gets a score of 0. What probability does the model give it?">
<option correct="true" why="The sigmoid of 0 is exactly one half: the model cannot decide.">0.5</option>
<option why="A probability of 0 needs a very negative score.">0</option>
</quiz>

<chapter title="Review" goal="Answer what a reviewer would ask about this model." />

<quiz question="Why does the model turn a score into a probability?">
<answer>A score can be any number; the sigmoid squeezes it between 0 and 1, so 0.438 reads as a 0.608 chance of positive.</answer>
</quiz>

<quiz question="What does a probability of 0.5 mean?">
<answer>The score was 0: the model leans neither way.</answer>
</quiz>

<quiz question="Where does every number of this lesson come from?">
<answer>From what the notebook printed: the score 0.438 and the probability 0.608 are its outputs.</answer>
</quiz>
```

A whole lesson opens with this map and repeats the middle chapter once per section of the notebook, each with its `stage` and its `<quiz>`, and ends with the review: 5–8 flashcards. Every number in a lesson comes from a notebook output (the rules are in `SKILL.md`, "Lessons").

## Template: a physical thing, drawn

A `<figure>` places a few shapes on a grid 100 wide and 60 high (`size="W H"` changes it): `<circle x y r>`, `<box x y w h>` (from its top-left corner), `<arrow points="x y x y …">` (a ray, a path, a push; `head="none"` for a plain line, `dashed="yes"`), `<angle at from to>` (the angle at `at` between the directions to `from` and to `to`), `<zone points>` (a shaded area) and `<label x y>words</label>`. Each takes a short `label` (up to 60 characters; the viewer places it beside the shape, clear of other labels) and a `color` (`ink`, `red`, `orange`, `yellow`, `green`, `blue`, `violet`, `gray`). x grows to the right and y downwards. Shapes in no `<show>` are the setting, there from the start; each `<show items="ids">` adds its shapes in the next part, with a one-sentence narration that Present shows as the subtitle. Place shapes against each other instead of computing numbers (F33): any point may be a place on a shape declared before it, `gota.left`, `.right`, `.top`, `.bottom`, `.center`, a box's corners `.top-left`…, an arrow's `.start`, `.middle`, `.end`, or a point of a circle's edge `gota@200` (degrees: 0 to the right, 90 down). A ray then touches the drop, and `<normal at="gota@239.5" />` draws the normal there, dashed, the line that optics measures every angle from. The picture must be true: the server warns when an arrow stops just short of a shape, when an angle labelled 42° is drawn at another angle, and when a shape hides another one's label.

```xml
<figure title="La gota separa la luz y la devuelve a tu ojo" arc="answer">
<circle id="gota" x="60" y="24" r="14" color="blue" />
<label x="84" y="8" color="blue">Gota de lluvia</label>
<icon id="sol" kind="sun" x="6" y="12" size="8" color="orange" label="Sol" />
<icon id="ojo" kind="eye" x="43.6" y="55.1" size="5" label="Tu ojo" />
<arrow id="luz" points="sol.right gota@239.5" label="Luz blanca" />
<normal id="normal" at="gota@239.5" label="Normal" />
<arrow id="dentro" points="gota@239.5 gota@338.8" color="gray" label="Se desvía" />
<arrow id="rebote" points="gota@338.8 gota@78.1" color="gray" label="Rebota" />
<normal id="normal2" at="gota@78.1" />
<arrow id="rojo" points="gota@78.1 ojo.top-right" color="red" />
<arrow id="violeta" points="gota@80.5 53.2 45.6" color="violet" />
<arrow id="linea" points="ojo.right 95 55.1" head="none" dashed="yes" color="gray" label="Dirección de la luz" />
<angle id="angulo" at="ojo.center" from="95 55.1" to="gota@78.1" color="red" label="42°" />
<show items="sol luz">La luz blanca del Sol llega a la gota.</show>
<show items="normal dentro">Al entrar, el agua la desvía respecto a la normal, cada color un poco distinto.</show>
<show items="rebote">El fondo de la gota la refleja hacia delante.</show>
<show items="normal2 rojo violeta">Al salir se desvía otra vez: el rojo más abierto, el violeta más cerrado.</show>
<show items="ojo linea angulo">Tu ojo recibe el rojo de las gotas que están a 42° de la dirección de la luz.</show>
</figure>
```

A show also changes what is already drawn, as it changes in reality: `move="car: 47 30 47 2"` (the shape travels through the points), `set="light: green"`, `hide="ids"`, `pulse="ids"` (a sensor firing) and `flow="arrow"` (a dot travels along the arrow: a call, a ray, a current); `ask` makes the reader predict the show first. A traffic light changing is one shape whose color is `set`, not a new circle; a car crossing is one shape that moves:

```xml
<figure title="La espira avisa al controlador y este le da el verde" arc="answer">
<zone points="0 24 100 24 100 36 0 36" color="gray" label="Avenida" />
<zone points="44 36 56 36 56 60 44 60" color="gray" />
<box id="espira" x="45" y="43" w="10" h="5" color="orange" label="Espira" />
<icon id="coche" kind="car" x="50" y="54" size="8" color="blue" label="Lucía" />
<icon id="lateral" kind="signal" x="63" y="40" size="7" color="red" label="Su semáforo" />
<icon id="avenida" kind="signal" x="36" y="17" size="7" color="green" label="Semáforo de la avenida" />
<box id="controlador" x="76" y="44" w="18" h="9" color="gray" label="Controlador" />
<arrow id="aviso" points="espira.right controlador.left" color="orange" dashed="yes" />
<arrow id="orden" points="controlador.top-left lateral.right" color="gray" dashed="yes" />
<show move="coche: 50 45.5">Lucía para en la calle lateral, justo encima de la espira.</show>
<show items="aviso" pulse="espira" flow="aviso">La espira nota el metal del coche y avisa al controlador.</show>
<show set="avenida: yellow" ask="Nadie viene por la avenida. ¿Qué hace el controlador?">Nadie espera en la avenida: el controlador le pasa el amarillo.</show>
<show items="orden" flow="orden" set="avenida: red; lateral: green">Avenida en rojo y verde para Lucía: 5 segundos en vez de 60.</show>
<show move="coche: 50 30 50 4">Lucía cruza; el controlador vuelve a mirar la espira.</show>
</figure>
```

Draw recognizable things with an `<icon>` (F34) rather than a circle that stands for them: `sun`, `eye`, `person`, `car`, `drop`, `house`, `tree`, `signal` (it lights the lamp of its color), `battery`, `magnet`, `cloud`, `factory`, `phone`, `server`, `coin`, `heart`, `leaf`, `bulb`, `clock`, `lock`. Draw what is round as it is with an `<arc>` (a rainbow's bow is six arcs around the shadow of your head, red outside), and a length with a `<measure>` (`<measure from="a.right" to="b.left">80 m</measure>`).

Keep a figure to what explains: 5–20 shapes, 2–6 `<show>`s, labels of one to four words (the viewer places them clear of the drawing, with a leader when they must sit away), and a `desc` on each part a reader will click to ask what it is. Each part lights what it changes and dims the rest, so one show changes one thing. A scene about a physical thing usually has one figure as its `answer`, after the example and the concept it needs.

## LaTeX

Formulas are drawn by KaTeX and checked by `render_scene`. A formula never comes alone: first the idea in words or a `<concept>`, then the formula, then a worked example or a `<derive>` with real numbers.

| Where | Write |
|---|---|
| Inside a sentence | `$\sigma(z) = \frac{1}{1+e^{-z}}$` |
| On its own, centered | a line `$$`, the formula, a line `$$` |
| In `<formula>` and `<line>` | the LaTeX alone, without `$` |
| Money in prose | `$5` stays text; `\$` is a literal dollar |

| To show | Write |
|---|---|
| a fraction | `\frac{a}{b}` |
| an index, a power | `x_i`, `x^{2}`, `e^{-z}` |
| a sum over n items | `\sum_{i=1}^{n} x_i` |
| a prediction, an average | `\hat{y}`, `\bar{x}` |
| Greek letters | `\sigma`, `\theta`, `\alpha`, `\beta`, `\lambda`, `\mu` |
| times, about, at most, at least | `\cdot`, `\approx`, `\le`, `\ge` |
| a word inside the formula | `\text{precision}` |
| a logarithm, a square root | `\log(x)`, `\sqrt{x}` |
| a vector | `\mathbf{w}` |
| less than, inside any tag | `\lt` (a bare `<` starts a tag) |
| a bar inside a Markdown table cell | `\vert` |

- In a `<derive>`, change one thing per line and write each symbol the same way on every line, so the viewer can glide it.
- Give every symbol a meaning in words the first time: "where $z$ is the review's score".
- When `render_scene` quotes a KaTeX error, fix that formula only and render again.

## Bad → good

| Instead of | Write |
|---|---|
| Title "Weights" | title "Only *bad* pulls towards negative" |
| A paragraph defining a term | a `<concept>` with an analogy and a tiny example |
| A paragraph describing how a value changes | a `<trace>` whose values change form |
| 5 bullets of steps | a `<flow>`, `<journey>` or `<timeline>` |
| "A is faster, B is cheaper, A is simpler…" | a `<compare>` with a `winner` per row |
| A formula on its own | words → `<concept>` with `<formula>` → `<derive>` with real numbers |
| A table of numbers in prose | a `<chart>`, or a `<matrix>` with `<focus>` on what matters |
| A chapter of prose and a quiz | the same chapter with its component first, then the quiz |
| Label `validateCredentials()` | label "Checks the password", `desc` with the detail, `ref` to the code |

## Checklist before you answer

- The scene opens with a `#` question of at most 12 words, then a `<brief>` whose six fields are concrete, then a `<theme>`.
- One slide corrects the brief's misconception in its own words (`arc="contrast"`), and a `<quiz>` with options asks its check.
- Every component has its `arc`; the brief's example comes first, before any idea or answer, and the scene ends on a check or a recap.
- Every term of the brief has its `<concept>` before any slide uses it, and every acronym is spelled out the first time.
- Every idea and every chapter has a component; every component's `title` is its point, in at most 12 words.
- One `<trace>` follows a real example through the whole process, from the real input to the real output.
- Every technical term is introduced once by a `<concept>` with an analogy (or replaced by plain words for a non-technical audience).
- Each formula has words before it and an example or real numbers after it.
- The page reads well alone: prose and narration around every component.
- Every step, stage, event, mark and trace value has a one-sentence narration or note of about 20 words: Present shows it as the subtitle.
- Every box has a `desc` that says what it does, and a code diagram has 1–4 `<code>` blocks. Outside software, boxes take an everyday `kind` (`person`, `object`, `place`, `signal`, `step`), and a physical thing is drawn as a `<figure>`.
- In a lesson, every chapter has a `goal` and a `<quiz>`, and the last chapter is a review of 5–8 flashcards.
- For a whole process: a `<journey>` map in the intro and one chapter per stop with `stage`, the same example in each.
- Every number comes from the code or its outputs.
- `render_scene` answered "No warnings".
- The scene text is in the user's language.
