#!/usr/bin/env bash
# PreToolUse hook: deny deferred/TODO/skip items in tasks.md
#
# Policy: tasks.md cannot contain "deferred", "skip", "later", "TODO".
# If a task cannot be implemented, explain why — don't mark it deferred.

set -euo pipefail
input="$(cat)"

tool="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)"
if [[ "$tool" != "Edit" && "$tool" != "Write" ]]; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || true)"
if [[ ! "$file" == *tasks.md ]]; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

content="$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // empty' 2>/dev/null || true)"
if echo "$content" | grep -qiE '\bdeferred\b|\bskip(ped)?\b|\blater\b|\btodo\b'; then
  reason="DENIED: tasks.md cannot contain 'deferred', 'skip', 'later', or 'TODO'. Implement the item now or explain in concrete terms why it is impossible. See .claude/rules/no-deferred.md"
  jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
fi

printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
exit 0
