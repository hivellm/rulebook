# Proposal: phase3_jev-tool-gate-hook

## Why
The prompt gate (`phase2_jev-prompt-gate-hook`) judges what the operator asked
for, not what the agent then does. A subagent can still run a destructive
command, print a secret, or edit far outside the task, and the only checks at
that point are two keyword guards (OS scheduling, task scaffolding). A
`PreToolUse` hook that asks Jev a few yes/no questions about each risky tool
call — after the cheap deterministic checks, in one batched call, with caching
and a tight time budget — adds judgment where keyword rules run out, and still
lets work continue when Jev is down.

## What Changes
- New event `rulebook hook tool-gate` in `src/cli/commands/hook.ts`, backed by
  a new module `src/core/typesafe/tool-gate.ts`: builds a compact, redacted
  summary of the call (tool, command or file path, edit sizes, short content
  preview) plus a small project context (id, languages, active task, Tier 1
  rules), asks Jev one batched request with one noul per criterion, and maps
  the per-criterion probabilities to a `permissionDecision`.
- Criteria (probability the call is fine): `safe_reversible`,
  `no_secret_exposure`, `follows_project_rules`, and `in_task_scope` when a
  task is active. Below `denyBelow` (0.5) → `deny`; below `askBelow` (0.7) →
  `ask`; `in_task_scope` is capped at `ask`. All criteria pass → no decision
  (the normal permission flow applies; the hook never emits `allow`).
- Cheap checks first: the wrapper `jev-gate.sh tool` runs the installed
  `no-os-scheduling.sh` guard on the same input and stops on its `deny`
  without calling Jev; a new deterministic destructive-git check
  (`reset --hard`, `push --force`/`-f`, `clean -f`, `checkout -- .`,
  `restore .`, `stash`, `branch -D`) returns `ask` citing the Git safety rules,
  also without a Jev call. Claude Code runs matching hooks in parallel, so the
  ordering lives inside this one hook.
- Secrets redaction: a new `redactSecrets()` in `src/core/typesafe/client.ts`
  wraps the existing `redact()` and adds common credential shapes; `.env*`
  file contents are never sent.
- Latency and cost: `gate.toolHook.deadlineMs` (default 2000 ms); an on-disk
  cache `.rulebook/cache/tool-gate.json` keyed by a hash of the redacted
  summary + active task (TTL 15 min, 200 entries); only Jev answers are cached.
- Fail-open on every error path: exit 0, no output.
- Config `gate.toolHook` (`enabled` — default false, `matcher` — default
  `Bash|Edit|Write`, `denyBelow`, `askBelow`, `deadlineMs`, `cacheTtlMs`);
  installer upserts a `PreToolUse` entry with signature `jev-tool-gate`.

## Impact
- Affected specs: gate-hooks (tool-call gate added)
- Affected code: src/core/typesafe/tool-gate.ts (new), src/core/typesafe/client.ts, src/cli/commands/hook.ts, src/core/claude/claude-settings-manager.ts, src/cli/commands/init.ts, update.ts, claude.ts, src/types.ts, templates/hooks/jev-gate.sh
- Breaking change: NO (opt-in; fail-open; never emits `allow`, so user permission rules are unchanged)
- User benefit: risky tool calls by any agent get a Jev check with a reason, while cheap rules still run first and a Jev outage never stops work
- Depends on: phase2_jev-prompt-gate-hook (hook CLI, wrapper, installer, `gate` config section)
