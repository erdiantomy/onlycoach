#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if claude mcp list 2>/dev/null | grep -qE '^playwright[: ]'; then
  exit 0
fi

claude mcp add playwright --scope user -- npx -y @playwright/mcp@latest >/dev/null 2>&1 || true
