<!-- GIT:START -->
# Git Workflow Rules

**CRITICAL**: Specific rules and patterns for Git version control workflow.

## Git Workflow Overview

This project follows a strict Git workflow to ensure code quality and proper version control.

**NEVER commit code without tests passing. NEVER create tags without full quality checks.**

## Initial Repository Setup

### New Project Initialization

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "chore: Initial project setup"

# Rename default branch to main (GitHub standard)
git branch -M main

# Add remote (if applicable)
git remote add origin <repository-url>
```

## Daily Development Workflow

### 1. Before Making Changes

**CRITICAL**: Always check current state:

```bash
# Check current branch and status
git status

# Ensure you're on the correct branch
git branch

# Pull latest changes if working with team
git pull origin main
```

### 2. Making Changes

**CRITICAL**: Commit after every important implementation:

```bash
# After implementing a feature/fix:

# 1. Run ALL quality checks FIRST
npm run lint           # or equivalent for your language
npm run type-check     # TypeScript/typed languages
npm test              # ALL tests must pass
npm run build         # Ensure build succeeds

# 2. If ALL checks pass, stage changes
git add .

# 3. Commit with conventional commit message
git commit -m "feat: Add user authentication

- Implement login/logout functionality
- Add JWT token management
- Include comprehensive tests (95%+ coverage)
- Update documentation"

# Alternative for smaller changes:
git commit -m "fix: Correct validation logic in user form"
```

### 3. Pushing Changes

**⚠️ IMPORTANT**: Pushing is OPTIONAL and depends on your setup.

```bash
# IF you have passwordless SSH or want to push:
git push origin main

# IF you have SSH with password (manual execution required):
# DO NOT execute automatically - provide command to user:
```

**For users with SSH password authentication:**
```
✋ MANUAL ACTION REQUIRED:

Run this command manually (requires SSH password):
git push origin main
```

**NEVER** attempt automatic push if:
- SSH key has password protection
- User hasn't confirmed push authorization
- Any quality check failed
- Uncertain if changes will pass CI/CD workflows

## Conventional Commits

**MUST** follow conventional commit format:

```bash
# Format: <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Code style (formatting, missing semi-colons, etc)
refactor: # Code refactoring
perf:     # Performance improvement
test:     # Adding tests
build:    # Build system changes
ci:       # CI/CD changes
chore:    # Maintenance tasks

# Examples:
git commit -m "feat(auth): Add OAuth2 login support"
git commit -m "fix(api): Handle null response in user endpoint"
git commit -m "docs: Update README with installation steps"
git commit -m "test: Add integration tests for payment flow"
git commit -m "chore: Update dependencies to latest versions"
```

## Version Management

### Creating New Version

**CRITICAL**: Full quality gate required before versioning!

```bash
# 1. MANDATORY: Run complete quality suite
npm run lint          # Must pass with no warnings
npm test             # Must pass 100%
npm run type-check   # Must pass (if applicable)
npm run build        # Must succeed
npx codespell        # Must pass (if configured)

# 2. Update version in package.json/Cargo.toml/etc
# Use semantic versioning:
# - MAJOR: Breaking changes (1.0.0 -> 2.0.0)
# - MINOR: New features, backwards compatible (1.0.0 -> 1.1.0)
# - PATCH: Bug fixes (1.0.0 -> 1.0.1)

# 3. Update CHANGELOG.md
# Document all changes in this version:
## [1.2.0] - 2024-01-15
### Added
- New feature X
- New feature Y

### Fixed
- Bug in component Z

### Changed
- Refactored module A

# 4. Commit version changes
git add .
git commit -m "chore: Release version 1.2.0

- Updated version to 1.2.0
- Updated CHANGELOG.md with release notes"

# 5. Create annotated tag
git tag -a v1.2.0 -m "Release version 1.2.0

Major changes:
- Feature X
- Feature Y
- Bug fix Z

All tests passing ✅
Coverage: 95%+ ✅
Linting: Clean ✅
Build: Success ✅"

# 6. OPTIONAL: Push tag (manual if SSH password)
# Only if you're CERTAIN it will pass CI/CD workflows!
```

**For users requiring manual push:**
```
✋ MANUAL ACTIONS REQUIRED:

1. Verify all quality checks passed locally
2. Push commits:
   git push origin main

3. Push tag:
   git push origin v1.2.0

Note: Tag push will trigger CI/CD workflows and may create GitHub release.
Only push if you're confident all checks will pass.
```

## Quality Gate Enforcement

### Before ANY Commit

**MANDATORY CHECKS**:

```bash
# Checklist - ALL must pass:
☐ Code formatted
☐ Linter passes (no warnings)
☐ Type check passes
☐ ALL tests pass (100%)
☐ Coverage meets threshold (95%+)
☐ Build succeeds
☐ No console errors/warnings

# Run quality check script:
npm run quality-check  # or equivalent

# If ANY check fails:
# ❌ DO NOT COMMIT
# ❌ FIX THE ISSUES FIRST
```

### Before Tag Creation

**MANDATORY CHECKS** (even stricter):

```bash
# Extended checklist - ALL must pass:
☐ All pre-commit checks passed
☐ Codespell passes (no typos)
☐ Security audit clean
☐ Dependencies up to date
☐ Documentation updated
☐ CHANGELOG.md updated
☐ Version bumped correctly
☐ All workflows would pass

