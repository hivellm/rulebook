#!/usr/bin/env bash
# Claude Code UserPromptSubmit hook for rulebook-terse (v5.6.0).
#
# Parses slash commands + natural-language activation/deactivation
# phrases in the user prompt, updates the project-local flag file,
# and emits a short (~45 token) attention anchor as hookSpecificOutput
# when a persistent mode is active.
#
# Performance: fast-path bash trigger scan avoids spawning node when the
# prompt cannot change state. When state can change, a single node call
# parses stdin + configs and returns a pre-resolved decision
# (`set:<mode>` / `unset` / `noop`) plus the resolved cwd. Bash only
# applies filesystem changes after that.
#
# Silent-fails on every filesystem error.

set -u

input="$(cat || true)"

# Fast-path trigger scan over raw stdin payload. JSON-escaped string
# values still match these literal substrings (the trigger words contain
# no JSON-special characters), so this is a safe coarse filter. If none
# match, we skip node entirely.
TRIGGER_RE='(/rulebook-terse|terse mode|be terse|stop terse|disable terse|deactivate terse|turn off terse|enable terse|activate terse|turn on terse|normal mode|less tokens?)'
prompt_has_trigger=0
if [ -n "$input" ] && printf '%s' "$input" | grep -qiE "$TRIGGER_RE"; then
  prompt_has_trigger=1
fi

VALID_MODES_RE='^(off|brief|terse|ultra|commit|review)$'
MAX_FLAG_BYTES=32

read_flag() {
  # Symlink-safe, size-capped, whitelist-validated read.
  local flag_path="$1"
  [ ! -f "$flag_path" ] && return 1
  [ -L "$flag_path" ] && return 1
  local size
  size="$(wc -c < "$flag_path" 2>/dev/null || echo "$MAX_FLAG_BYTES")"
  [ "$size" -gt "$MAX_FLAG_BYTES" ] && return 1
  local raw
  raw="$(head -c "$MAX_FLAG_BYTES" "$flag_path" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ "$raw" =~ $VALID_MODES_RE ]]; then
    printf '%s' "$raw"
    return 0
  fi
  return 1
}

emit_anchor() {
  # Hand-construct the JSON. The text below contains no quotes,
  # backslashes, or control chars, so this is safe.
  local mode="$1"
  local keep_clause
  if [ "$mode" = "brief" ]; then
    keep_clause="Keep articles and full sentences."
  else
    keep_clause="Fragments OK."
  fi
  local text="RULEBOOK-TERSE ACTIVE (${mode}). Drop filler/hedging/pleasantries. ${keep_clause} Code/tests/commits/security: write full. Quality-gate failures + destructive ops: write full."
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}' "$text"
}

safe_write_flag() {
  local flag_path="$1"
  local content="$2"
  local dir
  dir="$(dirname "$flag_path")"
  mkdir -p "$dir" 2>/dev/null || return 0
  [ -L "$dir" ] && return 0
  [ -L "$flag_path" ] && return 0
  local tmp
  tmp="$(mktemp "$dir/.terse-mode.XXXXXX" 2>/dev/null)" || return 0
  {
    umask 077
    printf '%s' "$content" > "$tmp" 2>/dev/null || { rm -f "$tmp"; return 0; }
  }
  chmod 600 "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$flag_path" 2>/dev/null || rm -f "$tmp"
}

# Fast exit: no trigger in prompt → state cannot change. Just emit the
# anchor for the active persistent mode (if any) and return.
if [ "$prompt_has_trigger" -eq 0 ]; then
  PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
  active_mode="$(read_flag "${PROJECT_ROOT}/.rulebook/.terse-mode" || true)"
  case "$active_mode" in
    brief|terse|ultra) emit_anchor "$active_mode" ;;
  esac
  exit 0
fi

