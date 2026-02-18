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

### Memory Types

- **bugfix**: Bug fixes, error resolutions
- **feature**: New features, additions
- **refactor**: Code restructuring
- **decision**: Architectural decisions (protected from eviction)
- **discovery**: Insights and learnings
- **change**: Updates and modifications
- **observation**: General observations

### CLI Commands

```bash
rulebook memory search "authentication bug"     # Hybrid search
rulebook memory save "Decided to use sql.js" --type decision --title "DB Choice"
rulebook memory list --limit 10                  # Recent memories
rulebook memory stats                            # Database statistics
rulebook memory cleanup --force                  # Force eviction
rulebook memory export --format json             # Export all memories
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
