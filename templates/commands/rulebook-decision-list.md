---
name: /rulebook-decision-list
id: rulebook-decision-list
category: Rulebook
description: List all Architecture Decision Records with optional status filter.
---
<!-- RULEBOOK:START -->
List ADRs with ID, title, and status.

**Usage**
```bash
rulebook decision list
rulebook decision list --status accepted
```

**What it does**
1. Lists all decisions; filter with `--status` (proposed, accepted, superseded, deprecated).
2. For details on one decision: `rulebook decision show <id>`.

**MCP equivalent**: `rulebook_decision_list`
<!-- RULEBOOK:END -->
