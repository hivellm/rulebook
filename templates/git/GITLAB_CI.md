# GitLab CI/CD

This template provides guidance for implementing GitLab CI/CD pipelines with best practices for multi-stage pipelines, caching, and artifacts.

## Purpose

GitLab CI/CD enables:
- Automated testing and building
- Continuous deployment
- Container registry integration
- Built-in security scanning
- Kubernetes deployment

## Agent Automation Commands

When implementing or modifying GitLab CI pipelines:

### Local Testing
```bash
# Validate .gitlab-ci.yml syntax
gitlab-ci-lint .gitlab-ci.yml

# Or via API
curl --header "Content-Type: application/json" \
  --data @.gitlab-ci.yml \
  https://gitlab.com/api/v4/ci/lint
```

### Pipeline Management
```bash
# Trigger pipeline
gitlab-runner exec shell build

# View pipeline status
git lab pipeline status

# View pipeline logs
gitlab-runner exec shell test --debug
```

## Basic Pipeline Structure

### Minimal CI Pipeline

**`.gitlab-ci.yml`**:
```yaml
image: node:20

stages:
  - test
  - build
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm test

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

deploy:
  stage: deploy
  script:
    - echo "Deploying to production"
  environment:
    name: production
    url: https://example.com
  only:
    - main
```

### Complete CI/CD Pipeline

**`.gitlab-ci.yml`**:
```yaml
image: node:20

variables:
  NPM_CONFIG_CACHE: "$CI_PROJECT_DIR/.npm"
  CYPRESS_CACHE_FOLDER: "$CI_PROJECT_DIR/.cypress"

stages:
  - validate
  - build
  - test
  - security
  - deploy

# Template for node jobs
.node-template:
  before_script:
    - npm ci --prefer-offline
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - .npm/
      - node_modules/

lint:
  extends: .node-template
  stage: validate
  script:
    - npm run lint
    - npm run format:check

typecheck:
  extends: .node-template
  stage: validate
  script:
    - npm run type-check

build:
  extends: .node-template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

test:unit:
  extends: .node-template
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ['18', '20', '22']
  image: node:$NODE_VERSION
  script:
    - npm test
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:e2e:
  extends: .node-template
  stage: test
  script:
    - npm run test:e2e
  artifacts:
    when: on_failure
    paths:
      - cypress/screenshots/
      - cypress/videos/
    expire_in: 1 week

security:dependencies:
  stage: security
  script:
    - npm audit --audit-level=high
  allow_failure: true

security:sast:
  stage: security
  image: registry.gitlab.com/gitlab-org/security-products/analyzers/semgrep:latest
  script:
    - /analyzer run
  artifacts:
    reports:
      sast: gl-sast-report.json

deploy:staging:
  stage: deploy
  script:
    - npm run deploy:staging
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop

deploy:production:
  stage: deploy
  script:
    - npm run deploy:production
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - main
```

## Best Practices

### ✅ DO

1. **Use Caching**
   ```yaml
   cache:
     key:
       files:
         - package-lock.json
     paths:
       - node_modules/
       - .npm/
   ```

2. **Use Job Templates (DRY)**
   ```yaml
   .deploy-template:
     stage: deploy
     script:
       - deploy.sh $ENVIRONMENT
     only:
       - main

   deploy:staging:
     extends: .deploy-template
     variables:
       ENVIRONMENT: staging

   deploy:production:
     extends: .deploy-template
     variables:
       ENVIRONMENT: production
   ```

3. **Use Parallel Matrix**
   ```yaml
   test:
     parallel:
       matrix:
         - NODE_VERSION: ['18', '20', '22']
           OS: ['ubuntu', 'alpine']
     image: node:$NODE_VERSION-$OS
   ```

4. **Use Pipeline-Specific Variables**
   ```yaml
   variables:
     DEPLOY_ENV: "production"
     API_ENDPOINT: "https://api.example.com"
   ```

5. **Use Artifacts for Build Outputs**
   ```yaml
   build:
     artifacts:
       paths:
         - dist/
       expire_in: 1 week
   ```

