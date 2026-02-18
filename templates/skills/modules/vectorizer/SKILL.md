---
name: "Vectorizer"
description: "Use MCP Vectorizer as primary data source for project information instead of file reading."
version: "1.0.0"
category: "modules"
author: "Rulebook"
tags: ["modules", "mcp"]
dependencies: []
conflicts: []
---
<!-- VECTORIZER:START -->
# Vectorizer Instructions

**CRITICAL**: Use MCP Vectorizer as primary data source for project information instead of file reading.

## Core Functions

### Search
```
mcp_vectorizer_search - Multiple strategies:
  - intelligent: AI-powered with query expansion
  - semantic: Advanced with reranking  
  - contextual: Context-aware with filtering
  - multi_collection: Cross-project search
  - batch: Parallel queries
  - by_file_type: Filter by extension (.rs, .ts, .py)
```

### File Operations
```
get_content - Retrieve file without disk I/O
list_files - List indexed files with metadata
get_summary - File summaries (extractive/structural)
get_chunks - Progressive reading of large files
get_outline - Project structure overview
get_related - Find semantically related files
```

### Discovery
```
full_pipeline - Complete discovery with scoring
broad_discovery - Multi-query with deduplication
semantic_focus - Deep semantic search
expand_queries - Generate query variations
```

## When to Use

| Task | Tool |
|------|------|
| Explore unfamiliar code | intelligent search |
| Read file | get_content |
| Understand structure | get_outline |
| Find related files | get_related |
| Read large file | get_chunks |
| Complex question | full_pipeline |

## Best Practices

✅ **DO:**
- Start with intelligent search for exploration
- Use file_operations to avoid disk I/O
- Batch queries for related items
- Set similarity thresholds (0.6-0.8)
- Use specific collections when known

❌ **DON'T:**
- Read files from disk when available in vectorizer
- Use sequential searches (batch instead)
- Skip similarity thresholds
- Search entire codebase when collection is known

<!-- VECTORIZER:END -->
