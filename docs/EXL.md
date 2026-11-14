# EXL: Explicador scene format

EXL is what the agent writes to show a scene: Markdown plus a closed catalog of JSX-like tags. There is no embedded JavaScript, no expressions and no raw HTML. The MCP server parses and validates it (`server/src/parser/`) before anything is cached or shown.

## Document

- Anything that is not a scene tag is Markdown and appears as prose in the viewer, in order.
- A scene tag starts at the beginning of a line (up to 3 spaces of indentation) outside code fences. Tags inside fenced code blocks, inline in a sentence, or autolinks such as `<https://…>` stay Markdown.
- Top-level tags: `<arch>`, `<flow>`, `<data>` and `<state>`, and for lessons and deep dives `<chapter>`, `<stats>`, `<journey>`, `<trace>`, `<chart>`, `<matrix>`, `<quiz>`, `<calc>`, `<threshold>`, `<concept>`, `<plot>`, `<derive>`, `<scatter>`, `<compare>`, `<timeline>`, `<space>`, `<cosine>`, `<structure>`, `<system>`, `<annotated>` and `<argument>`, plus `<theme>` and `<brief>`. A document needs at least one; `<theme>` only decorates and `<brief>` is never shown, so neither counts. Every top-level tag except `<theme>` and `<brief>` takes an optional `id`. Every component (every top-level tag except `<brief>`, `<theme>` and `<chapter>`) takes an optional `arc`: its part of the narrative (see "The arc").
- Every scene opens with a `<brief>` (see "The brief"): only Markdown, the `#` title, may come before it. The parser accepts a document without one, so scenes cached before it existed still open, but `render_scene` refuses to save it.
- Any other tag at the start of a line is an error (`<script>`, `<div>`, …), and so is a child tag outside a block.
- Attribute values are always quoted, with `"` or `'`. `attr={…}` is rejected. Entities `&amp; &lt; &gt; &quot; &apos;` are decoded.
- `<!-- comments -->` are allowed inside blocks.
- CRLF line endings are accepted.
- **Formulas** are LaTeX, drawn by KaTeX, wherever Markdown is: prose, lists, callouts, table cells, long descriptions, quiz questions, options, whys and answers.
  - `$…$` is inline math: `$\sigma(z) = \frac{1}{1+e^{-z}}$`. The opening `$` is followed by a non-space; the closing `$` follows a non-space and is not followed by a digit, so "$5 and $10" stay text. `\$` is a literal dollar.
  - A line starting with `$$` opens a display block that runs to the next `$$`. `$$…$$` inside a line draws full-size fractions and sums in the text.
  - Formulas are never read inside code spans or code fences.
  - Inside a tag (an attribute or a body) write `<` as `\lt` or `&lt;`, because `<` starts a tag there. In a table cell write `|` as `\vert`.
  - `render_scene` refuses a formula KaTeX cannot parse and quotes it with KaTeX's message.

## Tags

