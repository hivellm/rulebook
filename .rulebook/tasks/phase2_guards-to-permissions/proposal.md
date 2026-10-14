# Proposal: phase2_guards-to-permissions

## Why
Even with the prefilter fix the guards spawn a process per Bash/Edit/Write call; Claude Code can enforce both in-process (permissions.deny, hook `if`). But both guards answer "allow" on every passing call, silently auto-approving Bash/Edit/Write, so removing them changes permission prompts (docs/analysis/multi-session-performance/01-measured-overhead.md F-001..F-004; 06 F-039). Blocked on operator decision Q3.

## What Changes
- OS scheduling as permissions.deny: Bash and PowerShell rules + `Edit(...)` path rules (never `Write(...)`, which Claude Code never consults).
- Scaffolding guard behind the hook `if` field so it spawns only for .rulebook/tasks/**.
- Implicit allow replaced per Q3 (recommended: explicit permissions.allow rules written with consent at update).
- Codex keeps the script (no deny-rule equivalent).

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: src/core/claude/claude-settings-manager.ts, templates/hooks/*, tests/claude-settings-manager.test.ts, tests/os-scheduling-guard.test.ts
- Breaking change: Possibly (permission prompts) — depends on Q3
- User benefit: 0 rulebook process spawns per ordinary tool call (~83 ms/call, ~2,300 s summed per heavy session).
