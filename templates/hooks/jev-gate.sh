#!/usr/bin/env bash
# v7.4 Jev gate hook wrapper, installed to .claude/hooks/jev-gate.sh.
#
#   jev-gate.sh prompt   UserPromptSubmit → `rulebook hook prompt-gate`
#   jev-gate.sh tool     PreToolUse       → `rulebook hook tool-gate` (opt-in)
#
# Since v7.5 the prompt hook runs `node <rulebook>/dist/cli/hook-main.js`
# directly (exec form, no shell); `prompt` stays here for settings written by
# v7.4.
#
# Reads the hook JSON from stdin once, finds the rulebook CLI (the project's
# node_modules/.bin first, then the repo's own dist/index.js when the project is
# @hivehub/rulebook itself, then PATH), and hands the payload to it. The
# project is CLAUDE_PROJECT_DIR, else the payload's `cwd` (Codex sets no
# CLAUDE_PROJECT_DIR). Fail-open: the wrapper always exits 0 and a failing
# CLI's error output is dropped. A missing or failing CLI prints one
# `systemMessage` per session (a marker file under the temp dir), never one
# per prompt or tool call.
#
# `tool` runs the installed no-os-scheduling.sh guard on the same payload
# first (Claude Code runs matching hooks in parallel, so the order lives here):
# its deny is printed as-is and the CLI — and Jev — are never called.
set -u
input="$(cat)"

dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$dir" ]; then
  dir="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1 | sed 's/\\\\/\//g')"
fi

# Tell the operator once per session that the gate cannot run.
warn_once() {
  sid="$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([A-Za-z0-9_-]*\)".*/\1/p' | head -n 1)"
  marker="${TMPDIR:-/tmp}/rulebook-hook-warned-${sid:-nosession}"
  [ -e "$marker" ] && return 0
  : >"$marker" 2>/dev/null || true
  printf '{"systemMessage":"rulebook: %s, so the Jev gate hook is off for this session. Install @hivehub/rulebook (npm i -D @hivehub/rulebook, or globally), then run rulebook update."}\n' "$1"
}

case "${1:-}" in
  prompt) event="prompt-gate" ;;
  tool)
    event="tool-gate"
    guard="$dir/.claude/hooks/no-os-scheduling.sh"
    if [ -n "$dir" ] && [ -f "$guard" ]; then
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
if [ -n "$dir" ] && [ -x "$dir/node_modules/.bin/rulebook" ]; then
  cli=("$dir/node_modules/.bin/rulebook")
elif [ -n "$dir" ] && [ -f "$dir/dist/index.js" ] && command -v node >/dev/null 2>&1 &&
  grep -q '"name"[[:space:]]*:[[:space:]]*"@hivehub/rulebook"' "$dir/package.json" 2>/dev/null; then
  cli=(node "$dir/dist/index.js")
elif command -v rulebook >/dev/null 2>&1; then
  cli=(rulebook)
else
  warn_once "the rulebook CLI was not found"
  exit 0
fi

# `rulebook hook` always exits 0, so a non-zero exit is a broken CLI (a stale
# global shim, a missing build): its stderr is dropped and the wrapper still
# exits 0. Stdout passes through.
if ! "${cli[@]}" hook "$event" <<<"$input" 2>/dev/null; then
  warn_once "the rulebook CLI failed to run"
fi
exit 0
