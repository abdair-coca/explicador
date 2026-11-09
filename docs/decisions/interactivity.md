# Interactivity: how a viewer click reaches the agent

Status: **accepted** on 2026-11-09. The user approved the comparison and required that Explicador works without launch flags. Mechanism (d) was then added and tested to meet that requirement.

## Context

Claude Code works turn by turn, so a click in the browser viewer does not reach the agent by itself. Decision 6 (clicking an element asks the agent to go deeper) needs a delivery mechanism. Four were prototyped in `spikes/interactivity/`:

- **(a) Blocking tool.** `wait_for_interaction()` blocks until a click and returns it; the agent calls it again after each click.
- **(b) Headless relaunch.** The MCP server runs `claude -p --resume <session-id> "<click prompt>"`.
- **(c) Channel.** The MCP server declares `experimental['claude/channel']` and pushes `notifications/claude/channel` into the open session.
- **(d) Plugin monitor.** The plugin declares a monitor in `monitors/monitors.json`. Claude Code starts it with the session, and it prints each click it receives from the MCP server; Claude Code delivers every printed line to Claude.

## Method

- Environment: Windows 11, Claude Code 2.1.319, Opus 5.5 at xhigh effort, Claude Pro login, MCP TypeScript SDK 1.32.2, Node 24.14.
- Headless runs (`claude -p`) for (a), (b) and the page's security checks.
- Interactive runs in a real terminal pane, driven through herdr:
  - (a), (b) and (c): Claude idle, Claude busy, typing while waiting.
  - (a) again with `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=3000`.
  - (d) loaded with `claude --plugin-dir spikes/interactivity`, with no other flags: Claude idle, Claude busy, and a click after 6 minutes.
- Timings and tokens come from the server's event log and the session transcripts.

## Results

| Criterion | (a) default | (a) + auto-background 3 s | (b) relaunch | (c) channel | (d) plugin monitor |
|---|---|---|---|---|---|
| Launch flag or dialog | none | env var affecting every MCP server | none | `--dangerously-load-development-channels` plus a confirmation on every launch | **none** |
| Click reaches the session | 79 ms | 110 ms | separate process, 3 to 4 s to start | 56 ms | ~245 ms |
| Click while Claude is idle | starts a turn | starts a turn | answers in another process | starts a turn | starts a turn |
| Click while Claude is busy | waits for the next tool call | same | runs in parallel | queued to the end of the turn | queued to the end of the turn |
| Answer visible in the terminal | yes | yes | **no** | yes | yes (`Monitor event: …`) |
| Model calls per click | 2 (answer + re-arm) | 2 | 1 (full session reload) | 1 | 1 |
| User can type while waiting | **no**: busy 2 min after each re-arm | yes, after ~3 s | yes | yes | yes |
| Needs agent cooperation | yes, must re-call the tool | yes | no | no | no |

Answer time after delivery was 1.5 to 5.5 s in every mechanism and depends on model thinking, not on the mechanism. Each model call read about 52k cached tokens (this user's tools and skills) and wrote 300 to 1,050 new ones (2k to 3.7k on a session's first turn).

Other findings:
- **(b) corrupts the session.** The relaunched turn was appended to the live session's transcript, interleaved with the interactive turns, and the resume injected an empty `No response requested.` reply to close the pending tool call. The interactive session never saw that turn. Each click cost $0.026 to $0.033 and about 9 s.
- **(a) depends on the agent.** It only keeps listening if the agent re-calls the tool after every click. The first call also costs a `ToolSearch` round trip, because Claude Code loads MCP tools on demand. A plugin cannot set `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS`: plugin settings only accept `agent` and `subagentStatusLine`.
- **(c) needs the flag for good.** Own plugins are not on the channel allowlist, so every launch needs the development flag and its confirmation.
- **(d) lifecycle.** The monitor started 0.7 s after the session, connected to the server, and still delivered a click after 6 minutes. The Monitor tool's 5-minute deadline does not apply to plugin monitors. It stopped with the session without an exit prompt and left no processes behind. Docs: plugin monitors do not start in `-p` runs.
- **Shared identity.** The MCP server and the monitor both receive `CLAUDE_CODE_SESSION_ID` (same value) and run in the project directory. The monitor does not receive `CLAUDE_PLUGIN_ROOT` or `CLAUDE_PLUGIN_DATA` as environment variables, but `${CLAUDE_PLUGIN_ROOT}` is substituted in its command.
- **Click text.** A click message must describe the click, not restrict tools: the spike's first wording ("do not call any tool") clashed with (a)'s re-call instruction.
- **Security.** The page rejected requests without the per-launch token (403) and with a foreign `Origin` (403). The `Host` check against DNS rebinding is implemented but was not exercised.

## Decision

1. **(d) plugin monitor** delivers clicks. It needs no flag and no agent cooperation, and works both when Claude is idle and when it is busy, with one model call per click.
2. **(a) blocking tool** stays the approved fallback. It is built only if a target environment cannot run plugin monitors.
3. **(b) is discarded.** The user never sees the answer, and the session history gets corrupted.
4. **(c) is not built.** It needs a launch flag, and (d) delivers the same behavior without one.

## Consequences for Phase 2

- The plugin ships `monitors/monitors.json` with one monitor (`when: "always"`, or `on-skill-invoke` if it should start only with the skill) that runs the click feed from `${CLAUDE_PLUGIN_ROOT}`.
- The MCP server publishes its port and token in a per-session file, `.explicador/runtime/<CLAUDE_CODE_SESSION_ID>.json` in the analyzed project. The monitor finds it through the same session id, so several open sessions don't collide.
- Every line the monitor prints becomes a message for Claude. The feed prints only click messages, one line each. The server builds them from scene data it already holds (node id → label, ref), never from free text sent by the page.
- The page keeps the 127.0.0.1 binding, Host and Origin checks, and a per-launch token.
- `monitors/monitors.json` is part of the standard plugin layout, but its manifest key sits under `experimental`, whose shape may still change; re-check the docs before Phase 2. On Bedrock, Vertex or Foundry, or with telemetry or nonessential traffic disabled, monitors need Claude Code 2.1.310 or later.

## Implementation

Built in Phase 2: `monitors/monitors.json`, `server/src/monitor.ts`, `server/src/clicks/` and `server/src/navigation.ts`. The spike was removed afterwards; it is in git history up to commit `df57412` (`spikes/interactivity/`).
