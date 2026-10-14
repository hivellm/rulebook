# Proposal: phase3_codex-awareness

## Why
Codex reads AGENTS.override.md instead of AGENTS.md when both exist, so it never sees rulebook's rules; project hooks are untrusted in Codex and match Claude tool names, so the guards never apply there (docs/analysis/multi-session-performance/05-codex-and-9router.md F-032..F-034).

## What Changes
- Put a lean rulebook rules block where Codex reads it (override or a documented alternative).
- Document that Codex project hooks need trust and Codex tool names; decide whether to own .codex/hooks.json.

## Impact
- Affected specs: docs/analysis/multi-session-performance/08-execution-plan.md
- Affected code: templates/core/agents-lean.md, src/core/generators/*, docs/guides/*
- Breaking change: NO
- User benefit: Codex sessions get rulebook rules at all.
