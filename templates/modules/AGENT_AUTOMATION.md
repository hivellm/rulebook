<!-- AGENT_AUTOMATION:START -->
# Agent Automation Rules

**CRITICAL**: These rules define MANDATORY automated tasks that the AI agent MUST execute after EVERY implementation.

## Pre-Implementation Dependency Check

Before starting any implementation, verify project dependencies:

```bash
# 1. Check for known vulnerabilities
npm audit --production                # TypeScript/JavaScript
# OR
cargo audit                           # Rust
# OR
pip-audit                             # Python
# OR
go list -json -m all | nancy sleuth  # Go
# OR
mvn dependency:analyze                # Java

# 2. Check for outdated dependencies (informational)
npm outdated                          # TypeScript/JavaScript
# OR
cargo outdated                        # Rust
# OR
pip list --outdated                   # Python
# OR
go list -u -m all                     # Go
# OR
mvn versions:display-dependency-updates # Java

# 3. Document current state for comparison
# Log current dependency versions and vulnerability status
```

**Purpose**: Establish baseline before changes, catch supply chain issues early, and compare state after implementation.

## Mandatory Post-Implementation Workflow

After completing ANY feature implementation, bug fix, or code change, you MUST execute this complete workflow in order:

### Step 1: Quality Checks (MANDATORY - NO EXCEPTIONS)

```bash
# Run in this EXACT order - ALL must pass before proceeding

# 1. Type checking (if applicable)
npm run type-check    # TypeScript/typed languages
# OR
tsc --noEmit         # Direct TypeScript check
# OR  
cargo check          # Rust
# OR
mypy .              # Python

# 2. Linting (MUST pass with ZERO warnings)
npm run lint         # TypeScript/JavaScript
# OR
cargo clippy -- -D warnings    # Rust
# OR
ruff check .         # Python
# OR
golangci-lint run    # Go
# OR
dotnet format --verify-no-changes  # C#

# 3. Code formatting
npm run format       # TypeScript/JavaScript
# OR
cargo fmt           # Rust
# OR
black .             # Python
# OR
gofmt -w .          # Go

# 4. Run ALL tests (MUST pass 100%)
npm test            # TypeScript/JavaScript
# OR
cargo test          # Rust
# OR
pytest              # Python
# OR
go test ./...       # Go
# OR
dotnet test         # C#

# 5. Verify coverage meets threshold (default 95%)
npm run test:coverage    # TypeScript/JavaScript
# OR
cargo llvm-cov --lcov    # Rust
# OR
pytest --cov            # Python
# OR
go test -cover ./...    # Go
```

**IF ANY CHECK FAILS:**
- ❌ STOP immediately
- ❌ DO NOT proceed to next step
- ❌ DO NOT commit code
- ❌ FIX the failing check first
- ✅ Re-run ALL checks from the beginning

### Step 1.5: Security & Dependency Audits (MANDATORY)

After all quality checks pass, run comprehensive security scanning:

```bash
# TypeScript/JavaScript
npm audit --production --audit-level=moderate  # Fail on moderate+ vulnerabilities
npm outdated                                    # Informational
npx depcheck                                    # Find unused dependencies.(optional)

# Rust
cargo audit                                     # Check for advisories
cargo outdated                                  # Informational
cargo deny check                                # Additional checks (optional)

# Python
pip-audit                                       # Check for vulnerabilities
pip list --outdated                             # Informational
safety check                                    # Alternative to pip-audit

# Go
go list -json -m all | nancy sleuth            # Check advisories
go list -u -m all                               # Informational
gosec ./...                                     # Source code security scan (optional)

# Java
mvn dependency:analyze                          # Analyze dependencies
mvn versions:display-dependency-updates         # Informational
mvn org.owasp:dependency-check-maven:check     # OWASP check (optional)
```

**Vulnerability Handling:**
- If vulnerabilities detected, attempt automatic fixes first
- Document any exceptions with justification
- Create issue/technical debt tracking if fix deferred
- Update dependencies cautiously (check breaking changes)

**IF VULNERABILITIES FOUND:**
- ✅ Attempt automatic fix: `npm audit fix`, `cargo update`, `pip install --upgrade`
- ✅ If auto-fix fails, document the issue with justification
- ✅ Include vulnerability summary in Step 5 report
- ✅ Never ignore critical/high vulnerabilities without explicit user approval

### Step 2: Update OpenSpec Tasks (MANDATORY)

After all quality checks pass, you MUST update OpenSpec task status:

