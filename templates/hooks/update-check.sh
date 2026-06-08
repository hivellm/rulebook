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
#
# JSON is parsed/emitted with `node` (always present for a node CLI tool) so
# the hook does not depend on `jq` being installed.

set -euo pipefail

emit_none() { printf '%s' '{}'; exit 0; }

# node is required for JSON handling; without it, no-op gracefully.
command -v node &>/dev/null || emit_none

# Read a dotted field from a JSON file via node. Prints empty string on any
# error / missing key. Booleans print as `true`/`false`.
json_get() {
  node -e '
    const fs = require("fs");
    let raw = "";
    try { raw = fs.readFileSync(process.argv[1], "utf8"); } catch { process.exit(0); }
    try {
      let v = JSON.parse(raw);
      for (const k of process.argv[2].split(".")) v = v == null ? undefined : v[k];
      if (v !== undefined && v !== null) process.stdout.write(String(v));
    } catch {}
  ' "$1" "$2"
}

# --- Resolve project root (from stdin JSON cwd, else env, else pwd) ----------
input="$(cat || true)"
PROJECT_ROOT=""
if [[ -n "$input" ]]; then
  PROJECT_ROOT="$(printf '%s' "$input" | node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c)).on("end", () => {
      try { process.stdout.write(JSON.parse(d).cwd || ""); } catch {}
    });
  ' 2>/dev/null || true)"
fi
[[ -z "$PROJECT_ROOT" ]] && PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

CONFIG_FILE="${PROJECT_ROOT}/.rulebook/rulebook.json"
CACHE_FILE="${PROJECT_ROOT}/.rulebook/.update-check"
PKG="@hivehub/rulebook"
CACHE_TTL=86400 # 24h in seconds

[[ -f "$CONFIG_FILE" ]] || emit_none

installed="$(json_get "$CONFIG_FILE" version)"
[[ -z "$installed" ]] && emit_none

# Allow opt-out via config: { "updateCheck": { "enabled": false } }.
[[ "$(json_get "$CONFIG_FILE" updateCheck.enabled)" == "false" ]] && emit_none

# --- Determine latest version (cache-first) ---------------------------------
now="$(date -u +%s)"
latest=""
cache_ts=0
if [[ -f "$CACHE_FILE" ]]; then
  cache_ts="$(json_get "$CACHE_FILE" checkedAt)"; cache_ts="${cache_ts:-0}"
  latest="$(json_get "$CACHE_FILE" latest)"
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
    node -e '
      const fs = require("fs");
      try {
        fs.writeFileSync(process.argv[1], JSON.stringify({ latest: process.argv[2], checkedAt: Number(process.argv[3]) }));
      } catch {}
    ' "$CACHE_FILE" "$latest" "$now" 2>/dev/null || true
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
  node -e '
    console.log(JSON.stringify({
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: process.argv[1] },
    }));
  ' "$ctx"
  exit 0
fi

emit_none
