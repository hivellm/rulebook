#!/usr/bin/env bash
# Claude Code SessionStart hook for rulebook-terse (v5.4.0).
#
# Resolves the active intensity mode, writes it to the project-local
# flag file via a symlink-safe path, reads the installed SKILL.md,
# filters the intensity table + example rows down to the active
# level only, and emits the filtered body to stdout — Claude Code
# injects SessionStart stdout as hidden `additionalContext`.
#
# Contract matches `.rulebook/specs/RULEBOOK_TERSE.md`. Silent-fails
# on every filesystem error so a broken hook never blocks session
# start.
#
# Configuration resolution (first match wins):
#   1. RULEBOOK_TERSE_MODE env var
#   2. $PROJECT_ROOT/.rulebook/rulebook.json → terse.defaultMode
#   3. $XDG_CONFIG_HOME/rulebook/config.json → terse.defaultMode
#   4. ~/.config/rulebook/config.json       → terse.defaultMode
#   5. "terse"

set -u

# Hook input may arrive on stdin as JSON — read it if present so we
# can resolve PROJECT_ROOT from the `cwd` field (Claude Code may
# invoke the hook from a sub-directory of the project).
input=""
if [ ! -t 0 ]; then
  input="$(cat)"
fi

PROJECT_ROOT=""
if [ -n "$input" ]; then
  PROJECT_ROOT="$(printf '%s' "$input" | node -e "
    try {
      const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      process.stdout.write(data.cwd || '');
    } catch { }
  " 2>/dev/null || true)"
fi
[ -z "$PROJECT_ROOT" ] && PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

FLAG_PATH="${PROJECT_ROOT}/.rulebook/.terse-mode"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/rulebook"
USER_CONFIG="${CONFIG_DIR}/config.json"
PROJECT_CONFIG="${PROJECT_ROOT}/.rulebook/rulebook.json"

VALID_MODES_RE='^(off|brief|terse|ultra|commit|review)$'

resolve_mode() {
  # 1. Env var
  if [ -n "${RULEBOOK_TERSE_MODE:-}" ]; then
    local m="$(printf '%s' "$RULEBOOK_TERSE_MODE" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
    if [[ "$m" =~ $VALID_MODES_RE ]]; then
      printf '%s' "$m"
      return
    fi
  fi

  # 2. Project config
  if [ -f "$PROJECT_CONFIG" ]; then
    local m
    m="$(node -e "
      try {
        const cfg = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        if (cfg.terse && cfg.terse.defaultMode) process.stdout.write(String(cfg.terse.defaultMode));
      } catch { }
    " "$PROJECT_CONFIG" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]' || true)"
    if [ -n "$m" ] && [[ "$m" =~ $VALID_MODES_RE ]]; then
      printf '%s' "$m"
      return
    fi
  fi

  # 3. User config
  if [ -f "$USER_CONFIG" ]; then
    local m
    m="$(node -e "
      try {
        const cfg = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
        if (cfg.terse && cfg.terse.defaultMode) process.stdout.write(String(cfg.terse.defaultMode));
      } catch { }
    " "$USER_CONFIG" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]' || true)"
    if [ -n "$m" ] && [[ "$m" =~ $VALID_MODES_RE ]]; then
      printf '%s' "$m"
      return
    fi
  fi

  printf 'terse'
}

# Symlink-safe flag-file write. Refuses if target or parent is a
# symlink; creates with 0600 via umask + atomic temp+rename.
safe_write_flag() {
  local content="$1"
  local dir
  dir="$(dirname "$FLAG_PATH")"

  mkdir -p "$dir" 2>/dev/null || return 0

  # Refuse if parent is itself a symlink.
  [ -L "$dir" ] && return 0
  # Refuse if target already exists as a symlink.
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

mode="$(resolve_mode)"

# "off" → unlink the flag and exit cleanly (no hidden-context emission).
if [ "$mode" = "off" ]; then
  rm -f "$FLAG_PATH" 2>/dev/null || true
  exit 0
fi

safe_write_flag "$mode"

# Locate the SKILL.md. Prefer the installed copy; fall back to the
# repo-local template when running inside the Rulebook source tree.
SKILL_PATHS=(
  "${PROJECT_ROOT}/.claude/skills/rulebook-terse/SKILL.md"
  "${PROJECT_ROOT}/templates/skills/core/rulebook-terse/SKILL.md"
)

skill_body=""
for p in "${SKILL_PATHS[@]}"; do
  if [ -f "$p" ]; then
    skill_body="$(cat "$p" 2>/dev/null || true)"
    break
  fi
done

# Emit the payload. When no SKILL.md is found, fall back to a
# minimal hardcoded ruleset — matches the Caveman pattern for
# standalone installs without templates.
if [ -z "$skill_body" ]; then
  cat <<EOF
RULEBOOK-TERSE MODE ACTIVE — level: ${mode}

## Persistence
ACTIVE EVERY RESPONSE once set. Off only via "/rulebook-terse off", "normal mode", or session end.

## Rules
Drop filler (just, really, basically), pleasantries, hedging. Keep technical terms exact. Code blocks byte-for-byte unchanged.

## Auto-Clarity
Full prose for: security warnings, destructive-op confirmations, quality-gate failures, multi-step sequences, user confusion.

## Boundaries
Code/tests/commits/specs: unchanged.
EOF
  exit 0
fi

# Header + filtered body. Filtering:
#   - Strip YAML frontmatter (everything up through the second `---`).
#   - Intensity-table rows `| **<level>** | ...` — keep only the active one.
#   - Example lines `- **<level>**: "..."` — keep only the active one.
#   - All other lines pass through unchanged.
#
# Uses `node -e` for portability — BSD awk (macOS default) does not
# support the 3-arg `match(str, re, array)` form that gawk ships with.
printf 'RULEBOOK-TERSE MODE ACTIVE — level: %s\n\n' "$mode"

printf '%s' "$skill_body" | node -e "
  let body = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { body += c; });
  process.stdin.on('end', () => {
    const active = process.argv[1];
    // Strip YAML frontmatter.
    const stripped = body.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    const out = [];
    for (const line of stripped.split('\n')) {
      const tableRow = line.match(/^\s*\|\s*\*\*([^*]+)\*\*\s*\|/);
      if (tableRow) {
        if (tableRow[1] === active) out.push(line);
        continue;
      }
      const exampleLine = line.match(/^\s*-\s*\*\*([^*]+)\*\*\s*:/);
      if (exampleLine) {
        if (exampleLine[1] === active) out.push(line);
        continue;
      }
      out.push(line);
    }
    process.stdout.write(out.join('\n'));
  });
" "$mode"
