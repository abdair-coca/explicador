#!/usr/bin/env bash
# Fills the empty workspace of each run (see evals/scaffold.ts).
set -euo pipefail
node "$(dirname "$0")/../scaffold.ts" shop --scene login.exl.md --topic login --edit "src/auth/sessions.js=const TTL_MS = 60 * 60 * 1000;>const TTL_MS = 30 * 60 * 1000;"
