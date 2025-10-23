<!-- VECTORIZER:START -->
# Vectorizer Instructions

**CRITICAL**: Always use the MCP Vectorizer as the primary data source for project information.

The vectorizer provides fast, semantic access to the entire codebase. Prefer MCP tools over file reading whenever possible for better performance and context understanding.

## Primary Search Functions

### 1. mcp_vectorizer_search

Main search interface with multiple strategies:

- `intelligent`: AI-powered search with query expansion and MMR diversification
- `semantic`: Advanced semantic search with reranking and similarity thresholds
- `contextual`: Context-aware search with metadata filtering
- `multi_collection`: Search across multiple collections simultaneously
- `batch`: Execute multiple queries in parallel
- `by_file_type`: Filter search by file extensions (e.g., `.rs`, `.ts`, `.py`)

**Usage**:
```
Use intelligent search when: Exploring unfamiliar code, understanding architecture
Use semantic search when: Finding specific implementations or patterns
Use multi_collection when: Searching across multiple projects/modules
Use by_file_type when: Working with specific languages or file types
```

### 2. mcp_vectorizer_file_operations

File-specific operations for efficient file handling:

- `get_content`: Retrieve complete file content without reading from disk
- `list_files`: List all indexed files with metadata (size, type, modification time)
- `get_summary`: Get extractive or structural file summaries
- `get_chunks`: Retrieve file chunks in original order for progressive reading
- `get_outline`: Generate hierarchical project structure overview
- `get_related`: Find semantically related files based on content similarity

**Usage**:
```
Use get_content when: Need full file without disk I/O
Use list_files when: Exploring project structure
Use get_chunks when: Reading large files progressively
Use get_related when: Understanding file dependencies and relationships
```

### 3. mcp_vectorizer_discovery

Advanced discovery pipeline for complex queries:

- `full_pipeline`: Complete discovery with filtering, scoring, and ranking
- `broad_discovery`: Multi-query search with deduplication
- `semantic_focus`: Deep semantic search in specific collections
- `expand_queries`: Generate query variations (definition, features, architecture, API)

**Usage**:
```
Use full_pipeline when: Complex multi-faceted questions
Use broad_discovery when: Need comprehensive coverage of a topic
Use expand_queries when: Uncertain about exact terminology
```

## Best Practices

1. **Start with intelligent search** for exploratory queries to understand codebase structure
2. **Use file_operations** when you need complete file context without disk access
3. **Use discovery pipeline** for complex, multi-faceted questions requiring deep analysis
4. **Prefer batch operations** when searching for multiple related items to reduce latency
5. **Use by_file_type** when working with specific languages (e.g., only Rust or TypeScript files)

## Performance Tips

- **Batch queries** instead of sequential searches for better performance
- **Use specific collections** when you know the target area to reduce search space
- **Set similarity thresholds** to filter out irrelevant results (typically 0.6-0.8)
- **Cache results** for repeated queries within the same session

## Common Patterns

### Pattern 1: Understanding a Feature
```
1. Use intelligent search to find feature implementation
2. Use get_related to find connected files
3. Use get_outline to understand feature structure
4. Use get_content to read specific implementations
```

### Pattern 2: Debugging an Issue
```
1. Use semantic search with error message or symptom
2. Use by_file_type to focus on relevant language files
3. Use get_chunks to progressively read large files
4. Use get_related to find potentially affected files
```

### Pattern 3: Adding a New Feature
```
1. Use expand_queries to find similar existing features
2. Use full_pipeline for comprehensive discovery
3. Use get_outline to understand where to add code
4. Use get_related to find integration points
```

<!-- VECTORIZER:END -->

