#!/usr/bin/env bash
# PreToolUse hook (v5.6.0): consolidated deny rules.
#
# Replaces three legacy hooks (enforce-no-deferred / enforce-no-shortcuts /
# enforce-mcp-for-tasks) with a single bash + node invocation. Each rule's
# permissionDecisionReason is preserved verbatim so existing user guidance
# is unchanged.
set -euo pipefail
input="$(cat)"

result="$(node -e "
const input = JSON.parse(process.argv[1]);
const tool = input.tool_name || '';
const ti = input.tool_input || {};
const file = (ti.file_path || ti.filePath || '').replace(/\\\\/g, '/');
const content = ti.new_string || ti.content || '';
const cmd = ti.command || '';

// Rule: mcp-for-tasks — manual creation of task scaffolding is forbidden.
if (tool === 'Write' || tool === 'Edit') {
  const m = file.match(/\.rulebook\/tasks\/[^/]+\/(proposal\.md|\.metadata\.json)\$/);
  if (m) {
    try { require('fs').accessSync(file); /* existing file: allow edit */ }
    catch { console.log('DENY_MCP'); process.exit(0); }
  }
}
if (tool === 'Bash' && /mkdir.*\\.rulebook\\/tasks\\//.test(cmd)) {
  console.log('DENY_MCP'); process.exit(0);
}

// Rule: no-deferred — tasks.md must not contain deferred / skip / later / TODO.
if ((tool === 'Edit' || tool === 'Write') && file.endsWith('tasks.md')) {
  if (/\\b(deferred|skip(ped)?|later|todo)\\b/i.test(content)) {
    console.log('DENY_DEFERRED'); process.exit(0);
  }
}

// Rule: no-shortcuts — source files must not contain TODO/FIXME/HACK or stub/placeholder.
if (tool === 'Edit' || tool === 'Write') {
  if (/\\.(ts|tsx|js|jsx|py|rs|go|java|cs|cpp|c|hpp|h)\$/.test(file)
      && !/\\.test\\.|\\.spec\\.|__tests__|\\/tests\\//.test(file)) {
    if (/\\/\\/\\s*(TODO|FIXME|HACK)\\b|\\/\\*\\s*(TODO|FIXME|HACK)\\b|#\\s*(TODO|FIXME|HACK)\\b/.test(content)) {
      console.log('DENY_TODO'); process.exit(0);
    }
    if (/\\bplaceholder\\b|\\bstub\\b/i.test(content)) {
      console.log('DENY_STUB'); process.exit(0);
    }
  }
}

console.log('ALLOW');
" "$input" 2>/dev/null || echo "ALLOW")"

case "$result" in
  DENY_MCP)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: task files must be created via rulebook_task_create MCP tool, not manually. Use: rulebook_task_create({ taskId: phase1_your-task-name })"}}'
    ;;
  DENY_DEFERRED)
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"DENIED: tasks.md cannot contain deferred, skip, later, or TODO. Implement the item now or explain why impossible. See .claude/rules/no-deferred.md"}}'
    ;;
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
