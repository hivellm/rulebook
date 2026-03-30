# Tasks

## Research & Analysis
- [x] Review current AGENTS.md git workflow section to identify duplicated hook instructions
- [x] Audit templates/git/GIT_WORKFLOW.md and CLI flows for hook handling gaps
- [x] Catalogue README content to decide what moves into /docs

## Git Hook Automation
- [x] Extend detectProject to surface existing .git/hooks/pre-commit and pre-push status
- [x] Update init and update commands to prompt for hook installation only when missing
- [x] Add hook generation utility with language-aware pre-commit and pre-push scripts
- [x] Integrate hook installer with CLI confirmation flow and gitHooks feature flag
- [x] Add unit tests for hook detection and installer logic

## Framework Detection & Templates  
- [x] Enhance language detection to infer frameworks (NestJS, Spring, Laravel, Angular, React, Vue, Nuxt)
- [x] Create framework-specific templates under templates/frameworks/ with quality gates
- [x] Ensure AGENTS generation inserts framework sections based on detection
- [x] Add detector tests proving framework inference works

## Minimal Mode & Documentation
- [x] Introduce --minimal toggle in CLI to scaffold only README, LICENSE, tests, basic CI
- [x] Update generators to skip OpenSpec, Watcher, MCP modules when minimal enabled
- [x] Refactor README template to keep root concise with extended details in /docs
- [x] Create supporting /docs materials (ARCHITECTURE, DEVELOPMENT, ROADMAP)

## Documentation & Quality Assurance
- [x] Remove duplicate Git hook instructions from AGENTS.md
- [x] Document manual hook installation commands for users who skip automation
- [x] Run full lint/test/build pipeline
- [x] Validate change with openspec validate --strict
- [x] Smoke-test rulebook init and update flows with new features
  - Full mode: Detected NestJS + React frameworks, generated framework blocks in AGENTS.md
  - Minimal mode: Skipped modules/frameworks, generated concise README and essentials only
  - Git hooks: Prompted correctly when missing, skipped when declined
  - Workflows: Full mode generated 3 files (test, lint, codespell), minimal mode generated 1 (test only)

## Summary
**26/26 tasks complete (100%)**

All implementation, testing, and QA tasks completed successfully!

## Implementation Notes

### Git Hook Automation
- Added `detectGitHooks()` returning preCommitExists/prePushExists
- Created `src/utils/git-hooks.ts` with language-aware generation for TS/JS, Rust, Python, Go, Java, C#
- CLI prompts for installation only when hooks missing
- gitHooks flag in .rulebook reflects actual state

### Framework Detection
- Added `detectFrameworks()` analyzing package.json, composer.json, config files
- 7 new templates: NestJS, Spring Boot, Laravel, Angular, React, Vue, Nuxt
- Framework blocks render in AGENTS.md after language sections
- Tests validate detection for all frameworks

### Minimal Mode
- New --minimal CLI flag plus interactive mode selector
- Skips OpenSpec, Watcher, MCP, AGENT_AUTOMATION in minimal mode
- Generates concise README linking to /docs
- Scaffolds LICENSE, tests/, ARCHITECTURE.md, DEVELOPMENT.md, ROADMAP.md

### Files Modified
- Core: types.ts, detector.ts, generator.ts, config-manager.ts
- CLI: commands.ts, prompts.ts, index.ts
- New: git-hooks.ts, minimal-scaffolder.ts
- Updated: docs-generator.ts, workflow-generator.ts
- Templates: 7 framework .md files
- Tests: 5 test files updated/created
- Documentation: AGENTS.md (hook duplication removed)
