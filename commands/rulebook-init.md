---
name: rulebook-init
description: Initialize Rulebook for the current project with auto-detection
---

Initialize Rulebook for this project. This will:

1. Detect languages, frameworks, MCP modules, and services in the project
2. Generate AGENTS.md with appropriate rules and skills
3. Create .rulebook configuration file
4. Optionally install Git hooks and generate GitHub Actions workflows

Run `rulebook init --yes` to use auto-detected defaults, or `rulebook init` for interactive mode.

After initialization, use `rulebook skill list` to see available skills and `rulebook skill add <skill-id>` to enable additional capabilities.
