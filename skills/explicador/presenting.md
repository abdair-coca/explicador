# Presenting: one picture per slide, with subtitles

Every scene is two things. The **page** explains in full, for someone reading alone: prose, narration, notes. **Present** is a video the reader steps through: the title as the cover, then one component per slide, each saying one short sentence, its `title`, while the narration of the part on screen shows as a **subtitle** under it. Prose paragraphs never reach the slides; a speaker turns the subtitles off with S. Tag syntax: "EXL in short" in `SKILL.md` and `docs/EXL.md` in the plugin; lesson rules: "Lessons" in `SKILL.md`.

## What Present shows

- **The cover**: the `#` title at the top of the scene, alone and large. Then chapter cards and components, in order.
- **One slide per component**, its pieces arriving one per click: flow steps (every `<step>`, with or without `to`), journey stages, trace values, concept pieces, plot marks, derivation lines, comparison rows, timeline events, calc parts, matrix highlights, scatter classes.
- **On the slide**: titles, labels, values, boxes, arrows, bars, numbers, concept cards and quizzes.
- **As the subtitle of each part**: the narration of flow and walk steps, journey stages, timeline events and plot marks; the `note` of trace values, derivation lines and calc parts; the narration of matrix highlights; the narration of a `<space>`'s query, chosen cluster and compared items.
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

1. **The question.** Start with a `#` title that is the question the scene answers ("What happens when you log in?"), then `<theme>`. Done when the title has at most 12 words.
2. **The ideas.** List for yourself 3 to 7 ideas, each one sentence. Done when each one could be a slide.
3. **A component per idea.** Pick it from the table below. Done when every idea, and every chapter, has its component.
4. **One example through everything.** Pick one real input and follow it with a `<trace>` through the whole process, changing form at each step: the raw input as `text`, then `list`, `table`, `bars`, `number`. Done when its first value is the real input, its last one the real output, and every value comes from the code or its outputs. In `table` and `bars`, each item's name is what the slide shows and what glides from step to step, so keep the same names along the trace; a `number` is one value, so show a sum as `bars` of its parts, then its total as a `number`. The `label` and `code` of a value show on the slide, and its `note` as the subtitle of its step.
5. **Titles that say the point.** Each component's `title` is the takeaway as a claim of at most 12 words: "Only *bad* pulls towards negative", not "Weights". Done when a slide says its point with the title alone.
6. **The page and the subtitles.** Around each component, write for a reader alone: 1–3 short paragraphs. Give every step, stage, event, mark and value its narration or `note`: one sentence of about 20 words (the server warns above 25), with the real number when there is one, that says what this part shows. Done when the page makes sense without a speaker, and Present makes sense with the subtitles alone.
7. **Render.** Call `render_scene`. Fix every `EXL errors` line; then every `Warning:` line, and render again. Done when it answers "No warnings". The warnings are the server checking this guide's rules: a cover and a theme, a component per chapter, short titles and subtitles, a `desc` on every box, key `<code>` in code diagrams, a `<journey>` map, a check per chapter and a final review in lessons, one `<trace>` and a `<concept>` in a lesson, chapters instead of `##` sections, whys that do not open with a verdict, and numbers the notebook printed. Each tag's exact attributes and nesting (`<field>` inside `<entity>`, `<concept>` takes only `term`, `id` and `ref`) are in "EXL in short" in `SKILL.md`; when `render_scene` says `Unknown attribute`, it lists the allowed ones.
8. **Check** against the checklist at the end. Done when every line is true.

## Which component for which question

| The reader asks | Use | On the slide |
|---|---|---|
| How does one real example change along the whole process? | `<trace>` with `kind` per value | the same example changes form; surviving pieces glide to their new place |
| What are the parts and how do they connect? | `<arch>` (`<group>` for many parts) | boxes appear, then the arrows |
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

A list of more than 3 bullets is almost always one of these: steps in order → `<flow>` or `<timeline>`; pros and cons → `<compare>`; parts → `<arch>`; quantities → `<chart>`; one thing being transformed → `<trace>`.

## Template: explaining code

