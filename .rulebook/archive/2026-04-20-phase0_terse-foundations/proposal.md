# Proposal: phase0_terse-foundations

Source: docs/analysis/caveman/

## Why

v5.4.0 introduces a `rulebook-terse` skill family inspired by the Caveman analysis. Before any hooks, CLI, or CI work starts we need the source-of-truth SKILL.md files drafted, a spec delta describing the new skill family, and a smoke-tested offline eval harness shape so later phases land on a solid foundation. This phase is scaffolding — no hooks, no production wiring.

## What Changes

- Draft `templates/skills/rulebook-terse/SKILL.md` as static content.
- Create `.rulebook/specs/rulebook-terse/spec.md` with ADDED Requirements for skill family, intensity levels, auto-clarity, and boundaries.
- Smoke-test the eval harness shape manually with a 3-prompt fixture — no CI integration yet.

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (new)
- Affected code: none (content only)
- Breaking change: NO
- User benefit: Design artifacts reviewable before implementation begins.
