# Pre-Push Hook

This template provides guidance for implementing pre-push git hooks that enforce comprehensive quality gates before code is pushed to remote repositories.

## Purpose

Pre-push hooks run automatically before pushing commits to ensure:
- All tests pass (unit, integration, E2E)
- Build succeeds without errors
- Code coverage meets thresholds
- No broken dependencies
- Quality gates are met before sharing code

## Agent Automation Commands

When implementing or modifying pre-push hooks, use these patterns:

### TypeScript/JavaScript Projects
```bash
# Full quality check
npm run build && npm test && npm run test:coverage

# Skip hook (emergency only)
git push --no-verify
```

### Python Projects
```bash
# Full quality check
pytest --cov --cov-fail-under=95

# Skip hook (emergency only)
git push --no-verify
```

### Rust Projects
```bash
# Full quality check
cargo build --release && cargo test --all

# Skip hook (emergency only)
git push --no-verify
```

### Go Projects
```bash
# Full quality check
go build ./... && go test ./... -cover

# Skip hook (emergency only)
git push --no-verify
```

## Hook Implementation Patterns

### Cross-Platform Node.js Hook (Recommended)

**Shell Wrapper** (`.git/hooks/pre-push`):
```bash
#!/bin/sh

# Find Node.js executable (cross-platform)
NODE_PATH=""
if command -v node >/dev/null 2>&1; then
    NODE_PATH="node"
elif [ -f "/c/Program Files/nodejs/node.exe" ]; then
    NODE_PATH="/c/Program Files/nodejs/node.exe"
elif [ -f "/usr/bin/node" ]; then
    NODE_PATH="/usr/bin/node"
else
    echo "Error: Node.js not found"
    exit 1
fi

# Execute Node.js script
"$NODE_PATH" "$(dirname "$0")/pre-push.js"
exit $?
```

**Node.js Script** (`.git/hooks/pre-push.js`):
```javascript
#!/usr/bin/env node

const { spawn } = require('child_process');

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      else resolve();
    });
  });
}

async function main() {
  console.log('🚀 Running pre-push checks...\n');

  try {
    // Build check (FIRST - fastest to fail)
    console.log('🔨 Building project...');
    await runCommand('npm', ['run', 'build']);

    // Tests
    console.log('\n🧪 Running tests...');
    await runCommand('npm', ['test']);

    // Coverage check
    console.log('\n📊 Checking coverage...');
    await runCommand('npm', ['run', 'test:coverage']);

    console.log('\n✅ Pre-push checks passed! Safe to push.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pre-push checks failed!');
    console.error('💡 Fix the issues or use --no-verify to skip (not recommended)\n');
    process.exit(1);
  }
}

main();
```

### Shell-Only Hook (Simple)

**`.git/hooks/pre-push`**:
```bash
#!/bin/sh

echo "🚀 Running pre-push checks..."

# Build check (FIRST)
echo "🔨 Building project..."
npm run build || exit 1

# Tests
echo "🧪 Running tests..."
npm test || exit 1

# Coverage
echo "📊 Checking coverage..."
npm run test:coverage || exit 1

echo "✅ Pre-push checks passed! Safe to push."
exit 0
```

## Best Practices

### ✅ DO Include in Pre-Push

1. **Build Verification** (FIRST - fast failure)
   ```javascript
   // TypeScript/JavaScript
   await runCommand('npm', ['run', 'build']);

   // Rust
   await runCommand('cargo', ['build', '--release']);

   // Go
   await runCommand('go', ['build', './...']);
   ```

2. **Complete Test Suite**
   - Unit tests
   - Integration tests
   - E2E tests (if fast enough)
   - Snapshot tests
   ```javascript
   await runCommand('npm', ['test', '--', '--run']);
   ```

3. **Coverage Enforcement**
   ```javascript
   // Fail if coverage < 95%
   await runCommand('npm', ['run', 'test:coverage']);
   ```

4. **Dependency Checks** (Optional)
   ```javascript
   // Check for vulnerabilities
   await runCommand('npm', ['audit']);
   ```

5. **Progressive Checks** (Fail Fast)
   ```javascript
   // Order matters - fastest/most likely to fail first
   await runCommand('npm', ['run', 'build']);      // Fast, catches syntax
   await runCommand('npm', ['test']);              // Medium, catches logic
   await runCommand('npm', ['run', 'test:e2e']);   // Slow, catches integration
   ```

