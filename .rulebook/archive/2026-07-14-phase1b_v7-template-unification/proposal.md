# Proposal: phase1b_v7-template-unification

Source: docs/analysis/v7-performance/

## Why

After the context/spec diets, the template library itself remained v6-shaped:
19 language essays of 7–16 KB each, agent definitions with baked-in tier tables
(one with 9 KB of machine-specific boilerplate), 64 KB of git-hook tutorial
docs, retired-subsystem skills (terse/handoff/agent-automation), a library-rules
subsystem duplicating language rules, module skills duplicating deleted module
specs, and inconsistent SCREAMING_SNAKE filenames. User directives: update all
templates, simplify, unify, eliminate modules/libraries, normalize all names.

## What Changes

- All 19 remaining language templates rewritten lean (≤2.2 KB each) by a
  parallel agent fleet; the 9 core-language essays (dead after the lean-rule
  redirect) deleted.
- All 11 agent templates and 12 command docs slimmed (~50% and ~55% smaller).
- Git-hook doc templates rewritten lean (64 KB → ~10.5 KB).
- Library-rules subsystem eliminated: templates/libraries deleted, generation
  and prompts removed. Module skills (templates/skills/modules) deleted;
  retired-subsystem skills (terse/handoff/agent-automation/dag/etc.) deleted.
- The 17 retired always-on rule templates removed from templates/rules — the
  directory now holds ONLY the 8 lean language rule files (single source).
- ALL template filenames normalized lowercase kebab-case (core, git, hooks,
  cli, languages) with every reader updated; generated spec filenames already
  normalized (rulebook.md, quality.md, prohibitions.md, git.md, <lang>.md).
- This repo's own .claude/.rulebook cleaned: retired skills/agents/hooks/
  backups/handoff removed; specs regenerated lean lowercase.

## Impact

- Affected specs: all generated specs (naming + content)
- Affected code: generator.ts, rules-generator.ts, migrator.ts, merger.ts,
  init.ts, update.ts, prompts.ts, claude-md-generator.ts, override-manager.ts,
  plans-manager.ts; tests updated; retired-subsystem tests removed
- Breaking change: YES (template/spec names and file set; migration in phase5)
- User benefit: templates/ 1,219 KB → 564 KB (−54%); every on-demand read is
  lean; consistent lowercase naming everywhere; no duplicate subsystems
