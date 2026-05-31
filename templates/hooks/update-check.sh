#!/usr/bin/env bash
# Claude Code SessionStart hook — rulebook update check.
#
# Compares the project's installed rulebook version (.rulebook/rulebook.json
# → version) against the latest published @hivehub/rulebook on npm. When a
# newer version exists, emits an additionalContext advisory so Claude can
# offer to run `rulebook update`. The npm lookup is cached for 24h in
# .rulebook/.update-check to keep session start fast and offline-friendly.
#
# Emits `{}` (no-op) on any of: no config, no network/npm, already current,
# cache still fresh with no known update, or any error. Never blocks startup.

set -euo pipefail

# --- Resolve project root (from stdin JSON cwd, else env, else pwd) ----------
input="$(cat || true)"
PROJECT_ROOT=""
if [[ -n "$input" ]] && command -v jq &>/dev/null; then
  PROJECT_ROOT="$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null || true)"
fi
[[ -z "$PROJECT_ROOT" ]] && PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

CONFIG_FILE="${PROJECT_ROOT}/.rulebook/rulebook.json"
CACHE_FILE="${PROJECT_ROOT}/.rulebook/.update-check"
PKG="@hivehub/rulebook"
CACHE_TTL=86400 # 24h in seconds

emit_none() { printf '%s' '{}'; exit 0; }

# Need jq + a config to do anything useful.
command -v jq &>/dev/null || emit_none
[[ -f "$CONFIG_FILE" ]] || emit_none

installed="$(jq -r '.version // empty' "$CONFIG_FILE" 2>/dev/null || true)"
[[ -z "$installed" ]] && emit_none

# Allow opt-out via config: { "updateCheck": { "enabled": false } }.
# Note: jq's `//` treats `false` as empty, so `.updateCheck.enabled // true`
# would wrongly yield true when explicitly disabled — test the value directly.
enabled="$(jq -r 'if .updateCheck.enabled == false then "false" else "true" end' "$CONFIG_FILE" 2>/dev/null || echo true)"
[[ "$enabled" == "false" ]] && emit_none

# --- Determine latest version (cache-first) ---------------------------------
now="$(date -u +%s)"
latest=""
cache_ts=0
if [[ -f "$CACHE_FILE" ]]; then
  cache_ts="$(jq -r '.checkedAt // 0' "$CACHE_FILE" 2>/dev/null || echo 0)"
  latest="$(jq -r '.latest // empty' "$CACHE_FILE" 2>/dev/null || true)"
fi

age=$(( now - cache_ts ))
if [[ -z "$latest" || "$age" -ge "$CACHE_TTL" ]]; then
  # Cache miss or stale — query npm with a hard timeout so startup never hangs.
  fetched=""
  if command -v npm &>/dev/null; then
    if command -v timeout &>/dev/null; then
      fetched="$(timeout 5 npm view "$PKG" version 2>/dev/null || true)"
    else
      fetched="$(npm view "$PKG" version 2>/dev/null || true)"
    fi
  fi
  if [[ -n "$fetched" ]]; then
    latest="$fetched"
    # Refresh cache (best-effort; ignore write failures).
    jq -nc --arg l "$latest" --argjson t "$now" \
      '{latest: $l, checkedAt: $t}' > "$CACHE_FILE" 2>/dev/null || true
  fi
fi

# No latest resolved (offline / first run with no network) — no-op.
[[ -z "$latest" ]] && emit_none

# --- Compare semver (numeric major.minor.patch, ignoring pre-release) -------
ver_gt() {
  # returns 0 (true) if $1 > $2
  local a="${1%%-*}" b="${2%%-*}"
  local IFS=.
  # shellcheck disable=SC2206
  local A=($a) B=($b)
  for i in 0 1 2; do
    local ai="${A[i]:-0}" bi="${B[i]:-0}"
    # Strip non-numeric just in case.
    ai="${ai//[!0-9]/}"; bi="${bi//[!0-9]/}"
    ai="${ai:-0}"; bi="${bi:-0}"
    if (( ai > bi )); then return 0; fi
    if (( ai < bi )); then return 1; fi
  done
  return 1
}

if ver_gt "$latest" "$installed"; then
  ctx="## Rulebook update available\n\nThis project is on rulebook **${installed}**, but **${latest}** is published on npm.\n\nAsk the user whether they want to update. If they agree, run \`rulebook update\` (or \`npx ${PKG}@latest update\`) to regenerate the rules to the latest version, then review the diff before committing. Do not update without the user's confirmation."
  jq -nc --arg ctx "$ctx" '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $ctx
    }
  }'
  exit 0
fi

emit_none
