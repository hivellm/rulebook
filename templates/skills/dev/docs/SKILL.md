---
name: docs
description: Generate or update project documentation based on recent changes
model: haiku
context: fork
agent: docs-writer
---
Analyze recent code changes and update project documentation accordingly.

If $ARGUMENTS is provided, focus documentation on that specific topic or file.

Steps:
1. Run `git diff HEAD~5 --name-only` to find recently changed files
2. Read the changed files to understand what was modified
3. Check existing docs for sections that need updating
4. Update or create documentation to reflect the changes
5. Ensure code examples are accurate and up-to-date
