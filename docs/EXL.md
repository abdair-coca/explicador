# EXL: Explicador scene format

EXL is what the agent writes to show a scene: Markdown plus a closed catalog of JSX-like tags. There is no embedded JavaScript, no expressions and no raw HTML. The MCP server parses and validates it (`server/src/parser/`) before anything is cached or shown.

## Document

- Anything that is not a scene tag is Markdown and appears as prose in the viewer, in order.
- A scene tag starts at the beginning of a line (up to 3 spaces of indentation) outside code fences. Tags inside fenced code blocks, inline in a sentence, or autolinks such as `<https://…>` stay Markdown.
- Top-level tags: `<arch>`, `<flow>`, `<data>` and `<state>`, and for lessons `<chapter>`, `<stats>`, `<journey>`, `<trace>`, `<chart>`, `<matrix>`, `<quiz>` and `<calc>`. A document needs at least one.
- Any other tag at the start of a line is an error (`<script>`, `<div>`, …), and so is a child tag outside a block.
- Attribute values are always quoted, with `"` or `'`. `attr={…}` is rejected. Entities `&amp; &lt; &gt; &quot; &apos;` are decoded.
- `<!-- comments -->` are allowed inside blocks.
- CRLF line endings are accepted.

## Tags

| Tag | Attributes | Content |
|---|---|---|
| `<arch>` | `title` (required), `id` | `<node>`, `<group>`, `<edge>`, `<drill>` |
| `<flow>` | `title` (required), `id` | `<node>`, `<step>`, `<drill>` |
| `<group>` | `id`, `label` (required), `desc`, `kind` | `<node>` and nested `<group>`, only in `<arch>` |
| `<node>` | `id`, `label` (required), `desc`, `kind`, `ref` | optional text: the long description (or self-closing) |
| `<edge>` | `from`, `to` (required), `label`, `kind` | none (self-closing), only in `<arch>` |
| `<step>` | `from` (required), `to`, `label`, `kind`, `ref` | narration text (required), only in `<flow>` |
| `<drill>` | `node`, `topic` (required) | none (self-closing) |
| `<code>` | `node`, `ref` (required) | why these lines matter (required); in any block |
| `<data>` | `title` (required), `id` | `<entity>`, `<relation>`, `<drill>` |
| `<entity>` | `id`, `label` (required), `desc`, `ref` | `<field>` rows and optional text, the long description (may be empty or self-closing) |
| `<field>` | `name` (required), `type`, `key` | none (self-closing) |
| `<relation>` | `from`, `to`, `card` (required), `label` | none (self-closing) |
| `<state>` | `title` (required), `id` | `<status>`, `<transition>`, one `<walk>`, `<drill>` |
| `<status>` | `id`, `label` (required), `desc`, `role`, `ref` | optional text: the long description (or self-closing) |
| `<transition>` | `from`, `to`, `event` (required), `ref` | none (self-closing) |
| `<walk>` | none | `<go>` steps |
| `<go>` | `event` (required) | narration text (required) |
| `<chapter>` | `title` (required), `id`, `goal`, `ref` | none (self-closing); the chapter runs until the next one |
| `<stats>` | `id`, `title` | 1–6 `<stat>` |
| `<stat>` | `value`, `label` (required), `ref` | none (self-closing) |
| `<journey>` | `title` (required), `id` | 2–12 `<stage>`, `<drill>`, `<code>` |
| `<stage>` | `id`, `label` (required), `value`, `kind`, `op`, `ref` | narration text (required) |
| `<trace>` | `title` (required), `id`, `ref` | 2–12 `<value>` |
| `<value>` | `label` (required), `code`, `note`, `ref` | the value as text (required) |
| `<chart>` | `title`, `type` (required), `id`, `series`, `unit`, `highlight`, `ref` | 1–40 `<row>` |
| `<matrix>` | `title`, `cols` (required), `id`, `kind`, `corner`, `positive`, `ref` | 1–12 `<row>`, up to 8 `<focus>` |
| `<row>` | `label`, `values` (required) | none (self-closing), in `<chart>` and `<matrix>` |
| `<focus>` | `label`, `cells`, `metric` | narration text, only in `<matrix>` |
| `<quiz>` | `question` (required), `id` | 2–5 `<option>`, or one `<answer>` |
| `<option>` | `correct`, `why` | the option's text (required) |
| `<answer>` | none | the flashcard's answer, Markdown (required) |
| `<calc>` | `title` (required), `id`, `kind`, `total`, `classes`, `threshold`, `ref` | 2–24 `<part>` |
| `<part>` | `label`, `value` (required), `note`, `ref` | none (self-closing), only in `<calc>` |

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
- `ref`: `path`, `path:line` or `path:start-end`. Relative to the project root, forward slashes, no `..`, and the file must exist when the scene is rendered.
- `<field key>`: `pk`, `fk` or `unique`; `name` and `type` are one line of up to 60 characters; field names are unique within an entity; up to 40 fields.
- `<relation card>`: `1-1`, `1-n`, `n-1` or `n-n`; `from` and `to` name entities of the same `<data>`.
- `<status role>`: `initial` or `final`; exactly one state is `initial`. Transitions may loop on one state.
- `<walk>` starts at the initial state; each `<go event>` takes the one transition that leaves the current state on that event (none or several is an error) and moves to its target.
- In `<data>` and `<state>`, `<drill node>` names an entity or a state.
- Limits per block: 60 nodes and groups, 120 edges, 100 steps.

