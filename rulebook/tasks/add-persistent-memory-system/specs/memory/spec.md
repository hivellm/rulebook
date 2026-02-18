# Memory Core Architecture Specification

## ADDED Requirements

### Requirement: Memory Storage with SQLite (sql.js WASM)
The system SHALL persist memories in a local SQLite database using sql.js (pure WebAssembly) stored at `.rulebook-memory/memory.db` within the project root.

#### Scenario: Initialize memory database
Given the memory system is enabled in `.rulebook` config
When the MemoryManager initializes
Then it SHALL create the `.rulebook-memory/` directory if it does not exist
And it SHALL load or create the SQLite database at the configured dbPath
And it SHALL execute schema migrations if the database is new or outdated
And it SHALL create FTS5 virtual table with BM25 ranking support

#### Scenario: Persist database to disk
Given the memory database has pending changes in memory
When 50 write operations have accumulated OR the system shuts down
Then it SHALL export the SQLite ArrayBuffer to disk via `db.export()`
And it SHALL write the binary data to `.rulebook-memory/memory.db`
And it SHALL reset the write counter after successful save

#### Scenario: Memory CRUD operations
Given the memory store is initialized
When a memory is saved with type, title, content, and project fields
Then it SHALL generate a UUID for the memory ID
And it SHALL set created_at, updated_at, and accessed_at to current epoch milliseconds
And it SHALL insert the memory into the `memories` table
And it SHALL automatically update the FTS5 index via triggers
And it SHALL vectorize the content and add to the HNSW index

### Requirement: BM25 Keyword Search via FTS5
The system SHALL provide keyword search using SQLite FTS5 with BM25 ranking function.

#### Scenario: Search memories by keywords
Given memories exist in the database with various content
When a BM25 search is performed with query "fix authentication bug"
Then it SHALL query the `memory_fts` virtual table using FTS5 MATCH syntax
And it SHALL rank results using the `bm25()` ranking function
And it SHALL return results sorted by relevance score (most relevant first)
And it SHALL support filtering by type, project, and date range

#### Scenario: FTS5 index synchronization
Given the FTS5 virtual table uses content-sync mode (content=memories)
When a memory is inserted, updated, or deleted
Then the FTS5 index SHALL be automatically updated via database triggers
And the BM25 rankings SHALL reflect the current state of all memories

### Requirement: HNSW Vector Search (Pure TypeScript)
The system SHALL implement Hierarchical Navigable Small World graph for approximate nearest neighbor vector search using cosine distance, entirely in TypeScript with zero native dependencies.

#### Scenario: Add vector to HNSW index
Given the HNSW index is initialized with M=16, efConstruction=200
When a vector is added with a label and Float32Array
Then it SHALL insert the node into the appropriate graph layers
And it SHALL connect the node to its nearest neighbors respecting the M parameter
And it SHALL update the entry point if the new node has a higher layer

#### Scenario: Search nearest neighbors
Given the HNSW index contains vectors
When a search is performed with a query vector and k=10
Then it SHALL traverse the graph from the top layer using greedy search
And it SHALL refine results at each lower layer using ef=50 candidates
And it SHALL return the k nearest neighbors sorted by cosine distance
And the search complexity SHALL be O(log N) on average

#### Scenario: Persist HNSW index to disk
Given the HNSW index has been modified
When serialize is called OR the system shuts down
Then it SHALL serialize the graph structure and vectors to binary format
And it SHALL write to `.rulebook-memory/vectors.hnsw`
And it SHALL be loadable via `HNSWIndex.deserialize()` on next startup

### Requirement: TF-IDF Vectorizer with Feature Hashing
The system SHALL generate fixed-dimension text embeddings using TF-IDF weighting with feature hashing (hashing trick), requiring zero external dependencies.

#### Scenario: Vectorize text content
Given a text string to vectorize
When the vectorizer processes the text
Then it SHALL tokenize by lowercasing and splitting on whitespace/punctuation
And it SHALL remove common stop words
And it SHALL hash each token to a bucket index using FNV1a in range [0, dimensions)
And it SHALL compute TF-IDF weight for each bucket
And it SHALL L2-normalize the resulting vector
And the output SHALL be a Float32Array of the configured dimension (default 256)

#### Scenario: Consistent dimensionality
Given texts of varying lengths and vocabularies
When vectorized
Then all output vectors SHALL have exactly the same dimension (256 by default)
And the same text SHALL always produce the same vector (deterministic)

### Requirement: Hybrid Search with Reciprocal Rank Fusion
The system SHALL combine BM25 and HNSW search results using Reciprocal Rank Fusion (RRF) for hybrid scoring.

#### Scenario: Hybrid search execution
Given a search query with mode='hybrid'
When the search engine processes the query
Then it SHALL run BM25 search and HNSW vector search in parallel
And it SHALL merge results using RRF formula: score(d) = Σ 1/(k + rank_R(d)) where k=60
And it SHALL sort merged results by combined RRF score descending
And documents appearing in both rankings SHALL score higher than single-ranking documents

#### Scenario: 3-layer search pattern
Given the search system is initialized
When Layer 1 search is performed
Then it SHALL return only compact results: id, title, type, score, createdAt (~50-100 tokens per result)
When Layer 2 timeline is requested for a memory ID
Then it SHALL return chronological context window around the anchor memory
When Layer 3 details are requested for specific IDs
Then it SHALL return full memory content for only the requested IDs

### Requirement: Cache Size Limiter with LRU Eviction
The system SHALL enforce a configurable maximum database size (default 500MB) using LRU-based eviction to protect the SSD.

#### Scenario: Trigger eviction on size limit
Given the database size exceeds maxSizeBytes (default 524288000)
When the cache limiter checks size
Then it SHALL identify eviction candidates sorted by accessed_at ASC, created_at ASC
And it SHALL NOT evict memories of type 'decision' (protected)
And it SHALL NOT evict memories from the current active session
And it SHALL delete memories in batches of 100 until size is below 85% of maxSizeBytes
And it SHALL remove associated vectors from the HNSW index
And it SHALL optimize the FTS5 index after eviction

### Requirement: Privacy Filter
The system SHALL strip content between `<private>` and `</private>` tags before storing memories.

#### Scenario: Filter private content
Given memory content contains `<private>API_KEY=secret123</private>`
When the memory is saved
Then the stored content SHALL have the private-tagged content removed
And the original unfiltered content SHALL NOT be persisted to disk

### Requirement: Session Management
The system SHALL track AI interaction sessions with start/end times, summaries, and tool call counts.

#### Scenario: Session lifecycle
Given an AI agent starts working
When startSession is called with a project name
Then it SHALL create a session record with status 'active'
When the agent completes
Then endSession SHALL update status to 'completed', set ended_at, and store summary
And all memories created during the session SHALL reference the session_id

### Requirement: Memory Auto-Classification
The system SHALL automatically classify memories by type using content heuristics.

#### Scenario: Classify memory content
Given memory content "Fixed authentication bug causing login failures"
When auto-classification runs
Then it SHALL classify as type 'bugfix' based on matching keywords (fix, bug)
Given memory content "Added new export feature for CSV format"
When auto-classification runs
Then it SHALL classify as type 'feature' based on matching keywords (add, new, feature)
