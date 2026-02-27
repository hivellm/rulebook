# CI/CD Patterns

This template provides common CI/CD patterns and best practices applicable across all CI/CD platforms (GitHub Actions, GitLab CI, CircleCI, Jenkins, etc.).

## Purpose

CI/CD patterns ensure:
- Consistent build/test/deploy processes
- Fast feedback loops
- Reliable deployments
- Quality gates enforcement
- Automated release management

## Core CI/CD Stages

### 1. Validate Stage (Fastest - < 2 minutes)

**Purpose**: Catch syntax errors and basic issues quickly

**Includes**:
- Linting
- Code formatting check
- Type checking
- Basic syntax validation

**Example**:
```yaml
validate:
  script:
    - npm run lint
    - npm run format:check
    - npm run type-check
```

### 2. Build Stage (Fast - < 5 minutes)

**Purpose**: Verify code compiles/builds successfully

**Includes**:
- Compilation
- Bundling
- Asset generation
- Build artifact creation

**Example**:
```yaml
build:
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 7 days
```

### 3. Test Stage (Medium - < 15 minutes)

**Purpose**: Verify functionality and quality

**Includes**:
- Unit tests
- Integration tests
- Coverage reporting
- Security scanning

**Example**:
```yaml
test:
  parallel:
    matrix:
      - NODE_VERSION: ['18', '20', '22']
  script:
    - npm ci
    - npm test
    - npm run test:coverage
```

### 4. E2E Stage (Slow - < 30 minutes)

**Purpose**: Verify end-to-end functionality

**Includes**:
- E2E tests
- Visual regression tests
- Performance tests
- Smoke tests

**Example**:
```yaml
e2e:
  script:
    - npm run test:e2e
  artifacts:
    when: on_failure
    paths:
      - test-results/
      - screenshots/
```

### 5. Release Stage (Conditional)

**Purpose**: Publish packages and create releases

**Includes**:
- Version bumping
- Changelog generation
- Package publishing
- GitHub release creation

**Example**:
```yaml
release:
  only:
    - tags
  script:
    - npm run build
    - npm publish --access public
```

### 6. Deploy Stage (Conditional)

**Purpose**: Deploy to environments

**Includes**:
- Environment-specific deployments
- Database migrations
- Health checks
- Rollback capabilities

**Example**:
```yaml
deploy:production:
  only:
    - main
  environment:
    name: production
    url: https://example.com
  script:
    - deploy.sh production
  when: manual  # Require manual approval
```

## CI/CD Pipeline Patterns

### Pattern 1: Linear Pipeline (Simple Projects)

```
┌─────────┐    ┌───────┐    ┌──────┐    ┌────────┐
│ Validate│───▶│ Build │───▶│ Test │───▶│ Deploy │
└─────────┘    └───────┘    └──────┘    └────────┘
```

**When to use**: Small projects, single environment, simple workflows

**Example** (GitHub Actions):
```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint

  build:
    needs: validate
    steps:
      - run: npm run build

  test:
    needs: build
    steps:
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - run: deploy.sh
```

### Pattern 2: Fan-Out/Fan-In (Parallel Testing)

```
                ┌──────────┐
                │ Validate │
                └────┬─────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │ Test 18│  │ Test 20│  │ Test 22│
   └────┬───┘  └────┬───┘  └────┬───┘
        └────────────┼────────────┘
                     ▼
                ┌────────┐
                │ Deploy │
                └────────┘
```

**When to use**: Multi-version testing, cross-platform builds

**Example**:
```yaml
test:
  strategy:
    matrix:
      node-version: ['18', '20', '22']
      os: [ubuntu-latest, windows-latest, macos-latest]
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm test

deploy:
  needs: test  # Waits for ALL test jobs
  steps:
    - run: deploy.sh
```

### Pattern 3: Multi-Environment Pipeline

```
┌──────┐   ┌────┐   ┌──────────┐   ┌────────────┐   ┌────────────┐
│ Test │──▶│Push│──▶│Deploy Dev│──▶│Deploy Stage│──▶│Deploy Prod │
└──────┘   └────┘   └──────────┘   └────────────┘   └────────────┘
                         (auto)        (auto)          (manual)
```

**When to use**: Production applications, multiple environments

**Example**:
```yaml
deploy:dev:
  environment: development
  only:
    - develop
  script:
    - deploy.sh dev

deploy:staging:
  environment: staging
  only:
    - main
  script:
    - deploy.sh staging

deploy:production:
  environment: production
  only:
    - tags
  when: manual  # Manual approval required
  script:
    - deploy.sh production
```

