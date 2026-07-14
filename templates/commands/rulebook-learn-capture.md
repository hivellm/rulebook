---
name: /rulebook-learn-capture
id: rulebook-learn-capture
category: Rulebook
description: Capture a learning from implementation work for future reference.
---
<!-- RULEBOOK:START -->
Save a learning as markdown under `.rulebook/learnings/`, committed with the repo.

**Usage**
```bash
rulebook learn capture --title "<title>" --content "<content>" --tags "tag1,tag2" --related-task <task-id>
```

**What it does**
1. Saves the learning with title, content, tags, related task, and source (`manual` by default; `task-archive` when captured during archiving).
2. Verify with `rulebook learn list --limit 5`.
3. Promote significant learnings later:
   ```bash
   rulebook learn promote <id> knowledge    # → creates a pattern
   rulebook learn promote <id> decision     # → creates an ADR
   ```

**MCP equivalent**: `rulebook_learn_capture`
<!-- RULEBOOK:END -->
