# Post-Checkout Hook

This template provides guidance for implementing post-checkout git hooks that automate tasks after branch checkouts or clones.

## Purpose

Post-checkout hooks run automatically after `git checkout` or `git clone` to:
- Install/update dependencies automatically
- Clean up build artifacts from previous branch
- Update database schema
- Reset development environment
- Notify about branch-specific requirements

## Agent Automation Commands

When implementing or modifying post-checkout hooks:

### TypeScript/JavaScript Projects
```bash
# Manual dependency install after checkout
npm install

# Clean build artifacts
rm -rf dist/ node_modules/.cache

# Database migrations
npm run db:migrate
```

### Python Projects
```bash
# Install dependencies
pip install -r requirements.txt

# Or with poetry
poetry install

# Database migrations
python manage.py migrate
```

### Rust Projects
```bash
# Update dependencies
cargo update

# Clean build cache
cargo clean
```

## Hook Implementation Patterns

### Cross-Platform Node.js Hook (Recommended)

**Shell Wrapper** (`.git/hooks/post-checkout`):
```bash
#!/bin/sh

# Arguments:
# $1 = ref of previous HEAD
# $2 = ref of new HEAD
# $3 = flag (1 = branch checkout, 0 = file checkout)

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
"$NODE_PATH" "$(dirname "$0")/post-checkout.js" "$1" "$2" "$3"
exit $?
```

**Node.js Script** (`.git/hooks/post-checkout.js`):
```javascript
#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , prevHead, newHead, branchCheckoutFlag] = process.argv;

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`Command failed: ${command}`));
      else resolve();
    });
  });
}

async function main() {
  // Only run for branch checkouts, not file checkouts
  if (branchCheckoutFlag === '0') {
    console.log('File checkout detected, skipping post-checkout hook');
    return;
  }

  console.log('\n🔄 Post-checkout hook running...\n');

  try {
    // Check if package.json changed
    const packageJsonChanged = await hasFileChanged('package.json', prevHead, newHead);
    const packageLockChanged = await hasFileChanged('package-lock.json', prevHead, newHead);

    if (packageJsonChanged || packageLockChanged) {
      console.log('📦 Dependencies changed, running npm install...');
      await runCommand('npm', ['install']);
    } else {
      console.log('✅ No dependency changes detected');
    }

    // Clean build artifacts if switching branches
    if (fs.existsSync('dist')) {
      console.log('🧹 Cleaning build artifacts...');
      fs.rmSync('dist', { recursive: true, force: true });
    }

    // Check for .env.example updates
    const envExampleChanged = await hasFileChanged('.env.example', prevHead, newHead);
    if (envExampleChanged && fs.existsSync('.env.example') && !fs.existsSync('.env')) {
      console.log('⚙️  .env.example updated, consider updating .env');
    }

    console.log('\n✅ Post-checkout complete!\n');
  } catch (error) {
    console.error('⚠️  Post-checkout hook failed:', error.message);
    // Don't fail the checkout
    process.exit(0);
  }
}

async function hasFileChanged(filepath, prevRef, newRef) {
  return new Promise((resolve) => {
    const proc = spawn('git', ['diff', '--name-only', prevRef, newRef, '--', filepath], {
      shell: true,
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', () => {
      resolve(output.trim() !== '');
    });
  });
}

main();
```

### Shell-Only Implementation (Simple)

**`.git/hooks/post-checkout`**:
```bash
#!/bin/sh

# Arguments:
# $1 = ref of previous HEAD
# $2 = ref of new HEAD
# $3 = flag (1 = branch checkout, 0 = file checkout)

PREV_HEAD=$1
NEW_HEAD=$2
BRANCH_CHECKOUT=$3

# Only run for branch checkouts
if [ "$BRANCH_CHECKOUT" = "0" ]; then
  exit 0
fi

echo "🔄 Post-checkout hook running..."

# Check if package.json changed
if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q "package.json\|package-lock.json"; then
  echo "📦 Dependencies changed, running npm install..."
  npm install
else
  echo "✅ No dependency changes detected"
fi

# Clean build artifacts
if [ -d "dist" ]; then
  echo "🧹 Cleaning build artifacts..."
  rm -rf dist/
fi

echo "✅ Post-checkout complete!"
exit 0
```

