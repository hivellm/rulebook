---
name: /rulebook-decision-create
id: rulebook-decision-create
category: Rulebook
description: Create a new Architecture Decision Record (ADR) with auto-numbering and memory integration.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Decisions are stored in `.rulebook/decisions/` as numbered Markdown files with metadata sidecars.

**Steps**
1. **Understand the Decision**: Ask the user what architectural/technical decision needs to be recorded. Gather:
   - **Title**: Short, descriptive name (e.g., "Use PostgreSQL for Primary Database")
   - **Context**: Why this decision is needed — constraints, requirements, trade-offs
   - **Decision**: What was decided
   - **Alternatives**: What other options were considered and why they were rejected
   - **Consequences**: What follows from this decision (positive and negative)
   - **Related Tasks**: Any task IDs this decision relates to

2. **Check Existing Decisions**:
   ```bash
   rulebook decision list
   ```
   Verify no duplicate or conflicting decision exists.

3. **Create the Decision**:
   ```bash
   rulebook decision create "<title>" --context "<context>" --related-task <task-id>
   ```
   The system auto-numbers the decision (e.g., ADR-001, ADR-002).

4. **Enrich the Decision File**: Open the generated `.rulebook/decisions/NNN-<slug>.md` and fill in:
   - Context section with full background
   - Decision section with the chosen approach
   - Alternatives Considered with reasoning for each rejected option
   - Consequences with both positive and negative outcomes

5. **Update Status** (if immediately accepted):
   ```bash
   # Via MCP tool or direct metadata edit
   ```

6. **Verify**:
   ```bash
   rulebook decision show <id>
   ```

**Reference**
- Decisions use 4 statuses: `proposed` → `accepted` → `superseded` | `deprecated`
- Use `rulebook decision supersede <oldId> <newId>` to replace a decision
- Decisions are auto-injected into AGENTS.md on `rulebook update`
- See `/.rulebook/specs/DECISIONS.md` for format documentation
<!-- RULEBOOK:END -->
