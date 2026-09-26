#!/usr/bin/env bash
# v7.4 Jev gate hook wrapper, installed to .claude/hooks/jev-gate.sh.
#
#   jev-gate.sh prompt   UserPromptSubmit → `rulebook hook prompt-gate`
#
# Reads the hook JSON from stdin once, finds the rulebook CLI (PATH first, then
# the project's node_modules/.bin), and hands the payload to it. Fail-open: an
# unknown argument or a missing CLI exits 0 with no output, so the prompt goes
# through unchanged. The CLI itself always exits 0.
set -u
input="$(cat)"

case "${1:-}" in
  prompt) event="prompt-gate" ;;
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
