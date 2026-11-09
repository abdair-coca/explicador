---
description: Explain a part of this codebase with an animated diagram in the Explicador viewer. Usage /explicador:explain <topic>, e.g. /explicador:explain login.
argument-hint: <topic>
---

Explain "$ARGUMENTS" in this project with Explicador.

Follow the `explicador` skill: call `show_scene` with the topic first and answer from the cache when it is fresh; otherwise build or update the scene and call `render_scene`. If no topic was given, ask the user what to explain.
