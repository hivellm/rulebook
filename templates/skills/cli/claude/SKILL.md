---
name: "Claude"
description: "Tool: Anthropic Claude API with 200K context window"
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "cli-tool"]
dependencies: []
conflicts: []
---
<!-- CLAUDE:START -->
# Claude API/CLI Rules

**Tool**: Anthropic Claude API with 200K context window

## Quick Start

```bash
export ANTHROPIC_API_KEY=your_key
# Use via API or compatible CLIs
```

## Usage

In API requests or CLI prompts, include:
```
"Follow these project standards from AGENTS.md:
[paste relevant AGENTS.md sections]

Implement [feature] with tests first (95%+ coverage)."
```

## Workflow

1. Include AGENTS.md content in system prompt or context
2. Request features with standards reference
3. Review generated code
4. Run quality checks

**Critical**: Claude has 200K context - paste full AGENTS.md for best results.

<!-- CLAUDE:END -->
