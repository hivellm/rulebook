# Secrets Management in CI/CD

This template provides best practices for securely managing secrets, API keys, tokens, and sensitive configuration in CI/CD pipelines.

## Purpose

Secure secrets management ensures:
- No hardcoded credentials in code
- Encrypted storage of sensitive data
- Least-privilege access control
- Audit trail of secret usage
- Easy secret rotation

## Core Principles

### 1. **Never Commit Secrets to Version Control**

**❌ Bad**:
```javascript
// NEVER do this
const API_KEY = 'sk_live_abc123xyz';
const DATABASE_URL = 'postgres://user:password@host/db';
```

**✅ Good**:
```javascript
// Use environment variables
const API_KEY = process.env.API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
```

### 2. **Use Platform Secret Stores**

**Platforms**:
- GitHub Actions: Repository/Organization secrets
- GitLab CI: CI/CD variables
- CircleCI: Environment variables (Project/Context)
- Azure DevOps: Variable groups
- AWS: Secrets Manager / Parameter Store

### 3. **Apply Least Privilege**

**Principle**: Grant minimum necessary access

```yaml
# Good: Environment-specific secrets
production:
  env:
    API_KEY: ${{ secrets.PROD_API_KEY }}

development:
  env:
    API_KEY: ${{ secrets.DEV_API_KEY }}
```

### 4. **Rotate Secrets Regularly**

**Schedule**:
- API keys: Every 90 days
- Access tokens: Every 90 days
- SSH keys: Every 180 days
- Database passwords: Every 90 days

## Platform-Specific Implementation

### GitHub Actions

#### Repository Secrets

**Add via UI**:
1. Repository → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `API_KEY`
4. Value: `sk_live_abc123xyz`

**Add via CLI**:
```bash
gh secret set API_KEY < api_key.txt

# Or inline
gh secret set API_KEY --body "sk_live_abc123xyz"
```

**Usage in Workflow**:
```yaml
jobs:
  deploy:
    steps:
      - name: Deploy
        run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### Organization Secrets

**When to use**: Shared across multiple repositories

```yaml
# Available to all repos in org
- name: Use org secret
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # Org-level secret
```

#### Environment Secrets

**When to use**: Environment-specific secrets (production, staging)

```yaml
jobs:
  deploy:production:
    environment: production  # Uses production environment secrets
    steps:
      - run: deploy.sh
        env:
          API_KEY: ${{ secrets.API_KEY }}  # production-specific value
```

### GitLab CI

#### CI/CD Variables

**Add via UI**:
1. Project → Settings → CI/CD → Variables
2. Add variable
3. Key: `API_KEY`
4. Value: `sk_live_abc123xyz`
5. Flags: ✓ Protect variable (main branch only), ✓ Mask variable

**Usage in Pipeline**:
```yaml
deploy:
  script:
    - deploy.sh
  variables:
    API_KEY: ${{ secrets.API_KEY }}
  only:
    - main
```

#### File Variables

**For multi-line secrets** (certificates, keys):
```yaml
deploy:
  before_script:
    - echo "$SSL_CERTIFICATE" > cert.pem
    - chmod 600 cert.pem
  script:
    - use-certificate cert.pem
```

### CircleCI

#### Project Environment Variables

**Add via UI**:
1. Project Settings → Environment Variables
2. Add Variable
3. Name: `API_KEY`, Value: `sk_live_abc123xyz`

**Usage in Config**:
```yaml
jobs:
  deploy:
    steps:
      - run:
          command: deploy.sh
          environment:
            API_KEY: $API_KEY
```

#### Contexts (Organization Secrets)

```yaml
workflows:
  deploy:
    jobs:
      - deploy:
          context: production-secrets  # Shared secrets
```

## Secret Types and Patterns

### 1. API Keys

**Pattern**: Use environment-specific keys

```yaml
# development
env:
  STRIPE_KEY: ${{ secrets.STRIPE_TEST_KEY }}

# production
env:
  STRIPE_KEY: ${{ secrets.STRIPE_LIVE_KEY }}
