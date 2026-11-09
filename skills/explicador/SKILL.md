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
   - **stale**: re-read only the changed files it lists, update the EXL it returned and call `render_scene` with the same topic.
   - **missing**: continue below.
3. **Call `ensure_index`** and read its file tree and import graph before opening any code. Use it to choose the few files that matter.
4. **Read only what you need** (the entry point and the files on the path you explain). Check line numbers for every `ref` you will write.
5. **Write the EXL and call `render_scene`**. If it returns errors, fix exactly those lines and call it again; nothing is saved until it passes.
6. **Reply in the chat** with a short explanation (3–6 sentences) and the viewer URL. The scene carries the detail.
7. **Clicks from the viewer**: a message that starts with `Explicador viewer: the user clicked` means the user wants to go deeper into that node. Do what it says: `show_scene` with the given topic, then build the scene if needed, and reply briefly. The new scene becomes the deeper level in the viewer, with breadcrumbs back.
8. **Sharing and teaching**: the viewer's **Present** button shows the scene as slides that advance manually. When the user wants a file to share or present elsewhere, call `export_scene` with the topic and give them the path; the file works offline.
9. **Findings**: when you notice something non-obvious and worth keeping (a risk, a surprising behavior, a design decision), call `add_finding` once, in English, with refs. Do not record trivia.

## EXL in short

Full reference: `docs/EXL.md` in the plugin. Tags must start at the beginning of a line; attribute values are always quoted strings; no `{expressions}`, no other HTML.

```
# Title in Markdown

One short paragraph of context.

<arch id="overview" title="Login: the parts involved">
  <node id="form" label="Login form" kind="ui" ref="src/ui/login-form.js" />
  <node id="api" label="Auth routes" kind="service" ref="src/api/auth-routes.js:6-20" />
  <node id="users" label="Users table" kind="store" ref="src/db/users.js" />
  <group id="auth" label="Auth core">
    <node id="service" label="Auth service" ref="src/auth/auth-service.js" />
    <node id="password" label="Password check" kind="function" ref="src/auth/password.js" />
  </group>
  <edge from="form" to="api" label="POST /api/login" />
  <edge from="api" to="service" label="login()" />
  <edge from="service" to="users" label="find by email" />
  <drill node="password" topic="password hashing" />
</arch>

<flow id="login" title="Logging in">
  <node id="form" label="Login form" kind="ui" />
  <node id="api" label="Auth routes" kind="service" />
  <step from="form" to="api" label="POST /api/login" ref="src/ui/login-form.js:7-11">
    The form sends the email and password as JSON.
  </step>
  <step from="api" label="validate">It rejects empty fields with 400.</step>
</flow>
```

- `<arch title>`: the static picture: `<node>`s and `<edge from to label?>`s. Use it for "what are the parts".
- `<group id label kind?>` (in `<arch>` only) boxes related nodes; the viewer shows it collapsed and zooms in on click, without asking you. Edges may point at a group.
- `<drill node topic>` marks a node that deserves its own deeper scene, under that topic. Add one for the 1–3 nodes a reader will most likely want next.
- `<flow title>`: an ordered story: `<node>`s and `<step from to? label? ref?>narration</step>`. A step without `to` is an action inside `from`. Use it for "what happens when".
- `<node id label kind? ref?>`; `kind` is one of `actor`, `ui`, `service`, `module`, `function`, `store`, `external` (default `module`).
- `ref`: `path`, `path:line` or `path:start-end`, relative to the project root, forward slashes. Every ref must exist: the cache hashes these files to know when the scene goes stale, so put a ref on every node that maps to code.
- Write `&lt;` for a literal `<` in narration.

## Good scenes

- One `<arch>` and/or one `<flow>` per answer is usually enough; 4–10 visible boxes per level, 4–10 steps. With more parts, put related nodes in `<group>`s.
- Labels are names a reader recognizes (file or concept), at most 80 characters; narration is one or two plain sentences per step.
- Explain what the code does, not what it might do; if you are unsure, say so in the prose.
