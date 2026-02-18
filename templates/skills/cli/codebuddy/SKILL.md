---
name: "Codebuddy"
description: "Tool: Intelligent pair programming assistant"
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "cli-tool"]
dependencies: []
conflicts: []
---
<!-- CODEBUDDY:START -->
# CodeBuddy Code Rules

**Tool**: Intelligent pair programming assistant

## Usage

Reference AGENTS.md in all requests:
```
"Follow @AGENTS.md standards. Implement [feature] with tests first."
```

## Workflow

1. Include AGENTS.md in context
2. Request features with standards reference
3. Review code
4. Run `npm run lint && npm test`

<!-- CODEBUDDY:END -->
