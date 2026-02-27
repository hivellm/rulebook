# Proposal: Update Rulebook Hooks and Framework Templates

## Why
Teams adopting Rulebook today are forced to manually wire Git hooks, reconcile duplicated instructions in `AGENTS.md`, and sift through an overloaded README before they can ship. The CLI never offers to install hooks automatically, framework-specific guidance lags behind current ecosystem defaults, and new users face 35+ workflows on day one. These gaps slow onboarding, create inconsistent automation, and bury essential guidance under noise.

## What Changes
- **ADDED** optional Git hook automation that detects existing hooks and installs language-aware `pre-commit` and `pre-push` scripts only when requested during `init` or `update`
- **ENHANCED** project detection to identify popular backend/frontend frameworks (NestJS, Spring, Laravel, Angular, React, Vue, Nuxt, etc.) and inject up-to-date instructions
- **UPDATED** templates (`AGENTS.md`, `templates/git/GIT_WORKFLOW.md`, framework docs) to remove duplicated Git guidance and add framework playbooks
- **INTRODUCED** a `--minimal/--essentials` mode that scaffolds only README, LICENSE, basic tests, and CI while skipping OpenSpec, Watcher, MCP, and heavy templates
- **REFACTORED** README generation to keep root content concise and relocate deep dives into `/docs`
- **DOCUMENTED** manual hook installation workflow for teams that opt out of automation

## Impact
- Affected specs: CLI initialization/update flows, template generation, documentation structure
- Affected code: `src/core/detector.ts`, `src/cli/commands.ts`, `src/cli/prompts.ts`, `src/core/generator.ts`, template assets under `templates/`
- Breaking change: None (features remain opt-in; default behavior preserved)
- New dependencies: None (hook scripts generated with existing tooling)