### Pattern 4: Trunk-Based Deployment

```
feature/123 ──▶ main ──▶ Deploy (with feature flags)
                │
                └──▶ Rollback if issues
```

**When to use**: High-velocity teams, continuous deployment

**Key Principles**:
- Deploy to production on every merge to main
- Use feature flags for incomplete features
- Monitor and rollback quickly if issues
- Small, frequent deployments

**Example**:
```yaml
deploy:
  only:
    - main
  script:
    # Deploy with feature flags
    - export FEATURE_NEW_UI=false
    - deploy.sh production
    # Monitor for 5 minutes
    - monitor.sh 300
    # Rollback if errors detected
    - rollback-if-errors.sh
```

## Quality Gates

### Gate 1: Pre-Merge Checks (Required)

**Enforce on Pull Requests**:
- ✅ All tests pass
- ✅ Code coverage ≥ 95%
- ✅ Linting passes (no warnings)
- ✅ Build succeeds
- ✅ No security vulnerabilities

**Implementation**:
```yaml
# GitHub Actions - Require status checks
# Settings → Branches → Branch protection rules
# ✓ Require status checks to pass before merging
#   ✓ lint
#   ✓ test
#   ✓ build
```

### Gate 2: Pre-Deploy Checks (Production)

**Required Before Production Deploy**:
- ✅ All quality gates passed
- ✅ Manual approval obtained
- ✅ Staging tests passed
- ✅ Security scan completed
- ✅ Documentation updated

**Implementation**:
```yaml
deploy:production:
  needs: [test, security-scan, docs-check]
  environment:
    name: production
    url: https://example.com
  when: manual  # Require manual approval
```

### Gate 3: Post-Deploy Validation

**After Deployment**:
- ✅ Health check passes
- ✅ Smoke tests pass
- ✅ Metrics within thresholds
- ✅ No error rate increase

**Implementation**:
```yaml
deploy:production:
  script:
    - deploy.sh production
    - |
      # Wait for health check
      for i in {1..30}; do
        if curl -f https://example.com/health; then
          echo "Health check passed"
          exit 0
        fi
        sleep 10
      done
      echo "Health check failed"
      rollback.sh
      exit 1
```

## Caching Strategies

### Dependency Caching (Essential)

**Pattern**: Cache dependencies based on lock file hash

```yaml
# npm
cache:
  key: ${{ hashFiles('package-lock.json') }}
  paths:
    - node_modules/

# pip
cache:
  key: ${{ hashFiles('requirements.txt') }}
  paths:
    - .venv/

# cargo
cache:
  key: ${{ hashFiles('Cargo.lock') }}
  paths:
    - target/
    - ~/.cargo/
```

### Build Artifact Caching

**Pattern**: Cache build outputs to avoid rebuilding

```yaml
cache:
  key: build-${{ github.sha }}
  paths:
    - dist/
    - .cache/
```

### Incremental Builds

**Pattern**: Cache intermediate build artifacts

```yaml
# TypeScript incremental builds
cache:
  key: tsbuildinfo-${{ hashFiles('**/*.ts') }}
  paths:
    - tsconfig.tsbuildinfo

# Rust incremental builds
cache:
  key: rust-incremental-${{ hashFiles('**/*.rs') }}
  paths:
    - target/debug/incremental/
```

## Parallelization Strategies

### 1. Job-Level Parallelization

**Run independent jobs simultaneously**:
```yaml
jobs:
  lint:
    # Runs immediately
  test:
    # Runs immediately (parallel with lint)
  build:
    needs: [lint, test]  # Waits for both
```

### 2. Matrix Parallelization

**Test multiple configurations in parallel**:
```yaml
test:
  strategy:
    matrix:
      node: ['18', '20', '22']
      os: [ubuntu, windows, macos]
  # Runs 9 jobs in parallel (3 × 3)
```

### 3. Test Sharding

**Split tests across multiple runners**:
```yaml
test:
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  script:
    - npm test -- --shard=${{ matrix.shard }}/4
```

### 4. Conditional Parallelization

**Only parallelize when needed**:
```yaml
test:
  strategy:
    matrix:
      # Only test multiple versions on main branch
      node: ${{ github.ref == 'refs/heads/main' && ['18', '20', '22'] || ['20'] }}
```

## Optimization Patterns

