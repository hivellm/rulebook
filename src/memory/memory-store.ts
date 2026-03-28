/**
 * SQLite Storage Layer using better-sqlite3 (native)
 *
 * Provides CRUD operations for memories and sessions,
 * with FTS5 full-text search (BM25 ranking).
 *
 * Replaced sql.js (WASM) in v5.0 to eliminate:
 * - Full DB export() copies on every save (100-500MB allocations)
 * - WASM JIT warmup delay (~300ms on init)
 * - Event loop blocking on synchronous writeFileSync of entire DB
 *
 * better-sqlite3 writes directly to disk via SQLite's WAL journal.
 * No export(), no manual saveToDisk(), no memory copies.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Memory, MemorySession, MemoryType } from './memory-types.js';

export class MemoryStore {
  private db: DatabaseType | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directory exists
    const dir = join(this.dbPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Try better-sqlite3 (native, fast) first.
    // Falls back to sql.js (WASM, portable) if native addon isn't available
    // (e.g. no C++ build tools on Windows).
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
    } catch {
      // better-sqlite3 not available — fall back to sql.js (WASM)
      console.error(
        '[MemoryStore] better-sqlite3 unavailable, falling back to sql.js (slower but portable)'
      );
      const { default: initSqlJs } = await import('sql.js');
      const SQL = await initSqlJs();
      let rawDb;
      if (existsSync(this.dbPath)) {
        const { readFileSync } = await import('fs');
        rawDb = new SQL.Database(readFileSync(this.dbPath));
      } else {
        rawDb = new SQL.Database();
      }
      // Wrap sql.js to match better-sqlite3 API surface used in this file
      this.db = this.wrapSqlJs(rawDb) as unknown as DatabaseType;
    }

    this.createSchema();
    this.initialized = true;

    // For sql.js: force initial save so the .db file exists on disk
    // (better-sqlite3 creates the file automatically on open)
    this.saveToDisk();
  }

  private createSchema(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        project TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        session_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        summary TEXT,
        tool_calls INTEGER NOT NULL DEFAULT 0
      )
    `);

    // --- Indexer Extensions ---
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        hash TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1.0,
        FOREIGN KEY(source_id) REFERENCES code_nodes(id) ON DELETE CASCADE
      )
    `);

    // FTS5 virtual table for BM25 search
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
          title, content, type,
          content=memories,
          content_rowid=rowid
        )
      `);

      // Triggers to sync FTS with memories table
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memories BEGIN
          INSERT INTO memory_fts(rowid, title, content, type)
            VALUES (new.rowid, new.title, new.content, new.type);
        END
      `);

      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memories BEGIN
          INSERT INTO memory_fts(memory_fts, rowid, title, content, type)
            VALUES ('delete', old.rowid, old.title, old.content, old.type);
        END
      `);

      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS memory_fts_au AFTER UPDATE ON memories BEGIN
          INSERT INTO memory_fts(memory_fts, rowid, title, content, type)
            VALUES ('delete', old.rowid, old.title, old.content, old.type);
          INSERT INTO memory_fts(rowid, title, content, type)
            VALUES (new.rowid, new.title, new.content, new.type);
        END
      `);
    } catch {
      // FTS5 may not be available in some builds; continue without it
    }

    // Index for common queries
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(accessed_at)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id)');

    this.db.exec('CREATE INDEX IF NOT EXISTS idx_code_nodes_type ON code_nodes(type)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_code_nodes_path ON code_nodes(file_path)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_code_edges_source ON code_edges(source_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_code_edges_target ON code_edges(target_id)');
  }

  // --- Memory CRUD ---

  saveMemory(memory: Memory): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db
      .prepare(
        `INSERT OR REPLACE INTO memories (id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        memory.id,
        memory.type,
        memory.title,
        memory.content,
        memory.project,
        JSON.stringify(memory.tags),
        memory.sessionId ?? null,
        memory.createdAt,
        memory.updatedAt,
        memory.accessedAt
      );
  }

  getMemory(id: string): Memory | null {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db
      .prepare(
        `SELECT id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at
       FROM memories WHERE id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) return null;
    return this.rowToMemory(row);
  }

  deleteMemory(id: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare(`DELETE FROM memories WHERE id = ?`).run(id);
  }

  listMemories(options?: {
    type?: MemoryType;
    limit?: number;
    offset?: number;
    project?: string;
  }): Memory[] {
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.type) {
      conditions.push(`type = ?`);
      params.push(options.type);
    }
    if (options?.project) {
      conditions.push(`project = ?`);
      params.push(options.project);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const rows = this.db
      .prepare(
        `SELECT id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at
       FROM memories ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Array<Record<string, unknown>>;

    return rows.map((row) => this.rowToMemory(row));
  }

  updateAccessedAt(id: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare(`UPDATE memories SET accessed_at = ? WHERE id = ?`).run(Date.now(), id);
  }

  getMemoryCount(): number {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.prepare('SELECT COUNT(*) as count FROM memories').get() as {
      count: number;
    };
    return row.count;
  }

  // --- BM25 Search ---

  searchBM25(
    query: string,
    limit: number = 20,
    filters?: { type?: MemoryType; project?: string }
  ): Array<{ id: string; score: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Escape FTS5 special characters — strip quotes and special operators
      const escaped = query.replace(/['"*(){}[\]:^~!]/g, ' ').trim();
      if (!escaped) return [];

      // Build FTS5 match query with proper term quoting
      const terms = escaped.split(/\s+/).filter((t) => t.length > 1);
      if (terms.length === 0) return [];
      const ftsQuery = terms.map((t) => `"${t}"`).join(' OR ');

      let sql = `
        SELECT m.id, bm25(memory_fts) as score
        FROM memory_fts f
        JOIN memories m ON m.rowid = f.rowid
        WHERE memory_fts MATCH '${ftsQuery}'
      `;

      if (filters?.type) {
        sql += ` AND m.type = '${filters.type.replace(/'/g, "''")}'`;
      }
      if (filters?.project) {
        sql += ` AND m.project = '${filters.project.replace(/'/g, "''")}'`;
      }

      sql += ` ORDER BY score LIMIT ${limit}`;

      const rows = this.db.prepare(sql).all() as Array<{ id: string; score: number }>;
      return rows.map((row) => ({
        id: row.id,
        score: Math.abs(row.score), // BM25 returns negative scores
      }));
    } catch {
      // FTS5 not available or query error; fallback to LIKE
      return this.searchLike(query, limit, filters);
    }
  }

  private searchLike(
    query: string,
    limit: number,
    filters?: { type?: MemoryType; project?: string }
  ): Array<{ id: string; score: number }> {
    if (!this.db) return [];

    const terms = query
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 1);
    if (terms.length === 0) return [];

    const conditions = terms.map(
      (t) => `(LOWER(title) LIKE '%${t}%' OR LOWER(content) LIKE '%${t}%')`
    );

    let sql = `SELECT id FROM memories WHERE ${conditions.join(' OR ')}`;
    if (filters?.type) sql += ` AND type = '${filters.type}'`;
    if (filters?.project) sql += ` AND project = '${filters.project.replace(/'/g, "''")}'`;
    sql += ` LIMIT ${limit}`;

    const rows = this.db.prepare(sql).all() as Array<{ id: string }>;
    return rows.map((row, i) => ({
      id: row.id,
      score: 1 / (i + 1),
    }));
  }

  // --- Sessions ---

  createSession(session: MemorySession): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db
      .prepare(
        `INSERT INTO sessions (id, project, status, started_at, ended_at, summary, tool_calls)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.project,
        session.status,
        session.startedAt,
        session.endedAt ?? null,
        session.summary ?? null,
        session.toolCalls
      );
  }

  endSession(id: string, summary?: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db
      .prepare(`UPDATE sessions SET status = 'completed', ended_at = ?, summary = ? WHERE id = ?`)
      .run(Date.now(), summary ?? null, id);
  }

  getActiveSession(): MemorySession | null {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db
      .prepare(
        `SELECT id, project, status, started_at, ended_at, summary, tool_calls
       FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: row.id as string,
      project: row.project as string,
      status: row.status as 'active' | 'completed',
      startedAt: row.started_at as number,
      endedAt: row.ended_at as number | undefined,
      summary: row.summary as string | undefined,
      toolCalls: row.tool_calls as number,
    };
  }

  getSessionCount(): number {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as {
      count: number;
    };
    return row.count;
  }

  // --- Queries for cache/stats ---

  getOldestMemoryTimestamp(): number | undefined {
    if (!this.db) return undefined;
    const row = this.db.prepare('SELECT MIN(created_at) as ts FROM memories').get() as {
      ts: number | null;
    };
    return row.ts ?? undefined;
  }

  getNewestMemoryTimestamp(): number | undefined {
    if (!this.db) return undefined;
    const row = this.db.prepare('SELECT MAX(created_at) as ts FROM memories').get() as {
      ts: number | null;
    };
    return row.ts ?? undefined;
  }

  getEvictionCandidates(batchSize: number, activeSessionId?: string): Array<{ id: string }> {
    if (!this.db) return [];

    let sql = `SELECT id FROM memories WHERE type != 'decision'`;
    const params: unknown[] = [];

    if (activeSessionId) {
      sql += ` AND (session_id IS NULL OR session_id != ?)`;
      params.push(activeSessionId);
    }
    sql += ` ORDER BY accessed_at ASC, created_at ASC LIMIT ?`;
    params.push(batchSize);

    return this.db.prepare(sql).all(...params) as Array<{ id: string }>;
  }

  /**
   * Get memories in chronological order around a given memory
   */
  getTimelineAround(
    memoryId: string,
    window: number
  ): Array<{ id: string; title: string; type: string; createdAt: number }> {
    if (!this.db) return [];

    // Get anchor memory's timestamp
    const anchor = this.db.prepare(`SELECT created_at FROM memories WHERE id = ?`).get(memoryId) as
      | { created_at: number }
      | undefined;

    if (!anchor) return [];
    const anchorTs = anchor.created_at;

    // Get before + anchor + after
    const rows = this.db
      .prepare(
        `SELECT id, title, type, created_at FROM (
         SELECT id, title, type, created_at FROM memories
         WHERE created_at <= ?
         ORDER BY created_at DESC LIMIT ?
       )
       UNION ALL
       SELECT id, title, type, created_at FROM (
         SELECT id, title, type, created_at FROM memories
         WHERE created_at > ?
         ORDER BY created_at ASC LIMIT ?
       )
       ORDER BY created_at ASC`
      )
      .all(anchorTs, window + 1, anchorTs, window) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      type: row.type as string,
      createdAt: row.created_at as number,
    }));
  }

  // --- Persistence ---

  getDbSizeBytes(): number {
    if (!this.db) return 0;
    // O(1) — reads page count and page size from SQLite internal state
    // No memory allocation, no data copy (unlike sql.js db.export())
    try {
      const stat = statSync(this.dbPath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  saveToDisk(): void {
    if (!this.db) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((this.db as any)._isSqlJs) {
      // sql.js: export + writeFileSync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.db as any)._sqlJsSave();
    } else {
      // better-sqlite3: WAL checkpoint
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Wraps a sql.js database to expose the same API surface as better-sqlite3.
   * This enables the rest of the class to use db.prepare().run/get/all uniformly.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wrapSqlJs(rawDb: any): any {
    const dbPath = this.dbPath;
    let writeCount = 0;

    const saveToDisk = () => {
      const data = rawDb.export();
      const dir = join(dbPath, '..');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(dbPath, data);
    };

    const trackWrite = () => {
      writeCount++;
      if (writeCount >= 200) {
        saveToDisk();
        writeCount = 0;
      }
    };

    return {
      exec: (sql: string) => rawDb.run(sql),
      pragma: () => {}, // No-op for sql.js
      prepare: (sql: string) => ({
        run: (...params: unknown[]) => {
          rawDb.run(sql, params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          trackWrite();
        },
        get: (...params: unknown[]) => {
          const result = rawDb.exec(
            sql.replace(/\?/g, () => {
              const p = params.shift();
              if (p === null || p === undefined) return 'NULL';
              if (typeof p === 'string') return `'${p.replace(/'/g, "''")}'`;
              return String(p);
            })
          );
          if (!result.length || !result[0].values.length) return undefined;
          const cols = result[0].columns;
          const row = result[0].values[0];
          const obj: Record<string, unknown> = {};
          cols.forEach((c: string, i: number) => {
            obj[c] = row[i];
          });
          return obj;
        },
        all: (...params: unknown[]) => {
          let processed = sql;
          for (const p of params) {
            if (p === null || p === undefined) {
              processed = processed.replace('?', 'NULL');
            } else if (typeof p === 'string') {
              processed = processed.replace('?', `'${p.replace(/'/g, "''")}'`);
            } else {
              processed = processed.replace('?', String(p));
            }
          }
          const result = rawDb.exec(processed);
          if (!result.length) return [];
          const cols = result[0].columns;
          return result[0].values.map((row: unknown[]) => {
            const obj: Record<string, unknown> = {};
            cols.forEach((c: string, i: number) => {
              obj[c] = row[i];
            });
            return obj;
          });
        },
      }),
      close: () => {
        saveToDisk();
        rawDb.close();
      },
      // For saveToDisk() compatibility
      _sqlJsSave: saveToDisk,
      _isSqlJs: true,
    };
  }

  private rowToMemory(row: Record<string, unknown>): Memory {
    return {
      id: row.id as string,
      type: row.type as MemoryType,
      title: row.title as string,
      content: row.content as string,
      project: row.project as string,
      tags: JSON.parse((row.tags as string) || '[]'),
      sessionId: (row.session_id as string) || undefined,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
      accessedAt: row.accessed_at as number,
    };
  }

  // --- Background Indexer Graph Persistence ---

  saveCodeNode(node: import('../core/indexer/indexer-types.js').CodeNode): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db
      .prepare(
        `INSERT OR REPLACE INTO code_nodes (id, type, name, file_path, start_line, end_line, content, summary, hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        node.id,
        node.type,
        node.name,
        node.filePath,
        node.startLine,
        node.endLine,
        node.content,
        node.summary ?? null,
        node.hash,
        node.updatedAt
      );
  }

  saveCodeEdge(edge: import('../core/indexer/indexer-types.js').CodeEdge): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db
      .prepare(
        `INSERT OR IGNORE INTO code_edges (id, source_id, target_id, type, weight)
       VALUES (?, ?, ?, ?, ?)`
      )
      .run(edge.id, edge.sourceId, edge.targetId, edge.type, edge.weight);
  }

  getCodeNodeIdsByFile(filePath: string): string[] {
    if (!this.db) return [];
    const rows = this.db
      .prepare(`SELECT id FROM code_nodes WHERE file_path = ?`)
      .all(filePath) as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  deleteCodeNodesByFile(filePath: string): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.prepare(`DELETE FROM code_nodes WHERE file_path = ?`).run(filePath);
  }

  getCodeNodeByHash(id: string): string | null {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db.prepare(`SELECT hash FROM code_nodes WHERE id = ?`).get(id) as
      | { hash: string }
      | undefined;
    return row?.hash ?? null;
  }

  getCodeNode(id: string): {
    id: string;
    type: string;
    name: string;
    filePath: string;
    content: string;
    hash: string;
    updatedAt: number;
  } | null {
    if (!this.db) throw new Error('Database not initialized');
    const row = this.db
      .prepare(
        `SELECT id, type, name, file_path, content, hash, updated_at FROM code_nodes WHERE id = ?`
      )
      .get(id) as Record<string, unknown> | undefined;

    if (!row) return null;
    return {
      id: row.id as string,
      type: row.type as string,
      name: row.name as string,
      filePath: row.file_path as string,
      content: row.content as string,
      hash: row.hash as string,
      updatedAt: row.updated_at as number,
    };
  }
}
