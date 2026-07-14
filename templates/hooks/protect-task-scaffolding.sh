#!/usr/bin/env bash
# v7 PreToolUse guard (Edit|Write): protect rulebook task scaffolding.
#
# PATH-ONLY by design (F-009): no content inspection, no regexes over code.
# The single rule: `.rulebook/tasks/<id>/proposal.md` and `.metadata.json`
# are created by `rulebook_task` (MCP) or `rulebook task create` —
# never by hand. Editing them once the task exists is always allowed.
set -euo pipefail
input="$(cat)"

allow() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

# Fast path: payload doesn't mention the tasks dir at all.
case "$input" in
  *'.rulebook/tasks/'*|*'.rulebook\\tasks\\'*) ;;
  *) allow ;;
esac

# Extract the target path (first "file_path" in the payload), normalize slashes.
fp="$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fp="${fp//\\\\/\/}"
fp="${fp//\\//}"

case "$fp" in
  *.rulebook/tasks/*/proposal.md|*.rulebook/tasks/*/.metadata.json)
    if [[ ! -f "$fp" ]]; then
      echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Task scaffolding is created via rulebook_task (MCP) or `rulebook task create`, not by hand. Once the task exists, editing its files is allowed."}}'
      exit 0
    fi
    ;;
esac

allow
