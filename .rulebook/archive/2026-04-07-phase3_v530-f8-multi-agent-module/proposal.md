# Proposal: F8 — Multi-agent / Teams opt-in module

Source: [docs/analysis/v5.3.0/04-features.md#f8](../../../docs/analysis/v5.3.0/04-features.md)

## Why
tml has ~6 KB of policy on Teams usage; UzEngine has 30+ sub-agents. The pattern is real and recurring. Rulebook should ship the policy text as an opt-in module so projects don't have to write it from scratch.

## What Changes
- New `templates/core/MULTI_AGENT.md` containing the canonical multi-agent policy (Teams usage, SendMessage, when to spawn).
- Detector trigger: presence of `.claude/agents/` with ≥3 files OR explicit `multi_agent: true` in config.
- Pairs with F-NEW-1 hook (which enforces what this document says).
- AGENTS.md is updated to reference `MULTI_AGENT.md` when the trigger fires.

## Impact
- Affected specs: `templates/core/MULTI_AGENT.md` (new)
- Affected code: `src/core/detector.ts`, `src/core/generator.ts`
- Breaking change: NO
- User benefit: turnkey multi-agent policy without authoring 6 KB of rules