```bash
# Check if openspec directory exists
if [ -d "openspec" ]; then
  # Update STATUS.md with current implementation status
  # Mark completed tasks as [DONE]
  # Update in-progress tasks
  # Add any new tasks discovered during implementation
  
  # Example:
  # - [DONE] Implement feature X
  # - [IN_PROGRESS] Write integration tests
  # - [TODO] Update documentation
fi
```

**OpenSpec Update Checklist:**
- ✅ Mark completed tasks as `[DONE]` or `[COMPLETED]`
- ✅ Update progress percentages
- ✅ Add implementation notes or deviations
- ✅ Create new tasks if additional work discovered
- ✅ Update dependency chains if affected
- ✅ Document any blockers or issues

### Step 3: Update Documentation (MANDATORY)

Update relevant documentation files:

```bash
# 1. Update ROADMAP if feature is roadmap item
if [ -f "docs/ROADMAP.md" ]; then
  # Mark milestone as complete
  # Update progress indicators
  # Add completion dates
fi

# 2. Update CHANGELOG with changes
if [ -f "CHANGELOG.md" ]; then
  # Add entry for this change
  # Follow conventional commits format
  # Categorize: Added, Changed, Fixed, Breaking
fi

# 3. Update feature specs if implementation differs
if [ -d "docs/specs" ]; then
  # Document any deviations from original spec
  # Add implementation notes
  # Update API documentation if changed
fi

# 4. Update README if public API changed
if [ -f "README.md" ]; then
  # Update usage examples
  # Add new features to feature list
  # Update version badges
fi

# 5. Archive test artifacts for traceability
mkdir -p test-artifacts
# Save coverage reports
cp -r coverage test-artifacts/ 2>/dev/null || true
cp -r htmlcov test-artifacts/ 2>/dev/null || true
cp -r .coverage test-artifacts/ 2>/dev/null || true
# Save test logs
cp last-test.log test-artifacts/ 2>/dev/null || true
cp logs/*.log test-artifacts/ 2>/dev/null || true
# Archive for CI integration (Codecov, etc.)
echo "Test artifacts archived to test-artifacts/ at $(date)" >> test-artifacts/README.txt
```

**Artifact Archiving Purpose:**
- Enable full traceability of test results and coverage
- Support CI/CD integrations (Codecov, CodeClimate, etc.)
- Preserve evidence for code reviews and audits
- Document baseline quality metrics for comparison

### Step 4: Git Commit (ONLY after all above steps pass)

```bash
# Stage all changes
git add .

# Commit with conventional commit format
git commit -m "<type>(<scope>): <description>

- Detailed change 1
- Detailed change 2
- Tests: [describe test coverage]
- Coverage: [X]% (threshold: 95%)

Closes #<issue-number> (if applicable)"

# Examples:
# git commit -m "feat(auth): Add OAuth2 login support
# 
# - Implement OAuth2 flow with PKCE
# - Add token refresh mechanism
# - Include comprehensive integration tests
# - Tests: 15 new tests added
# - Coverage: 97.3% (threshold: 95%)
# 
# Closes #123"
```

**Commit Message Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### Step 5: Report to User (MANDATORY)

After completing all steps, provide a summary to the user:

```
✅ Implementation Complete

📝 Changes:
- [List main changes]

🧪 Quality Checks:
- ✅ Type check: Passed
- ✅ Linting: Passed (0 warnings)
- ✅ Formatting: Applied
- ✅ Tests: 42/42 passed (100%)
- ✅ Coverage: 97.3% (threshold: 95%)

🔒 Security Audit:
- ✅ No vulnerabilities detected
- ✅ Dependencies up to date
- ✅ Supply chain verified

📊 OpenSpec:
- ✅ STATUS.md updated
- ✅ Task marked as complete
- ✅ Progress: 65% → 75%

📚 Documentation:
- ✅ ROADMAP.md updated
- ✅ CHANGELOG.md updated
- ✅ Feature spec updated

📦 Artifacts:
- ✅ Test artifacts archived to test-artifacts/
- ✅ Coverage report: coverage/lcov-report/index.html

💾 Git:
- ✅ Committed: feat(feature): Description
- ✅ Hash: abc1234de5678f

📋 Next Steps:
- [ ] Review changes
- [ ] Push to remote (manual if SSH password required)
- [ ] Create PR (if applicable)
- [ ] Review test artifacts in test-artifacts/
```

## Automation Exceptions

The ONLY valid reasons to skip automation steps:

1. **Exploratory/Experimental Code**: User explicitly says "experimental", "draft", "try", "test idea"
   - Still run quality checks but OK to not commit
   - Document as WIP (Work In Progress)

2. **User Explicitly Requests Skip**: User says "skip tests", "no commit", "just show me"
   - Only skip the specific requested step
   - Warn about skipped steps

