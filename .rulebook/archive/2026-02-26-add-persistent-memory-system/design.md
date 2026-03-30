# Technical Design: Persistent Memory System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Public Interfaces                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  CLI Commands │  │  MCP Tools   │  │  Agent Hooks │  │
│  │  (6 commands) │  │  (6 tools)   │  │  (3 parsers) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └──────────────────┼──────────────────┘         │
│                            ▼                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │            MemoryManager (Orchestrator)          │   │
│  │  saveMemory | search | sessions | cleanup       │   │
│  └──────────┬──────────────────┬───────────────┘   │   │
│             │                  │                    │   │
│  ┌──────────▼──────┐  ┌──────▼───────────────┐   │   │
│  │  MemorySearch    │  │  MemoryCache         │   │   │
│  │  (Hybrid RRF)    │  │  (LRU Eviction)      │   │   │
│  └──┬─────────┬────┘  └──────────────────────┘   │   │
│     │         │                                    │   │
│  ┌──▼───┐ ┌──▼────────────┐                      │   │
│  │BM25  │ │HNSW + TF-IDF  │                      │   │
│  │(FTS5)│ │(Pure TS)      │                      │   │
│  └──┬───┘ └──┬────────────┘                      │   │
│     │        │                                    │   │
│  ┌──▼────────▼─────────────────────────────────┐ │   │
│  │         MemoryStore (sql.js WASM)           │ │   │
│  │  SQLite DB + FTS5 + Schema Migrations       │ │   │
│  └─────────────────────────────────────────────┘ │   │
│                                                   │   │
│  Storage: .rulebook-memory/                       │   │
│  ├── memory.db        (SQLite database)           │   │
│  └── vectors.hnsw     (HNSW index binary)         │   │
└───────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. sql.js (WASM) over better-sqlite3

**Chosen:** sql.js (pure WebAssembly)
- Zero native compilation — works on any Node.js without node-gyp
- Full SQLite including FTS5 with BM25 ranking
- Tradeoff: DB lives in memory as ArrayBuffer, must manually persist to disk
- Mitigation: Auto-save every 50 writes + save on shutdown

### 2. Pure TypeScript HNSW over hnswlib-node

**Chosen:** Custom HNSW in TypeScript
- Zero native dependencies — no C++ compilation needed
- Full control over serialization/persistence format
- Tradeoff: ~100x slower than C++ bindings
- Mitigation: Acceptable for project-local corpus (<50K memories), lazy loading

### 3. TF-IDF + Feature Hashing over Transformers

**Chosen:** TF-IDF with FNV1a feature hashing
- Zero external model downloads (vs ~500MB for transformers)
- Fixed dimensionality (256) regardless of vocabulary size via hashing trick
- O(n) vectorization time per document
- Tradeoff: No true semantic understanding (captures term co-occurrence, not meaning)
- Mitigation: BM25 handles exact keyword matching; HNSW handles fuzzy term similarity

### 4. Per-project Storage

**Chosen:** `.rulebook-memory/` inside project root
- Complete isolation between projects
- Added to .gitignore automatically
- DB file travels with the project (portable)
- Tradeoff: No cross-project search
- Mitigation: Could add global index later without breaking changes

## Search Architecture: 3-Layer Pattern

Inspired by claude-mem, designed for token efficiency:

**Layer 1 — Compact Search** (`rulebook_memory_search`):
Returns ~50-100 tokens per result: `{id, title, type, score, createdAt}`
The AI agent scans these to decide which are relevant.

**Layer 2 — Timeline** (`rulebook_memory_timeline`):
Given a memory ID, returns N memories before/after chronologically.
Shows context without full content. ~200 tokens per entry.

**Layer 3 — Full Details** (`rulebook_memory_get`):
Fetches complete content for specific IDs only.
AI agent requests this only for memories it actually needs. ~500-1000 tokens.

This progressive disclosure achieves ~10x token savings vs returning full content in search.

## Hybrid Search: Reciprocal Rank Fusion

```
For each candidate document d in BM25 ∪ HNSW results:
  rrf_score(d) = 1/(k + rank_bm25(d)) + 1/(k + rank_hnsw(d))
  where k = 60 (smoothing constant)
```

Documents appearing in both rankings score higher than those in only one.

## Cache Eviction Algorithm

```
Trigger: dbSize > maxSizeBytes OR memoryCount > maxMemories
Target:  reduce to 85% of limit (15% headroom)

Eviction order:
  1. Sort by accessed_at ASC, created_at ASC
  2. EXCLUDE type='decision' (protected long-term context)
  3. EXCLUDE active session memories
  4. Delete in batches of 100
  5. Remove associated HNSW vectors
  6. Optimize FTS5 index after eviction
```

## Memory Auto-Classification Heuristics

```
Content matches:  fix|bug|error|crash     → 'bugfix'
                  add|new|feature|create  → 'feature'
                  refactor|restructure    → 'refactor'
                  decide|chose|decision   → 'decision'
                  found|discover|learn    → 'discovery'
                  change|update|modify    → 'change'
                  (default)               → 'observation'
```

## sql.js Persistence Strategy

Since sql.js keeps the entire DB in memory as an ArrayBuffer:
- **Write counter**: Track writes, auto-save every 50 operations
- **Shutdown hook**: Always save on `close()` call
- **Startup**: Read existing `.db` file into ArrayBuffer, or create new DB
- **Size estimation**: `db.export().byteLength` for accurate size, or track via SQL queries for efficiency

## HNSW Persistence Strategy

- Serialize graph structure + vectors as binary format
- Save to `.rulebook-memory/vectors.hnsw`
- Lazy load: only load on first vector search (not on startup)
- Save after every 100 inserts or on shutdown
