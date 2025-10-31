<!-- SENTRY:START -->
# Sentry MCP Instructions

**CRITICAL**: Use MCP Sentry for error tracking, performance monitoring, and issue management.

## Core Operations

### Error Tracking
```typescript
// Capture error
Sentry.captureException(error, {
  tags: { feature: 'authentication' },
  level: 'error',
  extra: { userId: user.id, context: 'login' }
})

// Capture message
Sentry.captureMessage('User registration completed', {
  level: 'info',
  tags: { feature: 'registration' }
})

// Set context
Sentry.setUser({ id: user.id, email: user.email })
Sentry.setTag('environment', 'production')
Sentry.setContext('metadata', { version: '1.0.0' })
```

### Issue Management
```typescript
// Get issues
sentry.issues.list({
  project: 'project-slug',
  query: 'is:unresolved',
  statsPeriod: '24h'
})

// Update issue
sentry.issues.update({
  issueId: 'issue-id',
  status: 'resolved',
  assignedTo: 'user-id'
})

// Add comment
sentry.issues.addComment({
  issueId: 'issue-id',
  comment: 'Fixed in commit abc123'
})
```

### Performance Monitoring
```typescript
// Start transaction
const transaction = Sentry.startTransaction({
  name: 'API Request',
  op: 'http.server'
})

// Create span
const span = transaction.startChild({
  op: 'db.query',
  description: 'SELECT * FROM users'
})

// Finish span
span.finish()

// Finish transaction
transaction.finish()
```

### Releases
```typescript
// Create release
sentry.releases.create({
  organization: 'org-slug',
  version: '1.0.0',
  projects: ['project-slug']
})

// Upload source maps
sentry.releases.uploadSourceMaps({
  organization: 'org-slug',
  version: '1.0.0',
  files: ['dist/bundle.js.map']
})

// Finalize release
sentry.releases.finalize({
  organization: 'org-slug',
  version: '1.0.0'
})
```

## Common Patterns

### Error Handling with Context
```typescript
try {
  await riskyOperation()
} catch (error) {
  Sentry.withScope(scope => {
    scope.setTag('operation', 'riskyOperation')
    scope.setLevel('error')
    scope.setContext('operation', {
      input: operationInput,
      timestamp: Date.now()
    })
    Sentry.captureException(error)
  })
  throw error
}
```

### Performance Tracking
```typescript
async function fetchUserData(userId) {
  const transaction = Sentry.startTransaction({
    name: 'fetchUserData',
    op: 'function'
  })

  try {
    const dbSpan = transaction.startChild({
      op: 'db.query',
      description: 'Get user from database'
    })
    const user = await db.users.findById(userId)
    dbSpan.finish()

    const cacheSpan = transaction.startChild({
      op: 'cache.set',
      description: 'Cache user data'
    })
    await cache.set(`user:${userId}`, user)
    cacheSpan.finish()

    return user
  } finally {
    transaction.finish()
  }
}
```

### CI/CD Integration
```typescript
// After deployment, create release
const release = await sentry.releases.create({
  organization: 'my-org',
  version: process.env.GIT_SHA,
  projects: ['my-project'],
  refs: [{
    repository: 'my-org/my-repo',
    commit: process.env.GIT_SHA
  }]
})

// Associate commits
await sentry.releases.setCommits({
  organization: 'my-org',
  version: process.env.GIT_SHA,
  auto: true  // Auto-discover commits
})

// Deploy notification
await sentry.releases.createDeploy({
  organization: 'my-org',
  version: process.env.GIT_SHA,
  environment: 'production',
  dateStarted: new Date().toISOString()
})
```

### Alert Management
```typescript
// Query for new errors
const issues = await sentry.issues.list({
  project: 'my-project',
  query: 'is:unresolved is:for_review',
  statsPeriod: '1h'
})

// Auto-assign high-priority issues
for (const issue of issues) {
  if (issue.level === 'error' && issue.count > 100) {
    await sentry.issues.update({
      issueId: issue.id,
      status: 'unresolved',
      assignedTo: 'oncall-engineer',
      priority: 'high'
    })
  }
}
```

## Best Practices

✅ **DO:**
- Set user context for better debugging
- Use breadcrumbs for event trail
- Tag errors by feature/component
- Create releases for deployments
- Upload source maps
- Set appropriate error levels
- Use transactions for performance
- Filter sensitive data

❌ **DON'T:**
- Log sensitive user data
- Ignore rate limits
- Skip release tracking
- Capture expected errors
- Send test errors to production
- Disable in development unnecessarily

## Configuration

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sentry"],
      "env": {
        "SENTRY_DSN": "https://key@sentry.io/project-id",
        "SENTRY_AUTH_TOKEN": "your-auth-token",
        "SENTRY_ORG": "your-org-slug",
        "SENTRY_PROJECT": "your-project-slug"
      }
    }
  }
}
```

**Initialization:**
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,
  tracesSampleRate: 1.0,  // 100% of transactions
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
    }
    return event
  }
})
```

## Integration with AGENT_AUTOMATION

Track errors during development:

```typescript
// After running tests
if (testErrors.length > 0) {
  Sentry.captureMessage('Test failures detected', {
    level: 'warning',
    tags: { source: 'ci', suite: 'unit-tests' },
    extra: { errors: testErrors }
  })
}
```

<!-- SENTRY:END -->

