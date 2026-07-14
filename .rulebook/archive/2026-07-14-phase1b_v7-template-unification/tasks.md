## 1. Implementation
- [x] 1.1 Rewrite the 19 non-core language templates to lean format (parallel agent fleet; ≤2.2 KB each, markers preserved) and delete the 9 dead core-language essays
- [x] 1.2 Slim all 11 agent templates and 12 command docs (tier tables, delegation mandates, machine-specific boilerplate removed; lowercase spec refs)
- [x] 1.3 Rewrite git-hook doc templates lean (5 files, 64 KB → ~10.5 KB) and sweep skills/workflows/cli for retired-subsystem references
- [x] 1.4 Eliminate library-rules subsystem (templates, generation, prompts, tests) and module skills; delete retired skills (terse/handoff/agent-automation/dag/documentation-rules/quality-enforcement duplicates)
- [x] 1.5 Unify templates/rules as single per-language source (17 retired always-on rule templates removed; 8 lean language files remain)
- [x] 1.6 Normalize ALL template filenames to lowercase kebab-case (core/git/hooks/cli/languages) and update every reader (generateCoreRules, claude-md-generator, override-manager, plans-manager, update.ts, generateGitRules, generateLeanAgents, generateLanguageRules)
- [x] 1.7 Clean this repo's own .claude/.rulebook (retired skills/agents/hook script/backups/handoff/canonical rules removed; specs regenerated lean lowercase)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG template-unification sections + impact ledger row
- [x] 2.2 Write tests covering the new behavior — generator/merger/migrator/rules tests updated to lowercase naming and retired-subsystem removal; obsolete terse/library test files removed
- [x] 2.3 Run tests and confirm they pass — full suite green: 885 tests passing
