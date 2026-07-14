## 1. Implementation
- [x] 1.1 Make agent installation opt-in (`includeAgents` option on setupClaudeCodeIntegration); remove agents from default init — also removed the hidden side-effect installer inside generateModularAgents
- [x] 1.2 Reduce default skills to Rulebook-specific set — installDevSkills whitelists analysis/spec; INVOCABLE_CORE_SKILLS reduced to karpathy-guidelines; generateModularAgents no longer installs skills as a side effect
- [x] 1.3 Make workflows opt-in (`includeWorkflows` option); no default install
- [x] 1.4 Delete handoff subsystem remnants — init no longer creates .rulebook/handoff, gitignore entries removed, RulebookConfig.handoff type removed; PLANS.md kept as optional scratchpad
- [x] 1.5 Delete terse-mode subsystem remnants — src/hooks/safe-flag-io.ts + test deleted (src/hooks now empty), RulebookConfig.terse type removed, terse skill IDs dropped from INVOCABLE_CORE_SKILLS, stale terse text cleaned from claude.ts
- [x] 1.6 Delete teams-enforcement and token-tier directive content everywhere it is generated — delegation-table section removed from generateAgentsContent output, enforceTeamForBackgroundAgents config removed; multiAgent.enabled now only sets the feature env var
- [x] 1.7 Add fixture test: no orchestration-denying or -mandating directive in generated context (P0 check) plus the affirmative freedom line — context-budget.test.ts; default-install file count tracked by the benchmark (95 baseline → 29)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG phase4 sections + impact ledger row
- [x] 2.2 Write tests covering the new behavior — opt-in default test in claude-mcp-setup, P0 orchestration-freedom test; retired safe-flag-io test removed
- [x] 2.3 Run tests and confirm they pass — full suite green: 835 tests passing
