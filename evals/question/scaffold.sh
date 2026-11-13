#!/usr/bin/env bash
# Fills the empty workspace of each run (see evals/scaffold.ts).
set -euo pipefail
node "$(dirname "$0")/../scaffold.ts" shop --scene login.exl.md --topic login --ask "login-architecture/password=¿Por qué compara la contraseña en tiempo constante?"
