# Pre-Commit Hook

This template provides guidance for implementing pre-commit git hooks that enforce code quality standards before commits are created.

## Purpose

Pre-commit hooks run automatically before each commit to:
- Catch syntax errors and linting issues early
- Ensure code formatting standards
- Prevent broken code from entering version control
- Enforce type checking before commit
- Keep commits fast (avoid slow tests here)

## Agent Automation Commands

When implementing or modifying pre-commit hooks, use these patterns:

### TypeScript/JavaScript Projects
```bash
# Install hook
npm run format && npm run lint && npm run type-check

# Skip hook (emergency only)
git commit --no-verify -m "message"
```

### Python Projects
```bash
# Install hook
black . && ruff check . && mypy .

# Skip hook (emergency only)
git commit --no-verify -m "message"
```

### Rust Projects
```bash
# Install hook
cargo fmt --check && cargo clippy -- -D warnings

# Skip hook (emergency only)
git commit --no-verify -m "message"
```

### Go Projects
```bash
# Install hook
gofmt -s -w . && golangci-lint run

# Skip hook (emergency only)
git commit --no-verify -m "message"
```

## Hook Implementation Patterns

### Cross-Platform Node.js Hook (Recommended)

**Shell Wrapper** (`.git/hooks/pre-commit`):
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
"$NODE_PATH" "$(dirname "$0")/pre-commit.js"
exit $?
```

**Node.js Script** (`.git/hooks/pre-commit.js`):
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
  console.log('🔍 Running pre-commit checks...\n');

  try {
    // Format check
    console.log('📝 Checking formatting...');
    await runCommand('npm', ['run', 'format']);

    // Lint
    console.log('\n🔧 Running linter...');
    await runCommand('npm', ['run', 'lint']);

    // Type check
    console.log('\n🔒 Type checking...');
    await runCommand('npm', ['run', 'type-check']);

    console.log('\n✅ Pre-commit checks passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pre-commit checks failed!');
    console.error('💡 Fix the issues or use --no-verify to skip (not recommended)\n');
    process.exit(1);
  }
}

main();
```

### Shell-Only Hook (Simple)

**`.git/hooks/pre-commit`**:
```bash
#!/bin/sh

echo "🔍 Running pre-commit checks..."

# Format check
echo "📝 Checking formatting..."
npm run format || exit 1

# Lint
echo "🔧 Running linter..."
npm run lint || exit 1

# Type check
echo "🔒 Type checking..."
npm run type-check || exit 1

echo "✅ Pre-commit checks passed!"
exit 0
```

## Best Practices

### ✅ DO Include in Pre-Commit

1. **Fast Checks Only** (< 30 seconds total)
   - Code formatting validation
   - Linting (syntax, style)
   - Type checking
   - Basic syntax validation

2. **Automatic Fixes When Possible**
   ```javascript
   // Auto-format before committing
   await runCommand('npm', ['run', 'format:fix']);
   ```

3. **Clear Error Messages**
   ```javascript
   console.error('❌ Linting failed!');
   console.error('💡 Run: npm run lint:fix');
   console.error('📖 Or skip with: git commit --no-verify');
   ```

4. **Staged Files Only** (Advanced)
   ```bash
   # Only check staged files
   git diff --cached --name-only --diff-filter=ACM | \
     grep '\.ts$' | \
     xargs eslint
   ```

### ❌ DON'T Include in Pre-Commit

1. **Slow Operations** (move to pre-push)
   - Full test suite
   - Integration tests
   - E2E tests
   - Build verification
   - Coverage reports

2. **External API Calls**
   - Deployment checks
   - Remote validation
   - Database migrations

3. **Heavy Operations**
   - Large file processing
   - Compilation of entire codebase
   - Documentation generation

## Language-Specific Patterns

### TypeScript/JavaScript (npm/pnpm/yarn)

```json
{
  "scripts": {
    "format": "prettier --check \"src/**/*.ts\"",
    "format:fix": "prettier --write \"src/**/*.ts\"",
    "lint": "eslint src/**/*.ts --quiet",
    "lint:fix": "eslint src/**/*.ts --fix --quiet",
    "type-check": "tsc --noEmit"
  }
}
```

### Python (poetry/pip)

```bash
#!/bin/sh
echo "🔍 Running pre-commit checks..."

# Format check
black --check . || exit 1

# Lint
ruff check . || exit 1

# Type check
mypy . || exit 1

echo "✅ Pre-commit checks passed!"
```