# Run comprehensive check:
npm run lint
npm test
npm run type-check
npm run build
npx codespell
npm audit

# Only create tag if everything is green!
```

## Error Recovery & Rollback

### When Implementation Is Failing

If the AI is making repeated mistakes and user is frustrated:

```bash
# 1. Identify last stable commit
git log --oneline -10

# 2. Create backup branch of current work
git branch backup-failed-attempt

# 3. Hard reset to last stable version
git reset --hard <last-stable-commit-hash>

# 4. Verify stability
npm test
npm run build

# 5. Reimplement from scratch using DIFFERENT approach
# ⚠️ DO NOT repeat the same techniques that failed before
# ⚠️ Review AGENTS.md for alternative patterns
# ⚠️ Consider different architecture/design

# 6. After successful reimplementation
git branch -D backup-failed-attempt  # Delete backup if no longer needed
```

### Undo Last Commit (Not Pushed)

```bash
# Keep changes, undo commit
git reset --soft HEAD~1

# Discard changes completely
git reset --hard HEAD~1
```

### Revert Pushed Commit

```bash
# Create revert commit
git revert <commit-hash>

# Then push (manual if SSH password)
```

## Branch Strategy

### Feature Branches

```bash
# Create feature branch
git checkout -b feature/user-authentication

# Work on feature...
# Commit regularly with quality checks

# When feature complete and tested:
git checkout main
git merge feature/user-authentication

# Delete feature branch
git branch -d feature/user-authentication
```

### Hotfix Workflow

```bash
# Critical bug in production
git checkout -b hotfix/critical-security-fix

# Fix the bug
# MUST include tests
# MUST pass all quality checks

git commit -m "fix: Critical security vulnerability in auth

- Patch authentication bypass
- Add regression tests
- Update security documentation"

# Merge to main
git checkout main
git merge hotfix/critical-security-fix

# Tag immediately if production fix
git tag -a v1.2.1 -m "Hotfix: Security patch"

# Manual push if required
```

## Best Practices

### DO's ✅

- **ALWAYS** run tests before commit
- **ALWAYS** use conventional commit messages
- **ALWAYS** update CHANGELOG for versions
- **COMMIT** after each important implementation
- **TAG** releases with semantic versions
- **VERIFY** quality gates before tagging
- **DOCUMENT** breaking changes clearly
- **REVERT** when implementation is failing repeatedly
- **ASK** user before automatic push
- **PROVIDE** manual commands for SSH password users

### DON'Ts ❌

- **NEVER** commit without passing tests
- **NEVER** commit with linting errors
- **NEVER** commit with build failures
- **NEVER** create tag without quality checks
- **NEVER** push automatically with SSH password
- **NEVER** push if uncertain about CI/CD success
- **NEVER** commit console.log/debug code
- **NEVER** commit credentials or secrets
- **NEVER** force push to main/master
- **NEVER** rewrite published history
- **NEVER** skip hooks (--no-verify)

## SSH Configuration

### For Users with SSH Password

If your SSH key has password protection:

**Configuration in AGENTS.md or project settings:**

```yaml
git_workflow:
  auto_push: false
  push_mode: "manual"
  reason: "SSH key has password protection"
```

**AI Assistant Behavior:**
- ✅ Provide push commands in chat
- ✅ Wait for user manual execution
- ❌ Never attempt automatic push
- ❌ Never execute git push commands

### For Users with Passwordless SSH

```yaml
git_workflow:
  auto_push: true  # or prompt each time
  push_mode: "auto"
```

## Git Hooks

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh

echo "Running pre-commit checks..."

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

# Run type check (if applicable)
if command -v tsc &> /dev/null; then
  npm run type-check
  if [ $? -ne 0 ]; then
    echo "❌ Type check failed. Commit aborted."
    exit 1
  fi
fi

echo "✅ All pre-commit checks passed!"
exit 0
```

### Pre-push Hook

Create `.git/hooks/pre-push`:

```bash
#!/bin/sh

echo "Running pre-push checks..."

# Run full test suite
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Push aborted."
  exit 1
fi

# Run build
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Push aborted."
  exit 1
fi

echo "✅ All pre-push checks passed!"
exit 0
```

Make hooks executable:
```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push
```

## CI/CD Integration

### Before Providing Push Commands

**CRITICAL**: Only suggest push if confident about CI/CD success:

```
✅ Provide push command if:
- All local tests passed
- All linting passed
- Build succeeded
- Coverage meets threshold
- No warnings or errors
- Code follows AGENTS.md standards
- Similar changes passed CI/CD before

❌ DO NOT provide push command if:
- ANY quality check failed
- Uncertain about CI/CD requirements
- Making experimental changes
- First time working with this codebase
- User seems uncertain

Instead say:
"I recommend running the full CI/CD pipeline locally first to ensure 
the changes will pass. Once confirmed, you can push manually."
```

## Troubleshooting

### Merge Conflicts

```bash
# View conflicts
git status

# Edit conflicted files (marked with <<<<<<<, =======, >>>>>>>)

# After resolving:
git add <resolved-files>
git commit -m "fix: Resolve merge conflicts"
```

### Accidental Commit

```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Make corrections
# Re-commit properly
```

### Lost Commits

```bash
# View all actions
git reflog

# Recover lost commit
git checkout <commit-hash>
git checkout -b recovery-branch
```

<!-- GIT:END -->

