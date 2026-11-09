# Explicador

Claude Code plugin that explains software systems with animated, interactive diagrams. Ask "explain the login" and Claude answers with short prose plus scenes that play in a local browser tab. Built for developers reading unfamiliar code and for teachers presenting a system step by step.

## Status

Phase 0 is done: clicks in the viewer reach Claude through a plugin monitor, with no launch flags (`docs/decisions/interactivity.md`). Phase 1 (MVP) is next; the plan lives in `.dev/PLAN.md`.

## Develop

Requires Node 24+.

```sh
npm install
npm run typecheck
npm run lint
```
