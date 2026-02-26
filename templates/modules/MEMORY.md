<!-- MEMORY:START -->
## Persistent Memory System

The rulebook memory system provides persistent context across AI sessions using hybrid search (BM25 keyword + HNSW vector) with zero native dependencies.

### 3-Layer Search Pattern (Token-Efficient)

**Layer 1 — Compact Search**: Get brief results to scan relevance.
```
rulebook_memory_search({ query: "authentication bug", mode: "hybrid", limit: 10 })
→ Returns: { id, title, type, score, matchType, createdAt } per result (~50 tokens each)
```

**Layer 2 — Timeline**: Get chronological context around a memory.
```
rulebook_memory_timeline({ memoryId: "abc-123", window: 5 })
→ Returns: 5 memories before + anchor + 5 memories after (~200 tokens each)
```

**Layer 3 — Full Details**: Get complete content only for selected memories.
```
rulebook_memory_get({ ids: ["abc-123", "def-456"] })
→ Returns: Full memory objects with content (~500-1000 tokens each)
```

### Memory Structure

Each memory contains:
- **id**: Unique identifier
- **type**: Memory type (see below)
- **title**: Short title (80 chars)
- **summary**: Rich contextual summary with key concepts, decisions, patterns, gotchas (auto-extracted)
- **content**: Full content
- **tags**: Searchable tags for categorization
- **createdAt/updatedAt/accessedAt**: Timestamps for LRU tracking

### Memory Types

- **bugfix**: Bug fixes, error resolutions — save root cause and solution
- **feature**: New features, additions — save design approach and patterns
- **refactor**: Code restructuring — save architectural reasoning
- **decision**: Architectural decisions (protected from eviction) — save why this choice
- **discovery**: Insights and learnings — save patterns and gotchas
- **change**: Updates and modifications — save impact and reasoning
- **observation**: General observations — save insights worth preserving

### What to Capture in Summaries

Effective summaries include:
1. **Problem/Context**: What was being solved
2. **Approach**: How it was solved
3. **Key Decision**: Why this approach
4. **Pattern**: Reusable solution discovered
5. **Gotcha**: Edge case or limitation found
6. **Result**: Outcome or impact

**Example Summary**:
```
"Implemented OAuth token refresh with 30-min expiry. Decision: Used interceptor middleware for transparent refresh (avoids scattered retry logic). Gotcha: Tokens expire silently - must check response headers before retrying. Pattern: Double-request pattern for simultaneous requests during refresh."
```

### CLI Commands

```bash
# Search with hybrid BM25+Vector
rulebook memory search "authentication bug"     # Returns top results with summaries
rulebook memory search "oauth" --mode bm25      # BM25 keyword-only search
rulebook memory search "token" --mode vector    # Vector semantic search
rulebook memory search "api" --type feature     # Filter by memory type

# Save memories (summary auto-extracted from content)
rulebook memory save "Fixed OAuth token refresh..." --type feature --title "OAuth Implementation"
rulebook memory save "Decided to use sql.js for zero-dependency..." --type decision --title "DB Choice" --tags architecture,database

# Timeline and details
rulebook memory timeline --memoryId abc-123     # See 5 before/after
rulebook memory get abc-123 def-456             # Full details for specific memories

# Management
rulebook memory list --limit 10                  # Recent memories
rulebook memory stats                            # Database statistics & health
rulebook memory cleanup --force                  # Force cache eviction
rulebook memory export --format json             # Export all memories
```

### Best Practices for Rich Memories

1. **Save immediately after learning**: Capture insights while fresh
2. **Use memory types correctly**: Features vs decisions vs discoveries
3. **Include context in content**: Don't just save code, save reasoning
4. **Add relevant tags**: Enable discovery for related work
5. **Reference past memories**: Include memory IDs when related

**Workflow**:
```bash
# Before implementing: search for similar work
rulebook memory search "your feature" --mode hybrid

# During implementation: save discoveries
rulebook memory save "Pattern discovered: use X instead of Y because Z" --type discovery --title "Pattern Name"

# After implementation: save complete solution
rulebook memory save "Full implementation details, gotchas, test cases..." --type feature --title "Feature Name" --tags relevant,tags

# Next session: reference past work
rulebook memory search "feature name" --type feature
# → Displays summaries automatically, can drill down to full details
```

### Configuration (.rulebook)

```json
{
  "memory": {
    "enabled": true,
    "dbPath": ".rulebook-memory/memory.db",
    "maxSizeBytes": 524288000,
    "vectorDimensions": 256
  }
}
```

### Privacy

Content between `<private>` and `</private>` tags is automatically stripped before storage.
<!-- MEMORY:END -->
