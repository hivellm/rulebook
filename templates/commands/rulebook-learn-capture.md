---
name: /rulebook-learn-capture
id: rulebook-learn-capture
category: Rulebook
description: Capture a learning from implementation work for future reference.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Learnings are saved to both the memory system and `.rulebook/learnings/` for offline backup.
- Learnings can be promoted to patterns/decisions later via `rulebook learn promote`.

**Steps**
1. **Gather the Learning**:
   - **Title**: Short description of what was learned
   - **Content**: Full explanation — what happened, what was discovered, why it matters
   - **Tags**: Keywords for searchability
   - **Related Task**: Task ID if this learning came from a specific task
   - **Source**: `manual` (default), `ralph`, or `task-archive`

2. **Capture**:
   ```bash
   rulebook learn capture --title "<title>" --content "<content>" --tags "tag1,tag2" --related-task <task-id>
   ```

3. **Verify**:
   ```bash
   rulebook learn list --limit 5
   ```

**Promotion Flow**
If a learning is significant enough to become a team pattern or decision:
```bash
rulebook learn promote <id> knowledge    # → creates a pattern
rulebook learn promote <id> decision     # → creates an ADR
```

**Ralph Integration**
Extract learnings from Ralph autonomous loop history:
```bash
rulebook learn from-ralph
```
This reads `.rulebook/ralph/history/iteration-*.json` and captures entries with non-empty learnings.

**Reference**
- Learnings are searchable via `rulebook memory search`
- Use `rulebook learn list` to see all learnings
- Learnings captured during `rulebook task archive` have source `task-archive`
<!-- RULEBOOK:END -->
