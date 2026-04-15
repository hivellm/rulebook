---
name: rulebook-quality-gates
description: "Runs type-check, linter, formatter, test suite, and coverage validation as pre-commit and pre-push gates. Use when validating code before commits, configuring git hooks for automated checks, fixing lint or type-check failures, ensuring 95%+ test coverage, or enforcing zero-warning builds."
version: "1.0.0"
category: core
author: "HiveLLM"
tags: ["quality", "testing", "coverage", "linting", "pre-commit", "git-hooks"]
dependencies: []
conflicts: []
---

# Quality Gates Enforcement

## Pre-Commit Checklist

**MUST run these checks before every commit — fix failures at each step before proceeding:**

```bash
npm run type-check    # 1. Type errors (fix before linting)
npm run lint          # 2. Lint (0 warnings required)
npm run format        # 3. Format check
npm test              # 4. All tests (100% pass)
npm run build         # 5. Build verification
npm run test:coverage # 6. Coverage (95%+ required)
```

**If ANY check fails → FIX → re-run that check → continue.**

## Quality Thresholds

| Check | Requirement | Fix Command |
|-------|-------------|-------------|
| Type Check | Zero errors | `npm run type-check` to see errors |
| Lint | Zero warnings | `npm run lint:fix` for auto-fixable issues |
| Format | Matches Prettier config | `npm run format -- --write` to auto-format |
| Tests | 100% pass rate | `npm test` to see failures |
| Coverage | 95%+ | `npm run test:coverage` to see report |
| Build | Must succeed | `npm run build` to see errors |

## Git Hooks

Install automated enforcement with:

```bash
rulebook init  # Prompts to install hooks
```

### Pre-commit Hook
Runs format, lint, and type-check. Blocks commit on failure.

### Pre-push Hook
Runs build, full test suite, and coverage threshold check. Blocks push on failure.

Never bypass hooks with `--no-verify` — fix the root cause instead.