## Best Practices

### ✅ DO Include in Post-Checkout

1. **Dependency Installation** (Smart)
   ```javascript
   // Only if package.json changed
   if (packageJsonChanged) {
     await runCommand('npm', ['install']);
   }
   ```

2. **Clean Build Artifacts**
   ```javascript
   // Remove stale build files
   if (fs.existsSync('dist')) {
     fs.rmSync('dist', { recursive: true });
   }
   ```

3. **Database Migrations** (Optional)
   ```javascript
   // Check if migrations changed
   const migrationsChanged = await hasFileChanged('migrations/', prevHead, newHead);
   if (migrationsChanged) {
     await runCommand('npm', ['run', 'db:migrate']);
   }
   ```

4. **Environment Notifications**
   ```javascript
   // Warn about .env changes
   if (envExampleChanged) {
     console.log('⚠️  .env.example updated - review your .env file');
   }
   ```

5. **Git LFS Files** (If using Git LFS)
   ```bash
   git lfs pull
   ```

### ❌ DON'T Include in Post-Checkout

1. **Slow Operations** (> 1 minute)
   - Full test suite
   - Large data downloads
   - Complete rebuilds

2. **Interactive Operations**
   - User prompts
   - Manual confirmations
   - OAuth flows

3. **Destructive Operations Without Confirmation**
   - Dropping databases
   - Deleting user data
   - Resetting configurations

4. **External Service Calls**
   - Deployment triggers
   - API notifications
   - Third-party webhooks

## Language-Specific Patterns

### TypeScript/JavaScript (npm/pnpm/yarn)

**Smart Dependency Installation**:
```javascript
async function updateDependencies() {
  // Check if package manager files changed
  const filesChanged = await Promise.all([
    hasFileChanged('package.json', prevHead, newHead),
    hasFileChanged('package-lock.json', prevHead, newHead),
    hasFileChanged('pnpm-lock.yaml', prevHead, newHead),
    hasFileChanged('yarn.lock', prevHead, newHead),
  ]);

  if (filesChanged.some(changed => changed)) {
    // Detect package manager
    if (fs.existsSync('pnpm-lock.yaml')) {
      await runCommand('pnpm', ['install']);
    } else if (fs.existsSync('yarn.lock')) {
      await runCommand('yarn', ['install']);
    } else {
      await runCommand('npm', ['install']);
    }
  }
}
```

**Clean Node.js Cache**:
```javascript
// Clean stale cache
if (fs.existsSync('node_modules/.cache')) {
  fs.rmSync('node_modules/.cache', { recursive: true });
}
```

### Python (pip/poetry/pipenv)

```bash
#!/bin/sh

# Check if requirements changed
if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q "requirements.txt\|pyproject.toml\|Pipfile"; then
  echo "📦 Dependencies changed..."

  # Detect package manager
  if [ -f "poetry.lock" ]; then
    poetry install
  elif [ -f "Pipfile" ]; then
    pipenv install
  else
    pip install -r requirements.txt
  fi
fi

# Run migrations if using Django
if [ -f "manage.py" ]; then
  if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q "migrations/"; then
    echo "🗄️  Running database migrations..."
    python manage.py migrate
  fi
fi
```

### Rust (cargo)

```bash
#!/bin/sh

# Check if dependencies changed
if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q "Cargo.toml\|Cargo.lock"; then
  echo "📦 Dependencies changed, updating..."
  cargo update
fi

# Clean build artifacts
if [ -d "target" ]; then
  echo "🧹 Cleaning build artifacts..."
  cargo clean
fi
```

### Go

```bash
#!/bin/sh

# Check if dependencies changed
if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q "go.mod\|go.sum"; then
  echo "📦 Dependencies changed..."
  go mod download
  go mod verify
fi

# Clean build artifacts
if [ -d "bin" ]; then
  rm -rf bin/
fi
```

## Advanced Patterns

### Branch-Specific Actions

