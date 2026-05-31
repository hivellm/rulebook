#!/usr/bin/env bash
# Claude Code Stop hook — context freshness monitor.
#
# Runs after every model turn. Estimates the current context usage
# from the JSONL transcript and, when it exceeds the configured
# threshold, instructs the model to invoke the /handoff skill and tell
# the user to type /clear. The Stop event has no `additionalContext`
# field, so force mode uses `decision:"block"`+`reason` (fed to the
# model) and warn mode uses `systemMessage` (surfaced to the user).
#
# Thresholds are read from .rulebook/rulebook.json `handoff` section.
# Defaults: warn=75, force=90 (percentage of estimated max context).

set -euo pipefail

# Read the hook input from stdin (Claude Code passes it as JSON)
input="$(cat)"

# Resolve project root from hook input cwd, NOT $(pwd) — the hook may be
# invoked from a sub-directory the user is currently editing.
PROJECT_ROOT=""
if [[ -n "$input" ]] && command -v jq &>/dev/null; then
  PROJECT_ROOT="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || true)"
fi
[[ -z "$PROJECT_ROOT" ]] && PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

CONFIG_FILE="${PROJECT_ROOT}/.rulebook/rulebook.json"
HANDOFF_DIR="${PROJECT_ROOT}/.rulebook/handoff"

# Defaults
WARN_PCT=75
FORCE_PCT=90
MAX_CONTEXT_CHARS=1600000  # ~400k tokens ≈ 1.6M chars (rough 1:4 ratio)

# Override from config if available
if [[ -f "$CONFIG_FILE" ]] && command -v jq &>/dev/null; then
  WARN_PCT=$(jq -r '.handoff.warnThresholdPct // 75' "$CONFIG_FILE" 2>/dev/null || echo 75)
  FORCE_PCT=$(jq -r '.handoff.forceThresholdPct // 90' "$CONFIG_FILE" 2>/dev/null || echo 90)
fi

# Resolve transcript size from the payload's transcript_path. Claude Code
# always passes this in Stop hook stdin (Anthropic hook spec), so we avoid
# scanning $HOME/.claude/projects — which grows linearly with session count
# and also returns the wrong file in concurrent sessions.
transcript_size=0

if [[ -n "$input" ]] && command -v jq &>/dev/null; then
  transcript_path="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null || true)"
  if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
    transcript_size=$(stat -c%s "$transcript_path" 2>/dev/null || stat -f%z "$transcript_path" 2>/dev/null || echo 0)
  fi
fi

# If we couldn't get transcript size, emit nothing (no-op)
if [[ "$transcript_size" -eq 0 ]]; then
  printf '%s' '{}'
  exit 0
fi

# Estimate context percentage
pct=$(( transcript_size * 100 / MAX_CONTEXT_CHARS ))

if [[ "$pct" -ge "$FORCE_PCT" ]]; then
  # Force mode: write urgent sentinel + emit strong instruction
  mkdir -p "$HANDOFF_DIR"
  touch "${HANDOFF_DIR}/.urgent"
  # Block exactly once: drive the model to invoke /handoff. After the handoff
  # file exists, switch to a non-blocking systemMessage so we don't trap the
  # model in a stop-loop that burns context at the worst possible moment.
  if [[ -f "${HANDOFF_DIR}/_pending.md" ]]; then
    msg="⚠️ CONTEXT AT ${pct}% — handoff already saved to .rulebook/handoff/_pending.md. >>> TYPE /clear NOW — your context will be auto-restored in the next session <<<"
    jq -nc --arg msg "$msg" '{ systemMessage: $msg }'
  else
    msg="⚠️ CONTEXT AT ${pct}% (FORCE THRESHOLD). You MUST invoke /handoff NOW to save session state to .rulebook/handoff/_pending.md. After it succeeds, tell the user: '>>> TYPE /clear NOW — your context will be auto-restored in the next session <<<'. Do NOT continue working until the user has typed /clear."
    jq -nc --arg msg "$msg" '{ decision: "block", reason: $msg }'
  fi
elif [[ "$pct" -ge "$WARN_PCT" ]]; then
  msg="⚠️ Context at ${pct}%. Recommended: invoke /handoff to save session state, then type /clear for a fresh session."
  jq -nc --arg msg "$msg" '{ systemMessage: $msg }'
else
  # Below threshold — no-op
  printf '%s' '{}'
fi
exit 0
