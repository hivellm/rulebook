## 1. Implementation
- [x] 1.1 Rewrite templates/core/RULEBOOK.md lean (51 KB → ~3 KB): task format, spec-delta format, workflow, validation/archive — no essays (emitted spec now ~600 tok, was ~13k)
- [x] 1.2 Remove emission of TOKEN_OPTIMIZATION, AGENT_AUTOMATION, MULTI_AGENT from generateModularAgents; remove module-spec writing and Module Rules references (generateLeanAgents + AGENTS_LEAN template)
- [x] 1.3 Unify language specs with lean rule templates: generateLanguageRules prefers templates/rules/<slug>.md (frontmatter/sentinel stripped) for the 8 covered languages; legacy essays remain the fallback for the other languages
- [x] 1.4 Delete retired templates: templates/modules/* (9 MCP specs), core/TOKEN_OPTIMIZATION.md, core/AGENT_AUTOMATION.md, core/MULTI_AGENT.md, core/DAG.md, core/KNOWLEDGE.md, core/DECISIONS.md, core/DOCUMENTATION_RULES.md; also dead git/CI_CD_PATTERNS.md, git/GITHUB_ACTIONS.md, git/GITLAB_CI.md, git/SECRETS_MANAGEMENT.md; GIT_WORKFLOW.md rewritten lean (7.5k → ~450 tok)
- [x] 1.5 Remove dead module plumbing — generateModuleReference deleted; generateModuleRules retained (legacy merger/migrator paths degrade gracefully to a generic stub); all affected tests updated (generator, merger, migrator)

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation — CHANGELOG spec-diet sections + impact ledger row (specs 29,942 → 3,787 tok, −87%)
- [x] 2.2 Write tests covering the new behavior — v7 assertions in generator/merger/migrator tests (module refs absent, lean language headings)
- [x] 2.3 Run tests and confirm they pass — full suite green: 59 files, 994 tests passed
