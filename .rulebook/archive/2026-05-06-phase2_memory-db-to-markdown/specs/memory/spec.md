# Memory — file-based persistence

## ADDED Requirements

### Requirement: Memories persist as markdown files
The system SHALL persist every memory as a single `.md` file under
`.rulebook/memory/memories/<YYYY>/<MM>/<id>-<slug>.md`, with a YAML
frontmatter block holding the metadata and the markdown body holding the
content. The system MUST NOT use SQLite or any binary index format for the
canonical store.

#### Scenario: saveMemory writes a markdown file
Given a `MemoryManager` initialized in `.rulebook/memory/`
When the caller invokes `saveMemory({ type: 'decision', title: 'Use FileStore', content: '...' })`
Then a file `<rulebook>/memory/memories/<YYYY>/<MM>/<id>-use-filestore.md` exists
And its frontmatter contains the memory id, type, project, tags, createdAt, updatedAt, accessedAt
And its body contains the original `content` verbatim.

#### Scenario: list filters by project and tag
Given two memories saved with `project=A, tags=[bug]` and `project=B, tags=[bug]`
When the caller invokes `list({ project: 'A', tags: ['bug'] })`
Then only the project-A memory is returned.

### Requirement: Search uses BM25 over file content
The system SHALL implement memory search as BM25 (tf-idf) scoring over the
file body and a tag boost from frontmatter, and SHALL NOT spawn any vector
or HNSW index. Hybrid mode falls back to BM25.

#### Scenario: keyword query returns scored results
Given memories with bodies containing `"sqlite removed"` and `"hnsw removed"`
When the caller invokes `searchMemories({ query: 'sqlite' })`
Then the SQLite memory ranks first
And the result includes its id, title, score, and `matchType: 'bm25'`.

### Requirement: Atomic writes
The system SHALL write memory files atomically via temp-file + rename, so
concurrent writes never produce a partially written file.

#### Scenario: Concurrent saves
Given two `saveMemory` calls in flight simultaneously
When both writes complete
Then both target files exist with valid frontmatter
And neither contains a partially-written body.

## MODIFIED Requirements

### Requirement: getStats reports file metrics
The system SHALL drop the `indexHealth` field from `MemoryStats` and SHALL
add `fileCount`, since there is no separate vector index to monitor.

#### Scenario: getStats shape
Given a `MemoryManager` with N saved memories
When the caller invokes `getStats()`
Then the result includes `memoryCount: N`, `fileCount: N`, `dbSizeBytes` (sum of file sizes), and no `indexHealth` field.

### Requirement: cleanup is age-based
The system SHALL replace LRU byte-budget eviction with age-based retention.
`cleanup({ maxAgeDays })` MUST delete memories whose `createdAt` is older
than the given threshold; with no `maxAgeDays`, it MUST be a no-op.

#### Scenario: maxAgeDays prunes old memories
Given a memory created 60 days ago and another created today
When the caller invokes `cleanup({ maxAgeDays: 30 })`
Then the 60-day-old memory file is deleted
And the recent memory remains.

## ADDED Requirements

### Requirement: One-shot migration from legacy DB
The system SHALL detect an existing `.rulebook/memory/memory.db` on
`MemoryManager.initialize()`, export every row to a markdown file using the
new layout, and rename the DB to `memory.db.legacy`. The runtime MUST NOT
read SQLite after migration completes.

#### Scenario: First start with legacy DB
Given `.rulebook/memory/memory.db` exists with 50 memories and 5 sessions
When `MemoryManager.initialize()` runs for the first time after upgrade
Then 50 memory `.md` files and 5 session `.md` files exist under the new layout
And the DB file is renamed to `memory.db.legacy`
And subsequent `searchMemories` calls return results from the markdown files only.

#### Scenario: Manual migration command
Given a user with a legacy DB
When they run `rulebook memory migrate-from-db`
Then the migration runs idempotently (safe to invoke twice)
And the user receives a summary of how many memories and sessions were migrated.

## REMOVED Requirements

### Requirement: HNSW vector index
The system SHALL NOT ship the HNSW pure-TypeScript index, the TF-IDF
vectorizer, or the `vectors.hnsw` on-disk file. Hybrid and vector search
modes MUST accept the same input as before but route execution to the
BM25 implementation.

#### Scenario: Vector mode falls back to BM25
Given the migrated file-based memory store
When the caller invokes `searchMemories({ query: 'X', mode: 'vector' })`
Then the search executes BM25 against the markdown bodies
And the response `matchType` is `bm25` for every result.