| Tag | Attributes | Content |
|---|---|---|
| `<arch>` | `title` (required), `id` | `<node>`, `<group>`, `<edge>`, `<drill>`, `<code>` |
| `<flow>` | `title` (required), `id` | `<node>`, `<step>`, `<drill>`, `<code>` |
| `<group>` | `id`, `label` (required), `desc`, `kind` | `<node>` and nested `<group>`, only in `<arch>` |
| `<node>` | `id`, `label` (required), `desc`, `kind`, `ref` | optional text: the long description (or self-closing) |
| `<edge>` | `from`, `to` (required), `label`, `kind` | none (self-closing), only in `<arch>` |
| `<step>` | `from` (required), `to`, `label`, `kind`, `ref` | narration text (required), only in `<flow>` |
| `<drill>` | `node`, `topic` (required) | none (self-closing) |
| `<code>` | `node`, `ref` (required) | why these lines matter (required); in any block |
| `<data>` | `title` (required), `id` | `<entity>`, `<relation>`, `<drill>`, `<code>` |
| `<entity>` | `id`, `label` (required), `desc`, `ref` | `<field>` rows and optional text, the long description (may be empty or self-closing) |
| `<field>` | `name` (required), `type`, `key` | none (self-closing) |
| `<relation>` | `from`, `to`, `card` (required), `label` | none (self-closing) |
| `<state>` | `title` (required), `id` | `<status>`, `<transition>`, one `<walk>`, `<drill>`, `<code>` |
| `<status>` | `id`, `label` (required), `desc`, `role`, `ref` | optional text: the long description (or self-closing) |
| `<transition>` | `from`, `to`, `event` (required), `ref` | none (self-closing) |
| `<walk>` | none | `<go>` steps |
| `<go>` | `event` (required) | narration text (required) |
| `<chapter>` | `title` (required), `id`, `goal`, `ref`, `theme`, `stage` | none (self-closing); the chapter runs until the next one |
| `<stats>` | `id`, `title` | 1–6 `<stat>` |
| `<stat>` | `value`, `label` (required), `ref` | none (self-closing) |
| `<journey>` | `title` (required), `id` | 2–12 `<stage>`, `<drill>`, `<code>` |
| `<stage>` | `id`, `label` (required), `value`, `kind`, `op`, `ref` | narration text (required) |
| `<trace>` | `title` (required), `id`, `ref` | 2–12 `<value>` |
| `<value>` | `label` (required), `kind`, `code`, `note`, `dims`, `ref` | the value as text, or its items (required) |
| `<chart>` | `title`, `type` (required), `id`, `series`, `unit`, `highlight`, `ref` | 1–40 `<row>` |
| `<matrix>` | `title`, `cols` (required), `id`, `kind`, `corner`, `positive`, `ref` | 1–12 `<row>`, up to 8 `<focus>` |
| `<row>` | `label`, `values` (required) | none (self-closing), in `<chart>` and `<matrix>` |
| `<focus>` | `label`, `cells`, `metric` | narration text, only in `<matrix>` |
| `<quiz>` | `question` (required), `id` | 2–5 `<option>`, or one `<answer>` |
| `<option>` | `correct`, `why` | the option's text (required) |
| `<answer>` | none | the flashcard's answer, Markdown (required) |
| `<calc>` | `title` (required), `id`, `kind`, `total`, `classes`, `threshold`, `ref` | 2–24 `<part>` |
| `<part>` | `label`, `value` (required), `note`, `ref` | none (self-closing), only in `<calc>` |
| `<threshold>` | `title` (required), `id`, `classes`, `at`, `ref` | 2–200 `<point>` |
| `<point>` | `score`, `actual` (required), `label` | none (self-closing), only in `<threshold>` |
| `<plot>` | `title` (required), `id`, `x`, `y`, `from`, `to`, `ref` | 1–4 `<curve>`, 0–8 `<mark>` |
| `<curve>` | `fn` or `points` (one of them), `label`, and the function's parameters: `slope`, `intercept` (linear), `a`, `b`, `c` (quadratic), `rate` (exp), `mean`, `std` (gaussian) | none (self-closing), only in `<plot>` |
| `<mark>` | `x`, `label` (required), `curve` | optional narration, only in `<plot>` |
| `<scatter>` | `title`, `classes` (required), `id`, `x`, `y`, `ref` | 2–300 `<dot>`, at most one `<boundary>` |
| `<dot>` | `x`, `y`, `class` (required), `label` | none (self-closing), only in `<scatter>` |
| `<boundary>` | `slope`, `intercept` and `above`, or `points` | none (self-closing), only in `<scatter>` |
| `<compare>` | `title`, `a`, `b` (required), `id`, `ref` | 2–8 `<pair>` |
| `<pair>` | `label`, `a`, `b` (required), `winner` | none (self-closing), only in `<compare>` |
| `<timeline>` | `title` (required), `id`, `ref` | 2–12 `<event>` |
| `<event>` | `label` (required), `when`, `ref` | narration (required), only in `<timeline>` |
| `<derive>` | `title` (required), `id`, `ref` | 2–8 `<line>` |
| `<line>` | `note` | LaTeX without `$` (required), only in `<derive>` |
| `<space>` | `title` (required), `id`, `x`, `y`, `k`, `dims`, `ref` | 2–40 `<item>`, at most one `<query>`, none or 2–8 `<cluster>` |
| `<item>` | `id`, `label`, `x`, `y` (required), `cluster`, `score` | optional narration, only in `<space>` |
| `<query>` | `label`, `x`, `y` (required), `cluster` | optional narration, only in `<space>` |
| `<cluster>` | `id`, `label`, `x`, `y` (required) | optional narration, only in `<space>` |
| `<cosine>` | `title`, `a`, `b` (required), `id`, `dims`, `score`, `ref` | 2–12 `<dim>` |
| `<dim>` | `a`, `b` (required), `label` | none (self-closing), only in `<cosine>` |
| `<structure>` | `title` (required), `id`, `direction`, `ref` | 1–40 `<member>`, up to 20 `<change>` |
| `<member>` | `id`, `label` (required), `parent`, `side`, `desc`, `ref` | none (self-closing), only in `<structure>` |
| `<change>` | `label` (required), `add`, `remove`, `move`, `mark` | narration (required), only in `<structure>` |
| `<system>` | `title` (required), `id`, `ref` | 2–12 `<factor>`, 1–30 `<link>`, `<loop>` names, then up to 20 `<push>` and `<effect>` steps |
| `<factor>` | `id`, `label` (required), `desc`, `ref` | none (self-closing), only in `<system>` |
| `<link>` | `from`, `to`, `sign` (required), `label` | none (self-closing), only in `<system>` |
| `<loop>` | `through`, `label` (required) | none (self-closing), only in `<system>` |
| `<push>` | `factor`, `change` (required) | narration (required), only in `<system>` |
| `<effect>` | `from`, `to` (required) | narration (required), only in `<system>` |
| `<annotated>` | `title` (required), `id`, `ref` | one `<passage>`, 1–12 `<note>` |
| `<passage>` | none | the text as written, line breaks kept (required), only in `<annotated>` |
| `<note>` | `quote` (required), `label` | narration (required), only in `<annotated>` |
| `<argument>` | `title` (required), `id`, `ref` | one `<claim>` first, 1–8 `<support>` and `<objection>`, an optional `<verdict>` last |
| `<claim>`, `<verdict>` | none | one line (required), only in `<argument>` |
| `<support>` | `label` (required) | narration (required), only in `<argument>` |
| `<objection>` | `label` (required), `reply` | narration (required), only in `<argument>` |
| `<theme>` | `name` (required), `accent` | none (self-closing), top level, once, before every other tag but `<brief>` |
| `<concept>` | `term` (required), `id`, `ref` | `<define>` (required), `<analogy>`, `<formula>`, `<example>`, each at most once |
| `<define>`, `<analogy>` | none | the text, inline Markdown (required), only in `<concept>` |
| `<formula>` | none | LaTeX without `$` (required), only in `<concept>` |
| `<example>` | none | in `<concept>`: Markdown, line breaks kept (required); in `<brief>`: one line with concrete data |
| `<brief>` | `form` (required) | `<audience>`, `<question>`, `<example>`, `<misconception>`, `<check>` and `<terms>`, each exactly once; top level, before every other tag, never shown |
| `<audience>`, `<question>`, `<misconception>`, `<check>` | none | one line of text (required), at most 300 characters, only in `<brief>` |
| `<terms>` | none | 1–12 terms separated by commas, each at most 60 characters, only in `<brief>` |

