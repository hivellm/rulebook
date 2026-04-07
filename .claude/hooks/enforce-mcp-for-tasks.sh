#!/usr/bin/env bash
# PreToolUse hook: deny manual task file creation — must use MCP tools
set -euo pipefail
input="$(cat)"

result="$(node -e "
const input = JSON.parse(process.argv[1]);
const tool = input.tool_name || '';
if (tool === 'Write' || tool === 'Edit') {
  const file = input.tool_input?.file_path || input.tool_input?.filePath || '';
  // Block creating new proposal.md or .metadata.json in tasks/
  if (/\.rulebook\/tasks\/[^/]+\/(proposal\.md|\.metadata\.json)$/.test(file.replace(/\\\\/g,'/'))) {
    // Allow if editing existing file
    try { require('fs').accessSync(file); console.log('ALLOW'); } catch { console.log('DENY'); }
    process.exit(0);
  }
} else if (tool === 'Bash') {
  const cmd = input.tool_input?.command || '';
  if (/mkdir.*\.rulebook\/tasks\//.test(cmd) || /mkdir.*\.rulebook\\\\tasks\\\\/.test(cmd)) {
    console.log('DENY');
    process.exit(0);
  }
}
console.log('ALLOW');
" "$input" 2>/dev/null || echo "ALLOW")"

if [[ "$result" == "DENY" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: task files must be created via rulebook_task_create MCP tool, not manually. Use: rulebook_task_create({ taskId: phase1_your-task-name })"}}'
else
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
fi
