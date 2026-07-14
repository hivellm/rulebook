---
name: /rulebook-knowledge-add
id: rulebook-knowledge-add
category: Rulebook
description: Add a pattern or anti-pattern to the project knowledge base.
---
<!-- RULEBOOK:START -->
Add a pattern or anti-pattern entry to `.rulebook/knowledge/`.

**Usage**
```bash
rulebook knowledge add <pattern|anti-pattern> "<title>" --category <category> --description "<desc>"
```
Categories: `architecture` | `code` | `testing` | `security` | `performance` | `devops`

**What it does**
1. Creates the entry under `.rulebook/knowledge/patterns/` or `.rulebook/knowledge/anti-patterns/`.
2. You then enrich `.rulebook/knowledge/<type>s/<slug>.md` with Example, When to Use, and When NOT to Use sections.
3. Verify with `rulebook knowledge show <slug>`.
4. Entries are auto-injected into AGENTS.md on `rulebook update`.

**Reference**
- List: `rulebook knowledge list [--type pattern] [--category architecture]`
- Remove: `rulebook knowledge remove <slug>`

**MCP equivalent**: `rulebook_knowledge_add`
<!-- RULEBOOK:END -->