- `id`: starts with a letter, then letters, digits, `-` or `_`, up to 40 characters. Node ids are unique within their block and block ids within the document. A missing block id becomes `arch-1`, `flow-2`, … (by position).
- `kind`: `actor`, `ui`, `service`, `module`, `function`, `store` or `external`; default `module`.
- `title`, `label`: one line, not empty. Titles up to 120 characters, labels up to 80.
- `desc`: optional, one line of up to 80 characters saying what the part does ("Checks the password hash"). The viewer shows it inside the box, under the label, wrapped to at most three lines.
- Long description: the text inside `<node>`, `<entity>` or `<status>`, up to 1200 characters. It is Markdown (`**bold**`, `` `code` ``, lists); blank lines separate paragraphs, other whitespace collapses; no tags. The detail panel shows it.
- `<code node ref>`: key lines for a node, entity or state of the same block. `ref` must be a line range (`path:start-end` or `path:line`) of at most 40 lines; the text says why these lines matter (up to 300 characters). At most 3 per item. The server copies the lines from the file each time the scene is shown, so the agent never writes code into EXL; the file counts as a ref, so editing it marks the scene stale.
- `from` / `to`: ids of nodes declared in the same block. An `<edge>` may also name a `<group>`; a `<step>` only nodes. A `<step>` without `to` is an action inside `from`.
- `kind` on `<edge>` and `<step>` (not the node `kind`): `call` (default) when one part asks another, `return` when the answer comes back, `async` for a message nobody waits for (a queue, an event, a background job). A `return` step needs `to`.
- Continuity: in a `<flow>`, every step after the first starts at a node an earlier step already reached (as `from` or `to`). A step that starts anywhere else is an error naming the nodes in play; add the step that reaches that node first.
- Groups share the id namespace with nodes and need at least one node. Nodes inside a group still count as nodes of the block.
- `<drill node topic>`: `node` names a `<node>` (not a group) of the same block, at most one drill per node; `topic` is one line of up to 80 characters, the topic under which the deeper scene is explained and cached.
- Narration: plain text, whitespace collapsed, up to 600 characters. Write `&lt;` for a literal `<`.
- A section of a document: `path#Heading` (F28), for Markdown and text documents. The heading is written as in the document, with or without its number ("lease.md#3. Deposit" or "lease.md#Deposit", case and accents aside); the section runs from the heading to the line before the next heading of its level or higher, and headings inside code fences do not count. `render_scene` refuses a heading the document lacks and lists the ones it has; when the scene is shown or exported the server fills in the section's lines, so the code window opens it like a range, and the ref still follows the section when lines move. A section ref counts as a range for the whole-file warning. `<code>` still needs lines.
- `ref`: `path`, `path:line`, `path:start-end` or `path#Heading`. Relative to the project root, forward slashes, no `..`, and the file must exist when the scene is rendered. File names may contain spaces (`data/IMDB Dataset.csv:1-5`), not line breaks or tabs.
- `<field key>`: `pk`, `fk` or `unique`; `name` and `type` are one line of up to 60 characters; field names are unique within an entity; up to 40 fields.
- `<relation card>`: `1-1`, `1-n`, `n-1` or `n-n`; `from` and `to` name entities of the same `<data>`.
- `<status role>`: `initial` or `final`; exactly one state is `initial`. Transitions may loop on one state.
- `<walk>` starts at the initial state; each `<go event>` takes the one transition that leaves the current state on that event (none or several is an error) and moves to its target.
- In `<data>` and `<state>`, `<drill node>` names an entity or a state.
- Limits per block: 60 nodes and groups, 120 edges, 100 steps.

## The brief

Before designing, the model decides for whom the scene is, which question it answers and with which example. Every scene opens with that plan, right after its `#` title:

```exl
# Where does each value go in a search tree?

<brief form="structure">
<audience>Second-year engineering students; they know what a linked list is</audience>
<question>How does a binary search tree decide where each value goes, and what shape does it end up with?</question>
<example>Insert 50, 30, 70, 20 in that order</example>
<misconception>Believing the tree always stays balanced</misconception>
<check>Predict where 40 goes and whether the tree becomes full</check>
<terms>node, child, height (in levels), full tree, degenerate tree</terms>
</brief>

<theme name="code" />

<arch title="Smaller values go left, larger ones right" arc="example">
  <node id="n50" label="50" desc="The first value: the root" />
  <node id="n30" label="30" desc="Smaller than 50: left" />
  <node id="n70" label="70" desc="Larger than 50: right" />
  <edge from="n50" to="n30" label="left" />
  <edge from="n50" to="n70" label="right" />
</arch>
```

- `form` is the shape of the idea, which picks the picture: `structure` (parts and how they relate or change: a tree, an organization chart, an architecture), `process` (something goes through steps or states: a request, a law, a recipe), `quantity` (amounts, scale and how they change: interest, a funnel, metrics), `system` (causes and feedback: inflation, an ecosystem, a cache under load), `annotated` (a document, image or code read part by part: a lease, an interface), `argument` (a thesis with evidence and objections, or a decision with options and costs) or `timeline` (events in order: a history).
- `<audience>`: who reads it and what they already know. `<question>`: the one question the scene answers. `<example>`: the one concrete case followed from start to finish. `<misconception>`: the wrong idea the reader most likely brings, which the scene corrects. `<check>`: what the reader predicts or works out at the end. `<terms>`: the terms the reader meets, separated by commas. Their text is in the scene's language.
- Each field is required exactly once and is one line of at most 300 characters; `<terms>` holds 1–12 terms of at most 60 characters. The `<example>` must hold concrete data: a digit, a quoted literal (`"…"`, `«…»`, `` `…` ``) or a capitalized name after its first word that does not start a sentence ("Gutenberg", "Ana"). "Inserting some values" is refused.
- Each form is drawn by these components; `render_scene` warns when a scene has none of its form:

| Form (`<brief form>`) | The idea is… | Draw it with |
|---|---|---|
| `structure` | parts and how they relate or change | `<structure>`, `<arch>`, `<data>` |
| `process` | something going through steps or states | `<flow>`, `<state>`, `<journey>`, `<trace>`, `<timeline>` |
| `quantity` | amounts, scale and how they change | `<chart>`, `<calc>`, `<plot>`, `<stats>`, `<derive>`, `<matrix>`, `<threshold>`, `<scatter>`, `<space>`, `<cosine>` |
| `system` | causes and feedback | `<system>` |
| `annotated` | a document read part by part | `<annotated>` |
| `argument` | a thesis with reasons and objections, or a decision | `<argument>`, `<compare>` |
| `timeline` | events in order | `<timeline>`, `<journey>` |

- The brief is not a block: it travels as `scene.brief`, so the viewer, the slides, exports and the eval's scene text never show it.

## The arc

Every component says what it does for the brief's question with `arc`, one of:

| `arc` | The slide… |
|---|---|
| `question` | poses the problem: the case or the stakes, before anything is explained (a map of the process, the size of the data) |
| `example` | shows the brief's concrete example, with its real data |
| `idea` | draws the rule, the mechanism or the term from the example |
| `contrast` | puts the misconception against what really happens |
| `apply` | uses the idea on a new case or shows a consequence |
| `answer` | answers the brief's question |
| `check` | asks the reader to predict or work something out |
| `recap` | sums up or reviews |

- An unknown value is an error; `arc` on `<brief>`, `<theme>` or `<chapter>` is an unknown attribute. Without `arc`, a `<concept>` is an `idea`, a `<quiz>` with options a `check` and a flashcard a `recap`; every other component needs it.
- The order the server checks (warnings): the first `example` comes before any `idea` and any `answer` (concrete first); an `example` slide shows the brief's example (one of its numbers, quoted values or names); there is a `contrast` and an `answer`; the last component is a `check` or a `recap`. Several components may share a part, and parts may repeat (one `example`, `idea` and `check` per chapter).
- The arc is not shown: it travels on each block as `arc`.

## Lessons

Lesson tags explain notebooks and data or ML code with their real values. They work in any scene; a scene with at least one `<chapter>` gets the lesson layout.

- `<chapter title goal? ref? theme? stage?/>` starts a chapter that runs until the next one; the blocks before the first chapter are the intro. `goal` (up to 160 characters) says what the reader will understand by the end. `ref` is a range (notebook cells, or lines of a file) of at most 120; the server attaches those cells with their outputs (or the lines) when the scene is shown, as "Your cells". `stage` names a `<stage>` id of a `<journey>` in the scene (the parser refuses one no journey has): the chapter's card in Present and its header on the page show that journey as a strip of stops, the ones before ticked, this one lit ("you are here") and the next ones faint, so every chapter of a deep dive is seen in its place in the whole process. Up to 20 chapters.
- `<stats>`: headline numbers. `value` (up to 24 characters) is shown as written, and the numbers in it count up ("0.833", "49 582", "84.6 %").
- `<journey>`: the data's path, played like a flow. Each `<stage>` has a `value` (its size or shape, up to 40 characters, e.g. "18 × 70"), a `kind` (`file`, `table` (default), `text`, `matrix`, `split`, `model`, `metric`), and `op`, the operation that produced it as code (up to 60 characters). Stages are clickable like nodes and take `<drill node>` and `<code node>`.
- `<trace>`: one real value through a series of operations. The first `<value>` is the input; each next one is the result of `code` (up to 160 characters), with an optional `note` saying why it matters. Values are text (whitespace collapsed, up to 1500 characters). The viewer computes the word diff itself: removed words struck out, added ones in yellow, changed ones with their changed letters marked.
  - `kind` gives a value another form, so one real example can travel a whole process (a review through a model, a request through middleware, an order through checkout): `text` (default), `list` (items separated by `|`: `not|good|hated`), `table` (`name=value` rows separated by `|`), `bars` (`name=value` with numbers, as written; negatives diverge left in red) or `number` (one value of up to 24 characters, shown huge, counting up). Up to 40 items, names up to 40 characters, values up to 24.
  - `vector` is an embedding: 2 to 16 numbers separated by `|` (`0.83|0.56|0.00`), drawn as a strip of cells, blue for positive and red for negative, stronger the bigger the number, with the numbers under them. `dims` gives the vector's real size when only its first numbers are shown (`dims="384"`): a last cell counts the rest ("+376") and the counter says "384 dimensions". Between two vector steps the cells keep their place, so a change (a normalization) shows in place; a step from words or bars into a vector counts nothing removed or added.
  - A piece that survives a step keeps its identity: a word, an item, a row or a bar with the same name (letters and digits, case and accents aside) glides from its old place and form into its new one, and new pieces pop in. The step's badge counts the pieces it removed and added; a step to or from a `number` combines the pieces and counts nothing.