3. **Emergency Hotfix**: Critical production bug requiring immediate fix
   - Run minimal checks (syntax, critical tests)
   - Document technical debt created
   - Schedule follow-up for complete checks

**In ALL other cases: NO EXCEPTIONS - execute complete workflow**

## Parallel Execution (Advanced)

For experienced agents with access to parallel execution:

```bash
# Run independent checks in parallel
{
  npm run type-check &
  npm run lint &
  npm test &
} && echo "All checks passed" || echo "Some checks failed"
```

## Error Recovery

If automation workflow fails repeatedly (3+ times):

```bash
# 1. Create backup branch
git branch backup-failed-automation

# 2. Reset to last stable commit
git reset --hard <last-stable-commit>

# 3. Report to user with error details
# 4. Request guidance or try alternative implementation approach
```

## Integration with CI/CD

Before providing push commands, verify local execution matches CI/CD requirements:

```
✅ Checklist before push:
- [ ] All tests pass locally
- [ ] Coverage meets threshold
- [ ] Linting passes with 0 warnings
- [ ] Build succeeds
- [ ] No console warnings/errors
- [ ] Documentation updated
- [ ] OpenSpec updated
- [ ] Conventional commit format used
- [ ] Similar changes passed CI before (if applicable)

Only provide push command if ALL items checked.
```

## Monitoring Integration

If GitHub MCP Server or similar monitoring is available:

```
1. After push (manual or auto):
   - Wait 10 seconds for workflows to trigger
   - Check workflow status via MCP
   - Report status to user

2. If workflows fail:
   - Fetch complete error logs
   - Analyze against project standards
   - Implement fixes
   - Re-run local checks
   - Commit fixes
   - Provide push command for retry

3. Next user interaction:
   - Check if previous push workflows completed
   - Report any failures
   - Auto-fix if possible
```

## Task Dependencies

Before starting any task, check dependencies:

```
1. Check OpenSpec STATUS.md or task list
2. Identify task dependencies
3. Verify all dependencies are complete
4. If dependencies incomplete:
   - Report to user
   - Suggest completing dependencies first
   - Wait for user confirmation before proceeding
```

## Code Review Checklist

Before marking implementation complete:

```
Self-Review Checklist:
- [ ] Code follows project style guide
- [ ] No hardcoded values (use config)
- [ ] Error handling implemented
- [ ] Edge cases covered by tests
- [ ] No TODO/FIXME comments without issue links
- [ ] No console.log or debug code
- [ ] No commented-out code
- [ ] Imports organized and minimal
- [ ] Functions are single-purpose
- [ ] Variable names are descriptive
- [ ] Comments explain "why" not "what"
- [ ] No security vulnerabilities introduced
- [ ] Performance implications considered
```

## Best Practices

### DO's ✅

- **ALWAYS** run complete workflow after implementations
- **ALWAYS** update OpenSpec task status
- **ALWAYS** update documentation
- **ALWAYS** use conventional commit format
- **ALWAYS** verify quality checks pass 100%
- **ALWAYS** provide detailed summary to user
- **ASK** user before skipping any steps
- **REPORT** any issues or blockers immediately
- **DOCUMENT** deviations from original plan

### DON'Ts ❌

- **NEVER** skip quality checks without explicit user request
- **NEVER** commit code with failing tests
- **NEVER** commit code with linting errors
- **NEVER** commit without updating documentation
- **NEVER** mark OpenSpec tasks complete without verification
- **NEVER** assume user wants to skip automation
- **NEVER** commit console.log or debug code
- **NEVER** commit credentials or secrets
- **NEVER** proceed if coverage below threshold

## Language-Specific Notes

### TypeScript
```bash
npm run type-check && npm run lint && npm test && npm run test:coverage
```

### Rust
```bash
cargo fmt && cargo clippy -- -D warnings && cargo test && cargo llvm-cov
```

### Python
```bash
black . && ruff check . && mypy . && pytest --cov
```

### Go
```bash
gofmt -w . && golangci-lint run && go test -cover ./...
```

### Java
```bash
mvn verify && mvn checkstyle:check && mvn test
```

## Summary

**Remember**: This automation workflow is NOT optional. It ensures code quality, maintains project standards, and keeps documentation current. Execute it religiously after EVERY implementation.

**The workflow is:**
1. ✅ Quality checks (type, lint, format, test, coverage)
2. ✅ Update OpenSpec tasks
3. ✅ Update documentation (ROADMAP, CHANGELOG, specs)
4. ✅ Git commit with conventional format
5. ✅ Report to user with complete summary

**Only skip steps with explicit user permission and document why.**

<!-- AGENT_AUTOMATION:END -->