### ❌ DON'T

1. **Don't hardcode secrets**
   ```yaml
   # Bad
   script:
     - export API_KEY="sk_live_abc123"

   # Good
   script:
     - export API_KEY="$API_KEY"  # From CI/CD variables
   ```

2. **Don't use `latest` tags**
   ```yaml
   # Bad
   image: node:latest

   # Good
   image: node:20.11.0
   ```

3. **Don't run unnecessary jobs**
   ```yaml
   # Good - only run on specific branches
   deploy:
     only:
       - main
     except:
       - schedules
   ```

## Caching Strategies

### Global Cache

```yaml
# Apply to all jobs
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
```

### Job-Specific Cache

```yaml
test:
  cache:
    key: test-cache
    paths:
      - node_modules/
      - .cache/

build:
  cache:
    key: build-cache
    paths:
      - dist/
      - .webpack-cache/
```

### Cache with Fallback

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
  policy: pull  # Only pull, don't push

build:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
    policy: pull-push  # Pull and push cache
```

## Artifacts and Dependencies

### Uploading Artifacts

```yaml
build:
  script:
    - npm run build
  artifacts:
    name: "dist-$CI_COMMIT_SHORT_SHA"
    paths:
      - dist/
    expire_in: 1 week
    when: on_success  # or always, on_failure
```

### Downloading Artifacts

```yaml
deploy:
  dependencies:
    - build  # Downloads artifacts from 'build' job
  script:
    - ls dist/  # Artifact available
    - deploy.sh
```

### Artifact Reports

```yaml
test:
  script:
    - npm test
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
      dotenv: build.env  # Export variables to other jobs
```

## Multi-Project Pipelines

### Parent Pipeline

```yaml
# .gitlab-ci.yml
trigger:frontend:
  stage: deploy
  trigger:
    project: mygroup/frontend
    strategy: depend

trigger:backend:
  stage: deploy
  trigger:
    project: mygroup/backend
    strategy: depend
```

### Child Pipelines

```yaml
# Parent pipeline
generate-config:
  script:
    - generate-dynamic-config.sh > dynamic.yml
  artifacts:
    paths:
      - dynamic.yml

trigger-child:
  trigger:
    include:
      - artifact: dynamic.yml
        job: generate-config
    strategy: depend
```

## Docker Integration

### Build and Push Docker Image

```yaml
docker-build:
  image: docker:latest
  services:
    - docker:dind
  variables:
    DOCKER_DRIVER: overlay2
    DOCKER_TLS_CERTDIR: "/certs"
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
```

### Use GitLab Container Registry

```yaml
build:
  image: docker:latest
  services:
    - docker:dind
  script:
    # Login to GitLab Container Registry
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

    # Build and tag
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG .

    # Push
    - docker push $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
```

## Kubernetes Deployment

### Deploy to Kubernetes

```yaml
deploy:k8s:
  image: bitnami/kubectl:latest
  stage: deploy
  script:
    # Configure kubectl
    - kubectl config set-cluster k8s --server="$KUBE_URL" --insecure-skip-tls-verify=true
    - kubectl config set-credentials admin --token="$KUBE_TOKEN"
    - kubectl config set-context default --cluster=k8s --user=admin
    - kubectl config use-context default

    # Deploy
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - kubectl rollout status deployment/app
  environment:
    name: production
    kubernetes:
      namespace: production
```

### Helm Deployment

```yaml
deploy:helm:
  image: alpine/helm:latest
  stage: deploy
  script:
    - helm upgrade --install myapp ./charts/myapp \
        --set image.tag=$CI_COMMIT_SHORT_SHA \
        --namespace production
  environment:
    name: production
```

## Rules and Conditions

### Complex Rules

```yaml
test:
  script:
    - npm test
  rules:
    # Run on main branch
    - if: $CI_COMMIT_BRANCH == "main"
      when: always

    # Run on merge requests
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: always

    # Run on tags starting with 'v'
    - if: $CI_COMMIT_TAG =~ /^v/
      when: always

    # Skip on schedules
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: never

    # Manual for feature branches
    - if: $CI_COMMIT_BRANCH =~ /^feature\//
      when: manual

    # Otherwise skip
    - when: never
