#!/usr/bin/env bash
# v7.3 PreToolUse guard (Bash|Edit|Write): no OS-level scheduling (Tier 1 #7).
#
# Scheduling belongs in the application (job runner, queue, scheduler library),
# never in the operating system. This guard denies:
#   - Bash commands that create/install OS schedules (crontab, at, systemd
#     timers, launchd agents, Windows Task Scheduler);
#   - Edit/Write targets under OS scheduler directories.
# v7.5: only tool_input.command and tool_input.file_path are inspected — never
# the description, the edit text or the file contents — and heredoc bodies are
# skipped, so prose never reaches the patterns. Bash builtins only, no
# subprocess. RULEBOOK_GUARD_TRACE=1 reports the path taken on stderr.
set -uo pipefail
# Builtin read, no `cat` fork. `-N` reads in blocks (bash 4.1+); `-d ''` reads a
# pipe one byte per call, so it is only the fallback for bash 3.2 (macOS).
input=""
if (( BASH_VERSINFO[0] > 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] >= 1) )); then
  IFS= read -r -N 100000000 input || true
else
  IFS= read -r -d '' input || true
fi

trace() {
  if [[ -n "${RULEBOOK_GUARD_TRACE:-}" ]]; then
    printf 'no-os-scheduling: %s\n' "$1" >&2
  fi
}

pass() {
  trace "$1"
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

deny() {
  trace deny
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"No OS-level scheduling (Tier 1 #7): $1. Scheduling lives in the application — add a job runner / scheduler inside the app, or file a decision request with rulebook_task ask.\"}}"
  exit 0
}

# --- The two fields the guard reads ------------------------------------------
# Keys inside string values are escaped (\"command\"), so only the real
# tool_input keys match.
CMD_RE='"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)"'
FP_RE='"file_path"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)"'
cmd=""
fp=""
if [[ $input == *'"command"'* && $input =~ $CMD_RE ]]; then cmd="${BASH_REMATCH[1]}"; fi
if [[ $input == *'"file_path"'* && $input =~ $FP_RE ]]; then fp="${BASH_REMATCH[1]}"; fi
fp="${fp//\\\\/\/}"
fp="${fp//\\//}"

# --- Edit/Write tools: the target path ---------------------------------------
case "$fp" in
  /etc/cron*|/etc/anacrontab|/var/spool/cron/*|*/LaunchAgents/*.plist|*/LaunchDaemons/*.plist|/etc/systemd/*.timer|/usr/lib/systemd/*.timer|*/.config/systemd/user/*.timer)
    deny "scheduler file $fp"
    ;;
esac

# --- Bash tool: the command text ---------------------------------------------
if [[ -n "$cmd" ]]; then
  # JSON-unescape (\\ via a placeholder, then \" \n \t \r).
  cmd="${cmd//\\\\/$'\001'}"
  cmd="${cmd//\\\"/\"}"
  cmd="${cmd//\\n/$'\n'}"
  cmd="${cmd//\\t/$'\t'}"
  cmd="${cmd//\\r/}"
  cmd="${cmd//$'\001'/\\}"

  # Heredoc bodies are data, not commands: keep each operator line (its
  # redirects and pipes still count), drop the body up to the terminator.
  q="[\"'\\\\]?"
  HEREDOC_RE="(^|[^<])<<-?[[:space:]]*${q}([A-Za-z_][A-Za-z0-9_]*)${q}"
  rounds=0
  while [[ $cmd == *'<<'* && $cmd =~ $HEREDOC_RE ]] && (( rounds++ < 20 )); do
    op="${BASH_REMATCH[0]}"
    lead="${BASH_REMATCH[1]}"
    delim="${BASH_REMATCH[2]}"
    before="${cmd%%"$op"*}"
    rest="${cmd#*"$op"}"
    if [[ $rest != *$'\n'* ]]; then
      cmd="$before$lead$rest"
      continue
    fi
    body=$'\n'"${rest#*$'\n'}"
    if [[ $body == *$'\n'"$delim"$'\n'* ]]; then
      after="${body#*$'\n'"$delim"$'\n'}"
    else
      after="" # terminator on the last line, or unterminated: the body runs to the end
    fi
    cmd="$before$lead${rest%%$'\n'*}"$'\n'"$after"
  done
fi

# --- Fast path: no scheduler keyword in the command ---------------------------
# `at`/`batch` count only as a command word: at the start, or after a shell
# separator or newline.
AT_RE=$'(^|[;&|(\n])[[:space:]]*(sudo[[:space:]]+)?(at|batch)[[:space:]]'
case "$cmd" in
  *crontab*|*/etc/cron*|*anacron*|*spool/cron*|\
  *schtasks*|*ScheduledTask*|*ScheduledJob*|\
  *launchctl*|*LaunchAgents*|*LaunchDaemons*|\
  *.timer*|*systemd-run*) ;;
  *) if ! [[ $cmd =~ $AT_RE ]]; then pass fast; fi ;;
esac

# --- Slow path: anchored patterns on the command -----------------------------
# A command (or subcommand) starts at the beginning of the string or after a
# shell separator or newline — never in the middle of an argument.
START=$'(^|[;&|(\n][[:space:]]*)(sudo[[:space:]]+)?'

# crontab in any writing form (-e, -, <file>, -r); listing with -l alone is harmless.
if [[ "$cmd" =~ ${START}crontab([[:space:]]|$) ]] && ! [[ "$cmd" =~ crontab[[:space:]]+-l([[:space:]]|$) ]]; then
  deny "crontab"
fi
if [[ "$cmd" =~ ${START}(tee|cp|mv|ln|install)[[:space:]].*(/etc/cron|/var/spool/cron|/etc/anacrontab) ]] || [[ "$cmd" =~ \>[[:space:]]*/etc/(cron|anacrontab) ]]; then
  deny "writing under /etc/cron*"
fi
if [[ "$cmd" =~ ${START}(at|batch)[[:space:]]+(-f|-t|-m|now|midnight|noon|teatime|tomorrow|[0-9]) ]]; then
  deny "at/batch"
fi
if [[ "$cmd" =~ systemctl[[:space:]].*(enable|start|link|edit|reenable).*\.timer ]] || [[ "$cmd" =~ systemd-run[[:space:]].*--on- ]] || [[ "$cmd" =~ ${START}(tee|cp|mv|ln|install)[[:space:]].*systemd/[^[:space:]]*\.timer ]] || [[ "$cmd" =~ \>[[:space:]]*[^[:space:]]*systemd/[^[:space:]]*\.timer ]]; then
  deny "systemd timer"
fi
if [[ "$cmd" =~ launchctl[[:space:]]+(load|bootstrap|enable|submit|kickstart) ]] || [[ "$cmd" =~ ${START}(tee|cp|mv|ln|install)[[:space:]].*(LaunchAgents|LaunchDaemons)/ ]] || [[ "$cmd" =~ \>[[:space:]]*[^[:space:]]*(LaunchAgents|LaunchDaemons)/ ]]; then
  deny "launchd agent/daemon"
fi
if [[ "$cmd" =~ schtasks([[:space:]]|\.exe).*/[Cc](reate|hange) ]]; then
  deny "schtasks"
fi
if [[ "$cmd" =~ (Register|New|Set|Enable)-ScheduledTask ]] || [[ "$cmd" =~ Register-ScheduledJob ]]; then
  deny "PowerShell ScheduledTask"
fi

pass slow