### Pattern 1: Fail Fast

**Stop pipeline immediately on critical failures**:
```yaml
strategy:
  matrix:
    node: ['18', '20', '22']
  fail-fast: true  # Stop all jobs if one fails
```

### Pattern 2: Skip Redundant Builds

**Skip builds for docs-only changes**:
```yaml
on:
  push:
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

### Pattern 3: Smart Caching

**Multi-level cache fallback**:
```yaml
cache:
  key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}
  restore-keys: |
    ${{ runner.os }}-deps-
    ${{ runner.os }}-
```

### Pattern 4: Artifact Reuse

**Build once, test/deploy many times**:
```yaml
build:
  script:
    - npm run build
  artifacts:
    paths: [dist/]

test:
  needs: build
  script:
    - npm test  # Uses dist/ from build

deploy:
  needs: build
  script:
    - deploy dist/  # Uses same dist/
```

## Monitoring and Observability

### Pipeline Metrics to Track

1. **Pipeline Duration**
   - Target: < 10 minutes for CI
   - Track: P50, P95, P99

2. **Failure Rate**
   - Target: < 5% false positives
   - Track: Flaky tests, infrastructure failures

3. **Deploy Frequency**
   - Target: Multiple times per day (high-velocity)
   - Track: Deploys per day/week

4. **Mean Time to Recovery (MTTR)**
   - Target: < 1 hour
   - Track: Time from incident to fix deployed

### Notification Patterns

**Slack/Discord Notifications**:
```yaml
notify:
  script:
    - |
      curl -X POST $SLACK_WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d '{
          "text": "Pipeline failed: ${{ job.name }}",
          "channel": "#ci-alerts"
        }'
  when: on_failure
```

## Security Patterns

### Pattern 1: Secrets Rotation

**Rotate secrets regularly**:
- API keys: Every 90 days
- Deploy keys: Every 180 days
- Service account tokens: Every 90 days

### Pattern 2: Least Privilege

**Grant minimal permissions**:
```yaml
permissions:
  contents: read      # Read-only by default
  pull-requests: write  # Only if needed
```

### Pattern 3: Dependency Scanning

**Scan dependencies for vulnerabilities**:
```yaml
security:
  script:
    - npm audit --audit-level=high
    - snyk test --severity-threshold=high
```

### Pattern 4: SBOM Generation

**Generate Software Bill of Materials**:
```yaml
sbom:
  script:
    - cyclonedx-bom -o sbom.json
  artifacts:
    paths: [sbom.json]
```

## Rollback Strategies

### Pattern 1: Blue-Green Deployment

```yaml
deploy:
  script:
    # Deploy to green (inactive) environment
    - deploy.sh green
    # Run smoke tests
    - test-green.sh
    # Switch traffic to green
    - switch-traffic.sh green
    # Keep blue for rollback
```

### Pattern 2: Canary Deployment

```yaml
deploy:
  script:
    # Deploy to 5% of servers
    - deploy.sh --canary 5
    # Monitor for 10 minutes
    - monitor.sh 600
    # If OK, deploy to 100%
    - deploy.sh --all
```

### Pattern 3: Feature Flags

```yaml
deploy:
  script:
    # Deploy with new feature disabled
    - export FEATURE_ENABLED=false
    - deploy.sh
    # Enable for 10% of users
    - feature-flag.sh new-feature 10
```

## Common Pitfalls

1. **❌ No caching**: Slow pipelines
2. **❌ Sequential testing**: Wasted time
3. **❌ No fail-fast**: Long feedback loops
4. **❌ Rebuilding artifacts**: Inefficient
5. **❌ No quality gates**: Poor code quality
6. **❌ Manual deployments**: Slow releases
7. **❌ No rollback plan**: Risky deployments

## Integration with Rulebook

If using `@hivehub/rulebook`, CI/CD patterns are enforced automatically:

```bash
# Generate CI/CD workflows
npx @hivehub/rulebook workflows

# Validates against best practices:
# - Caching enabled
# - Parallel testing
# - Quality gates configured
```

## Related Templates

- See `/.rulebook/specs/GITHUB_ACTIONS.md` for GitHub Actions specifics
- See `/.rulebook/specs/GITLAB_CI.md` for GitLab CI specifics
- See `/.rulebook/specs/SECRETS_MANAGEMENT.md` for secrets handling
- See `/.rulebook/specs/QUALITY_ENFORCEMENT.md` for quality standards
