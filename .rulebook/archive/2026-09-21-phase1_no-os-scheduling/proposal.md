# Proposal: phase1_no-os-scheduling

## Why
Agents keep solving "this must run periodically" by reaching for the operating
system: `crontab -e`, `schtasks /create`, a launchd plist, a systemd timer. That
schedule lives outside the repository — untested, invisible to the team, tied to
one machine and one user account — and it keeps running after the task is over.
Anything that needs scheduling belongs in the application (its job runner, queue
or scheduler library), where it is committed, reviewed and tested.

## What Changes
- Tier 1 prohibition #7 in `prohibitions.md`: no OS-level scheduling in any form
  (cron/anacron/`at`, systemd timers, launchd agents/daemons, Windows Task
  Scheduler via `schtasks` or PowerShell `*-ScheduledTask`), nor the harness's
  own scheduler as a stand-in for application scheduling.
- One-line clause in the generated `CLAUDE.md` and lean `AGENTS.md`, inside the
  always-loaded context budget.
- A second optional PreToolUse guard, `no-os-scheduling.sh`, in the same
  cheap style as the task-scaffolding guard: on `Bash` it denies commands that
  create or install OS schedules; on `Edit|Write` it denies paths under the OS
  scheduler directories. Everything else is allowed on the fast path.
- `applyClaudeSettings` gains `osSchedulingGuard`; `rulebook init`, `rulebook
  update` and `rulebook claude` turn it on.

## Impact
- Affected specs: prohibitions
- Affected code: templates/core/prohibitions.md, templates/core/claude-md.md,
  templates/core/agents-lean.md, templates/hooks/no-os-scheduling.sh,
  src/core/claude/claude-settings-manager.ts, src/cli/commands/{init,update,claude}.ts
- Breaking change: NO (a new hook entry; the guard only denies scheduler commands/paths)
- User benefit: schedules stop leaking into the OS; recurring work is code in the app
