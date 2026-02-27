# GitHub Actions Workflows

This template provides guidance for implementing GitHub Actions CI/CD workflows with best practices for matrix builds, caching, and automation.

## Purpose

GitHub Actions workflows automate:
- Continuous Integration (build, test, lint)
- Continuous Deployment (publish, deploy)
- Code quality checks
- Security scanning
- Release automation
- Cross-platform testing

## Agent Automation Commands

When implementing or modifying GitHub Actions:

### Local Testing
```bash
# Install act for local testing
brew install act  # macOS
# or
choco install act  # Windows

# Run workflow locally
act

# Run specific job
act -j test

# Run with secrets
act -s GITHUB_TOKEN=xxx
```

### Workflow Management
```bash
# List workflows
gh workflow list

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Re-run failed jobs
gh run rerun <run-id>
```

## Basic Workflow Structure

### Minimal CI Workflow

**`.github/workflows/ci.yml`**:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
```

### Complete CI/CD Workflow

**`.github/workflows/ci-cd.yml`**:
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run Prettier
        run: npm run format:check

  test:
    name: Test (Node ${{ matrix.node-version }}, ${{ matrix.os }})
    runs-on: ${{ matrix.os }}

    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: ['18', '20', '22']
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '20'
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  publish:
    name: Publish to npm
    runs-on: ubuntu-latest
    needs: [build]
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Best Practices

### ✅ DO

1. **Use Dependency Caching**
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: '20'
       cache: 'npm'  # or 'pnpm', 'yarn'
   ```

2. **Use Matrix Builds for Cross-Platform Testing**
   ```yaml
   strategy:
     matrix:
       os: [ubuntu-latest, windows-latest, macos-latest]
       node-version: ['18', '20', '22']
   ```

3. **Use `needs` for Job Dependencies**
   ```yaml
   jobs:
     test:
       # ...
     deploy:
       needs: test  # Only runs if test succeeds
   ```

4. **Use Conditional Execution**
   ```yaml
   - name: Publish
     if: github.ref == 'refs/heads/main'
     run: npm publish
   ```

5. **Pin Action Versions**
   ```yaml
   # Good - specific commit SHA
   - uses: actions/checkout@8e5e7e5ab8b370d6c329ec480221332ada57f0ab  # v4.1.1

   # Better - major version (gets patches)
   - uses: actions/checkout@v4

   # Bad - latest (unpredictable)
   - uses: actions/checkout@main
   ```

6. **Use Environment Variables**
   ```yaml
   env:
     NODE_VERSION: '20'
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
   ```

### ❌ DON'T

1. **Don't hardcode secrets**
   ```yaml
   # Bad
   env:
     API_KEY: 'sk_live_abc123'

   # Good
   env:
     API_KEY: ${{ secrets.API_KEY }}
   ```

2. **Don't use `latest` for OS**
   ```yaml
   # Bad
   runs-on: ubuntu-latest

   # Better (predictable)
   runs-on: ubuntu-22.04
   ```

3. **Don't install dependencies twice**
   ```yaml
   # Bad - npm install in multiple jobs without artifacts

   # Good - use artifacts or caching
   ```

4. **Don't ignore failed jobs**
   ```yaml
   # Bad
   continue-on-error: true

   # Good - fix the underlying issue
   ```

## Matrix Builds

### Language Versions

**Node.js**:
```yaml
strategy:
  matrix:
    node-version: ['18', '20', '22']
    os: [ubuntu-latest, windows-latest, macos-latest]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
```

**Python**:
```yaml
strategy:
  matrix:
    python-version: ['3.9', '3.10', '3.11', '3.12']
    os: [ubuntu-latest, windows-latest, macos-latest]

steps:
  - uses: actions/setup-python@v5
    with:
      python-version: ${{ matrix.python-version }}
```

**Rust**:
```yaml
strategy:
  matrix:
    rust-version: [stable, beta, nightly]
    os: [ubuntu-latest, windows-latest, macos-latest]

steps:
  - uses: dtolnay/rust-toolchain@master
    with:
      toolchain: ${{ matrix.rust-version }}
```

### Include/Exclude Matrix Items

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: ['18', '20', '22']
    include:
      # Add experimental combination
      - os: ubuntu-latest
        node-version: '23'
        experimental: true
    exclude:
      # Skip specific combination
      - os: macos-latest
        node-version: '18'
```

## Caching Strategies

### npm/pnpm/yarn Cache

**Automatic** (recommended):
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Automatically caches node_modules
```

**Manual** (advanced):
```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Build Artifact Caching

```yaml
- name: Cache build
  uses: actions/cache@v4
  with:
    path: |
      dist/
      .cache/
    key: ${{ runner.os }}-build-${{ hashFiles('src/**') }}
```

### Rust Caching

```yaml
- uses: Swatinem/rust-cache@v2
  with:
    shared-key: "rust-cache"
    cache-on-failure: true
