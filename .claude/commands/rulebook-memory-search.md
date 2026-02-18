---
name: /rulebook-memory-search
id: rulebook-memory-search
category: Rulebook
description: Search persistent memories using hybrid BM25+vector search for context across sessions.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Use the MCP memory tools when available (preferred over CLI commands).
- The memory system uses 3-layer search: Layer 1 (compact search), Layer 2 (timeline), Layer 3 (full details).
- Always start with a broad search, then narrow down with timeline and full details.

**Steps**
1. **Search memories** using the MCP tool or CLI:
   ```
   # Via MCP (preferred)
   rulebook_memory_search({ query: "search terms", mode: "hybrid", limit: 20 })

   # Via CLI
   rulebook memory search "search terms" --mode hybrid --limit 20
   ```
   Modes: `hybrid` (default, best results), `bm25` (keyword only), `vector` (semantic only).

2. **Get timeline context** around a relevant result:
   ```
   rulebook_memory_timeline({ memoryId: "<id>", window: 5 })
   ```

3. **Get full details** for specific memories:
   ```
   rulebook_memory_get({ ids: ["<id1>", "<id2>"] })
   ```

**Memory Types**
- `bugfix` - Bug fixes and error resolutions
- `feature` - New features and capabilities
- `refactor` - Code restructuring
- `decision` - Architecture/design decisions (protected from eviction)
- `discovery` - Findings about codebase or tools
- `change` - General code changes
- `observation` - General observations

**Reference**
- Use `rulebook memory stats` to check database health
- Decisions are never evicted during cleanup
- Privacy: content within `<private>...</private>` tags is automatically redacted
<!-- RULEBOOK:END -->
