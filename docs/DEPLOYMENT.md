# Deployment Guide - @hivellm/rulebook

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- npm account with publishing rights
- Git repository with remote configured

## Pre-Deployment Checklist

### 1. Quality Verification

Run all quality checks:

```bash
cd rulebook

# Type checking
npm run type-check
✅ Expected: 0 errors

# Linting
npm run lint
✅ Expected: 0 warnings

# Build
npm run build
✅ Expected: dist/ directory created

# Tests
npm test -- --run
✅ Expected: 422+/422+ tests passing

# Coverage
npm run test:coverage -- --run
✅ Expected: 95%+ coverage
```

### 2. Version Verification

Ensure version is correctly set:

```bash
# Check package.json
cat package.json | grep version
✅ Current: "version": "0.14.0"

# Check src/index.ts
grep "version" src/index.ts
✅ Should match package.json
```

### 3. Documentation Review

Verify documentation is up-to-date:

- [ ] README.md has current version features (28 languages, 17 frameworks, 12 MCP modules)
- [ ] CHANGELOG.md has v0.14.0 entry
- [ ] ROADMAP.md is current
- [ ] All 126+ templates are complete
- [ ] 30 Git hook templates work correctly
- [ ] Framework templates tested
- [ ] Examples work correctly

### 4. Git Status

```bash
git status
✅ Expected: working tree clean

git log --oneline -5
✅ Verify commits are correct
```

## Deployment Steps

### Step 1: Final Build

```bash
# Clean previous builds
rm -rf dist

# Fresh install
rm -rf node_modules
npm install

# Build
npm run build

# Verify build
ls -la dist/
✅ Should see index.js and other compiled files
```

### Step 2: Test NPX Locally

```bash
# Link package locally
npm link

# Test in another directory
cd /tmp/test-project
rulebook --help
rulebook init --yes

# Verify works correctly
✅ Should initialize without errors

# Unlink
npm unlink -g @hivellm/rulebook
```

### Step 3: Create Git Tags

```bash
cd rulebook

# Create annotated tags for all versions
git tag -a v0.1.0 -m "v0.1.0 - Initial release

- Core implementation with auto-detection
- 24 templates (3 languages, 4 modules, 4 IDEs, 6 CLI, 7 workflows)
- Interactive CLI
- Smart AGENTS.md generation and merging
- 41 tests, 93.96% coverage"

git tag -a v0.2.0 -m "v0.2.0 - Workflow and IDE generation

- Workflow generation for GitHub Actions
- IDE file generation (.cursorrules, etc.)
- CI/CD for rulebook itself
- 53 tests, 95.28% coverage"

git tag -a v0.3.0 -m "v0.3.0 - Validation and extended languages

- Project validation command
- Go and Java language support
- Quality scoring system
- 63 tests, 90.38% coverage"

git tag -a v0.4.0 -m "v0.4.0 - Dependency and coverage checking

- Dependency checking across all languages
- Coverage verification with threshold
- Vulnerability scanning
- Advanced validation capabilities
- 5 CLI commands, 28 templates"

# Verify tags
git tag -l
✅ Should list: v0.1.0, v0.2.0, v0.3.0, v0.4.0
```

### Step 4: Push to GitHub

```bash
# Push commits
git push origin main

# Push all tags
git push origin v0.1.0
git push origin v0.2.0
git push origin v0.3.0
git push origin v0.4.0

# Or push all tags at once
git push origin --tags
```

### Step 5: Publish to npm

```bash
# Login to npm (if not already logged in)
npm login

# Dry run to verify what will be published
npm publish --dry-run

# Verify files list
✅ Should include: dist/, templates/

# Publish
npm publish

# If scoped package, ensure public access
npm publish --access public

# For WSL users (from user's configuration)
npm run publish:wsl
```

### Step 6: Verify Publication

```bash
# Check npm registry
npm view @hivellm/rulebook

# Test installation
npx @hivellm/rulebook@latest --version
✅ Should show: 0.4.0

# Test in fresh project
mkdir /tmp/test-publish
cd /tmp/test-publish
npx @hivellm/rulebook init --yes

✅ Should work correctly
```

### Step 7: Create GitHub Release

1. Go to GitHub repository
2. Click "Releases" → "Create a new release"
3. Select tag: v0.4.0
4. Title: "v0.4.0 - Dependency and Coverage Checking"
5. Description: Copy from CHANGELOG.md
6. Attach binaries/artifacts if needed
7. Publish release

## Post-Deployment

### 1. Announcement

Share on:
- GitHub Discussions
- Twitter/X
- Dev.to
- Reddit (r/rust, r/typescript, etc.)
- Discord communities

### 2. Monitor

- Watch for issues on GitHub
- Monitor npm download statistics
- Collect user feedback
- Track bug reports

### 3. Support

- Respond to issues within 48 hours
- Update documentation based on questions
- Fix critical bugs ASAP
- Plan next version based on feedback

## Rollback Plan

If issues are found after deployment:

### Option 1: Deprecate Version

```bash
npm deprecate @hivellm/rulebook@0.4.0 "Please use v0.3.0 instead"
```

### Option 2: Publish Hotfix

```bash
# Create hotfix branch
git checkout -b hotfix/0.4.1

# Fix issue
# Commit fix

# Update version
npm version patch

# Publish
npm publish

# Merge back
git checkout main
git merge hotfix/0.4.1
git push origin main
git push origin --tags
```

## Continuous Deployment

For future versions, consider:

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Strategy

- **Patch** (0.4.x): Bug fixes only
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Release Frequency

- **Patch**: As needed for bug fixes
- **Minor**: Every 2-4 weeks for features
- **Major**: When necessary for breaking changes

## Maintenance

- Update dependencies monthly
- Security patches immediately
- Documentation updates with each release
- Collect and review user feedback regularly

---

**Current Status**: Ready for v0.14.0 deployment
**Last Verified**: October 31, 2025

**Major Changes in v0.14.0**:
- 28 programming languages (was 11)
- 17 frameworks with auto-detection (NEW)
- 12 MCP modules (was 6)
- 30 Git hook templates (NEW)
- 126+ total templates (was 65)
- 422+ tests with 95%+ coverage
- Template simplification: -10,500 lines removed