```

## Artifacts and Outputs

### Upload Artifacts

```yaml
- name: Build
  run: npm run build

- name: Upload build artifacts
  uses: actions/upload-artifact@v4
  with:
    name: dist-${{ github.sha }}
    path: dist/
    retention-days: 7
    if-no-files-found: error
```

### Download Artifacts

```yaml
- name: Download artifacts
  uses: actions/download-artifact@v4
  with:
    name: dist-${{ github.sha }}
    path: dist/
```

### Job Outputs

```yaml
jobs:
  build:
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - id: version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

  deploy:
    needs: build
    steps:
      - name: Deploy version ${{ needs.build.outputs.version }}
        run: deploy.sh ${{ needs.build.outputs.version }}
```

## Secrets Management

### Using Secrets

```yaml
- name: Deploy
  run: ./deploy.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Organization Secrets

```yaml
# Available to all repos in org
- name: Use org secret
  env:
    ORG_SECRET: ${{ secrets.ORG_SECRET }}
```

### Environment Secrets

```yaml
jobs:
  deploy:
    environment: production  # Uses production environment secrets
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
```

## Conditional Execution

### Branch Conditions

```yaml
# Only on main
- if: github.ref == 'refs/heads/main'
  run: deploy.sh

# Not on main
- if: github.ref != 'refs/heads/main'
  run: echo "Not main branch"

# Only on tags
- if: startsWith(github.ref, 'refs/tags/v')
  run: release.sh
```

### Event Conditions

```yaml
# Only on push (not PR)
- if: github.event_name == 'push'
  run: deploy.sh

# Only on PR
- if: github.event_name == 'pull_request'
  run: preview.sh
```

### Matrix Conditions

```yaml
# Only on specific OS
- if: runner.os == 'Linux'
  run: linux-specific-command

# Only on specific node version
- if: matrix.node-version == '20'
  run: upload-coverage.sh
```

## Advanced Patterns

### Parallel Jobs with Artifacts

```yaml
jobs:
  build:
    strategy:
      matrix:
        target: [linux, windows, macos]
    steps:
      - run: build-${{ matrix.target }}
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.target }}
          path: dist/

  test:
    needs: build
    strategy:
      matrix:
        target: [linux, windows, macos]
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-${{ matrix.target }}
      - run: test.sh
```

### Reusable Workflows

**`.github/workflows/reusable-test.yml`**:
```yaml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test
```

**Calling reusable workflow**:
```yaml
jobs:
  test-node-18:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '18'

  test-node-20:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '20'
```

### Dynamic Matrix from JSON

```yaml
jobs:
  generate-matrix:
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: echo "matrix={\"node\":[\"18\",\"20\",\"22\"]}" >> $GITHUB_OUTPUT

  test:
    needs: generate-matrix
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
    steps:
      - run: test-node-${{ matrix.node }}
```

## Security Best Practices

### Pull Request Security

```yaml
on:
  pull_request_target:  # Has write access to repo
    types: [opened, synchronize]

jobs:
  test:
    # Only run for trusted contributors
    if: github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
```

### Least Privilege Permissions

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  test:
    permissions:
      contents: read  # Override with minimal permissions
    steps:
      - uses: actions/checkout@v4
```

### GITHUB_TOKEN Scope

```yaml
- name: Create release
  uses: actions/create-release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Automatically scoped
```

## Troubleshooting

### Workflow Not Triggering

**Check**:
1. YAML syntax valid (`yamllint .github/workflows/`)
2. Branch/path filters correct
3. Workflow file in `.github/workflows/`
4. Workflow enabled in repo settings

### Cache Not Restoring

**Solutions**:
1. Check cache key uniqueness
2. Verify path exists
3. Check cache size limits (10GB max)
4. Use `restore-keys` for fallback

### Job Timeout

**Increase timeout**:
```yaml
jobs:
  test:
    timeout-minutes: 60  # Default is 360
```

### Debugging

**Enable debug logging**:
```yaml
- name: Debug
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
```

## Common Pitfalls

1. **❌ Not caching dependencies**: Slow CI builds
2. **❌ Running tests sequentially**: Use matrix for parallel
3. **❌ Hardcoding versions**: Use environment variables
4. **❌ No timeout limits**: Jobs hang indefinitely
5. **❌ Exposing secrets**: Use `secrets` context properly
6. **❌ Not pinning action versions**: Unpredictable behavior

## Integration with Rulebook

If using `@hivehub/rulebook`, workflows are automatically generated:

```bash
# Generate workflows
npx @hivehub/rulebook workflows

# Creates language-specific workflows in .github/workflows/
```

## Related Templates

- See `/.rulebook/specs/CI_CD_PATTERNS.md` for common CI/CD patterns
- See `/.rulebook/specs/SECRETS_MANAGEMENT.md` for secrets handling
- See `/.rulebook/specs/QUALITY_ENFORCEMENT.md` for quality gates
- See language-specific templates for test/build commands