### ❌ DON'T Include in Pre-Push

1. **Deployment Operations**
   - Actual deployment to production/staging
   - Database migrations
   - External service updates

2. **Extremely Slow Operations** (> 10 minutes)
   - Move to CI/CD pipeline instead
   - Visual regression testing with thousands of snapshots
   - Performance benchmarks across multiple environments

3. **Interactive Operations**
   - User prompts
   - Manual approvals
   - OAuth flows

## Language-Specific Patterns

### TypeScript/JavaScript (npm/pnpm/yarn)

**Minimal** (Fast projects < 1 minute):
```bash
#!/bin/sh
npm run build && npm test
```

**Standard** (Most projects):
```bash
#!/bin/sh
npm run build && npm test && npm run test:coverage
```

**Comprehensive** (Critical projects):
```bash
#!/bin/sh
# Build
npm run build || exit 1

# Tests
npm test || exit 1

# Coverage
npm run test:coverage || exit 1

# Audit
npm audit --audit-level=high || exit 1

# Type check (if not in build)
npm run type-check || exit 1
```

**package.json scripts**:
```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Python (poetry/pip)

**Standard**:
```bash
#!/bin/sh
echo "🚀 Running pre-push checks..."

# Tests with coverage
pytest --cov --cov-fail-under=95 || exit 1

echo "✅ Pre-push checks passed!"
```

**Comprehensive**:
```bash
#!/bin/sh
# Type check
mypy . || exit 1

# Tests with coverage
pytest --cov --cov-fail-under=95 || exit 1

# Check for security issues
safety check || exit 1
```

### Rust (cargo)

**Standard**:
```bash
#!/bin/sh
echo "🚀 Running pre-push checks..."

# Build (release mode)
cargo build --release || exit 1

# Tests
cargo test --all || exit 1

echo "✅ Pre-push checks passed!"
```

**Comprehensive**:
```bash
#!/bin/sh
# Build
cargo build --release || exit 1

# Tests
cargo test --all || exit 1

# Coverage
cargo llvm-cov --all --lcov --output-path lcov.info || exit 1

# Security audit
cargo audit || exit 1
```

### Go

**Standard**:
```bash
#!/bin/sh
echo "🚀 Running pre-push checks..."

# Build
go build ./... || exit 1

# Tests with coverage
go test ./... -cover -coverprofile=coverage.out || exit 1

# Check coverage threshold
go tool cover -func=coverage.out | grep total | awk '{print $3}' | \
  sed 's/%//' | awk '{if ($1 < 95) exit 1}'

echo "✅ Pre-push checks passed!"
```

## Performance Optimization

### Parallel Execution

**Node.js** (using Promise.all):
```javascript
async function main() {
  try {
    // Build must complete first
    await runCommand('npm', ['run', 'build']);

    // Run tests and audit in parallel
    await Promise.all([
      runCommand('npm', ['test']),
      runCommand('npm', ['audit', '--audit-level=high']),
    ]);

    console.log('✅ All checks passed!');
  } catch (error) {
    console.error('❌ Checks failed!');
    process.exit(1);
  }
}
```

### Caching Results

```javascript
const fs = require('fs');
const crypto = require('crypto');

function getFilesHash(files) {
  const content = files.map(f => fs.readFileSync(f, 'utf8')).join('');
  return crypto.createHash('md5').update(content).digest('hex');
}

async function main() {
  const srcFiles = fs.readdirSync('src').map(f => `src/${f}`);
  const currentHash = getFilesHash(srcFiles);
  const cacheFile = '.git/hooks/cache/build-hash';

  if (fs.existsSync(cacheFile)) {
    const cachedHash = fs.readFileSync(cacheFile, 'utf8');
    if (cachedHash === currentHash) {
      console.log('⚡ No changes detected, skipping build...');
      return;
    }
  }

  await runCommand('npm', ['run', 'build']);
  fs.writeFileSync(cacheFile, currentHash);
}
```

### Skip Checks for Specific Branches

```bash
#!/bin/sh

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Skip checks for WIP branches
if echo "$BRANCH" | grep -q "^wip/"; then
  echo "⚠️  WIP branch detected, skipping pre-push checks"
  exit 0
fi

# Run full checks for main/master
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "🚀 Main branch detected, running comprehensive checks..."
  npm run build && npm test && npm run test:coverage && npm audit
  exit $?