```javascript
async function main() {
  const currentBranch = await getCurrentBranch();

  // Production branch - extra checks
  if (currentBranch === 'main' || currentBranch === 'master') {
    console.log('⚠️  You are on production branch!');
    console.log('💡 Run tests before pushing: npm test');
  }

  // Development branch - setup dev environment
  if (currentBranch === 'develop') {
    console.log('🔧 Setting up development environment...');
    if (!fs.existsSync('.env')) {
      fs.copyFileSync('.env.example', '.env');
      console.log('✅ Created .env from .env.example');
    }
  }

  // Feature branch - notify about base branch
  if (currentBranch.startsWith('feature/')) {
    console.log(`💡 Feature branch detected: ${currentBranch}`);
    console.log('💡 Remember to rebase from develop regularly');
  }
}

async function getCurrentBranch() {
  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { shell: true });
    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.on('close', () => { resolve(output.trim()); });
  });
}
```

### Notify About Conflicting Files

```javascript
async function checkForConflicts() {
  return new Promise((resolve) => {
    const proc = spawn('git', ['diff', '--name-only', '--diff-filter=U'], { shell: true });
    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.on('close', () => {
      const conflicts = output.trim().split('\n').filter(f => f);
      if (conflicts.length > 0) {
        console.log('\n⚠️  MERGE CONFLICTS DETECTED:');
        conflicts.forEach(file => console.log(`  - ${file}`));
        console.log('\n💡 Resolve conflicts before continuing\n');
      }
      resolve();
    });
  });
}
```

### Update Git Submodules

```bash
#!/bin/sh

# Check if .gitmodules changed
if git diff --name-only $PREV_HEAD $NEW_HEAD | grep -q ".gitmodules"; then
  echo "📦 Submodules changed, updating..."
  git submodule update --init --recursive
fi
```

## Troubleshooting

### Hook Running Too Slowly

**Issue**: Checkout takes too long

**Solutions**:
1. Only run operations when files actually changed
2. Run npm/pip install in background
3. Skip hook for file checkouts (check `$3` flag)
4. Add timeout to prevent hanging

```javascript
// Run with timeout
const timeout = 60000; // 60 seconds
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

try {
  await runCommand('npm', ['install'], { signal: controller.signal });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('⚠️  Install timed out, continuing...');
  }
} finally {
  clearTimeout(timeoutId);
}
```

### Dependencies Not Installing

**Issue**: npm install fails silently

**Solutions**:
1. Check exit codes: `|| exit 1` (but don't fail checkout)
2. Log errors clearly
3. Provide manual command to run

```javascript
try {
  await runCommand('npm', ['install']);
} catch (error) {
  console.error('⚠️  Failed to install dependencies');
  console.error('💡 Run manually: npm install');
  // Don't exit 1 - don't block checkout
}
```

### Hook Not Running

**Causes**:
1. File permissions incorrect
2. Shebang missing
3. Syntax errors in script

**Solutions**:
```bash
# Fix permissions
chmod +x .git/hooks/post-checkout

# Test manually
.git/hooks/post-checkout prev_ref new_ref 1

# Check for syntax errors
node .git/hooks/post-checkout.js prev_ref new_ref 1
```

## Common Pitfalls

1. **❌ Failing checkout on errors**: Always exit 0 (don't block checkout)
2. **❌ Running for file checkouts**: Check flag `$3 == 1`
3. **❌ No progress indication**: Log what's happening
4. **❌ Installing deps every time**: Only when files changed
5. **❌ Interactive operations**: No user prompts allowed
6. **❌ Not handling errors gracefully**: Log and continue

## Integration with Rulebook

If using `@hivehub/rulebook`, post-checkout hooks are automatically generated:

```bash
# Initialize with hooks
npx @hivehub/rulebook init

# Configuration in .rulebook
{
  "hooks": {
    "postCheckout": {
      "enabled": true,
      "autoInstall": true,
      "cleanArtifacts": true
    }
  }
}
```

## Related Templates

- See `/rulebook/PRE_COMMIT.md` for pre-commit quality checks
- See `/rulebook/PRE_PUSH.md` for pre-push validation
- See `/rulebook/GIT.md` for git workflow
- See language-specific templates for dependency management commands
