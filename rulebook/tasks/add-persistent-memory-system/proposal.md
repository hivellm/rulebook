# Proposal: Persistent Memory System with BM25 + HNSW Search

## Why

Currently, every time a new Claude Code session starts, all context from previous sessions is lost. Developers must re-explain project decisions, past bugs, architectural choices, and ongoing work from scratch. This creates significant friction and wasted tokens, especially on large projects with complex histories.

The claude-mem project (https://github.com/thedotmack/claude-mem) demonstrated that persistent memory with semantic search can transform AI coding assistants from session-based tools into tools with continuous project memory. However, claude-mem requires external dependencies (Python/Chroma) and is tightly coupled to a single AI CLI.

Rulebook already has the infrastructure (MCP server, CLI commands, skills system, agent parsers) to implement a superior memory system that:

- **Works across all AI CLIs** (Claude Code, Cursor, Gemini) via existing agent parsers
- **Uses zero native dependencies** (sql.js WASM + pure TypeScript HNSW) for maximum portability
- **Provides hybrid search** (BM25 keyword + HNSW vector) for both exact and semantic matching
- **Protects SSD** with configurable cache limits and LRU eviction
- **Integrates with MCP** for programmatic access and with Skills for natural language search

## What Changes

### 1. Memory Core Module
- **ADDED** `src/memory/memory-types.ts` — TypeScript interfaces for Memory, MemorySession, MemorySearchResult, MemoryConfig, MemoryStats, TimelineEntry
- **ADDED** `src/memory/memory-store.ts` — SQLite persistence layer using sql.js (pure WASM), with FTS5 virtual table for BM25 keyword search, schema migrations, auto-save to disk
- **ADDED** `src/memory/memory-vectorizer.ts` — TF-IDF vectorizer with feature hashing (FNV1a) for fixed-dimension embeddings, zero external dependencies
- **ADDED** `src/memory/hnsw-index.ts` — Pure TypeScript HNSW (Hierarchical Navigable Small World) graph for approximate nearest neighbor vector search with cosine distance
- **ADDED** `src/memory/memory-search.ts` — Hybrid search orchestrator combining BM25 + HNSW using Reciprocal Rank Fusion (RRF), plus 3-layer search pattern (compact → timeline → full details)
- **ADDED** `src/memory/memory-cache.ts` — Cache size limiter with LRU eviction algorithm, configurable max size (default 500MB), protected memory types (decisions)
- **ADDED** `src/memory/memory-manager.ts` — Main orchestrator providing public API for CRUD, search, sessions, maintenance, and privacy filtering

### 2. Agent Integration
- **ADDED** `src/memory/memory-hooks.ts` — Capture adapters for Claude Code, Cursor, and Gemini agent output, with auto-classification heuristics (bugfix, feature, refactor, decision, discovery, change)
- **MODIFIED** `src/core/agent-manager.ts` — Integration points for auto-capture: startSession on agent start, captureFromXxx after each output, endSession on completion

### 3. MCP Server Tools
- **ADDED** `rulebook_memory_search` — Hybrid BM25+HNSW search returning compact results (Layer 1)
- **ADDED** `rulebook_memory_timeline` — Chronological context window around a memory (Layer 2)
- **ADDED** `rulebook_memory_get` — Full details for specific memory IDs (Layer 3)
- **ADDED** `rulebook_memory_save` — Store a new memory manually
- **ADDED** `rulebook_memory_stats` — Database statistics (size, counts, health)
- **ADDED** `rulebook_memory_cleanup` — Force eviction and optimization

### 4. CLI Commands
- **ADDED** `rulebook memory search <query>` — Search memories with type/mode filters
- **ADDED** `rulebook memory save <text>` — Save manual memory
- **ADDED** `rulebook memory list` — List recent memories
- **ADDED** `rulebook memory stats` — Show database statistics
- **ADDED** `rulebook memory cleanup` — Force cache cleanup
- **ADDED** `rulebook memory export` — Export memories as JSON/CSV

### 5. Configuration and Types
- **MODIFIED** `src/types.ts` — Add MemoryConfig to RulebookConfig interface
- **MODIFIED** `src/core/config-manager.ts` — Add memory defaults to initialization and migration
- **ADDED** `templates/modules/MEMORY.md` — Skill template documenting memory system usage

### 6. Dependencies
- **ADDED** `sql.js` — Pure WASM SQLite (zero native compilation)

## Impact

- **Affected specs**:
  - `specs/memory/spec.md` (new — memory core architecture)
  - `specs/mcp/spec.md` (new — 6 memory MCP tools)
  - `specs/cli/spec.md` (new — 6 memory CLI commands)

- **Affected code**:
  - `src/memory/` (new directory — 8 modules)
  - `src/mcp/rulebook-server.ts` (add 6 MCP tools)
  - `src/cli/commands.ts` (add 6 command handlers)
  - `src/index.ts` (register memory subcommand)
  - `src/types.ts` (add memory config types)
  - `src/core/config-manager.ts` (add memory defaults)
  - `src/core/agent-manager.ts` (add capture hooks)
  - `templates/modules/MEMORY.md` (new template)
  - `package.json` (add sql.js dependency)

- **Breaking change**: NO (memory is opt-in, disabled by default)

- **User benefit**:
  - Persistent context across AI sessions — no more re-explaining project history
  - Hybrid search (keyword + semantic) finds relevant memories regardless of exact wording
  - Token-efficient 3-layer search pattern (~10x savings vs full retrieval)
  - SSD protection with configurable cache limits and automatic eviction
  - Works across Claude Code, Cursor, and Gemini via existing agent parsers
  - Zero native dependencies — pure JS/WASM, works on any platform without compilation
  - Complete interaction reports via auto-capture from agent sessions