```

### Changes-Based Execution

```yaml
test:backend:
  script:
    - cd backend && npm test
  rules:
    - changes:
        - backend/**/*
      when: always

test:frontend:
  script:
    - cd frontend && npm test
  rules:
    - changes:
        - frontend/**/*
      when: always
```

## Security Scanning

### SAST (Static Application Security Testing)

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml

sast:
  stage: security
  variables:
    SAST_EXCLUDED_PATHS: "spec, test, tests, tmp, node_modules"
```

### Dependency Scanning

```yaml
include:
  - template: Security/Dependency-Scanning.gitlab-ci.yml

dependency_scanning:
  stage: security
```

### Container Scanning

```yaml
include:
  - template: Security/Container-Scanning.gitlab-ci.yml

container_scanning:
  stage: security
  variables:
    CS_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
```

## Optimization Patterns

### Skip Pipeline for Docs

```yaml
# Skip pipeline if only docs changed
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
      changes:
        - "**/*.md"
        - "docs/**/*"
      when: never
    - when: always
```

### Interruptible Jobs

```yaml
test:
  interruptible: true  # Cancel if new pipeline starts
  script:
    - npm test
```

### Retry Failed Jobs

```yaml
test:
  script:
    - npm test
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
```

## CI/CD Variables

### Predefined Variables

```yaml
test:
  script:
    - echo "Pipeline ID: $CI_PIPELINE_ID"
    - echo "Commit SHA: $CI_COMMIT_SHA"
    - echo "Commit Branch: $CI_COMMIT_BRANCH"
    - echo "Commit Tag: $CI_COMMIT_TAG"
    - echo "Project Name: $CI_PROJECT_NAME"
    - echo "Registry: $CI_REGISTRY_IMAGE"
```

### Custom Variables

```yaml
variables:
  ENVIRONMENT: "production"
  API_ENDPOINT: "https://api.example.com"

deploy:
  script:
    - deploy.sh --env $ENVIRONMENT --api $API_ENDPOINT
```

### Protected Variables

**Add via UI**: Settings → CI/CD → Variables

```yaml
deploy:
  script:
    - echo "Deploying with token: $DEPLOY_TOKEN"
  only:
    - main  # Protected variables only available on protected branches
```

## Troubleshooting

### Pipeline Not Triggered

**Check**:
1. `.gitlab-ci.yml` syntax valid
2. Rules/only/except conditions met
3. CI/CD enabled for project
4. GitLab Runner available

### Cache Not Working

**Solutions**:
```yaml
# Use specific cache key
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/

# Clear cache if corrupted
# Settings → CI/CD → Clear runner caches
```

### Artifacts Not Available

**Check**:
1. Artifact expiration not exceeded
2. Job succeeded (artifacts only uploaded on success by default)
3. Dependencies declared correctly

```yaml
deploy:
  dependencies:
    - build  # Must match job name exactly
```

## Common Pitfalls

1. **❌ No caching**: Slow pipelines
2. **❌ Not using templates**: Duplication
3. **❌ Artifacts too large**: Slow uploads/downloads
4. **❌ No retry logic**: Flaky tests fail pipeline
5. **❌ Running all jobs always**: Wasted resources
6. **❌ No manual gates for production**: Risky deployments

## Integration with Rulebook

If using `@hivehub/rulebook`, GitLab CI pipelines are generated automatically:

```bash
# Generate GitLab CI pipeline
npx @hivehub/rulebook workflows

# Creates .gitlab-ci.yml with:
# - Language-specific stages
# - Caching configured
# - Artifacts management
# - Security scanning
```

## Related Templates

- See `/rulebook/GITHUB_ACTIONS.md` for GitHub Actions comparison
- See `/rulebook/CI_CD_PATTERNS.md` for general CI/CD patterns
- See `/rulebook/SECRETS_MANAGEMENT.md` for secrets handling
- See `/rulebook/QUALITY_ENFORCEMENT.md` for quality gates
