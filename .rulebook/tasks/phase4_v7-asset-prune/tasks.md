## 1. Implementation
- [ ] 1.1 Make agent installation opt-in (`rulebook agents add <role>`); remove agents from default init
- [ ] 1.2 Reduce default skills to Rulebook-specific set (task flows, analysis); remove generic engineering skills from default install
- [ ] 1.3 Make workflows opt-in via `rulebook workflows add`
- [ ] 1.4 Delete handoff subsystem (templates, hooks, skill, spec sections, generation code); keep PLANS.md as optional scratchpad
- [ ] 1.5 Delete terse-mode subsystem (hooks, skills, tracker, spec sections)
- [ ] 1.6 Delete teams-enforcement and token-tier directive content everywhere it is generated
- [ ] 1.7 Add fixture test: default init produces ~15 files and no directive that denies or mandates orchestration (P0 check)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