## Lessons

Lesson tags explain notebooks and data or ML code with their real values. They work in any scene; a scene with at least one `<chapter>` gets the lesson layout.

- `<chapter title goal? ref?/>` starts a chapter that runs until the next one; the blocks before the first chapter are the intro. `goal` (up to 160 characters) says what the reader will understand by the end. `ref` is a range (notebook cells, or lines of a file) of at most 120; the server attaches those cells with their outputs (or the lines) when the scene is shown, as "Your cells". Up to 20 chapters.
- `<stats>`: headline numbers. `value` (up to 24 characters) is shown as written, and the numbers in it count up ("0.833", "49 582", "84.6 %").
- `<journey>`: the data's path, played like a flow. Each `<stage>` has a `value` (its size or shape, up to 40 characters, e.g. "18 × 70"), a `kind` (`file`, `table` (default), `text`, `matrix`, `split`, `model`, `metric`), and `op`, the operation that produced it as code (up to 60 characters). Stages are clickable like nodes and take `<drill node>` and `<code node>`.
- `<trace>`: one real value through a series of operations. The first `<value>` is the input; each next one is the result of `code` (up to 160 characters), with an optional `note` saying why it matters. Values are text (whitespace collapsed, up to 1500 characters). The viewer computes the word diff itself: removed words struck out, added ones in yellow, changed ones with their changed letters marked.
- `<chart type>`: `bars` (grouped, from zero), `hbars` (horizontal; one series with negative values diverges blue/red around zero) or `line` (rows evenly spaced in order). `series` names up to 4 series separated by `|` (leave it out for one); each `<row label values>` has one number per series, separated by `|`, written as the notebook prints them (`0.846`, `-1.2e-3`), shown as written plus `unit` (a symbol like `%` is glued, a word gets a space). `highlight` names a series (the others turn gray) or a row (the others dim). Up to 40 rows.
- `<matrix cols>`: a grid with `cols` separated by `|` (up to 12) and one `<row label values>` per row, each cell up to 16 characters. Numbers get a blue heat by size; text cells stay white. `<focus label cells>narration</focus>` highlights cells: `cells` is a space-separated list of 1-based `row,col` pairs where `*` means all (`1,1 2,2`, `2,*`, `*,3`).
- `<matrix kind="confusion">`: rows are the actual classes and columns the predicted ones, in the same order, with whole counts. `positive` names the positive class (default the last). The viewer colors hits and errors (TP, FP, FN, TN with two classes) and always offers accuracy, precision, recall and F1, computed from the counts with the formula and the real numbers. `<focus metric="accuracy|precision|recall|f1">` adds a label and narration to a metric, and takes no `cells`.
- `<quiz question>`: a multiple-choice check with 2–5 `<option>`s, exactly one with `correct="true"`; `why` (up to 300 characters) explains each option and shows once it is picked. With one `<answer>` instead, it is a flashcard: the answer stays hidden until asked for, then the reader says whether they knew it. Questions and options take inline Markdown.
- `<calc>`: how a model scores one input, part by part (the intercept, then each feature's contribution). Each `<part>` has a `value` written as the notebook prints it (`-0.332`, `+0.175`) and an optional `note` (up to 300 characters) shown when the part is added. `total` is the score the notebook printed; the parser refuses it when the parts do not add up to it within rounding (half a unit of each number's last decimal), and the viewer says so when rounding shows. `kind` is `sum` (default) or `logistic`: then the viewer also applies the sigmoid, shows the probability on the curve and decides the class against `threshold` (default 0.5); `classes="negative|positive"` names the class below and the class at or above it (default `0|1`). The viewer draws a waterfall, one bar per part from the running total before it to after it, then the score from zero, and plays it step by step. The agent does no arithmetic.
- Callouts: a Markdown quote that starts with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` renders as a colored box; a leading `**bold**` line is its title.

Lesson layout: the intro, then one section per chapter (number, title, goal, "Your cells", "Ask about this chapter", the chapter's blocks and a "Next" button), a sticky chapter rail with a check per done chapter and the share of checks done (a strip of pills on small screens), and an end card. A chapter is done when its checks are right (or known, for flashcards); one without checks, once the reader reached it. Progress is kept in the browser per scene version, also in exports, and starts again when the scene is re-rendered.

## Semantics

- `<arch>` is the static picture of the parts and how they connect. The viewer lays it out left to right with ELK, keeps room for every edge label, and reveals it box by box, then the edges. Each box shows its kind (a colored chip with an icon), its label and its `desc`.
- `<flow>` is an ordered story. The viewer draws one edge per pair of nodes and kind (a call and its return are two edges), then plays the steps: the active nodes and edge are highlighted, a token travels along the edge, and the narration shows under the diagram with links to the step before and after. Play, pause, previous, next and jumping to a step are available. With reduced motion, playback does not start by itself and no token moves.
- Line styles: calls are solid, returns dashed, async messages dotted; a legend appears under any diagram that uses returns or async messages, and the step badge says "Answer back" or "Async".
- `<group>` shows collapsed as one box with its member count; edges into its members attach to the box (merged per pair; a label is kept only when all merged edges share it). Clicking it zooms in without asking Claude: its members appear, with faded context boxes for the nodes outside that its edges reach, and breadcrumbs lead back out.
- Clicking any other node, entity or state opens its detail panel beside the scene (a bottom sheet on small screens): kind, label, ref, `desc`, long description, key code with line numbers and highlighting, and its drill topic. Clicking it again or pressing Esc closes it.
- "Go deeper" in the panel asks to go deeper. If the node has a `<drill>` whose topic is cached and fresh, the viewer opens that scene with a zoom-in. Otherwise the request reaches Claude through the plugin monitor as one line naming the node, its ref, the scene and the topic (the drill topic, or the node label); the next scene Claude renders becomes the deeper level. Scenes reached this way show the scenes above them as breadcrumbs.
- `<data>` draws each entity as a table (PK, FK and UQ badges, types on the right) and each relation as an undirected edge labelled with its cardinality, e.g. `owns (1 : 1)`.
- `<state>` draws a start dot pointing at the initial state, states as pills (final states with a double ring) and transitions labelled with their event. With a `<walk>`, it plays like a `<flow>`: the transition taken and both states are highlighted and the narration shows below. Entities and states are clickable like nodes.
- Presentation mode shows one slide per Markdown block, one per `<arch>` and `<data>`, one per `<walk>` step (or one per `<state>` without a walk), one per `<flow>` step (with its narration in large type), and in lessons one per chapter title, `<stats>`, journey stage, trace value, `<chart>`, `<quiz>`, `<matrix>`, matrix highlight and `<calc>` step, in document order, advancing only on request. Write prose blocks with that in mind: short, one idea each.
- Exported files embed the parsed scene with its key code; they keep `<group>` zoom, `<flow>` playback and the detail panel, read-only: no "Go deeper".
- Every file named in a `ref` is hashed when the scene is cached. If one of them changes or disappears, the scene is reported stale and the viewer shows which files changed.

## Errors

Errors carry a line and column, one per line in the tool result, e.g.:

```
line 3, column 18: "to" refers to unknown node "ghost"
line 7, column 1: Unclosed <arch>: expected </arch>
```

Syntax errors (unclosed tags, input that ends inside a tag, bad quoting) stop parsing at the first one; validation errors are all reported together.

## Example

See `examples/scenes/login.exl.md` (`<arch>`, `<flow>`, `<group>`, `<drill>`), `data-model.exl.md` (`<data>`) and `session-states.exl.md` (`<state>` with a `<walk>`), all written against `examples/shop`, and `notebook-lesson.exl.md` (a lesson with every lesson tag), written against `examples/notebook/reviews.ipynb`.
