#!/usr/bin/env bash
# Claude Code UserPromptSubmit hook for rulebook-terse (v5.4.0).
#
# Parses slash commands + natural-language activation/deactivation
# phrases in the user prompt, updates the project-local flag file,
# and emits a short (~45 token) attention anchor as hookSpecificOutput
# when a persistent mode is active — keeps the compression register in
# the model's attention on every user message.
#
# Independent sub-skill modes (commit / review) do NOT get the anchor:
# their own SKILL.md files drive behavior for the single turn they're
# invoked.
#
# Silent-fails on every filesystem error.

set -u

input="$(cat || true)"
prompt=""
cwd=""
if [ -n "$input" ]; then
  # Parse JSON via node (always available in Claude Code hook env).
  # Emits two lines: prompt on line 1, cwd on line 2.
  parsed="$(printf '%s' "$input" | node -e "
    try {
      const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      process.stdout.write((data.prompt || '') + '\\n' + (data.cwd || ''));
    } catch { process.stdout.write('\\n'); }
  " 2>/dev/null || printf '\n')"
  prompt="$(printf '%s' "$parsed" | head -n 1)"
  cwd="$(printf '%s' "$parsed" | tail -n +2)"
fi

PROJECT_ROOT="${cwd:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
FLAG_PATH="${PROJECT_ROOT}/.rulebook/.terse-mode"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/rulebook"
USER_CONFIG="${CONFIG_DIR}/config.json"
PROJECT_CONFIG="${PROJECT_ROOT}/.rulebook/rulebook.json"

VALID_MODES_RE='^(off|brief|terse|ultra|commit|review)$'
MAX_FLAG_BYTES=32

resolve_default_mode() {
  if [ -n "${RULEBOOK_TERSE_MODE:-}" ]; then
    local m="$(printf '%s' "$RULEBOOK_TERSE_MODE" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
    if [[ "$m" =~ $VALID_MODES_RE ]]; then printf '%s' "$m"; return; fi
  fi
  if [ -f "$PROJECT_CONFIG" ]; then
    local m
    m="$(node -e "
      try {
        const cfg = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        if (cfg.terse && cfg.terse.defaultMode) process.stdout.write(String(cfg.terse.defaultMode));
      } catch { }
    " "$PROJECT_CONFIG" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]' || true)"
    if [ -n "$m" ] && [[ "$m" =~ $VALID_MODES_RE ]]; then printf '%s' "$m"; return; fi
  fi
  if [ -f "$USER_CONFIG" ]; then
    local m
    m="$(node -e "
      try {
        const cfg = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        if (cfg.terse && cfg.terse.defaultMode) process.stdout.write(String(cfg.terse.defaultMode));
      } catch { }
    " "$USER_CONFIG" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]' || true)"
    if [ -n "$m" ] && [[ "$m" =~ $VALID_MODES_RE ]]; then printf '%s' "$m"; return; fi
  fi
  printf 'terse'
}

safe_write_flag() {
  local content="$1"
  local dir
  dir="$(dirname "$FLAG_PATH")"
  mkdir -p "$dir" 2>/dev/null || return 0
  [ -L "$dir" ] && return 0
  [ -L "$FLAG_PATH" ] && return 0

  local tmp
  tmp="$(mktemp "$dir/.terse-mode.XXXXXX" 2>/dev/null)" || return 0
  {
    umask 077
    printf '%s' "$content" > "$tmp" 2>/dev/null || { rm -f "$tmp"; return 0; }
  }
  chmod 600 "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$FLAG_PATH" 2>/dev/null || rm -f "$tmp"
}

read_flag() {
  # Symlink-safe, size-capped, whitelist-validated read.
  [ ! -f "$FLAG_PATH" ] && return 1
  [ -L "$FLAG_PATH" ] && return 1
  local size
  size="$(wc -c < "$FLAG_PATH" 2>/dev/null || echo "$MAX_FLAG_BYTES")"
  [ "$size" -gt "$MAX_FLAG_BYTES" ] && return 1

  local raw
  raw="$(head -c "$MAX_FLAG_BYTES" "$FLAG_PATH" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ "$raw" =~ $VALID_MODES_RE ]]; then
    printf '%s' "$raw"
    return 0
  fi
  return 1
}

default_mode="$(resolve_default_mode)"
lower_prompt="$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')"

# Parse intent. Order matters: deactivation wins over accidental
# activation, slash commands win over natural-language patterns.
new_mode=""
deactivate=0

# Slash commands
if [[ "$lower_prompt" == /rulebook-terse-commit* ]]; then
  new_mode="commit"
elif [[ "$lower_prompt" == /rulebook-terse-review* ]]; then
  new_mode="review"
elif [[ "$lower_prompt" == /rulebook-terse ]]; then
  new_mode="$default_mode"
elif [[ "$lower_prompt" == /rulebook-terse\ * ]]; then
  arg="$(printf '%s' "$lower_prompt" | awk '{print $2}')"
  case "$arg" in
    off) deactivate=1 ;;
    brief|terse|ultra|commit|review) new_mode="$arg" ;;
    *) : ;;  # unknown subcommand → leave state unchanged
  esac
fi

# Natural-language deactivation — checked first so "stop terse" wins.
if [ -z "$new_mode" ] && [ "$deactivate" -eq 0 ]; then
  if echo "$prompt" | grep -qiE '\b(stop|disable|turn off|deactivate)\b.*\brulebook[- ]?terse\b' \
     || echo "$prompt" | grep -qiE '\brulebook[- ]?terse\b.*\b(stop|disable|turn off|deactivate)\b' \
     || echo "$prompt" | grep -qiE '\b(stop|disable) terse\b' \
     || echo "$prompt" | grep -qiE '\bnormal mode\b'; then
    deactivate=1
  fi
fi

# Natural-language activation
if [ -z "$new_mode" ] && [ "$deactivate" -eq 0 ]; then
  if echo "$prompt" | grep -qiE '\b(activate|enable|turn on|start)\b.*\brulebook[- ]?terse\b' \
     || echo "$prompt" | grep -qiE '\brulebook[- ]?terse\b.*\b(mode|activate|enable|turn on|start)\b' \
     || echo "$prompt" | grep -qiE '\bbe terse\b' \
     || echo "$prompt" | grep -qiE '\bterse mode\b' \
     || echo "$prompt" | grep -qiE '\bless tokens?\b'; then
    new_mode="$default_mode"
  fi
fi

# Apply intent
if [ "$deactivate" -eq 1 ]; then
  rm -f "$FLAG_PATH" 2>/dev/null || true
elif [ -n "$new_mode" ]; then
  if [ "$new_mode" = "off" ]; then
    rm -f "$FLAG_PATH" 2>/dev/null || true
  else
    safe_write_flag "$new_mode"
  fi
fi

# Emit attention anchor for persistent modes only.
active_mode="$(read_flag || true)"
case "$active_mode" in
  brief|terse|ultra)
    if [ "$active_mode" = "brief" ]; then
      keep_clause="Keep articles and full sentences."
    else
      keep_clause="Fragments OK."
    fi
    text="RULEBOOK-TERSE ACTIVE (${active_mode}). Drop filler/hedging/pleasantries. ${keep_clause} Code/tests/commits/security: write full. Quality-gate failures + destructive ops: write full."
    # Emit hookSpecificOutput JSON via node — universal across platforms.
    node -e "
      const text = process.argv[1];
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: text
        }
      }));
    " "$text" 2>/dev/null || true
    ;;
  *)
    # No active persistent mode, or commit/review sub-skill — no anchor.
    :
    ;;
esac
