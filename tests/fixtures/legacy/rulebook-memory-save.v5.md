---
name: /rulebook-memory-save
id: rulebook-memory-save
category: Rulebook
description: Save a new persistent memory for context across AI sessions.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Use the MCP memory tools when available (preferred over CLI commands).
- Choose the correct memory type for accurate classification and search.
- Keep titles concise and content descriptive.
- Use tags for better discoverability.

**Steps**
1. **Save a memory** using the MCP tool or CLI:
   ```
   # Via MCP (preferred)
   rulebook_memory_save({
     type: "feature",
     title: "Short descriptive title",
     content: "Detailed description of what happened, why, and context",
     tags: ["relevant", "tags"]
   })

   # Via CLI
   rulebook memory save "content text" --type feature --title "Title" --tags tag1,tag2
   ```

2. **Choose the right type**:
   - `bugfix` - Fixed a bug or resolved an error
   - `feature` - Added new functionality
   - `refactor` - Restructured code without changing behavior
   - `decision` - Made an architecture or design choice (protected from eviction)
   - `discovery` - Found something important about the codebase
   - `change` - General code modification
   - `observation` - Noted something worth remembering

3. **Verify** the memory was saved:
   ```
   rulebook_memory_search({ query: "your title keywords" })
   ```

**Best Practices**
- Save decisions early - they are protected from cache eviction
- Include "why" in content, not just "what"
- Use consistent tags across related memories
- Content within `<private>...</private>` tags will be automatically redacted
<!-- RULEBOOK:END -->