- `<chart type>`: `bars` (grouped, from zero), `hbars` (horizontal; one series with negative values diverges blue/red around zero) or `line` (rows evenly spaced in order). `series` names up to 4 series separated by `|` (leave it out for one); each `<row label values>` has one number per series, separated by `|`, written as the notebook prints them (`0.846`, `-1.2e-3`), shown as written plus `unit` (a symbol like `%` is glued, a word gets a space). `highlight` names a series (the others turn gray) or a row (the others dim). Up to 40 rows.
- `<matrix cols>`: a grid with `cols` separated by `|` (up to 12) and one `<row label values>` per row, each cell up to 16 characters. Numbers get a blue heat by size; text cells stay white. `<focus label cells>narration</focus>` highlights cells: `cells` is a space-separated list of 1-based `row,col` pairs where `*` means all (`1,1 2,2`, `2,*`, `*,3`).
- `<matrix kind="confusion">`: rows are the actual classes and columns the predicted ones, in the same order, with whole counts. `positive` names the positive class (default the last). The viewer colors hits and errors (TP, FP, FN, TN with two classes) and always offers accuracy, precision, recall and F1, computed from the counts with the formula and the real numbers. `<focus metric="accuracy|precision|recall|f1">` adds a label and narration to a metric, and takes no `cells`.
- `<quiz question>`: a multiple-choice check with 2–5 `<option>`s, exactly one with `correct="true"`; `why` (up to 300 characters) explains each option and shows once it is picked. With one `<answer>` instead, it is a flashcard: the answer stays hidden until asked for, then the reader says whether they knew it. Questions and options take inline Markdown.
- `<calc>`: how a model scores one input, part by part (the intercept, then each feature's contribution). Each `<part>` has a `value` written as the notebook prints it (`-0.332`, `+0.175`) and an optional `note` (up to 300 characters) shown when the part is added. `total` is the score the notebook printed; the parser refuses it when the parts do not add up to it within rounding (half a unit of each number's last decimal), and the viewer says so when rounding shows. `kind` is `sum` (default) or `logistic`: then the viewer also applies the sigmoid, shows the probability on the curve and decides the class against `threshold` (default 0.5); `classes="negative|positive"` names the class below and the class at or above it (default `0|1`). The viewer draws a waterfall, one bar per part from the running total before it to after it, then the score from zero, and plays it step by step. The agent does no arithmetic.
- `<theme name accent? />`: what the scene is about, which picks its decoration. `name` is one of `plain` (default: no decoration), `data`, `ml`, `math`, `text`, `web`, `network`, `database`, `security`, `code`, `hardware`, `business`. Each theme has three drawings of flat line art on a common grid, in two tones (its accent, and yellow for the one thing each drawing points at), an accent color and a glyph: `data` a bar chart, a table and an area chart; `ml` a network, a decision tree and two separated classes; `math` a curve on its axes, the unit circle and a bell curve; `text` tokens, a page and speech bubbles; `web` a browser, two devices and a wireframe; `network` a mesh, a hub and a client with its servers; `database` stores, two related tables and an index tree; `security` a shield, a padlock and a honeycomb; `code` lines of code, a branch and a terminal; `hardware` a chip, signals and a board; `business` growth, a funnel and a board of cards. The details of each drawing come from the scene, so two scenes with the same theme do not look the same. It shows at the top of the page, beside each chapter's header and behind the slides in Present mode, where it draws itself in. There every slide has its own composition: a large drawing and a small one, in two corners, and neither the corners nor the drawings repeat on the next slide. `accent` replaces the theme's color: `blue`, `green`, `purple`, `red`, `orange`, `teal`, `pink`. `<chapter theme="…">` gives one chapter its own theme. It works in any scene, also one with only `<arch>` or `<flow>`.
- `<plot title>`: functions drawn on their axes, with real inputs marked on them. `x` and `y` label the axes (up to 40 characters).
  - `<curve fn>` draws a function from a closed list: `sigmoid`, `tanh`, `relu`, `log` (no parameters), `linear` (`slope`, `intercept`), `quadratic` (`a`, `b`, `c`), `exp` (`rate`), `gaussian` (`mean`, `std`). There are no free expressions.
  - `<curve points="1,0.69 2,0.52 3,0.41">` draws values the notebook printed (a loss per epoch), as `x,y` pairs separated by spaces, left to right, 2 to 200 of them, joined by straight lines.
  - With several curves each needs a `label`; they share the axes and get a legend.
  - `from` and `to` set the stretch of x shown. Without them each function has its own (`sigmoid` runs from -6 to 6) and points run from their first to their last x.
  - `<mark x label>narration</mark>` marks a real input: `x` as the notebook prints it, inside the plot. The viewer computes its height on the curve (the first one, or the one named by `curve`) and shows it with three decimals. The narration is optional.
  - In Present mode the axes draw and each curve is traced; then each mark is a part: a point travels along the curve to it while its reading follows, and its guides and label land.
- `<scatter title classes>`: points of 2 to 4 classes on two axes. `classes` names them separated by `|`; each `<dot x y class label? />` is one point, with its coordinates as the notebook prints them (for text or other data with many dimensions, a 2-D projection the notebook computed, such as PCA). Classes differ by color and by shape. `x` and `y` label the axes.
  - `<boundary slope intercept above />` is a straight decision boundary, the line y = slope·x + intercept, for two classes; `above` names the class on its upper side. The viewer tints the two sides, finds the points on the wrong one and counts them.
  - `<boundary points="-1,2 0,0.5 1,-1" />` is a boundary of any shape, drawn as given; nothing is counted.
  - In Present mode the parts are the axes, each class landing in turn, the boundary being traced, and the points on the wrong side ringed with their count.
