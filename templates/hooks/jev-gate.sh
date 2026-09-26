#!/usr/bin/env bash
# v7.4 Jev gate hook wrapper, installed to .claude/hooks/jev-gate.sh.
#
#   jev-gate.sh prompt   UserPromptSubmit → `rulebook hook prompt-gate`
#   jev-gate.sh tool     PreToolUse       → `rulebook hook tool-gate` (opt-in)
#
# Reads the hook JSON from stdin once, finds the rulebook CLI (PATH first, then
# the project's node_modules/.bin), and hands the payload to it. Fail-open: an
# unknown argument or a missing CLI exits 0 with no output, so the prompt goes
# through unchanged. The CLI itself always exits 0.
#
# `tool` runs the installed no-os-scheduling.sh guard on the same payload
# first (Claude Code runs matching hooks in parallel, so the order lives here):
# its deny is printed as-is and the CLI — and Jev — are never called.
set -u
input="$(cat)"

case "${1:-}" in
  prompt) event="prompt-gate" ;;
  tool)
    event="tool-gate"
    guard="${CLAUDE_PROJECT_DIR:-}/.claude/hooks/no-os-scheduling.sh"
    if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -f "$guard" ]; then
      verdict="$(bash "$guard" <<<"$input" 2>/dev/null || true)"
      case "$verdict" in
        *'"permissionDecision":"deny"'*) printf '%s\n' "$verdict"; exit 0 ;;
      esac
    fi
    ;;
  *) exit 0 ;;
esac

if command -v rulebook >/dev/null 2>&1; then
  cli="rulebook"
elif [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -x "$CLAUDE_PROJECT_DIR/node_modules/.bin/rulebook" ]; then
  cli="$CLAUDE_PROJECT_DIR/node_modules/.bin/rulebook"
else
  exit 0
fi

exec "$cli" hook "$event" <<<"$input"
