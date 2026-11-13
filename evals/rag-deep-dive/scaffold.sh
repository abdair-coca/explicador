#!/usr/bin/env bash
# Fills the empty workspace of each run (see evals/scaffold.ts).
set -euo pipefail
node "$(dirname "$0")/../scaffold.ts" rag
# The real numbers, as a log the project keeps: what `npm run demo` prints.
node src/demo.js > demo-output.txt
