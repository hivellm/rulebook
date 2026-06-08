# Proposal: phase4_prune-skill-and-agent-library

## Why

The template library ships **90 skills** (`templates/skills/**/SKILL.md`) and
**46 agent templates**, but real adoption is tiny:

- Skills enabled per project: **1** (Cortex, Tml, Nexus, Synap, HiveGPU,
  TmlDocs, Vectorizer) to **3** (Rulebook) — roughly **2% of the library**.
- Tml installs 61 skills and enables 1.

Shipping 90 skills + 46 agents per project is dead surface: maintenance burden,
slow install, and noise in `.claude/`. The user's decision is an **aggressive
prune** of the library down to what is actually used.

## What Changes

- Determine the empirically-used set first: union of (a) skills enabled in each
  project's `rulebook.json`, (b) slash commands present in `.claude/commands/`,
  (c) agents referenced by the AGENTS.md delegation table
  (`implementer`, `researcher`, `tester`, `code-reviewer`, `architect`,
  `docs-writer`, `build-engineer`, `security-reviewer`, `team-lead`).
- Keep that used set plus the core workflow skills (`task-*`, `handoff`,
  `continue`, `analysis`, the `rulebook-*` skills).
- Remove the remaining skills and agent templates from `templates/`.
- Keep the install path lean: a default `init` provisions only the core; the
  pruned library no longer exists to be copied.

## Impact

- Affected specs: `specs/skill-agent-library/spec.md` (this task)
- Affected code: `templates/skills/**`, `templates/agents/**` (or equivalent),
  `src/core/skills/skills-manager.ts`, the agent template engine, related tests
- Breaking change: YES — removes skills/agents from the shipped library
  (target release 6.0.0). Projects that manually enabled a now-removed skill
  keep their local copy; it is simply no longer in the template source.
- User benefit: far smaller install footprint, less `.claude/` noise, lower
  maintenance surface; the skills/agents people actually use remain.

## Risk

The "used set" must be derived from data (item 1.1), not guessed, so a genuinely
used-but-rarely-enabled skill is not dropped. The keep-list is reviewed before
any deletion.
