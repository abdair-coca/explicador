# EXL: Explicador scene format

EXL is what the agent writes to show a scene: Markdown plus a closed catalog of JSX-like tags. There is no embedded JavaScript, no expressions and no raw HTML. The MCP server parses and validates it (`server/src/parser/`) before anything is cached or shown.

## Document

- Anything that is not a scene tag is Markdown and appears as prose in the viewer, in order.
- A scene tag starts at the beginning of a line (up to 3 spaces of indentation) outside code fences. Tags inside fenced code blocks, inline in a sentence, or autolinks such as `<https://…>` stay Markdown.
- Top-level tags: `<arch>`, `<flow>`, `<data>` and `<state>`. A document needs at least one.
- Any other tag at the start of a line is an error (`<script>`, `<div>`, …), and so is a child tag outside a block.
- Attribute values are always quoted, with `"` or `'`. `attr={…}` is rejected. Entities `&amp; &lt; &gt; &quot; &apos;` are decoded.
- `<!-- comments -->` are allowed inside blocks.
- CRLF line endings are accepted.

## Tags

| Tag | Attributes | Content |
|---|---|---|
| `<arch>` | `title` (required), `id` | `<node>`, `<group>`, `<edge>`, `<drill>` |
| `<flow>` | `title` (required), `id` | `<node>`, `<step>`, `<drill>` |
| `<group>` | `id`, `label` (required), `kind` | `<node>` and nested `<group>`, only in `<arch>` |
| `<node>` | `id`, `label` (required), `kind`, `ref` | none (self-closing) |
| `<edge>` | `from`, `to` (required), `label` | none (self-closing), only in `<arch>` |
| `<step>` | `from` (required), `to`, `label`, `ref` | narration text (required), only in `<flow>` |
| `<drill>` | `node`, `topic` (required) | none (self-closing) |
| `<data>` | `title` (required), `id` | `<entity>`, `<relation>`, `<drill>` |
| `<entity>` | `id`, `label` (required), `ref` | `<field>` rows (may be empty or self-closing) |
| `<field>` | `name` (required), `type`, `key` | none (self-closing) |
| `<relation>` | `from`, `to`, `card` (required), `label` | none (self-closing) |
| `<state>` | `title` (required), `id` | `<status>`, `<transition>`, one `<walk>`, `<drill>` |
| `<status>` | `id`, `label` (required), `role`, `ref` | none (self-closing) |
| `<transition>` | `from`, `to`, `event` (required), `ref` | none (self-closing) |
| `<walk>` | none | `<go>` steps |
| `<go>` | `event` (required) | narration text (required) |

- `id`: starts with a letter, then letters, digits, `-` or `_`, up to 40 characters. Node ids are unique within their block and block ids within the document. A missing block id becomes `arch-1`, `flow-2`, … (by position).
- `kind`: `actor`, `ui`, `service`, `module`, `function`, `store` or `external`; default `module`.
- `title`, `label`: one line, not empty. Titles up to 120 characters, labels up to 80.
- `from` / `to`: ids of nodes declared in the same block. An `<edge>` may also name a `<group>`; a `<step>` only nodes. A `<step>` without `to` is an action inside `from`.
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

## Semantics

- `<arch>` is the static picture of the parts and how they connect. The viewer lays it out left to right with ELK and reveals it layer by layer.
- `<flow>` is an ordered story. The viewer draws one edge per pair of nodes that talk, then plays the steps: the active nodes and edge are highlighted, a token travels along the edge, and the narration shows under the diagram. Play, pause, previous, next and jumping to a step are available. With reduced motion, playback does not start by itself and no token moves.
- `<group>` shows collapsed as one box with its member count; edges into its members attach to the box (merged per pair; a label is kept only when all merged edges share it). Clicking it zooms in without asking Claude: its members appear, with faded context boxes for the nodes outside that its edges reach, and breadcrumbs lead back out.
- Clicking any other node asks to go deeper. If the node has a `<drill>` whose topic is cached and fresh, the viewer opens that scene with a zoom-in. Otherwise the click reaches Claude through the plugin monitor as one line naming the node, its ref, the scene and the topic (the drill topic, or the node label); the next scene Claude renders becomes the deeper level. Scenes reached this way show the scenes above them as breadcrumbs.
- `<data>` draws each entity as a table (PK, FK and UQ badges, types on the right) and each relation as an undirected edge labelled with its cardinality, e.g. `owns (1 : 1)`.
- `<state>` draws a start dot pointing at the initial state, states as pills (final states with a double ring) and transitions labelled with their event. With a `<walk>`, it plays like a `<flow>`: the transition taken and both states are highlighted and the narration shows below. Entities and states are clickable like nodes.
- Presentation mode shows one slide per Markdown block, one per `<arch>` and `<data>`, one per `<walk>` step (or one per `<state>` without a walk), one per `<arch>` and one per `<flow>` step (with its narration in large type), in document order, advancing only on request. Write prose blocks with that in mind: short, one idea each.
- Exported files embed the parsed scene; they keep `<group>` zoom and `<flow>` playback but drop clicks to Claude.
- Every file named in a `ref` is hashed when the scene is cached. If one of them changes or disappears, the scene is reported stale and the viewer shows which files changed.

## Errors

Errors carry a line and column, one per line in the tool result, e.g.:

```
line 3, column 18: "to" refers to unknown node "ghost"
line 7, column 1: Unclosed <arch>: expected </arch>
```

Syntax errors (unclosed tags, input that ends inside a tag, bad quoting) stop parsing at the first one; validation errors are all reported together.

## Example

See `examples/scenes/login.exl.md` (`<arch>`, `<flow>`, `<group>`, `<drill>`), `data-model.exl.md` (`<data>`) and `session-states.exl.md` (`<state>` with a `<walk>`), all written against `examples/shop`.
