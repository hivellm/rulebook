#!/usr/bin/env bash
# PreToolUse hook: deny stubs, TODOs, placeholders in source code
#
# Policy: no // TODO, // FIXME, // HACK, placeholder, stub in committed code.
# Applies to Edit and Write on source files (not markdown, not tests).

set -euo pipefail
input="$(cat)"

tool="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null || true)"
if [[ "$tool" != "Edit" && "$tool" != "Write" ]]; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // empty' 2>/dev/null || true)"

# Only check source files, not markdown/config/tests
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.rs|*.go|*.java|*.cs|*.cpp|*.c|*.hpp|*.h)
    ;;
  *)
    printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
    exit 0
    ;;
esac

# Skip test files — TODOs in tests are less critical
if echo "$file" | grep -qiE '\.test\.|\.spec\.|__tests__|/tests/'; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

content="$(printf '%s' "$input" | jq -r '.tool_input.new_string // .tool_input.content // empty' 2>/dev/null || true)"

if echo "$content" | grep -qE '//\s*(TODO|FIXME|HACK)\b|/\*\s*(TODO|FIXME|HACK)\b|#\s*(TODO|FIXME|HACK)\b'; then
  reason="DENIED: source code cannot contain // TODO, // FIXME, or // HACK comments. Implement the logic now or ask for guidance. See .claude/rules/no-shortcuts.md"
  jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
fi

if echo "$content" | grep -qiE '\bplaceholder\b|\bstub\b|return\s+0;\s*//|return\s+null;\s*//\s*fix'; then
  reason="DENIED: source code cannot contain placeholders or stubs. Implement the real logic. See .claude/rules/no-shortcuts.md"
  jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
fi

printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
exit 0
