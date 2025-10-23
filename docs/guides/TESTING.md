# Testing Guide

This guide covers testing procedures for @hivellm/rulebook.

## Running Tests

### Unit and Integration Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test -- --watch
```

Run specific test file:

```bash
npm test -- tests/detector.test.ts
```

### Coverage

Generate coverage report:

```bash
npm run test:coverage
```

Coverage files are generated in `coverage/` directory:
- `coverage/index.html` - HTML report (open in browser)
- `coverage/lcov.info` - LCOV format for CI
- `coverage-final.json` - JSON format

Coverage thresholds (must meet all):
- **Lines**: 95%
- **Functions**: 95%
- **Branches**: 95%
- **Statements**: 95%

## Test Structure

### Test Files

All tests are in the `/tests` directory:

```
tests/
├── detector.test.ts     # Project detection tests
├── generator.test.ts    # AGENTS.md generation tests
├── merger.test.ts       # AGENTS.md merging tests
├── file-system.test.ts  # File system utility tests
└── rulesignore.test.ts  # .rulesignore parsing tests
```

### Test Framework

- **Framework**: Vitest
- **Environment**: Node.js
- **Globals**: Enabled (describe, it, expect, etc.)

### Writing Tests

Example test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('feature name', () => {
  beforeEach(async () => {
    // Setup before each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  it('should handle valid input', () => {
    const result = myFunction('valid');
    expect(result).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction('')).toThrow('Invalid input');
  });
});
```

## NPX Compatibility Testing

### Automated Test

Run the NPX compatibility test script:

**Linux/macOS**:
```bash
cd rulebook
chmod +x scripts/test-npx.sh
./scripts/test-npx.sh
```

**Windows (PowerShell)**:
```powershell
cd rulebook
.\scripts\test-npx.ps1
```

### Manual NPX Test

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Link locally**:
   ```bash
   npm link
   ```

3. **Test command**:
   ```bash
   rulebook --help
   ```

4. **Test on a sample project**:
   ```bash
   cd /path/to/test-project
   rulebook init
   ```

5. **Unlink when done**:
   ```bash
   npm unlink -g @hivellm/rulebook
   ```

## Type Checking

Run TypeScript type checking:

```bash
npm run type-check
```

This runs `tsc --noEmit` to check types without generating output.

## Linting

Run ESLint:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint:fix
```

## Formatting

Check code formatting:

```bash
npm run format -- --check
```

Fix formatting:

```bash
npm run format
```

## Pre-Commit Checklist

Before committing, ensure:

1. ✅ All tests pass: `npm test`
2. ✅ Coverage meets threshold: `npm run test:coverage`
3. ✅ No type errors: `npm run type-check`
4. ✅ No lint errors: `npm run lint`
5. ✅ Code is formatted: `npm run format`

## CI/CD Testing

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ '**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm test
      - run: npm run test:coverage
```

## Debugging Tests

### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["test", "--", "--run"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Vitest UI

Run tests with UI:

```bash
npm test -- --ui
```

## Test Coverage Goals

- **Minimum**: 95% across all metrics
- **Target**: 100% for critical paths
- **Files**: All source files except types.ts

### Excluded from Coverage

- `node_modules/`
- `dist/`
- `tests/`
- `**/*.test.ts`
- `**/*.config.ts`

## Common Test Scenarios

### Testing File Operations

Use temporary directories:

```typescript
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

let testDir: string;

beforeEach(async () => {
  testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});
```

### Testing CLI Prompts

Mock inquirer:

```typescript
import inquirer from 'inquirer';
import { vi } from 'vitest';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ answer: 'test' }),
  },
}));
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  await expect(async () => {
    await dangerousFunction();
  }).rejects.toThrow('Expected error message');
});
```

## Performance Testing

### Benchmark Tests

For performance-critical functions:

```typescript
import { bench, describe } from 'vitest';

describe('performance', () => {
  bench('fast operation', () => {
    // Operation that should be fast
  });
});
```

Run benchmarks:

```bash
npm test -- --run --benchmark
```

## Troubleshooting

### Tests Failing Locally

1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear coverage: `rm -rf coverage`
3. Check Node version: `node --version` (should be 18+)

### Coverage Not Meeting Threshold

1. Run coverage report: `npm run test:coverage`
2. Open `coverage/index.html` in browser
3. Identify uncovered lines
4. Add tests for uncovered code

### Type Errors

1. Run type check: `npm run type-check`
2. Fix errors reported by TypeScript
3. Re-run tests

## Continuous Monitoring

- Run tests frequently during development
- Monitor coverage trends
- Keep tests fast (< 1 second per test file)
- Refactor slow tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js Testing Guide](https://nodejs.org/en/docs/guides/testing/)

