# Interactivity spike (Phase 0)

Disposable prototype that compares ways for a click in the local viewer to reach a running Claude Code session. The decision lives in `docs/decisions/interactivity.md`.

| Mechanism | How the click arrives |
|---|---|
| (a) `wait` | The `wait_for_interaction` tool call blocks until the click and returns it. |
| (b) `relaunch` | The server runs `claude -p --resume <session-id> "<click prompt>"`. |
| (c) `channel` | The server pushes a `notifications/claude/channel` event into the open session. |
| (d) `monitor` | A plugin monitor (`monitors/monitors.json`) prints the click; Claude Code delivers each line to Claude. |

Requires Node 24+ (runs the TypeScript sources directly) and `npm install` at the repo root.

## Run (d): plugin monitor, no flags

This folder is also a minimal plugin. From the repo root:

```sh
claude --plugin-dir spikes/interactivity
```

## Run (a), (b), (c): project MCP server

```sh
cd spikes/interactivity/sandbox
claude --dangerously-load-development-channels server:explicador-spike
```

Accept the development-channels warning, the project MCP server and the workspace trust prompt. The SessionStart hook in `sandbox/.claude/settings.json` records the session id for (b).

## Clicking

Ask Claude to call `open_viewer`, pick a mechanism on the page and click a node. The page URL with its per-launch token is also in `sandbox/.spike/url.txt`.

## Measurements

`sandbox/.spike/` (git-ignored):
- `events.jsonl`: server and monitor events with timestamps (clicks, waits, relaunches, channel sends, feed connections).
- `session.json`: last session recorded by the SessionStart hook.

Token use and reaction times come from the session transcript under `~/.claude/projects/`.
