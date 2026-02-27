---
name: "Atlassian"
description: "Use MCP Atlassian for Jira issues, Confluence documentation, and Bitbucket repositories."
version: "1.0.0"
category: "modules"
author: "Rulebook"
tags: ["modules", "mcp"]
dependencies: []
conflicts: []
---
<!-- ATLASSIAN:START -->
# Atlassian MCP Instructions

**CRITICAL**: Use MCP Atlassian for Jira issues, Confluence documentation, and Bitbucket repositories.

## Jira Operations

### Issue Management
```typescript
// Create issue
jira.issues.createIssue({
  fields: {
    project: { key: 'PROJ' },
    summary: 'Bug in authentication',
    description: 'Users cannot login with valid credentials',
    issuetype: { name: 'Bug' },
    priority: { name: 'High' }
  }
})

// Update issue
jira.issues.updateIssue({
  issueIdOrKey: 'PROJ-123',
  fields: {
    status: { name: 'In Progress' },
    assignee: { accountId: 'user-id' }
  }
})

// Get issue
jira.issues.getIssue({ issueIdOrKey: 'PROJ-123' })

// Search issues
jira.issueSearch.searchForIssuesUsingJql({
  jql: 'project = PROJ AND status = "To Do" ORDER BY priority DESC'
})

// Add comment
jira.issueComments.addComment({
  issueIdOrKey: 'PROJ-123',
  body: 'Working on this issue'
})
```

### Transitions
```typescript
// Get transitions
const transitions = await jira.issues.getTransitions({ issueIdOrKey: 'PROJ-123' })

// Transition issue
jira.issues.doTransition({
  issueIdOrKey: 'PROJ-123',
  transition: { id: transitionId }
})
```

## Confluence Operations

### Page Management
```typescript
// Create page
confluence.content.createContent({
  type: 'page',
  title: 'API Documentation',
  space: { key: 'DOCS' },
  body: {
    storage: {
      value: '<h1>Introduction</h1><p>Content here</p>',
      representation: 'storage'
    }
  }
})

// Update page
confluence.content.updateContent({
  id: 'page-id',
  type: 'page',
  title: 'Updated Title',
  version: { number: currentVersion + 1 },
  body: {
    storage: {
      value: '<p>Updated content</p>',
      representation: 'storage'
    }
  }
})

// Get page
confluence.content.getContentById({ id: 'page-id' })

// Search
confluence.search.search({
  cql: 'type=page AND space=DOCS AND title~"API"'
})
```

### Attachments
```typescript
// Add attachment
confluence.content.createAttachment({
  id: 'page-id',
  file: fileBuffer,
  filename: 'document.pdf'
})

// Get attachments
confluence.content.getAttachments({ id: 'page-id' })
```

## Bitbucket Operations

### Repository Management
```typescript
// Get repositories
bitbucket.repositories.list({ workspace: 'my-workspace' })

// Get repository
bitbucket.repositories.get({
  workspace: 'my-workspace',
  repo_slug: 'my-repo'
})

// Get branches
bitbucket.refs.listBranches({
  workspace: 'my-workspace',
  repo_slug: 'my-repo'
})
```

### Pull Requests
```typescript
// Create PR
bitbucket.pullrequests.create({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  title: 'Add new feature',
  source: { branch: { name: 'feature/new-feature' } },
  destination: { branch: { name: 'main' } },
  description: 'Implements feature X'
})

// List PRs
bitbucket.pullrequests.list({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  state: 'OPEN'
})

// Approve PR
bitbucket.pullrequests.approve({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  pull_request_id: 123
})
```

## Common Patterns

### CI/CD Integration
```typescript
// Create issue on test failure
if (testsFailed) {
  await jira.issues.createIssue({
    fields: {
      project: { key: 'PROJ' },
      summary: `Test failure in ${testSuite}`,
      description: `Tests failed with errors:\n${errors.join('\n')}`,
      issuetype: { name: 'Bug' },
      labels: ['ci-failure', 'automated']
    }
  })
}
```

### Documentation Sync
```typescript
// Sync CHANGELOG to Confluence
const changelog = fs.readFileSync('CHANGELOG.md', 'utf-8')
const html = markdownToConfluenceHtml(changelog)

await confluence.content.updateContent({
  id: changelogPageId,
  type: 'page',
  title: 'Changelog',
  version: { number: version + 1 },
  body: { storage: { value: html, representation: 'storage' } }
})
```

### Sprint Planning
```typescript
// Get sprint tasks
const issues = await jira.issueSearch.searchForIssuesUsingJql({
  jql: 'sprint = ACTIVE AND project = PROJ',
  fields: ['summary', 'status', 'assignee', 'priority']
})

// Generate sprint report
const report = issues.issues.map(issue => ({
  key: issue.key,
  summary: issue.fields.summary,
  status: issue.fields.status.name,
  assignee: issue.fields.assignee?.displayName
}))
```

## Best Practices

✅ **DO:**
- Use JQL for complex Jira queries
- Cache project/user data
- Handle rate limits
- Use issue transitions properly
- Version Confluence pages correctly
- Link issues to commits/PRs

❌ **DON'T:**
- Create duplicate issues
- Skip issue validation
- Ignore rate limiting
- Hardcode issue keys
- Update without version check
- Store credentials in code

## Configuration

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-atlassian"],
      "env": {
        "JIRA_HOST": "your-domain.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token",
        "CONFLUENCE_HOST": "your-domain.atlassian.net",
        "CONFLUENCE_EMAIL": "your-email@example.com",
        "CONFLUENCE_API_TOKEN": "your-api-token",
        "BITBUCKET_WORKSPACE": "your-workspace",
        "BITBUCKET_USERNAME": "your-username",
        "BITBUCKET_APP_PASSWORD": "your-app-password"
      }
    }
  }
}
```

**Setup:**
1. Generate API token at https://id.atlassian.com/manage-profile/security/api-tokens
2. For Bitbucket, create app password in account settings
3. Never commit credentials

<!-- ATLASSIAN:END -->

