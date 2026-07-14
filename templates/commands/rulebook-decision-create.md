---
name: /rulebook-decision-create
id: rulebook-decision-create
category: Rulebook
description: Create a new Architecture Decision Record (ADR) with auto-numbering and memory integration.
---
<!-- RULEBOOK:START -->
Create an auto-numbered ADR in `.rulebook/decisions/`.

**Usage**
```bash
rulebook decision create "<title>" --context "<context>" --related-task <task-id>
```

**What it does**
1. Gathers title, context, decision, alternatives considered, and consequences.
2. Checks `rulebook decision list` for duplicate or conflicting decisions.
3. Creates the auto-numbered file (`.rulebook/decisions/NNN-<slug>.md`) with a metadata sidecar.
4. You then fill in Context, Decision, Alternatives, and Consequences sections.
5. Verify with `rulebook decision show <id>`.

**Reference**
- Statuses: `proposed` → `accepted` → `superseded` | `deprecated`
- Replace a decision with `rulebook decision supersede <oldId> <newId>`
- Format documentation: `/.rulebook/specs/rulebook.md`

**MCP equivalent**: `rulebook_memory`
<!-- RULEBOOK:END -->