fi

# Standard checks for feature branches
npm run build && npm test
exit $?
```

## Troubleshooting

### Hook Too Slow (> 5 minutes)

**Solutions**:
1. **Move slowest tests to CI/CD**
   - Keep pre-push under 5 minutes
   - Run E2E/visual tests only in CI

2. **Use test sharding**
   ```bash
   # Split tests across multiple processes
   npm test -- --shard=1/4 &
   npm test -- --shard=2/4 &
   npm test -- --shard=3/4 &
   npm test -- --shard=4/4 &
   wait
   ```

3. **Cache build artifacts**
   ```bash
   # Only rebuild if sources changed
   if [ .git/hooks/cache/build -ot src/ ]; then
     npm run build
   fi
   ```

### Tests Pass Locally But Fail on Push

**Causes**:
1. Uncommitted files affecting tests
2. Environment variables missing
3. Database state issues

**Solutions**:
```bash
# Run tests in clean environment
git stash --include-untracked
npm test
git stash pop

# Or use git worktree
git worktree add .git/hooks/test-workspace HEAD
cd .git/hooks/test-workspace
npm test
cd ../../..
rm -rf .git/hooks/test-workspace
```

### Coverage Threshold Not Met

**Issue**: Coverage drops below threshold

**Solutions**:
1. **Identify uncovered code**
   ```bash
   npm run test:coverage -- --reporter=html
   open coverage/index.html
   ```

2. **Exclude test files from coverage**
   ```javascript
   // vitest.config.ts
   coverage: {
     exclude: ['**/*.test.ts', '**/*.spec.ts', 'tests/**']
   }
   ```

3. **Add missing tests before push**
   ```bash
   # Find files with low coverage
   npm run test:coverage | grep -E "^[^|]*\|[^|]*\|[^|]*[0-9]{1,2}\."
   ```

### Build Fails Only in Hook

**Causes**:
1. Different Node.js version
2. Missing environment variables
3. Stale node_modules

**Solutions**:
```bash
# Use same Node.js version as development
nvm use $(cat .nvmrc)
npm run build

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Emergency Bypass

When you MUST push despite failing checks:

```bash
# Skip pre-push hook (use sparingly!)
git push --no-verify

# Or set environment variable
HUSKY_SKIP_HOOKS=1 git push

# Or disable temporarily
mv .git/hooks/pre-push .git/hooks/pre-push.disabled
git push
mv .git/hooks/pre-push.disabled .git/hooks/pre-push
```

**⚠️ WARNING**: Only bypass hooks for genuine emergencies. Fix the underlying issues immediately after.

## Common Pitfalls

1. **❌ Hook takes > 10 minutes**: Too slow, move to CI/CD
2. **❌ Not failing fast**: Run build first (catches syntax errors quickly)
3. **❌ Running checks twice**: Pre-commit already did lint/format
4. **❌ Not testing in clean state**: Uncommitted files affect results
5. **❌ No escape hatch**: Always allow `--no-verify` for emergencies
6. **❌ Unclear progress**: Add console.log for each step
7. **❌ Not checking exit codes**: Use `|| exit 1` or check `$?`

## Integration with CI/CD

Pre-push hooks are a LOCAL safety net. CI/CD provides the FINAL verification:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Test
        run: npm test
      - name: Coverage
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Philosophy**:
- Pre-push: Fast checks (< 5 min) to catch obvious issues
- CI/CD: Comprehensive checks (10-30 min) to verify everything

## Integration with Rulebook

If using `@hivehub/rulebook`, pre-push hooks are automatically generated:

```bash
# Initialize project with hooks
npx @hivehub/rulebook init

# Hooks are created with language-specific checks
```

Hook configuration in `.rulebook`:
```json
{
  "hooks": {
    "prePush": {
      "enabled": true,
      "checks": ["build", "test", "coverage"],
      "coverageThreshold": 95
    }
  }
}
```

## Related Templates

- See `/.rulebook/specs/PRE_COMMIT.md` for fast quality checks before commit
- See `/.rulebook/specs/QUALITY_ENFORCEMENT.md` for quality standards
- See `/.rulebook/specs/GIT.md` for git workflow and conventions
- See `/.rulebook/specs/GITHUB_ACTIONS.md` for CI/CD integration
- See language-specific templates for test commands and coverage tools
