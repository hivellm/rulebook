---
name: /rulebook-decision-list
id: rulebook-decision-list
category: Rulebook
description: List all Architecture Decision Records with optional status filter.
---
<!-- RULEBOOK:START -->
**Steps**
1. Run `rulebook decision list` to see all decisions.
2. Optionally filter: `rulebook decision list --status accepted`
3. Present results to the user with ID, title, and status.
4. If the user wants details on a specific decision, run `rulebook decision show <id>`.

**Status Values**: proposed, accepted, superseded, deprecated
<!-- RULEBOOK:END -->
