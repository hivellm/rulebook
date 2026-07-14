# Proposal: phase2_v7-hook-teardown

Source: docs/analysis/v7-performance/

## Why

v6 wires 7 hook entries across 5 events (F-002), including hooks on the two
hottest paths (UserPromptSubmit, Stop). The PreToolUse Agent hook **denies the
native background-subagent fan-out that Fable uses as a core working style**
(F-006) — the single clearest anchor behavior in v6 and a direct violation of
design principle P0. The content-regex guard also produces false-positive
denials on legitimate code (F-009), each costing a full recovery turn.

## What Changes

- Stop (handoff), UserPromptSubmit (terse), SessionStart ×4, and **PreToolUse
  Agent (teams enforcement)** hook generation is removed (P0: nothing may deny
  or mandate how the model orchestrates subagents/teams).
- `LEGACY_SIGNATURES` in claude-settings-manager.ts extended with all retired v6
  hook signatures so `rulebook update` cleans existing projects automatically.
- The surviving Edit|Write guard is rewritten path-only (protects
  `.rulebook/tasks/*/proposal.md` + `.metadata.json` scaffolding): pure bash,
  no node spawn, no content inspection.
- Content rules (TODO/stub markers) move to the quality gate (lint/pre-commit)
  where real parsers evaluate code instead of regex payloads.

## Impact

- Affected specs: AGENT_AUTOMATION.md, MULTI_AGENT.md, QUALITY_ENFORCEMENT.md
- Affected code: src/core/claude/claude-settings-manager.ts, templates/hooks/*,
  templates/git/* (pre-commit content checks)
- Breaking change: YES (hook set changes; update path cleans old entries)
- User benefit: zero hot-path latency, zero orchestration denials — Fable/Opus
  fan out subagents freely; no more false-positive edit denials
