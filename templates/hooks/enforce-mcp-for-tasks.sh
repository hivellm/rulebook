#!/usr/bin/env bash
# PreToolUse hook: deny manual task file creation — must use MCP tools
#
# Policy: task directories and files must be created via rulebook_task_create
# MCP tool, never via Write/Edit/Bash mkdir. The MCP tool enforces naming
# conventions, mandatory tail items, phase structure, and metadata.

set -euo pipefail
input="$(cat)"

tool="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)"

case "$tool" in
  Write|Edit)
    file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || true)"
    # Block writing proposal.md or .metadata.json in tasks/ (but allow tasks.md edits for marking [x])
    if echo "$file" | grep -qE '\.rulebook/tasks/[^/]+/proposal\.md$|\.rulebook/tasks/[^/]+/\.metadata\.json$'; then
      # Allow if file already exists (editing existing task is OK)
      if [[ ! -f "$file" ]]; then
        reason="DENIED: task files must be created via the rulebook_task_create MCP tool, not manually. The MCP tool enforces naming conventions, mandatory tail items, and metadata. Use: rulebook_task_create({ taskId: 'phase1_your-task-name' })"
        jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
        exit 0
      fi
    fi
    ;;
  Bash)
    cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
    if echo "$cmd" | grep -qE 'mkdir.*\.rulebook/tasks/'; then
      reason="DENIED: task directories must be created via the rulebook_task_create MCP tool, not mkdir. Use: rulebook_task_create({ taskId: 'phase1_your-task-name' })"
      jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
      exit 0
    fi
    ;;
esac

printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
exit 0
