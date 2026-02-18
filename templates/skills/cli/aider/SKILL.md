---
name: "Aider"
description: "Tool: AI pair programming in terminal (`pip install aider-chat`)"
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "cli-tool"]
dependencies: []
conflicts: []
---
<!-- AIDER:START -->
# Aider CLI Rules

**Tool**: AI pair programming in terminal (`pip install aider-chat`)

## Quick Start

```bash
# Always include AGENTS.md
aider AGENTS.md src/feature.ts tests/feature.test.ts

# In chat:
"Follow AGENTS.md standards. Implement [feature] with tests first."
```

## Essential Commands

```bash
/add file.ts          # Add files to context
/drop file.ts         # Remove from context
/run npm test         # Run command
/commit "message"     # Commit changes
/undo                 # Undo last change
/diff                 # Review changes
```

## Configuration (.aider.conf.yml)

```yaml
model: gpt-4
read: [AGENTS.md]
lint: true
lint-cmd: "npm run lint"
test-cmd: "npm test"
auto-commits: true
commit-prompt: true
```

## Workflow

1. Start session with `aider AGENTS.md [files]`
2. Request: "Follow AGENTS.md. Implement [feature] with tests first (95%+ coverage)"
3. Review diffs with `/diff`
4. Test with `/run npm test`
5. Commit with `/commit "feat: description"`

**Critical**: Always reference AGENTS.md in your requests for consistent standards.

<!-- AIDER:END -->
