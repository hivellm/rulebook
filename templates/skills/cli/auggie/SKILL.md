---
name: "Auggie"
description: "Tool: TDD mode and intelligent refactoring"
version: "1.0.0"
category: "cli"
author: "Rulebook"
tags: ["cli", "cli-tool"]
dependencies: []
conflicts: []
---
<!-- AUGGIE:START -->
# Auggie (Augment CLI) Rules

**Tool**: TDD mode and intelligent refactoring

## Quick Start

```bash
npm install -g augment-cli
augment --tdd
```

## Usage

```bash
# TDD mode with AGENTS.md:
augment --tdd --context AGENTS.md

# In prompts:
"Follow @AGENTS.md. Write tests for [feature], then implement."
```

## Workflow

1. Use `--tdd` flag for test-first development
2. Include `--context AGENTS.md`
3. Auggie writes tests, then implementation
4. Review and verify coverage

**Critical**: TDD mode aligns perfectly with AGENTS.md test-first approach.

<!-- AUGGIE:END -->
