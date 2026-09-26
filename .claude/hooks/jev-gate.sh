#!/usr/bin/env bash
# v7.4 Jev gate hook wrapper, installed to .claude/hooks/jev-gate.sh.
#
#   jev-gate.sh prompt   UserPromptSubmit → `rulebook hook prompt-gate`
#   jev-gate.sh tool     PreToolUse       → `rulebook hook tool-gate` (opt-in)
#
# Reads the hook JSON from stdin once, finds the rulebook CLI (the project's
# node_modules/.bin first, then the repo's own dist/index.js when the project is
# @hivehub/rulebook itself, then PATH), and hands the payload to it. Fail-open:
# the wrapper always exits 0; an unknown argument or a missing CLI prints
# nothing, and a failing CLI's error output is dropped.
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

# In the rulebook repo itself (package.json named @hivehub/rulebook) there is no
# node_modules/.bin/rulebook: run the repo's own build, not a global shim.
dir="${CLAUDE_PROJECT_DIR:-}"
if [ -n "$dir" ] && [ -x "$dir/node_modules/.bin/rulebook" ]; then
  cli=("$dir/node_modules/.bin/rulebook")
elif [ -n "$dir" ] && [ -f "$dir/dist/index.js" ] && command -v node >/dev/null 2>&1 &&
  grep -q '"name"[[:space:]]*:[[:space:]]*"@hivehub/rulebook"' "$dir/package.json" 2>/dev/null; then
  cli=(node "$dir/dist/index.js")
elif command -v rulebook >/dev/null 2>&1; then
  cli=(rulebook)
else
  exit 0
fi

# A broken CLI (a stale global shim, a crash) must not fail the hook: its
# stderr is dropped and the wrapper always exits 0. Stdout passes through.
"${cli[@]}" hook "$event" <<<"$input" 2>/dev/null
exit 0