### Rust (cargo)

```bash
#!/bin/sh
echo "🔍 Running pre-commit checks..."

# Format check
cargo fmt -- --check || exit 1

# Lint
cargo clippy -- -D warnings || exit 1

echo "✅ Pre-commit checks passed!"
```

### Go

```bash
#!/bin/sh
echo "🔍 Running pre-commit checks..."

# Format
gofmt -s -w . || exit 1

# Lint
golangci-lint run || exit 1

# Vet
go vet ./... || exit 1

echo "✅ Pre-commit checks passed!"
```

## Installation Methods

### Manual Installation

```bash
# Copy hook to .git/hooks/
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Automated Installation (Recommended)

**`package.json`**:
```json
{
  "scripts": {
    "prepare": "node scripts/install-hooks.js"
  }
}
```

**`scripts/install-hooks.js`**:
```javascript
const fs = require('fs');
const path = require('path');

const hookSource = path.join(__dirname, 'pre-commit.sh');
const hookDest = path.join(__dirname, '..', '.git', 'hooks', 'pre-commit');

if (!fs.existsSync('.git/hooks')) {
  fs.mkdirSync('.git/hooks', { recursive: true });
}

fs.copyFileSync(hookSource, hookDest);
fs.chmodSync(hookDest, 0o755);

console.log('✅ Pre-commit hook installed!');
```

### Using Husky (npm)

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky init

# Create pre-commit hook
npx husky set .husky/pre-commit "npm run format && npm run lint && npm run type-check"
```

## Troubleshooting

### Hook Not Running

**Issue**: Git doesn't execute the hook

**Solutions**:
1. Check file permissions: `chmod +x .git/hooks/pre-commit`
2. Verify shebang: `#!/bin/sh` or `#!/usr/bin/env node`
3. Check file location: Must be `.git/hooks/pre-commit` (no extension)

### Hook Too Slow

**Issue**: Pre-commit takes > 1 minute

**Solutions**:
1. Move slow checks to pre-push hook
2. Only check staged files (not entire codebase)
3. Use parallel execution for independent checks
4. Cache results between runs

### Windows Compatibility Issues

**Issue**: Hook fails on Windows/Git Bash

**Solutions**:
1. Use Node.js-based hooks (cross-platform)
2. Use forward slashes in paths (`/c/Program Files/nodejs/node.exe`)
3. Use `spawn` instead of `exec` in Node.js scripts
4. Avoid bash-specific syntax (use POSIX-compliant shell)

### False Positives

**Issue**: Hook fails on valid code

**Solutions**:
1. Review linting rules for strictness
2. Add `.eslintignore` / `.prettierignore` for generated files
3. Update type definitions for external libraries
4. Adjust formatter config to match team standards

## Emergency Bypass

When you MUST commit despite failing checks:

```bash
# Skip pre-commit hook (use sparingly!)
git commit --no-verify -m "Emergency fix: production down"

# Or set environment variable
HUSKY_SKIP_HOOKS=1 git commit -m "message"
```

**⚠️ WARNING**: Only bypass hooks for genuine emergencies. Fix the underlying issues immediately after.

## Common Pitfalls

1. **❌ Running full test suite**: Too slow, move to pre-push
2. **❌ Not handling staged files**: Checks all files instead of just staged changes
3. **❌ Unclear error messages**: Developers don't know how to fix issues
4. **❌ No escape hatch**: Always allow `--no-verify` for emergencies
5. **❌ Platform-specific commands**: Use cross-platform tools or Node.js scripts

## Integration with Rulebook

If using `@hivehub/rulebook`, hooks are automatically generated:

```bash
# Initialize project with hooks
npx @hivehub/rulebook init

# Hooks are created in .git/hooks/ with cross-platform support
# Configuration stored in .rulebook file
```

Hook configuration in `.rulebook`:
```json
{
  "hooks": {
    "preCommit": {
      "enabled": true,
      "checks": ["format", "lint", "type-check"]
    }
  }
}
```

## Related Templates

- See `/.rulebook/specs/PRE_PUSH.md` for build and test checks before push
- See `/.rulebook/specs/COMMIT_MSG.md` for commit message validation
- See `/.rulebook/specs/QUALITY_ENFORCEMENT.md` for quality standards
- See `/.rulebook/specs/GIT.md` for git workflow and commit conventions
- See language-specific templates for language-specific quality commands
