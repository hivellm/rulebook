/**
 * SQLite Storage Layer using sql.js (WASM)
 *
 * Provides CRUD operations for memories and sessions,
 * with FTS5 full-text search (BM25 ranking).
 */

import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import type { Memory, MemorySession, MemoryType } from './memory-types.js';

// sql.js types (loaded dynamically)
type SqlJsDatabase = {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  export(): Uint8Array;
  close(): void;
};

const AUTO_SAVE_THRESHOLD = 50;

export class MemoryStore {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private writeCount = 0;
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

    // Dynamic import sql.js
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();

    // Load existing DB or create new
    if (existsSync(this.dbPath)) {
      const fileData = readFileSync(this.dbPath);
      this.db = new SQL.Database(fileData) as unknown as SqlJsDatabase;
    } else {
      this.db = new SQL.Database() as unknown as SqlJsDatabase;
    }

    this.createSchema();
    this.initialized = true;
  }

  private createSchema(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
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

    this.db.run(`
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

    // FTS5 virtual table for BM25 search
    // Use external content mode synced with memories table
    try {
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
          title, content, type,
          content=memories,
          content_rowid=rowid
        )
      `);

      // Triggers to sync FTS with memories table
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memory_fts_ai AFTER INSERT ON memories BEGIN
          INSERT INTO memory_fts(rowid, title, content, type)
            VALUES (new.rowid, new.title, new.content, new.type);
        END
      `);

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memory_fts_ad AFTER DELETE ON memories BEGIN
          INSERT INTO memory_fts(memory_fts, rowid, title, content, type)
            VALUES ('delete', old.rowid, old.title, old.content, old.type);
        END
      `);

      this.db.run(`
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
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)'
    );
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)'
    );
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(accessed_at)'
    );
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id)'
    );
  }

  private trackWrite(): void {
    this.writeCount++;
    if (this.writeCount >= AUTO_SAVE_THRESHOLD) {
      this.saveToDisk();
      this.writeCount = 0;
    }
  }

  // --- Memory CRUD ---

  saveMemory(memory: Memory): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT OR REPLACE INTO memories (id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memory.id,
        memory.type,
        memory.title,
        memory.content,
        memory.project,
        JSON.stringify(memory.tags),
        memory.sessionId ?? null,
        memory.createdAt,
        memory.updatedAt,
        memory.accessedAt,
      ]
    );
    this.trackWrite();
  }

  getMemory(id: string): Memory | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at
       FROM memories WHERE id = '${id.replace(/'/g, "''")}'`
    );

    if (result.length === 0 || result[0].values.length === 0) return null;

    const row = result[0].values[0];
    return this.rowToMemory(row);
  }

  deleteMemory(id: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`DELETE FROM memories WHERE id = ?`, [id]);
    this.trackWrite();
  }

  listMemories(options?: {
    type?: MemoryType;
    limit?: number;
    offset?: number;
    project?: string;
  }): Memory[] {
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    if (options?.type) conditions.push(`type = '${options.type}'`);
    if (options?.project)
      conditions.push(
        `project = '${options.project.replace(/'/g, "''")}'`
      );

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options?.limit ? `LIMIT ${options.limit}` : 'LIMIT 100';
    const offset = options?.offset ? `OFFSET ${options.offset}` : '';

    const result = this.db.exec(
      `SELECT id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at
       FROM memories ${where} ORDER BY created_at DESC ${limit} ${offset}`
    );

    if (result.length === 0) return [];
    return result[0].values.map((row) => this.rowToMemory(row));
  }

  updateAccessedAt(id: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`UPDATE memories SET accessed_at = ? WHERE id = ?`, [
      Date.now(),
      id,
    ]);
    this.trackWrite();
  }

  getMemoryCount(): number {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT COUNT(*) FROM memories');
    if (result.length === 0) return 0;
    return Number(result[0].values[0][0]);
  }

  // --- BM25 Search ---

  searchBM25(
    query: string,
    limit: number = 20,
    filters?: { type?: MemoryType; project?: string }
  ): Array<{ id: string; score: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Escape FTS5 special characters
      const escaped = query.replace(/['"]/g, ' ').trim();
      if (!escaped) return [];

      let sql = `
        SELECT m.id, bm25(memory_fts) as score
        FROM memory_fts f
        JOIN memories m ON m.rowid = f.rowid
        WHERE memory_fts MATCH '${escaped}'
      `;

      if (filters?.type) {
        sql += ` AND m.type = '${filters.type}'`;
      }
      if (filters?.project) {
        sql += ` AND m.project = '${filters.project.replace(/'/g, "''")}'`;
      }

      sql += ` ORDER BY score LIMIT ${limit}`;

      const result = this.db.exec(sql);
      if (result.length === 0) return [];

      return result[0].values.map((row) => ({
        id: row[0] as string,
        score: Math.abs(row[1] as number), // BM25 returns negative scores
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
      (t) =>
        `(LOWER(title) LIKE '%${t}%' OR LOWER(content) LIKE '%${t}%')`
    );

    let sql = `SELECT id FROM memories WHERE ${conditions.join(' OR ')}`;
    if (filters?.type) sql += ` AND type = '${filters.type}'`;
    if (filters?.project)
      sql += ` AND project = '${filters.project.replace(/'/g, "''")}'`;
    sql += ` LIMIT ${limit}`;

    const result = this.db.exec(sql);
    if (result.length === 0) return [];

    return result[0].values.map((row, i) => ({
      id: row[0] as string,
      score: 1 / (i + 1), // Simple rank-based score
    }));
  }

  // --- Sessions ---

  createSession(session: MemorySession): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `INSERT INTO sessions (id, project, status, started_at, ended_at, summary, tool_calls)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.project,
        session.status,
        session.startedAt,
        session.endedAt ?? null,
        session.summary ?? null,
        session.toolCalls,
      ]
    );
    this.trackWrite();
  }

  endSession(id: string, summary?: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      `UPDATE sessions SET status = 'completed', ended_at = ?, summary = ? WHERE id = ?`,
      [Date.now(), summary ?? null, id]
    );
    this.trackWrite();
  }

  getActiveSession(): MemorySession | null {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      `SELECT id, project, status, started_at, ended_at, summary, tool_calls
       FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
    );

    if (result.length === 0 || result[0].values.length === 0) return null;

    const row = result[0].values[0];
    return {
      id: row[0] as string,
      project: row[1] as string,
      status: row[2] as 'active' | 'completed',
      startedAt: row[3] as number,
      endedAt: row[4] as number | undefined,
      summary: row[5] as string | undefined,
      toolCalls: row[6] as number,
    };
  }

  getSessionCount(): number {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT COUNT(*) FROM sessions');
    if (result.length === 0) return 0;
    return Number(result[0].values[0][0]);
  }

  // --- Queries for cache/stats ---

  getOldestMemoryTimestamp(): number | undefined {
    if (!this.db) return undefined;

    const result = this.db.exec(
      'SELECT MIN(created_at) FROM memories'
    );
    if (result.length === 0 || result[0].values[0][0] === null) return undefined;
    return Number(result[0].values[0][0]);
  }

  getNewestMemoryTimestamp(): number | undefined {
    if (!this.db) return undefined;

    const result = this.db.exec(
      'SELECT MAX(created_at) FROM memories'
    );
    if (result.length === 0 || result[0].values[0][0] === null) return undefined;
    return Number(result[0].values[0][0]);
  }

  getEvictionCandidates(
    batchSize: number,
    activeSessionId?: string
  ): Array<{ id: string }> {
    if (!this.db) return [];

    let sql = `SELECT id FROM memories WHERE type != 'decision'`;
    if (activeSessionId) {
      sql += ` AND (session_id IS NULL OR session_id != '${activeSessionId.replace(/'/g, "''")}')`;
    }
    sql += ` ORDER BY accessed_at ASC, created_at ASC LIMIT ${batchSize}`;

    const result = this.db.exec(sql);
    if (result.length === 0) return [];
    return result[0].values.map((row) => ({ id: row[0] as string }));
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
    const anchorResult = this.db.exec(
      `SELECT created_at FROM memories WHERE id = '${memoryId.replace(/'/g, "''")}'`
    );
    if (anchorResult.length === 0 || anchorResult[0].values.length === 0)
      return [];

    const anchorTs = anchorResult[0].values[0][0] as number;

    // Get before + anchor + after
    const result = this.db.exec(
      `SELECT id, title, type, created_at FROM (
         SELECT id, title, type, created_at FROM memories
         WHERE created_at <= ${anchorTs}
         ORDER BY created_at DESC LIMIT ${window + 1}
       )
       UNION ALL
       SELECT id, title, type, created_at FROM (
         SELECT id, title, type, created_at FROM memories
         WHERE created_at > ${anchorTs}
         ORDER BY created_at ASC LIMIT ${window}
       )
       ORDER BY created_at ASC`
    );

    if (result.length === 0) return [];
    return result[0].values.map((row) => ({
      id: row[0] as string,
      title: row[1] as string,
      type: row[2] as string,
      createdAt: row[3] as number,
    }));
  }

  // --- Persistence ---

  getDbSizeBytes(): number {
    if (!this.db) return 0;
    return this.db.export().byteLength;
  }

  saveToDisk(): void {
    if (!this.db) return;

    const dir = join(this.dbPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data = this.db.export();
    writeFileSync(this.dbPath, data);
  }

  close(): void {
    if (this.db) {
      this.saveToDisk();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  private rowToMemory(row: unknown[]): Memory {
    return {
      id: row[0] as string,
      type: row[1] as MemoryType,
      title: row[2] as string,
      content: row[3] as string,
      project: row[4] as string,
      tags: JSON.parse((row[5] as string) || '[]'),
      sessionId: (row[6] as string) || undefined,
      createdAt: row[7] as number,
      updatedAt: row[8] as number,
      accessedAt: row[9] as number,
    };
  }
}
