# Presenting: every slide a picture, for anyone

Every scene is also a presentation: the viewer's **Present** button turns it into slides. Write every scene, code or lesson, so that a person with no technical background understands it from the slides alone. Tag syntax: `docs/EXL.md` in the plugin; lesson rules: "Lessons" in `SKILL.md`.

## How the slides are cut

- Each tag is one slide, and its pieces arrive one per click: flow steps (every `<step>`, with or without `to`; a step without `to` lights its box and shows its narration), journey stages, trace values, concept pieces, plot marks, derivation lines, comparison rows, timeline events, calc parts, matrix highlights.
- **A picture** is every tag except `<chapter>`, `<quiz>` and `<theme>`. A quiz checks the picture before it; it never replaces it.
- Each Markdown block (the prose between two tags) is one slide of **text alone**. So prose is only the short caption that leads into the next picture.
- The explanation lives **inside** the visuals, where it shows large: step and stage narration, `note`s, `<mark>` and `<focus>` narration, the pieces of a `<concept>`, `<pair>` rows, `<event>` narration.
- The theme draws line art on every slide; it decorates, it does not explain. The pictures that explain are your tags.

## Audience

- By default the audience is **non-technical**: a manager, a client, a student on day one. Raise the level only when the user says the audience is technical ("for my team of engineers", "they know Python").
- Name things by what they do for a person: "Checks who you are", not `AuthService.login()`. Technical names go in `desc`, `ref`, `<code>` and the long descriptions, which open on click.
- A technical word the reader must learn appears on a slide only after a `<concept>` card introduced it, with an `<analogy>` from everyday life. Any other technical word becomes plain words ("word counts", not "BoW"; "share of right answers", not "accuracy").
- The cover (everything before the first chapter: title, `<stats>`, `<journey>`) uses plain words only; each technical name arrives in the chapter whose `<concept>` introduces it.
- Numbers come with a comparison a person feels: "5 of the 6 hidden reviews", "one hour, then you log in again".

## Recipe

1. **The question.** Write the `#` title as the question a non-technical person would ask ("What happens when you log in?"), then `<theme>`. Done when the title has no jargon.
2. **The ideas.** List for yourself 3 to 7 ideas, each one sentence in plain words. Done when a stranger could repeat each one.
3. **A picture per idea.** Pick a tag for each idea from the table below. Done when every idea has its tag, and no tag is there only to decorate.
4. **Write.** Follow the template that fits: a short caption (at most 3 short paragraphs, items or callouts), then the picture, then a 1-sentence takeaway or a `<quiz>`. Done when every caption sits right before or after a picture. Each tag's exact attributes and nesting (`<field>` inside `<entity>`, `<concept>` takes only `term`, `id` and `ref`) are in "EXL in short" in `SKILL.md`; when `render_scene` says `Unknown attribute`, it lists the allowed ones.
5. **Render.** Call `render_scene`. Fix every `EXL errors` line; then fix every `Warning:` line about slides and render again. Done when the result has no slide warnings.
6. **Check** against the checklist at the end. Done when every line is true.

## Which picture for which question

| The reader asks | Use | They can |
|---|---|---|
| What are the parts and how do they connect? | `<arch>` (`<group>` for many parts) | click a box for its panel, zoom into a group |
| What happens, step by step? | `<flow>` | play, pause and step; a token travels each arrow |
| What is stored, and how does it relate? | `<data>` | click a table |
| What states can it be in, and what moves it? | `<state>` with a `<walk>` | play the walk |
| What is this idea? | `<concept>` | read the term, then each piece arrives |
| How does the data change shape? | `<journey>` | step and click each stage |
| How was this one value transformed? | `<trace>` | step; changed words are marked |
| Which is bigger, what ranks first, how did it trend? | `<chart>` | switch to a table, replay |
| What is in this grid, where are the mistakes? | `<matrix>` | click each highlight; a confusion matrix explains its metrics |
| How did the model score this one case? | `<calc>` | step through each part |
| What if we moved the cut-off? | `<threshold>` | drag the slider and watch the errors change |
| Where does this number fall on the curve? | `<plot>` with `<mark>`s | (Present) a point travels to each mark |
| How do I get from the formula to the result? | `<derive>` | (Present) shared symbols glide line to line |
| How are the groups separated? | `<scatter>` | (Present) each group lands, the boundary is traced |
| Which of two options, and in what? | `<compare>` | (Present) row by row, then the tally |
| In what order did things happen? | `<timeline>` | (Present) the line reaches each event |
| Did I understand? | `<quiz>` | answer and read why |
| What are the key numbers? | `<stats>` | numbers count up |

A list of more than 3 bullets is almost always one of these: steps in order → `<flow>` or `<timeline>`; pros and cons → `<compare>`; parts → `<arch>`; quantities → `<chart>`. Use three or four different kinds in a scene; repeating one kind is fine, ten kinds is noise.

