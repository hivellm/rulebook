---
name: /rulebook-task-validate
id: rulebook-task-validate
category: Rulebook
description: Validate Rulebook task format against OpenSpec-compatible requirements.
---
<!-- RULEBOOK:START -->
Validate a task's format; errors block archiving, warnings do not.

**Usage**
```bash
rulebook task validate <task-id>
```

**What it does**
1. Checks purpose length (≥20 chars), SHALL/MUST keywords, scenario format, Given/When/Then structure, and delta headers (ADDED/MODIFIED/REMOVED/RENAMED).
2. Fix reported errors, then re-run until clean.

**Common fixes**
- `### Scenario:` (3 hashtags) → `#### Scenario:` (4 hashtags)
- "The system provides X" → "The system SHALL provide X"
- Bullet-point scenarios → Given/When/Then lines
- `## New Requirements` → `## ADDED Requirements`

**Reference**
- Format requirements: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_task_validate`
<!-- RULEBOOK:END -->