```exl
# What happens when you log in?

<theme name="security" />

When you log in, the shop never stores or compares your password as you typed it. It keeps a **hash**, and compares hashes.

<concept term="Password hash">
<define>A scrambled version of the password that cannot be turned back into it.</define>
<analogy>Like a fingerprint: it proves who you are, but nobody can rebuild your hand from it.</analogy>
</concept>

<arch title="Four parts take part in a login">
  <node id="you" label="You" desc="Type your email and password" kind="actor" />
  <node id="page" label="Login page" desc="Sends what you typed" kind="ui" ref="src/ui/login-page.js:4-15" />
  <node id="check" label="Password check" desc="Compares hashes, never passwords" kind="function" ref="src/auth/password.js:14-19" />
  <node id="list" label="List of users" desc="Keeps each user's hash" kind="store" ref="src/db/users.js:2-10" />
  <edge from="you" to="page" label="email + password" />
  <edge from="page" to="check" label="check this" />
  <edge from="check" to="list" label="find the hash" />
  <code node="check" ref="src/auth/password.js:14-19">The comparison takes the same time whether the hashes match or not, so timing gives nothing away.</code>
</arch>

The password travels once, then only its hash is compared.

<trace title="Your password never travels as itself">
<value label="What you type">ana@shop.com hunter2</value>
<value kind="table" label="What the page sends" code="JSON.stringify({ email, password })">email=ana@shop.com|password=hunter2</value>
<value kind="table" label="What the check compares" code="scrypt(password, salt)">email=ana@shop.com|hash=9f2c…e71a</value>
<value kind="number" label="The answer">match</value>
</trace>

<flow title="A match gives you a pass for one hour">
  <node id="page" label="Login page" desc="Sends what you typed" kind="ui" ref="src/ui/login-page.js:4-15" />
  <node id="check" label="Password check" desc="Compares hashes, never passwords" kind="function" ref="src/auth/password.js:14-19" />
  <step from="page" to="check" label="email + password" ref="src/ui/login-page.js:9-12">The page sends what you typed, once, over a secure connection.</step>
  <step from="check" label="compare hashes" ref="src/auth/password.js:14-19">It hashes what you typed the same way and compares it with the stored hash.</step>
  <step from="check" to="page" kind="return" label="pass for one hour" ref="src/auth/sessions.js:7-11">If they match, your browser gets a pass that keeps you logged in for one hour.</step>
</flow>

> [!TIP]
> This is why the shop can never email you your password: it does not have it.

<quiz question="Why can't the shop send you your password?">
<option why="It could store it; it chooses not to.">It forgot it</option>
<option correct="true" why="It only keeps a hash, and a hash cannot be turned back into the password.">It only keeps a hash</option>
</quiz>
```

With your project's code, every value of the trace comes from the code or a log, every node and step gets a `ref` with a real line range (check the numbers), every box a `desc`, and 1–4 `<code>` blocks open on click.

## Template: a lesson chapter

```exl
# Can a model tell a good review from a bad one?

<theme name="ml" />

<journey title="A review becomes a verdict in three steps">
<stage id="review" label="Review" value="1 review" kind="text">The review, as its author wrote it.</stage>
<stage id="score" label="Score" value="0.438" kind="model" op="decision_function()">The model adds up what each word weighs.</stage>
<stage id="probability" label="Probability" value="0.608" kind="metric" op="predict_proba()">The sigmoid turns the score into a probability.</stage>
</journey>

<chapter title="A score becomes a probability" goal="Read a score as a probability between 0 and 1." stage="probability" />

The model gives each review a **score**, which can be any number. The **sigmoid** turns it into a probability.

<concept term="Sigmoid">
<define>A function that squeezes any number into a value between 0 and 1.</define>
<analogy>A dimmer switch: however far you turn the knob, the light stays between off and full.</analogy>
<formula>\sigma(z) = \frac{1}{1 + e^{-z}}</formula>
</concept>

<plot title="A score just above 0 gives just over one half" x="score" y="probability of positive">
<curve fn="sigmoid" />
<mark x="0.438" label="our review">A score a little above 0 becomes a probability a little above one half.</mark>
</plot>

<trace title="Our review becomes 0.608">
<value label="The review">a great film, really great</value>
<value kind="number" label="Its score" code="model.decision_function(X)" note="Above 0, so it leans positive.">0.438</value>
<value kind="number" label="Its probability" code="model.predict_proba(X)[:, 1]" note="The sigmoid turns the score into a probability.">0.608</value>
</trace>

<derive title="0.438 becomes 0.608">
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

- The scene opens with a `#` question of at most 12 words, then a `<theme>`.
- Every idea and every chapter has a component; every component's `title` is its point, in at most 12 words.
- One `<trace>` follows a real example through the whole process, from the real input to the real output.
- Every technical term is introduced once by a `<concept>` with an analogy (or replaced by plain words for a non-technical audience).
- Each formula has words before it and an example or real numbers after it.
- The page reads well alone: prose and narration around every component.
- Every step, stage, event, mark and trace value has a one-sentence narration or note of about 20 words: Present shows it as the subtitle.
- Every box has a `desc` that says what it does, and a code diagram has 1–4 `<code>` blocks.
- In a lesson, every chapter has a `goal` and a `<quiz>`, and the last chapter is a review of 5–8 flashcards.
- For a whole process: a `<journey>` map in the intro and one chapter per stop with `stage`, the same example in each.
- Every number comes from the code or its outputs.
- `render_scene` answered "No warnings".
- The scene text is in the user's language.
