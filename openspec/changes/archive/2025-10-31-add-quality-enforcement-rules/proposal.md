# Proposal: Add Quality Enforcement Rules

## Why
AI models need strict, non-negotiable rules to prevent bypassing quality gates. Without explicit prohibitions, AI assistants often take shortcuts like:
- Skipping tests with .skip() or .only()
- Using --no-verify to bypass git hooks
- Creating boilerplate tests without real assertions
- Seeking creative workarounds instead of fixing root causes

This results in technical debt, broken CI/CD pipelines, and degraded code quality over time.

## What Changes
- **ADDED** Strict anti-bypass rules to prevent quality gate circumvention
  - Prohibits test skipping (.skip, .only, commenting out tests)
  - Prohibits git hook bypassing (--no-verify)
  - Prohibits boilerplate tests without real assertions
  - Enforces pragmatic problem-solving over creative shortcuts
- **ADDED** Light mode for minimal rule setup
  - Skips quality enforcement, testing, linting, coverage requirements
  - Use for quick prototypes or non-production projects
  - Flag: --light on init and update commands
- **ADDED** Automatic injection into all generated AGENTS.md
- **ADDED** Integration with update command to add rules to existing projects

## Impact
- Affected specs: core (quality enforcement template)
- Affected code: src/core/generator.ts, src/cli/commands.ts, src/index.ts, src/types.ts
- Breaking change: No (new feature with optional bypass)
- Default behavior: Quality rules active (can opt-out with --light)
- User benefit: Prevents technical debt and ensures quality standards
