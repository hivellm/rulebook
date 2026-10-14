#!/usr/bin/env bash
# v7 PreToolUse guard (Edit|Write): protect rulebook task scaffolding.
#
# PATH-ONLY by design (F-009): no content inspection, no regexes over code.
# The single rule: `.rulebook/tasks/<id>/proposal.md` and `.metadata.json`
# are created, with their content, by `rulebook_task` (MCP) or
# `rulebook task create` — never by hand. Editing them once the task exists is always allowed.
#
# v7.5: the settings entry gates each handler with an `if` rule
# (Edit(**/.rulebook/tasks/**), Write(**/.rulebook/tasks/**)), so Claude Code
# spawns this script only for task files. A passing call prints nothing — the
# guard never approves anything; the normal permission flow decides.
set -euo pipefail
# Builtin read, no `cat` fork. `-N` reads in blocks (bash 4.1+); `-d ''` reads a
# pipe one byte per call, so it is only the fallback for bash 3.2 (macOS).
input=""
if (( BASH_VERSINFO[0] > 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 1) )); then
  IFS= read -r -N 100000000 input || true
else
  IFS= read -r -d '' input || true
fi

# Fast path: payload doesn't mention the tasks dir at all.
case "$input" in
  *'.rulebook/tasks/'*|*'.rulebook\\tasks\\'*) ;;
  *) exit 0 ;;
esac

# Extract the target path (the tool_input key — keys inside string values are
# escaped), normalize slashes. Builtin regex, no subprocess.
FP_RE='"file_path"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)"'
fp=""
if [[ $input =~ $FP_RE ]]; then fp="${BASH_REMATCH[1]}"; fi
fp="${fp//\\\\/\/}"
fp="${fp//\\//}"

case "$fp" in
  *.rulebook/tasks/*/proposal.md|*.rulebook/tasks/*/.metadata.json)
    if [[ ! -f "$fp" ]]; then
      echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Tasks are created with their content (why, what, items) via rulebook_task (MCP) or `rulebook task create`, not by hand. Once the task exists, editing its files is allowed."}}'
      exit 0
    fi
    ;;
esac

exit 0