# Slow path: ONE node call does the entire parse + decision logic, then
# emits two lines: `cwd` and `decision` (one of `set:<mode>`, `unset`,
# `noop`). Bash only handles filesystem ops after that.
result="$(printf '%s' "$input" | RULEBOOK_TERSE_MODE="${RULEBOOK_TERSE_MODE:-}" node -e '
  const fs = require("fs");
  function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
  const VALID = /^(off|brief|terse|ultra|commit|review)$/;

  let data = {};
  try { data = JSON.parse(fs.readFileSync(0, "utf8")); } catch { }
  const prompt = String(data.prompt || "");
  const cwd = String(data.cwd || "");
  const lower = prompt.toLowerCase();

  // Resolve default mode: env > project config > user config > "terse".
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  let def = norm(process.env.RULEBOOK_TERSE_MODE);
  if (!VALID.test(def)) def = "";
  if (!def && cwd) {
    const pc = readJson(cwd + "/.rulebook/rulebook.json");
    const m = norm(pc && pc.terse && pc.terse.defaultMode);
    if (VALID.test(m)) def = m;
  }
  if (!def) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const xdg = process.env.XDG_CONFIG_HOME || (home ? home + "/.config" : "");
    if (xdg) {
      const uc = readJson(xdg + "/rulebook/config.json");
      const m = norm(uc && uc.terse && uc.terse.defaultMode);
      if (VALID.test(m)) def = m;
    }
  }
  if (!def) def = "terse";

  // Slash commands.
  let newMode = "";
  let deact = false;
  if (lower.startsWith("/rulebook-terse-commit")) newMode = "commit";
  else if (lower.startsWith("/rulebook-terse-review")) newMode = "review";
  else if (lower === "/rulebook-terse") newMode = def;
  else if (lower.startsWith("/rulebook-terse ")) {
    const arg = lower.split(/\s+/)[1] || "";
    if (arg === "off") deact = true;
    else if (/^(brief|terse|ultra|commit|review)$/.test(arg)) newMode = arg;
  }

  // Natural-language deactivation (checked first so "stop terse" wins).
  if (!newMode && !deact) {
    if (
      /\b(stop|disable|turn off|deactivate)\b.*\brulebook[- ]?terse\b/i.test(prompt) ||
      /\brulebook[- ]?terse\b.*\b(stop|disable|turn off|deactivate)\b/i.test(prompt) ||
      /\b(stop|disable) terse\b/i.test(prompt) ||
      /\bnormal mode\b/i.test(prompt)
    ) deact = true;
  }
  // Natural-language activation.
  if (!newMode && !deact) {
    if (
      /\b(activate|enable|turn on|start)\b.*\brulebook[- ]?terse\b/i.test(prompt) ||
      /\brulebook[- ]?terse\b.*\b(mode|activate|enable|turn on|start)\b/i.test(prompt) ||
      /\bbe terse\b/i.test(prompt) ||
      /\bterse mode\b/i.test(prompt) ||
      /\bless tokens?\b/i.test(prompt)
    ) newMode = def;
  }

  let decision = "noop";
  if (deact || newMode === "off") decision = "unset";
  else if (newMode) decision = "set:" + newMode;

  process.stdout.write(cwd + "\n" + decision);
' 2>/dev/null || printf '\nnoop')"

# First line = cwd, rest = decision.
cwd="$(printf '%s' "$result" | sed -n '1p')"
decision="$(printf '%s' "$result" | sed -n '2p')"

PROJECT_ROOT="${cwd:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
FLAG_PATH="${PROJECT_ROOT}/.rulebook/.terse-mode"

case "$decision" in
  unset)
    rm -f "$FLAG_PATH" 2>/dev/null || true
    ;;
  set:*)
    new_mode="${decision#set:}"
    safe_write_flag "$FLAG_PATH" "$new_mode"
    ;;
  *)  # noop
    ;;
esac

# Emit attention anchor for persistent modes only.
active_mode="$(read_flag "$FLAG_PATH" || true)"
case "$active_mode" in
  brief|terse|ultra) emit_anchor "$active_mode" ;;
esac
