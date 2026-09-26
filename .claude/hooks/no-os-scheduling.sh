#!/usr/bin/env bash
# v7.3 PreToolUse guard (Bash|Edit|Write): no OS-level scheduling (Tier 1 #7).
#
# Scheduling belongs in the application (job runner, queue, scheduler library),
# never in the operating system. This guard denies:
#   - Bash commands that create/install OS schedules (crontab, at, systemd
#     timers, launchd agents, Windows Task Scheduler);
#   - Edit/Write targets under OS scheduler directories.
# Everything else takes the fast path: a keyword prefilter runs first, so the
# patterns below only execute when the payload mentions a scheduler at all.
# Portable sh/sed -E (GNU and BSD), no jq.
set -euo pipefail
input="$(cat)"

allow() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
}

deny() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"No OS-level scheduling (Tier 1 #7): $1. Scheduling lives in the application — add a job runner / scheduler inside the app, or file a decision request with rulebook_task ask.\"}}"
  exit 0
}

# Fast path: nothing scheduler-like anywhere in the payload.
case "$input" in
  *crontab*|*/etc/cron*|*anacron*|*spool/cron*|\
  *schtasks*|*ScheduledTask*|*ScheduledJob*|\
  *launchctl*|*LaunchAgents*|*LaunchDaemons*|\
  *.timer*|*systemd-run*|\
  *' at '*|*'"at '*|*';at '*|*batch*) ;;
  *) allow ;;
esac

# A command (or subcommand) starts at the beginning of the string or after a
# shell separator — never in the middle of an argument or a commit message.
START='(^|[;&|(][[:space:]]*)(sudo[[:space:]]+)?'

# --- Bash tool: inspect the command string -----------------------------------
cmd="$(printf '%s' "$input" | sed -nE 's/.*"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)".*/\1/p' | head -1)"
if [[ -n "$cmd" ]]; then
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
fi

# --- Edit/Write tools: inspect the target path -------------------------------
fp="$(printf '%s' "$input" | sed -nE 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' | head -1)"
fp="${fp//\\\\/\/}"
fp="${fp//\\//}"
if [[ -n "$fp" ]]; then
  case "$fp" in
    /etc/cron*|/etc/anacrontab|/var/spool/cron/*|*/LaunchAgents/*.plist|*/LaunchDaemons/*.plist|/etc/systemd/*.timer|/usr/lib/systemd/*.timer|*/.config/systemd/user/*.timer)
      deny "scheduler file $fp"
      ;;
  esac
fi

allow
