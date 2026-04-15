---
name: rulebook-typescript
description: "Configures TypeScript strict mode, writes and runs Vitest unit tests, enforces ESLint rules, and sets up CI/CD build pipelines. Use when configuring tsconfig.json strict options, writing Vitest tests, fixing ESLint or type-check errors, setting up GitHub Actions for TypeScript, or enforcing code quality in TypeScript projects."
version: "1.0.0"
category: languages
author: "HiveLLM"
tags: ["typescript", "javascript", "node", "strict", "testing", "vitest", "eslint"]
dependencies: []
conflicts: []
---

# TypeScript Development Standards

## Quality Check Workflow

Run in this order after every implementation — fix errors at each step before proceeding:

```bash
npm run type-check        # 1. Type errors → fix before linting
npm run lint              # 2. Lint warnings → fix or run lint:fix
npm run format            # 3. Formatting → auto-fixable
npm test                  # 4. Tests → fix failures before coverage
npm run test:coverage     # 5. Coverage (95%+ required)
npm run build             # 6. Build verification
```

If type-check fails, do not proceed to lint — type errors cascade into false lint warnings.

## TypeScript Configuration

Use TypeScript 5.3+ with strict mode:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

## Code Quality Rules

1. **No `any` type** — Use `unknown` with type guards
2. **Strict null checks** — Handle null/undefined explicitly
3. **Type guards over assertions** — Avoid `as` keyword
4. **95%+ test coverage** — Required for all new code

## Testing with Vitest

```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should handle valid input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow('Input required');
  });
});
```

Run a single test file during development:

```bash
npx vitest run tests/my-feature.test.ts
```

## ESLint Setup

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

## CI/CD Pipeline

GitHub Actions configuration for TypeScript projects:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20.x, 22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run build
```
