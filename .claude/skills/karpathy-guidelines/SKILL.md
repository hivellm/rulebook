---
name: "Karpathy Guidelines"
description: "Behavioral guidelines to reduce common LLM coding mistakes — overcomplication, sloppy refactors, hidden assumptions, weak goals. Use when writing, reviewing, or refactoring code. Auto-applies; invoke explicitly via /karpathy-guidelines or 'follow karpathy discipline'."
version: "1.0.0"
category: "core"
author: "Andrej Karpathy (originator) / forrestchang (skill packaging) / Rulebook (Rulebook adaptation)"
tags: ["core", "discipline", "quality"]
dependencies: []
conflicts: []
license: "MIT"
upstream: "https://github.com/forrestchang/andrej-karpathy-skills"
source: "https://x.com/karpathy/status/2015883857489522876"
---
<!-- KARPATHY_GUIDELINES:START -->
# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on LLM coding pitfalls.

**Tradeoff:** these guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "write tests for invalid inputs, then make them pass."
- "Fix the bug" → "write a test that reproduces it, then make it pass."
- "Refactor X" → "ensure tests pass before and after."

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Interaction with Rulebook

This skill complements existing Rulebook rules:

- `no-shortcuts.md` forbids stubs/TODOs; **Simplicity First** forbids the opposite — bloat.
- `research-first.md` requires investigating unknowns; **Think Before Coding** adds *surfacing* what was investigated.
- `incremental-implementation.md` tests each step; **Goal-Driven Execution** adds defining the test up front.
- **Surgical Changes** has no Rulebook counterpart and fills a real gap: no rule today forbids opportunistic refactor of adjacent code.

Skill body is deliberately small (≤80 lines) so it adds < 1KB to the context budget per session.

<!-- KARPATHY_GUIDELINES:END -->