- `<space title x? y? k? dims?>`: a vector space, for embeddings and similarity search. Each `<item id label x y cluster? score?>narration</item>` is a stored row (a chunk, a document) at its place on the two axes, as the system printed it; for embeddings of many dimensions, a 2-D projection the project computed (`dims` then says how many dimensions the picture flattens). Both axes share one scale, so an angle on screen is the angle between the two vectors. Up to 40 items; `x` and `y` label the axes.
  - `<query label x y cluster?>narration</query>` (at most one) is the question: the viewer draws an arrow from the origin to the query and to each item it compares, the angle between them and its cosine, then rings and ranks the `k` nearest (default 3, up to 10) in a list with bars. Without `score`s the viewer computes each cosine from `x` and `y`; with them (the system's real similarity, as printed) it ranks by them and the picture only places the points. With real scores, every compared item needs one.
  - `<cluster id label x y>narration</cluster>` (2 to 8, or none) is a cluster of the index with its centroid; every item names its `cluster`. The query is sent to the cluster `query` names (the one the system chose), or else to the centroid closest in direction, and only that cluster's items are compared ("compares 3 of 12"); the others dim. A `<space>` with clusters and no query shows the index alone, with a legend of the clusters and their sizes.
  - In Present mode the parts are: the items landing, the query arriving, the index choosing its cluster, each comparison (the arrows, the angle and its cosine; at most 7 one by one, the rest together) and the ranking. The narration of the query, of the chosen cluster and of each compared item is the subtitle of its part. On the page the same parts play with step controls.
- `<cosine title a b dims? score?>`: the cosine similarity of two vectors worked out step by step. `a` and `b` name the two vectors; each `<dim a b label? />` is one dimension (2 to 12), as written. The viewer multiplies each pair, adds the products (the dot product), measures each vector's length and divides, showing every number, then places the result on a gauge from −1 (opposite) through 0 (unrelated) to 1 (same direction). With every dimension shown, a given `score` must match the numbers within 0.02 (they are rounded); when `dims` says the vectors are longer than what is shown, the real `score` is required and the hidden dimensions show as "+376". In Present mode the parts are the two vectors, the products, the sum, the lengths and the result.
- `<compare title a b>`: two things side by side. `a` and `b` name the two sides; each `<pair label a b winner? />` is one row: what is compared and what each side does (up to 140 characters each, inline Markdown). `winner` is `a`, `b` or `tie`; leave it out when the row is a plain difference. The viewer marks the winner of each row and, when rows have winners, shows the tally. In Present mode the two names face each other, then each row is a part, then the tally.
- `<timeline title>`: events in order along a line. Each `<event label when?>narration</event>` has a short name, an optional `when` (a date, a cell, a version; up to 24 characters) and one or two sentences. In Present mode each event is a part: the line reaches it and its narration shows large. Use it for things that happen in time (a history, a request's life, training steps); use `<journey>` when data changes shape along the way.
- `<structure title direction?>`: a structure drawn as itself (a tree, an organization chart, a file system, the outline of a document) that changes state by state, for "how is it built" and "what happens to it when…".
  - `<member id label parent? side? desc? ref? />` is one part. `parent` names another member (none: a root; several roots are drawn side by side). `side="left|right"` keeps a binary tree's shape: a lone child sits on its side, and two children of one parent cannot share a side. Up to 40 members, labels up to 80 characters, `desc` one line under the label.
  - `<change label add? remove? move? mark?>narration</change>` is one step from a state to the next: `add` and `remove` list member ids separated by spaces, `move="a>b"` puts `a` under `b` (`a>b:left` with a side, `a>` makes it a root), `mark` lists the members the step points at (the path compared, the part that changed). Up to 20 changes, each with its narration (the subtitle of its state).
  - Members that no change adds are there from the start. The parser plays the changes and refuses one that adds a member already there, removes, moves or marks one that is not, moves a member under itself or below itself, leaves a member there without its parent, or does nothing. The block carries every state.
  - `direction` is `down` (default: the root on top) or `right` (the root on the left, like a file tree).
  - The viewer lays each state out as a tidy tree (a parent centered over its children) on one frame for every state. Between two states each member glides to its new place, a new one grows out of its parent, a removed one fades, and the marked ones and the links between them light up; a part taken back plays backwards. In Present mode each state is a part, the change's `label` shows above the picture and its narration is the subtitle; on the page the states play with step controls. A wide tree scrolls inside its frame on a phone.
- `<system title>`: a web of causes (a cache under load, inflation, an ecosystem), for "what causes what, and what feeds back".
  - `<factor id label desc? ref? />` is a quantity that can go up or down; 2 to 12.
  - `<link from to sign label? />`: `sign="same"` when more of `from` brings more of `to`, `"opposite"` when it brings less. No link from a factor to itself, one link per pair and direction, up to 30. `label` (up to 40 characters) says how, under the sign.
  - Loops are found by the parser: every cycle of links is one, **reinforcing** when it holds an even number of `opposite` links and **balancing** when odd, shortest first, up to 8 drawn. `<loop through="a b c" label />` names one; its factors must be a cycle of the system, in any order.
  - One push played step by step: `<push factor change="up|down">narration</push>` starts it (the first step is a push), and each `<effect from to>narration</effect>` follows a `<link>` from a factor that has already moved. The parser works out the target's direction (`same` keeps it, `opposite` flips it) and marks a factor that turns the other way as pushed back. An effect along no link, or from a factor that has not moved, is an error. Up to 20 steps.
  - The viewer puts the factors on a ring and each link as a curved arrow (a link and its reverse bend apart), `+` or `−` at its middle (opposite links dashed), and each loop's badge inside it (R1, B1… with its name). In Present mode the first part is the system at rest and each step a part: its link draws with dots flowing along it, the factor it reaches lights up with an arrow up (blue) or down (red), and the narration is the subtitle. On the page the steps play with step controls. Present shrinks it to fit like other diagrams.
- `<annotated title>`: a text read part by part (a lease, an article of a law, a paragraph of a page), for "what does this text say, clause by clause".
  - `<passage>` is the text as written, up to 3000 characters; its line breaks are kept and its common indentation removed. Exactly one.
  - `<note quote label?>narration</note>` (1 to 12): `quote` is words of the passage, as written (any run of spaces and line breaks matches any other); the parser finds them and refuses a quote that is not there or that overlaps another note's words. `label` names the part ("Clause 3").
  - The viewer shows the passage with each quote marked and numbered, and the notes beside it (below it on a phone). In Present mode the passage comes first, then each note is a part: its words turn yellow and the note rises beside them; the earlier ones stay marked. On the page every note shows.
  - The passage quotes its source, so its words do not count as the scene using a term of the brief or an acronym; the notes do.
- `<argument title>`: a claim weighed point by point, for a decision or a thesis with its evidence.
  - `<claim>` comes first (one line, required); then 1 to 8 `<support label>narration</support>` and `<objection label reply?>narration</objection>`, in the order they are weighed (`reply`, up to 300 characters, answers the objection); then, optionally, `<verdict>` (one line), last.
  - The viewer draws the claim on top, the reasons in a "For" column and the objections, each with its reply, in an "Against" column, and the verdict at the bottom. In Present mode the claim, each point and the verdict are parts, and each point's narration is its subtitle.
- `<derive title>`: a formula that changes line by line. Each `<line>` is LaTeX without `$` (up to 500 characters, checked like any formula); `note` (up to 300 characters, inline Markdown) says what changed. The viewer compares each line with the one before: the symbols they share, in order, are the same symbols, and the others are new and get a yellow marker. In Present mode each line is a part: the shared symbols glide down from the line above and the new ones pop in. Change one thing per line so the eye can follow it, and write the same symbol the same way on every line.
- `<concept term>`: a new idea introduced from zero, as a card. `term` is its name (up to 60 characters). `<define>` says what it is in one or two sentences (up to 300 characters); `<analogy>` compares it to something everyday (up to 300); `<formula>` is its LaTeX without `$` (up to 500), checked like any formula; `<example>` is a tiny worked example in Markdown (up to 1200; it may hold a small table, and its line breaks are kept). They always show in that order. In Present mode the term first stands alone, giant, then moves to the top and each piece arrives on its own; the formula assembles symbol by symbol.
- `<threshold>`: a decision threshold the reader moves over real predictions. Each `<point>` is one test input: `score` is the model's probability of the second class (0 to 1, as printed, e.g. from `predict_proba(X)[:, 1]`), `actual` names its real class, `label` (up to 80 characters) identifies it. `classes` names the class below the threshold and the class at or above it (default `0|1`); `at` is the starting threshold (default 0.5). The viewer shows the points in one lane per actual class along 0–1, green when called right and red when not, a slider (arrow keys move it by 0.01) and the confusion matrix, accuracy, precision and recall at the current threshold, recomputed live.
- Callouts: a Markdown quote that starts with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` renders as a colored box; a leading `**bold**` line is its title.

Lesson layout: the intro, then one section per chapter (number, title, goal, "Your cells", "Ask about this chapter", the chapter's blocks and a "Next" button), a sticky chapter rail with a check per done chapter and the share of checks done (a strip of pills on small screens), and an end card. A "Practice" button (in the rail, the pill strip and the end card) asks every check and flashcard of the lesson again, one at a time: first the ones the reader missed, then the unanswered, then the rest; it ends with the score of first answers and can repeat the missed ones. Its answers count in the lesson's progress. A chapter is done when its checks are right (or known, for flashcards); one without checks, once the reader reached it. Progress is kept in the browser per scene version, also in exports, and starts again when the scene is re-rendered.

## Semantics

- `<arch>` is the static picture of the parts and how they connect. The viewer lays it out left to right with ELK, keeps room for every edge label, and reveals it box by box, then the edges. Each box shows its kind (a colored chip with an icon), its label and its `desc`.
- `<flow>` is an ordered story. The viewer draws one edge per pair of nodes and kind (a call and its return are two edges), then plays the steps: the active nodes and edge are highlighted, a token travels along the edge, and the narration shows under the diagram with links to the step before and after. Play, pause, previous, next and jumping to a step are available. With reduced motion, playback does not start by itself and no token moves.
- Line styles: calls are solid, returns dashed, async messages dotted; a legend appears under any diagram that uses returns or async messages, and the step badge says "Answer back" or "Async".
- `<group>` shows collapsed as one box with its member count; edges into its members attach to the box (merged per pair; a label is kept only when all merged edges share it). Clicking it zooms in without asking Claude: its members appear, with faded context boxes for the nodes outside that its edges reach, and breadcrumbs lead back out.
- Clicking any other node, entity or state opens its detail panel beside the scene (a bottom sheet on small screens): kind, label, ref, `desc`, long description, key code with line numbers and highlighting, and its drill topic. Clicking it again or pressing Esc closes it.
- "Go deeper" in the panel asks to go deeper. If the node has a `<drill>` whose topic is cached and fresh, the viewer opens that scene with a zoom-in. Otherwise the request reaches Claude through the plugin monitor as one line naming the node, its ref, the scene and the topic (the drill topic, or the node label); the next scene Claude renders becomes the deeper level. Scenes reached this way show the scenes above them as breadcrumbs.
- `<data>` draws each entity as a table (PK, FK and UQ badges, types on the right) and each relation as an undirected edge labelled with its cardinality, e.g. `owns (1 : 1)`.
- `<state>` draws a start dot pointing at the initial state, states as pills (final states with a double ring) and transitions labelled with their event. With a `<walk>`, it plays like a `<flow>`: the transition taken and both states are highlighted and the narration shows below. Entities and states are clickable like nodes.
- Presentation mode shows the narration of the part on screen (a flow or walk step, a journey stage, a trace note, a calc part's note, a matrix highlight, a plot mark, a derivation note, a timeline event, a query, a cluster or an item of a `<space>`) as a subtitle under the slide, like a video's; S or the header button turns it off for a speaker, and the browser remembers the choice. Markdown is not a slide, except the scene's leading `#` title, shown alone as the cover (a scene made only of Markdown keeps one slide per Markdown block). Components keep their titles, labels and values; their paragraphs stay on the page, and only the narration of the current part reaches the slide, as its subtitle. It shows one per `<arch>` and `<data>`, one per `<walk>` step (or one per `<state>` without a walk), one per `<flow>` step, and in lessons one per chapter title, `<stats>`, journey stage, trace value, `<chart>`, `<quiz>`, `<matrix>`, matrix highlight, `<calc>` step, `<threshold>` (interactive), `<concept>` (the term, then each piece) `<plot>` (the curves, then each mark), `<derive>` (each line) `<scatter>` (axes, each class, the boundary, the wrong side), `<compare>` (the names, each row, the tally), `<timeline>` (each event), `<space>` (the items, the query, the index, each comparison, the ranking) and `<cosine>` (the vectors, the products, the sum, the lengths, the result), in document order, advancing only on request. Write each block's `title` as the one short sentence its slide says.
- Exported files embed the parsed scene with its key code; they keep `<group>` zoom, `<flow>` playback and the detail panel, read-only: no "Go deeper".
- Every file named in a `ref` is hashed when the scene is cached. If one of them changes or disappears, the scene is reported stale and the viewer shows which files changed.

## Errors

Errors carry a line and column, one per line in the tool result, e.g.:

```
line 3, column 18: "to" refers to unknown node "ghost"
line 7, column 1: Unclosed <arch>: expected </arch>
```

Syntax errors (unclosed tags, input that ends inside a tag, bad quoting) stop parsing at the first one; validation errors are all reported together.

`render_scene` refuses a scene without `<brief>` and answers with a brief to fill in.

After a scene is saved, `render_scene` may add warnings, one `Warning:` line each, which never block it: the skill asks the agent to fix every one and render again until the result says "No warnings". They are stored with the cached scene, and `show_scene` lists them again (computed anew, so rules added later apply to older scenes) and asks to fix them before answering from the cache. The rules (`server/src/slides.ts`, `server/src/rules.ts`):

- The brief: no component, check or concept takes up its misconception (at least half of the misconception's key words, the words of 4 letters or more that are not in its question and do not just frame it, such as "believing", in the text of one block); no `<quiz>` with options, where the reader predicts its check; or, for a scene cached before briefs existed, no `<brief>` at all (rebuild it with one).
- The arc, in a scene with a brief: components that declare no part; an `idea` or an `answer` before the first `example`; no `example` slide that shows the brief's example; no `contrast`; no `answer`; a last component that is no `check` or `recap`.
- The form, in a scene with a brief: no component of its `form` (the table in "The brief").
- Terms, in a scene with a brief: a term of `<terms>` that no `<concept term>` names, or that a component shows before its card (chapter cards may name it).
- Acronyms: a word of 2–6 capital letters (two such words may be joined by a hyphen, "TF-IDF") that a component or a chapter card shows before the scene spells it out (`ACR (words)` or `words (ACR)`, emphasis allowed, in that block or one before it, prose included) or a `<concept term>` names it, unless the brief's `<audience>` or `<terms>` name it. Roman numerals and codes such as `BOOK-1843` are not acronyms.
- Titles of one or two words on a component: a label, not the slide's point.
- A box whose `ref` names a whole file of more than 30 lines (or 2 notebook cells) instead of a line range.
- The presentation, where a speaker shows the `#` title as the cover and one component per slide with its `title` as its sentence: a scene without `<theme>`; a scene that does not open with a `# ` title; a chapter (or a scene without chapters) with no component, unless it holds two or more `<quiz>` (a review); a block or chapter `title` of more than 12 words. `<chapter>`, `<quiz>` and `<theme>` are not components.
- Numbers, in a scene that refers to a notebook: every number a component shows as data (stat and stage values, chart and matrix rows, calc parts and total, threshold scores, trace numbers, bars, table values and vectors, plot marks, curve points and parameters, scatter dots and boundary, space positions and scores, cosine dimensions and score, compare cells, and the decimals of a derivation) must appear in an output or a cell of the notebooks it refers to, or in another file it refers to, as written or rounded to the decimals shown; a percentage may be a printed fraction × 100.
- Boxes (`<node>`, `<group>`, `<entity>`, `<status>`) without `desc`, or whose `desc` repeats the label; more than 12 boxes on one level of an `<arch>` (its top or the inside of a group); more than 12 steps in a `<flow>`.
- Subtitles of more than 25 words: the narration of flow and walk steps, journey stages, timeline events, structure changes, system steps, annotated notes, argument points, plot marks, matrix highlights and `<space>` items, clusters and query, and the `note` of trace values, derivation lines and calc parts.
- A scene without chapters but with more than two `##` headings: its sections should be chapters.
- In a scene with chapters: no `<journey>` before the first chapter (the map); a chapter without `goal`; a chapter without `<quiz>`, except the last one when it is the review; a last chapter with fewer than 3 flashcards (no review); no `<trace>`; no `<concept>`.
- A `why` that opens with a verdict ("Right,", "Wrong:", "Correcto.").
- A scene with `<arch>`, `<flow>`, `<data>` or `<state>` and no `<code>`.
- A scene with a `<flow>` and no `<trace>`: one real input should follow the process.

The skill's `presenting.md` says how to fix each one.

## Example

See `examples/scenes/login.exl.md` (`<arch>`, `<flow>`, `<group>`, `<drill>`), `data-model.exl.md` (`<data>`) and `session-states.exl.md` (`<state>` with a `<walk>`), all written against `examples/shop`, and `notebook-lesson.exl.md` (a lesson with every lesson tag), written against `examples/notebook/reviews.ipynb`.
