#!/usr/bin/env bash
# Claude Code SessionStart hook (matcher: "compact").
#
# Re-injects critical architectural context after a conversation
# compaction. Claude Code already re-loads CLAUDE.md on compact, so
# this hook is defense-in-depth: it outputs a short, always-fresh
# cheat sheet from `.rulebook/COMPACT_CONTEXT.md` so the model has
# the load-bearing reminders immediately available without waiting
# for the CLAUDE.md re-read.
#
# The file is user-editable. Rulebook seeds it during `init` from a
# stack-specific template and never overwrites it afterward.

set -euo pipefail

PROJECT_ROOT="$(pwd)"
CONTEXT_FILE="${PROJECT_ROOT}/.rulebook/COMPACT_CONTEXT.md"

if [[ ! -f "$CONTEXT_FILE" ]]; then
  # Nothing to inject — emit a benign empty additionalContext.
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}}'
  exit 0
fi

content="$(cat "$CONTEXT_FILE")"

# Emit as additionalContext via jq so we correctly escape newlines/quotes.
jq -nc --arg ctx "$content" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
exit 0
