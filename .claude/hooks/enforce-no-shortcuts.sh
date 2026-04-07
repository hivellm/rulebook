#!/usr/bin/env bash
# PreToolUse hook: deny stubs, TODOs, placeholders in source code
set -euo pipefail
input="$(cat)"

result="$(node -e "
const input = JSON.parse(process.argv[1]);
const tool = input.tool_name || '';
if (tool !== 'Edit' && tool !== 'Write') { console.log('ALLOW'); process.exit(0); }
const file = input.tool_input?.file_path || input.tool_input?.filePath || '';
// Only check source files
if (!/\.(ts|tsx|js|jsx|py|rs|go|java|cs|cpp|c|hpp|h)$/.test(file)) { console.log('ALLOW'); process.exit(0); }
// Skip test files
if (/\.test\.|\.spec\.|__tests__|\/tests\//.test(file)) { console.log('ALLOW'); process.exit(0); }
const content = input.tool_input?.new_string || input.tool_input?.content || '';
if (/\/\/\s*(TODO|FIXME|HACK)\b|\/\*\s*(TODO|FIXME|HACK)\b|#\s*(TODO|FIXME|HACK)\b/.test(content)) { console.log('DENY_TODO'); process.exit(0); }
if (/\bplaceholder\b|\bstub\b/i.test(content)) { console.log('DENY_STUB'); process.exit(0); }
console.log('ALLOW');
" "$input" 2>/dev/null || echo "ALLOW")"

case "$result" in
  DENY_TODO)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: source code cannot contain // TODO, // FIXME, or // HACK. Implement the logic now. See .claude/rules/no-shortcuts.md"}}'
    ;;
  DENY_STUB)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: source code cannot contain placeholders or stubs. Implement real logic. See .claude/rules/no-shortcuts.md"}}'
    ;;
  *)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
    ;;
esac