```

### 2. Database Credentials

**Pattern**: Use connection strings with secrets

```yaml
env:
  # Store entire connection string
  DATABASE_URL: ${{ secrets.DATABASE_URL }}

  # Or compose from parts
  DB_HOST: ${{ secrets.DB_HOST }}
  DB_USER: ${{ secrets.DB_USER }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  DB_NAME: ${{ secrets.DB_NAME }}
```

**Script usage**:
```bash
# Use DATABASE_URL directly
psql "$DATABASE_URL" -c "SELECT 1"

# Or construct connection string
psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST/$DB_NAME"
```

### 3. SSH Keys

**Pattern**: Add SSH key for deployments

```yaml
- name: Setup SSH key
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts
```

### 4. Service Account Keys (JSON)

**Pattern**: Store JSON credentials as secret

```yaml
- name: Authenticate with GCP
  run: |
    echo '${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}' > key.json
    gcloud auth activate-service-account --key-file=key.json
    rm key.json  # Clean up
```

### 5. Certificates (PEM/CRT)

**Pattern**: Multi-line secret as file

```yaml
- name: Setup certificate
  run: |
    echo "${{ secrets.SSL_CERTIFICATE }}" > cert.pem
    echo "${{ secrets.SSL_PRIVATE_KEY }}" > key.pem
    chmod 600 *.pem
```

### 6. Signing Keys

**Pattern**: Sign artifacts with secret key

```yaml
- name: Sign package
  run: |
    echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --import
    gpg --sign package.tar.gz
```

## Advanced Patterns

### Pattern 1: Dynamic Secrets from Vault

**Use Vault for dynamic, short-lived secrets**:

```yaml
- name: Get secrets from Vault
  run: |
    # Login to Vault
    vault login -method=github token=${{ secrets.VAULT_TOKEN }}

    # Get dynamic database credentials (expires in 1 hour)
    export DB_USER=$(vault read -field=username database/creds/app)
    export DB_PASSWORD=$(vault read -field=password database/creds/app)

    # Use credentials
    psql "postgres://$DB_USER:$DB_PASSWORD@$DB_HOST/$DB_NAME"
```

### Pattern 2: AWS Secrets Manager

**Retrieve secrets at runtime**:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}

- name: Get secrets from AWS Secrets Manager
  run: |
    export API_KEY=$(aws secretsmanager get-secret-value \
      --secret-id production/api-key \
      --query SecretString \
      --output text)

    # Use API_KEY
    curl -H "Authorization: Bearer $API_KEY" https://api.example.com
```

### Pattern 3: Google Secret Manager

```yaml
- name: Authenticate with GCP
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_CREDENTIALS }}

- name: Get secrets
  run: |
    export DATABASE_URL=$(gcloud secrets versions access latest \
      --secret="database-url")
```

### Pattern 4: OIDC/Federated Authentication

**Passwordless authentication using OIDC** (GitHub Actions → AWS):

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/GitHubActionsRole
    aws-region: us-east-1
    # No secrets needed! Uses OIDC token
```

**Benefits**:
- No long-lived credentials
- Automatic rotation
- Fine-grained permissions

## Security Best Practices

### ✅ DO

1. **Use Secret Scanning**
   ```yaml
   # Enable in GitHub: Settings → Code security and analysis
   # Automatically detects committed secrets
   ```

2. **Mask Secrets in Logs**
   ```yaml
   # Secrets automatically masked in GitHub Actions logs
   # Manually mask custom values:
   - run: echo "::add-mask::$CUSTOM_VALUE"
   ```

3. **Use Separate Secrets Per Environment**
   ```yaml
   production:
     env:
       API_KEY: ${{ secrets.PROD_API_KEY }}

   staging:
     env:
       API_KEY: ${{ secrets.STAGING_API_KEY }}
   ```

4. **Limit Secret Scope**
   ```yaml
   # GitHub: Only available to protected branches
   # Settings → Secrets → Environment secrets → production
   # ✓ Required reviewers
   # ✓ Wait timer
   ```

5. **Audit Secret Usage**
   ```yaml
   # GitHub audit log shows:
   # - Who accessed secrets
   # - When secrets were used
   # - Which workflows used secrets
   ```

6. **Rotate Secrets Regularly**
   ```bash
   # Automate rotation with cron job
   0 0 1 * * rotate-secrets.sh  # Monthly
   ```

### ❌ DON'T

1. **Don't Echo Secrets**
   ```yaml
   # Bad
   - run: echo "API key is ${{ secrets.API_KEY }}"

   # Good
   - run: echo "API key configured"
   ```

2. **Don't Store Secrets in Code**
   ```javascript
   // Bad
   const key = 'sk_live_abc123';

   // Good
   const key = process.env.API_KEY;
   ```

3. **Don't Use Secrets in PR Builds**
   ```yaml
   # Bad - secrets exposed to forks
   on: pull_request

   # Good - use pull_request_target with care
   on:
     pull_request_target:
       types: [labeled]

   jobs:
     test:
       if: github.event.label.name == 'safe-to-test'
   ```

4. **Don't Share Secrets Across Teams**
   ```yaml
   # Bad - everyone has prod access
   env:
     PROD_KEY: ${{ secrets.PROD_KEY }}

   # Good - separate secrets per team/environment
   ```

5. **Don't Commit `.env` Files**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.*.local
   **/.env
   ```

## Secret Rotation Strategy

### Automated Rotation Process

**1. Generate New Secret**:
```bash
# Script: rotate-api-key.sh
NEW_KEY=$(generate-api-key.sh)

# Update in secret store
gh secret set API_KEY --body "$NEW_KEY"

# Update in application
update-application-config.sh "$NEW_KEY"
```

**2. Test New Secret**:
```yaml
- name: Test new secret
  run: |
    curl -H "Authorization: Bearer ${{ secrets.API_KEY }}" \
      https://api.example.com/health
```

**3. Deactivate Old Secret**:
```bash
# After confirming new secret works
deactivate-old-api-key.sh "$OLD_KEY"
```

### Rotation Checklist

- [ ] Generate new secret
- [ ] Update in CI/CD platform
- [ ] Deploy with new secret
- [ ] Verify functionality
- [ ] Revoke old secret
- [ ] Update documentation

## Troubleshooting

### Secret Not Available

**Issue**: Workflow can't access secret

**Solutions**:
1. Check secret name matches exactly (case-sensitive)
2. Verify workflow has permission to access secret
3. Check if secret is environment-specific
4. Ensure secret is not expired/deleted

### Secret Masked Incorrectly

**Issue**: Secret visible in logs

**Solutions**:
```yaml
# Explicitly mask value
- run: echo "::add-mask::$VALUE"

# Check if secret contains special characters
# - Secrets with spaces may not mask correctly
# - Use quotes: echo "::add-mask::$SECRET"
```

### Secret Too Large

**Issue**: Secret exceeds size limit

**GitHub Limits**:
- Secret value: 64 KB
- Repository: 100 secrets
- Organization: 1000 secrets

**Solutions**:
1. Split large secrets into multiple parts
2. Store in external secret manager (Vault, AWS Secrets Manager)
3. Use base64 encoding for binary data

### Secret Rotation Breaks Deployment

**Issue**: Old secret revoked before new one deployed

**Solution**:
```bash
# Grace period approach
1. Deploy new secret to CI/CD
2. Deploy application with new secret
3. Wait 24 hours (grace period)
4. Revoke old secret
```

## Common Pitfalls

1. **❌ Hardcoding secrets**: Always use environment variables
2. **❌ Committing `.env`**: Add to `.gitignore`
3. **❌ Using same secret everywhere**: Separate dev/staging/prod
4. **❌ Never rotating secrets**: Set up automated rotation
5. **❌ Logging secrets**: Mask sensitive values
6. **❌ Sharing secrets insecurely**: Use secret management platform
7. **❌ No audit trail**: Enable secret access logging

## Integration with Rulebook

If using `@hivehub/rulebook`, secret management patterns are enforced:

```bash
# Initialize with secret management best practices
npx @hivehub/rulebook init

# Creates:
# - .env.example (template)
# - .gitignore (excludes .env)
# - Documentation on secret management
```

**`.env.example`**:
```bash
# API Keys
API_KEY=your-api-key-here
DATABASE_URL=postgres://user:password@localhost/db

# AWS Credentials
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Note: Copy to .env and fill with actual values
# .env is gitignored and should NEVER be committed
```

## Related Templates

- See `/.rulebook/specs/GITHUB_ACTIONS.md` for GitHub Actions secrets
- See `/.rulebook/specs/GITLAB_CI.md` for GitLab CI secrets
- See `/.rulebook/specs/CI_CD_PATTERNS.md` for deployment patterns
- See `/.rulebook/specs/GIT.md` for .gitignore patterns