## Template: explaining code

```exl
# What happens when you log in?

<theme name="security" />

When you type your password, the shop checks it without ever storing it in plain text.

<concept term="Password hash">
<define>A scrambled version of the password that cannot be turned back into it.</define>
<analogy>Like a fingerprint: it proves who you are, but nobody can rebuild your hand from it.</analogy>
</concept>

<arch title="The parts that take part">
  <node id="you" label="You" desc="Type your email and password" kind="actor" />
  <node id="page" label="Login page" desc="Sends what you typed" kind="ui" />
  <node id="check" label="Password check" desc="Compares fingerprints, never passwords" kind="function" />
  <node id="list" label="List of users" desc="Keeps each user's fingerprint" kind="store" />
  <edge from="you" to="page" label="email + password" />
  <edge from="page" to="check" label="check this" />
  <edge from="check" to="list" label="find the fingerprint" />
</arch>

<flow title="Logging in, step by step">
  <node id="page" label="Login page" kind="ui" />
  <node id="check" label="Password check" kind="function" />
  <step from="page" to="check" label="email + password">The page sends what you typed, once, over a secure connection.</step>
  <step from="check" label="compare">It scrambles what you typed the same way and compares the two fingerprints.</step>
  <step from="check" to="page" kind="return" label="pass for one hour">If they match, your browser gets a pass that keeps you logged in for one hour.</step>
</flow>

> [!TIP]
> This is why the shop can never email you your password: it does not have it.

<quiz question="Why can't the shop send you your password?">
<option why="It could store it; it chooses not to.">It forgot it</option>
<option correct="true" why="It only keeps a fingerprint, and a fingerprint cannot be turned back into the password.">It only keeps a scrambled version</option>
</quiz>
```

With real code, add `ref` (with line ranges) to every node and step, and 1–4 `<code>` blocks: they open on click and never crowd a slide.

## Template: a lesson chapter

```exl
# Can a model tell a good review from a bad one?

<theme name="ml" />

<chapter title="How sure is the model?" goal="Read a score as a probability between 0 and 1." />

The model gives each review a score. A score can be any number, so one last step turns it into a chance.

<concept term="Sigmoid">
<define>A function that squeezes any number into a value between 0 and 1.</define>
<analogy>A dimmer switch: no matter how far you turn the knob, the light stays between off and full.</analogy>
<formula>\sigma(z) = \frac{1}{1 + e^{-z}}</formula>
</concept>

<plot title="Our review on the curve" x="score" y="chance of positive">
<curve fn="sigmoid" />
<mark x="0.438" label="our review">A score a little above 0 becomes a chance a little above half.</mark>
</plot>

<derive title="From score to chance">
<line note="The definition.">\sigma(z) = \frac{1}{1 + e^{-z}}</line>
<line note="Our review's score, as the notebook prints it.">\sigma(0.438) = \frac{1}{1 + e^{-0.438}}</line>
<line note="The chance the notebook prints.">\sigma(0.438) = 0.608</line>
</derive>

<quiz question="A review gets a score of 0. What chance does the model give it?">
<option correct="true" why="The sigmoid of 0 is exactly one half: the model cannot decide.">0.5</option>
<option why="A chance of 0 needs a very negative score.">0</option>
</quiz>
```

Every number in a lesson comes from a notebook output (the rules are in `SKILL.md`, "Lessons").

## LaTeX

Formulas are drawn by KaTeX and checked by `render_scene`. For a non-technical reader a formula never comes alone: first the idea in words or a `<concept>`, then the formula, then a worked example or a `<derive>` with real numbers.

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
| A paragraph defining a term | a `<concept>` with an analogy and a tiny example |
| 5 bullets of steps | a `<flow>`, `<journey>` or `<timeline>` |
| "A is faster, B is cheaper, A is simpler…" | a `<compare>` with a `winner` per row |
| A formula on its own | words → `<concept>` with `<formula>` → `<derive>` with real numbers |
| A table of numbers in prose | a `<chart>`, or a `<matrix>` with `<focus>` on what matters |
| Label `validateCredentials()` | label "Checks the password", `desc` with the detail, `ref` to the code |
| Narration "Calls the service" | "Asks the server whether this password is right, so nobody gets in by guessing" |

## Checklist before you answer

- The title is a question a non-technical person would ask, and a `<theme>` follows it.
- Every idea has a picture; no Markdown block holds more than 3 paragraphs, items or callouts, and each one sits right before or after a picture.
- Every technical word on a slide was introduced by a `<concept>` with an analogy.
- Labels say what things do; code names live in `desc`, `ref` and `<code>`.
- Each formula has words before it and an example or real numbers after it.
- Every number comes from the code or its outputs.
- `render_scene` returned no slide warnings.
- The scene text is in the user's language.
