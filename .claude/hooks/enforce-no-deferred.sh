#!/usr/bin/env bash
# PreToolUse hook: deny deferred/TODO/skip items in tasks.md
set -euo pipefail
input="$(cat)"

# Parse JSON with node (jq may not be available on Windows)
result="$(node -e "
const input = JSON.parse(process.argv[1]);
const tool = input.tool_name || '';
if (tool !== 'Edit' && tool !== 'Write') { console.log('ALLOW'); process.exit(0); }
const file = input.tool_input?.file_path || input.tool_input?.filePath || '';
if (!file.endsWith('tasks.md')) { console.log('ALLOW'); process.exit(0); }
const content = input.tool_input?.new_string || input.tool_input?.content || '';
if (/\b(deferred|skip(ped)?|later|todo)\b/i.test(content)) { console.log('DENY'); } else { console.log('ALLOW'); }
" "$input" 2>/dev/null || echo "ALLOW")"

if [[ "$result" == "DENY" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: tasks.md cannot contain deferred, skip, later, or TODO. Implement the item now or explain why impossible. See .claude/rules/no-deferred.md"}}'
else
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
fi
