/**
 * One-shot legacy SQLite → markdown migrator.
 *
 * Lazily imported only when an existing `memory.db` is detected on the
 * first `MemoryManager.initialize()`. Reads memories + sessions from the
 * legacy DB (using `better-sqlite3` if available, otherwise `sql.js` as a
 * fallback) and writes one markdown file per row via `FileStore`.
 *
 * After the manager renames `memory.db` → `memory.db.legacy` neither
 * sql.js nor better-sqlite3 is loaded again at runtime. The migrator
 * itself isolates those imports inside try-blocks so a missing native
 * binary is non-fatal — the user keeps the markdown migration that
 * already succeeded for the rows the fallback could read.
 */

import { existsSync, readFileSync } from 'fs';
import type { FileStore } from './file-store.js';
import type { Memory, MemorySession, MemoryType } from './memory-types.js';

interface MigrationStats {
  memories: number;
  sessions: number;
}

interface MinimalDb {
  prepare(sql: string): {
    all: (...params: unknown[]) => Array<Record<string, unknown>>;
  };
  close?: () => void;
}

async function openDb(dbPath: string): Promise<MinimalDb | null> {
  try {
    // better-sqlite3 is an optional native dep — keep the import indirect so
    // tsc does not require its type declarations when the package is absent
    // (matches the sql.js pattern below).
    const moduleName = 'better-sqlite3';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(moduleName);
    const Database = mod.default ?? mod;
    const db = new Database(dbPath, { readonly: true });
    return db as unknown as MinimalDb;
  } catch {
    // Fall through to sql.js
  }
  try {
    // sql.js is deprecated as a runtime dep in v5.6 (file-based store).
    // It is only used by the legacy migrator and only when the user has it
    // installed locally. Indirect dynamic import keeps the TS compile clean
    // even when the package is absent from node_modules.
    const moduleName = 'sql.js';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sqlMod: any = await import(moduleName);
    const initSqlJs = sqlMod.default ?? sqlMod;
    const SQL = await initSqlJs();
    if (!existsSync(dbPath)) return null;
    const raw = new SQL.Database(readFileSync(dbPath));
    return {
      prepare: (sql: string) => ({
        all: (...params: unknown[]) => {
          let processed = sql;
          for (const p of params) {
            if (p === null || p === undefined) processed = processed.replace('?', 'NULL');
            else if (typeof p === 'string')
              processed = processed.replace('?', `'${p.replace(/'/g, "''")}'`);
            else processed = processed.replace('?', String(p));
          }
          const result = raw.exec(processed);
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
      close: () => raw.close(),
    };
  } catch {
    return null;
  }
}

const KNOWN_TYPES = new Set<MemoryType>([
  'bugfix',
  'feature',
  'refactor',
  'decision',
  'discovery',
  'change',
  'observation',
]);

function rowToMemory(row: Record<string, unknown>): Memory | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const rawType = typeof row.type === 'string' ? row.type : 'observation';
  const type = (KNOWN_TYPES.has(rawType as MemoryType) ? rawType : 'observation') as MemoryType;
  const title = typeof row.title === 'string' ? row.title : null;
  if (!id || !title) return null;
  let tags: string[] = [];
  try {
    if (typeof row.tags === 'string') tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }
  return {
    id,
    type,
    title,
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    content: typeof row.content === 'string' ? row.content : '',
    project: typeof row.project === 'string' ? row.project : '',
    tags,
    sessionId: typeof row.session_id === 'string' ? row.session_id : undefined,
    createdAt: typeof row.created_at === 'number' ? row.created_at : Date.now(),
    updatedAt: typeof row.updated_at === 'number' ? row.updated_at : Date.now(),
    accessedAt: typeof row.accessed_at === 'number' ? row.accessed_at : Date.now(),
  };
}

function rowToSession(row: Record<string, unknown>): MemorySession | null {
  const id = typeof row.id === 'string' ? row.id : null;
  const startedAt = typeof row.started_at === 'number' ? row.started_at : null;
  if (!id || startedAt === null) return null;
  const status = row.status === 'completed' ? 'completed' : 'active';
  return {
    id,
    project: typeof row.project === 'string' ? row.project : '',
    status,
    startedAt,
    endedAt: typeof row.ended_at === 'number' ? row.ended_at : undefined,
    summary: typeof row.summary === 'string' ? row.summary : undefined,
    toolCalls: typeof row.tool_calls === 'number' ? row.tool_calls : 0,
  };
}

/**
 * Migrate every row of a legacy memory.db into the file-based store.
 * Idempotent against the FileStore: if a memory id already exists on disk
 * it is overwritten with the legacy content (same id → same partition).
 */
export async function migrateLegacyDb(
  dbPath: string,
  fileStore: FileStore
): Promise<MigrationStats> {
  if (!existsSync(dbPath)) return { memories: 0, sessions: 0 };
  const db = await openDb(dbPath);
  if (!db) return { memories: 0, sessions: 0 };

  let memories = 0;
  let sessions = 0;

  try {
    const memoryRows = db
      .prepare(
        `SELECT id, type, title, content, project, tags, session_id, created_at, updated_at, accessed_at
         FROM memories`
      )
      .all() as Array<Record<string, unknown>>;
    for (const row of memoryRows) {
      const m = rowToMemory(row);
      if (!m) continue;
      await fileStore.saveMemory(m);
      memories++;
    }
  } catch {
    // memories table may not exist on partial DBs
  }

  try {
    const sessionRows = db
      .prepare(
        `SELECT id, project, status, started_at, ended_at, summary, tool_calls
         FROM sessions`
      )
      .all() as Array<Record<string, unknown>>;
    for (const row of sessionRows) {
      const s = rowToSession(row);
      if (!s) continue;
      await fileStore.saveSession(s);
      sessions++;
    }
  } catch {
    // sessions table may not exist
  }

  if (db.close) {
    try {
      db.close();
    } catch {
      // ignore
    }
  }

  return { memories, sessions };
}
