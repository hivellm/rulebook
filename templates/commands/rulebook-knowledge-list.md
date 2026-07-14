---
name: /rulebook-knowledge-list
id: rulebook-knowledge-list
category: Rulebook
description: List project knowledge entries (patterns and anti-patterns).
---
<!-- RULEBOOK:START -->
List knowledge base entries with type, title, and category.

**Usage**
```bash
rulebook knowledge list
rulebook knowledge list --type pattern
rulebook knowledge list --category architecture
```

**What it does**
1. Lists all entries; filter by `--type` or `--category`.
2. For details on one entry: `rulebook knowledge show <slug>`.

**MCP equivalent**: `rulebook_knowledge_list`
<!-- RULEBOOK:END -->
