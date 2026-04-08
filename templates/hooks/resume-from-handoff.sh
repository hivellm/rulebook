#!/usr/bin/env bash
# Claude Code SessionStart hook — auto-restore from handoff.
#
# Checks for `.rulebook/handoff/_pending.md`. If present, emits its
# contents as additionalContext so the new session begins with full
# prior-session context loaded, then archives the file to
# `.rulebook/handoff/<ISO-timestamp>.md` for history.

set -euo pipefail

# Read hook input from stdin to get the actual project cwd
input="$(cat || true)"
PROJECT_ROOT=""
if [[ -n "$input" ]] && command -v jq &>/dev/null; then
  PROJECT_ROOT="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || true)"
fi
[[ -z "$PROJECT_ROOT" ]] && PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
HANDOFF_DIR="${PROJECT_ROOT}/.rulebook/handoff"
PENDING="${HANDOFF_DIR}/_pending.md"
URGENT="${HANDOFF_DIR}/.urgent"
CONFIG_FILE="${PROJECT_ROOT}/.rulebook/rulebook.json"

# No pending handoff — nothing to inject
if [[ ! -f "$PENDING" ]]; then
  printf '%s' '{}'
  exit 0
fi

content="$(cat "$PENDING")"

# Archive the pending file with ISO timestamp
timestamp=$(date -u +"%Y-%m-%dT%H-%M-%S")
archive_name="${timestamp}.md"
mv "$PENDING" "${HANDOFF_DIR}/${archive_name}"

# Clear urgent sentinel if present
rm -f "$URGENT"

# Prune old handoff files (keep max N, default 50)
max_history=50
if [[ -f "$CONFIG_FILE" ]] && command -v jq &>/dev/null; then
  max_history=$(jq -r '.handoff.maxHistoryFiles // 50' "$CONFIG_FILE" 2>/dev/null || echo 50)
fi

# Count and prune (oldest first, skip _pending.md and .urgent)
history_count=$(find "$HANDOFF_DIR" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
if [[ "$history_count" -gt "$max_history" ]]; then
  excess=$(( history_count - max_history ))
  find "$HANDOFF_DIR" -maxdepth 1 -name "*.md" -type f -printf '%T@ %p\n' 2>/dev/null \
    | sort -n | head -"$excess" | awk '{print $2}' | xargs rm -f
fi

# Emit the handoff content as additionalContext
header="## Session restored from handoff (${archive_name})\n\nThe following context was saved by the previous session's /handoff skill:\n\n"
jq -nc --arg ctx "${header}${content}" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
exit 0
