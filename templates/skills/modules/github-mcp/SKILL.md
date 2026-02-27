---
name: "GitHub MCP"
description: "Monitor CI/CD workflows after every `git push` using GitHub MCP."
version: "1.0.0"
category: "modules"
author: "Rulebook"
tags: ["modules", "mcp"]
dependencies: []
conflicts: []
---
<!-- GITHUB_MCP:START -->
# GitHub MCP Server Integration

**CRITICAL**: Monitor CI/CD workflows after every `git push` using GitHub MCP.

## Workflow After Push

```
1. Push changes
2. Wait 10 seconds  
3. Check workflow status via GitHub MCP
4. If workflows running → check again in next interaction
5. If workflows failed → fetch logs, analyze, fix
6. If workflows passed → confirm to user
```

## Error Recovery

**When CI/CD fails:**

```
1. Fetch error information (workflow, job, step, logs)
2. Analyze against AGENTS.md standards
3. Propose fix
4. Implement fix with full quality checks
5. Commit and provide push command
6. Monitor workflows again
```

## Best Practices

✅ **DO:**
- Always check workflows after push
- Fetch complete error logs on failures
- Fix issues before next feature
- Verify fixes locally before re-pushing
- Report status to user

❌ **DON'T:**
- Ignore workflow failures
- Push again without fixing
- Skip error analysis
- Proceed if workflows failing
- Create tags if CI/CD failed

## Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

**Token permissions:** Repository (read), Actions (read), Workflows (read/write)

<!-- GITHUB_MCP:END -->
