#!/usr/bin/env bash
# PreToolUse hook (v5.9.0): consolidated deny rules — perf-optimized.
#
# Matcher is Edit|Write only (Bash excluded) so it never fires on the
# most frequent tool. A pure-bash trigger pre-filter short-circuits to
# "allow" without spawning node for the overwhelming majority of edits;
# node is only invoked when the raw payload contains a suspicious token,
# keeping per-call cost at ~one bash spawn for normal work.
#
# Rules enforced (unchanged semantics):
#   mcp-for-tasks  — block manual creation of task proposal.md/.metadata.json
#   no-deferred    — tasks.md must not contain deferred/skip/later/TODO
#   no-shortcuts   — source files must not contain TODO/FIXME/HACK or stub/placeholder
set -euo pipefail
input="$(cat)"

allow() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

# Fast path: if the raw payload contains no trigger token at all, allow
# immediately without spawning node. deferred/skip/later only matter inside
# tasks.md, which is already caught by the "tasks.md" path token below.
shopt -s nocasematch
case "$input" in
  *TODO*|*FIXME*|*HACK*|*placeholder*|*stub*|*tasks.md*|*proposal.md*|*.metadata.json*) ;;
  *) allow ;;
esac
shopt -u nocasematch

result="$(node -e "
const input = JSON.parse(process.argv[1]);
const tool = input.tool_name || '';
const ti = input.tool_input || {};
const file = (ti.file_path || ti.filePath || '').replace(/\\\\/g, '/');
const content = ti.new_string || ti.content || '';

// Rule: mcp-for-tasks — manual creation of task scaffolding is forbidden.
if (tool === 'Write' || tool === 'Edit') {
  const m = file.match(/\.rulebook\/tasks\/[^/]+\/(proposal\.md|\.metadata\.json)\$/);
  if (m) {
    try { require('fs').accessSync(file); /* existing file: allow edit */ }
    catch { console.log('DENY_MCP'); process.exit(0); }
  }
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
