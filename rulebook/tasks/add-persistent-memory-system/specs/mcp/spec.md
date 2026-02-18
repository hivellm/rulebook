# MCP Memory Tools Specification

## ADDED Requirements

### Requirement: Memory Search MCP Tool
The MCP server SHALL expose a `rulebook_memory_search` tool for hybrid BM25+HNSW search.

#### Scenario: Search memories via MCP
Given the MCP server is running with memory enabled
When `rulebook_memory_search` is called with `{ query: "authentication bug", limit: 10, mode: "hybrid" }`
Then it SHALL return compact results with fields: id, title, type, score, matchType, createdAt
And it SHALL support optional filters: type, limit, mode (bm25|vector|hybrid)
And it SHALL return `{ success: true, results: [...], total: number }`

#### Scenario: Memory not enabled
Given the MCP server is running with memory.enabled = false in `.rulebook`
When any `rulebook_memory_*` tool is called
Then it SHALL return `{ success: false, error: "Memory system is not enabled. Set memory.enabled=true in .rulebook" }`

### Requirement: Memory Timeline MCP Tool
The MCP server SHALL expose a `rulebook_memory_timeline` tool for chronological context.

#### Scenario: Get timeline context
Given memories exist in chronological order
When `rulebook_memory_timeline` is called with `{ memoryId: "abc-123", window: 5 }`
Then it SHALL return up to 5 memories before and 5 after the anchor memory chronologically
And each entry SHALL include position (before|anchor|after) and distanceFromAnchor

### Requirement: Memory Get MCP Tool
The MCP server SHALL expose a `rulebook_memory_get` tool for full memory details.

#### Scenario: Get full memory details
Given memories exist with known IDs
When `rulebook_memory_get` is called with `{ ids: ["id1", "id2"] }`
Then it SHALL return complete memory objects including full content
And it SHALL update accessed_at timestamp for LRU tracking
And it SHALL return `{ success: true, memories: [...] }`

### Requirement: Memory Save MCP Tool
The MCP server SHALL expose a `rulebook_memory_save` tool for manual memory storage.

#### Scenario: Save memory via MCP
Given the memory system is enabled
When `rulebook_memory_save` is called with `{ type: "decision", title: "Use sql.js", content: "Decided to use sql.js for zero native deps", tags: ["architecture"] }`
Then it SHALL save the memory with generated UUID and timestamps
And it SHALL vectorize and index the content for search
And it SHALL return `{ success: true, memory: { id, ... } }`

### Requirement: Memory Stats MCP Tool
The MCP server SHALL expose a `rulebook_memory_stats` tool for database statistics.

#### Scenario: Get memory statistics
Given the memory database contains data
When `rulebook_memory_stats` is called
Then it SHALL return dbSizeBytes, memoryCount, sessionCount, oldestMemory, newestMemory, maxSizeBytes, usagePercent, indexHealth

### Requirement: Memory Cleanup MCP Tool
The MCP server SHALL expose a `rulebook_memory_cleanup` tool for forced eviction.

#### Scenario: Force cleanup
Given the memory database contains data
When `rulebook_memory_cleanup` is called with `{ force: true }`
Then it SHALL run the LRU eviction algorithm regardless of current size
And it SHALL return `{ success: true, evictedCount: number, freedBytes: number }`
