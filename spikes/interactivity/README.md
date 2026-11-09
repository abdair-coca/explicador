# Interactivity spike (Phase 0)

Disposable prototype that compares three ways for a click in the local viewer to reach a running Claude Code session. The decision lives in `docs/decisions/interactivity.md`.

| Mechanism | How the click arrives |
|---|---|
| (a) `wait` | The `wait_for_interaction` tool call blocks until the click and returns it. |
| (b) `relaunch` | The server runs `claude -p --resume <session-id> "<click prompt>"`. |
| (c) `channel` | The server pushes a `notifications/claude/channel` event into the open session. |

## Run the guided test

Requires Node 24+ (runs the TypeScript sources directly) and `npm install` at the repo root.

```sh
cd spikes/interactivity/sandbox
claude --dangerously-load-development-channels server:explicador-spike
```

Accept the development-channels warning, the project MCP server and the workspace trust prompt. Then ask Claude to call `open_viewer`, pick a mechanism on the page and click a node.

## Where the measurements go

`sandbox/.spike/` (git-ignored):
- `events.jsonl`: server-side events with timestamps (clicks, waits, heartbeats, relaunches, channel sends).
- `session.json`: last session recorded by the SessionStart hook.
- `url.txt`: the page URL with its per-launch token.

Token use and reaction times come from the session transcript under `~/.claude/projects/`.
