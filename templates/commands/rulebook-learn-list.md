---
name: /rulebook-learn-list
id: rulebook-learn-list
category: Rulebook
description: List captured learnings with source and promotion status.
---
<!-- RULEBOOK:START -->
List captured learnings, newest first, with source badge (manual/archive) and promotion status.

**Usage**
```bash
rulebook learn list
rulebook learn list --limit 10
```

**What it does**
1. Lists learnings; limit output with `--limit`.
2. Promote significant learnings with `rulebook learn promote <id> knowledge|decision`.

**MCP equivalent**: `rulebook_memory`
<!-- RULEBOOK:END -->
