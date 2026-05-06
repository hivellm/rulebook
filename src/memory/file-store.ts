/**
 * File-based memory store (replaces SQLite + HNSW).
 *
 * Persists memories and sessions as plain markdown files with YAML
 * frontmatter. Search is BM25 over the body with a tag-frontmatter boost.
 * No vector index, no native dependency, no WASM.
 *
 * Layout:
 *   <root>/memories/<YYYY>/<MM>/<id>-<slug>.md
 *   <root>/sessions/<YYYY>/<MM>/<id>-<slug>.md
 *   <root>/codegraph/nodes.jsonl     (one CodeNode per line)
 *   <root>/codegraph/edges.jsonl     (one CodeEdge per line)
 *   <root>/.index.json (optional, lazily refreshed when memoryCount > 1000)
 */

import { existsSync, statSync } from 'fs';
import { mkdir, readFile, readdir, rename, rm, writeFile, appendFile, stat } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Memory, MemorySession, MemoryType } from './memory-types.js';
import type { CodeNode, CodeEdge } from '../core/indexer/indexer-types.js';

/** Body sentinel separating frontmatter from content. */
const FM_DELIMITER = '---';

const MEMORY_TYPES: ReadonlySet<string> = new Set([
  'bugfix',
  'feature',
  'refactor',
  'decision',
  'discovery',
  'change',
  'observation',
]);

/** Convert "Hello, World!" → "hello-world" with a 60-char cap. */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'memory'
  );
}

/** Pick the YYYY/MM partition for a given epoch-ms timestamp. */
function partitionFor(ts: number): { year: string; month: string } {
  const d = new Date(ts);
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
  };
}

function escapeFmString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

function unescapeFmString(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Serialize a Memory to a markdown file body.
 */
export function memoryToMarkdown(m: Memory): string {
  const fm: string[] = [
    FM_DELIMITER,
    `id: ${m.id}`,
    `type: ${m.type}`,
    `title: "${escapeFmString(m.title)}"`,
  ];
  if (m.summary) fm.push(`summary: "${escapeFmString(m.summary)}"`);
  fm.push(`project: "${escapeFmString(m.project)}"`);
  fm.push(`tags: [${m.tags.map((t) => `"${escapeFmString(t)}"`).join(', ')}]`);
  if (m.sessionId) fm.push(`sessionId: ${m.sessionId}`);
  fm.push(`createdAt: ${m.createdAt}`);
  fm.push(`updatedAt: ${m.updatedAt}`);
  fm.push(`accessedAt: ${m.accessedAt}`);
  fm.push(FM_DELIMITER);
  fm.push('');
  return fm.join('\n') + m.content + (m.content.endsWith('\n') ? '' : '\n');
}

/**
 * Serialize a MemorySession to markdown.
 */
export function sessionToMarkdown(s: MemorySession): string {
  const fm: string[] = [
    FM_DELIMITER,
    `id: ${s.id}`,
    `project: "${escapeFmString(s.project)}"`,
    `status: ${s.status}`,
    `startedAt: ${s.startedAt}`,
  ];
  if (s.endedAt !== undefined) fm.push(`endedAt: ${s.endedAt}`);
  fm.push(`toolCalls: ${s.toolCalls}`);
  fm.push(FM_DELIMITER);
  fm.push('');
  return fm.join('\n') + (s.summary ?? '') + '\n';
}

/**
 * Parse YAML-ish frontmatter and body. Supports the minimal forms the writer
 * emits: `key: value`, `key: "string"`, and `key: [a, b]`.
 */
export function parseFile(text: string): { meta: Record<string, unknown>; body: string } {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith(`${FM_DELIMITER}\n`)) {
    return { meta: {}, body: norm };
  }
  const end = norm.indexOf(`\n${FM_DELIMITER}`, FM_DELIMITER.length + 1);
  if (end < 0) return { meta: {}, body: norm };
  const block = norm.slice(FM_DELIMITER.length + 1, end);
  const body = norm.slice(end + FM_DELIMITER.length + 1).replace(/^\n/, '');
  const meta: Record<string, unknown> = {};
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (!inner) {
        meta[key] = [];
        continue;
      }
      const parts: string[] = [];
      const re = /"((?:\\.|[^"\\])*)"\s*,?\s*|([^,\s][^,]*)\s*,?\s*/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(inner)) !== null) {
        if (match[1] !== undefined) parts.push(unescapeFmString(match[1]));
        else if (match[2] !== undefined) parts.push(match[2].trim());
      }
      meta[key] = parts;
      continue;
    }
    if (value.startsWith('"') && value.endsWith('"')) {
      meta[key] = unescapeFmString(value.slice(1, -1));
      continue;
    }
    if (/^-?\d+$/.test(value)) {
      meta[key] = Number(value);
      continue;
    }
    meta[key] = value;
  }
  return { meta, body };
}

function metaToMemory(meta: Record<string, unknown>, body: string): Memory | null {
  const id = typeof meta.id === 'string' ? meta.id : null;
  const type =
    typeof meta.type === 'string' && MEMORY_TYPES.has(meta.type) ? (meta.type as MemoryType) : null;
  const title = typeof meta.title === 'string' ? meta.title : null;
  if (!id || !type || title === null) return null;
  const tags = Array.isArray(meta.tags)
    ? (meta.tags as string[]).filter((t) => typeof t === 'string')
    : [];
  const project = typeof meta.project === 'string' ? meta.project : '';
  const summary = typeof meta.summary === 'string' ? meta.summary : undefined;
  const sessionId = typeof meta.sessionId === 'string' ? meta.sessionId : undefined;
  const createdAt = typeof meta.createdAt === 'number' ? meta.createdAt : 0;
  const updatedAt = typeof meta.updatedAt === 'number' ? meta.updatedAt : createdAt;
  const accessedAt = typeof meta.accessedAt === 'number' ? meta.accessedAt : createdAt;
  return {
    id,
    type,
    title,
    summary,
    content: body.replace(/\n+$/, ''),
    project,
    tags,
    sessionId,
    createdAt,
    updatedAt,
    accessedAt,
  };
}

function metaToSession(meta: Record<string, unknown>, body: string): MemorySession | null {
  const id = typeof meta.id === 'string' ? meta.id : null;
  const startedAt = typeof meta.startedAt === 'number' ? meta.startedAt : null;
  if (!id || startedAt === null) return null;
  const status = meta.status === 'active' || meta.status === 'completed' ? meta.status : 'active';
  return {
    id,
    project: typeof meta.project === 'string' ? meta.project : '',
    status,
    startedAt,
    endedAt: typeof meta.endedAt === 'number' ? meta.endedAt : undefined,
    summary: body.trim() ? body.replace(/\n+$/, '') : undefined,
    toolCalls: typeof meta.toolCalls === 'number' ? meta.toolCalls : 0,
  };
}

/** Atomic write via temp file + rename. */
async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, content, 'utf-8');
  await rename(tmp, filePath);
}

interface CachedEntry {
  filePath: string;
  meta: Record<string, unknown>;
  body: string;
  mtimeMs: number;
}

export class FileStore {
  private memoriesRoot: string;
  private sessionsRoot: string;
  private codegraphRoot: string;
  private codegraphNodesFile: string;
  private codegraphEdgesFile: string;
  /** id → cached parsed memory entry (in-memory hot path; rebuilt from disk). */
  private memoryCache: Map<string, CachedEntry> = new Map();
  private memoryCacheLoaded = false;
  private sessionCache: Map<string, CachedEntry> = new Map();
  private sessionCacheLoaded = false;

  constructor(public readonly root: string) {
    this.memoriesRoot = path.join(root, 'memories');
    this.sessionsRoot = path.join(root, 'sessions');
    this.codegraphRoot = path.join(root, 'codegraph');
    this.codegraphNodesFile = path.join(this.codegraphRoot, 'nodes.jsonl');
    this.codegraphEdgesFile = path.join(this.codegraphRoot, 'edges.jsonl');
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.root)) await mkdir(this.root, { recursive: true });
    if (!existsSync(this.memoriesRoot)) await mkdir(this.memoriesRoot, { recursive: true });
    if (!existsSync(this.sessionsRoot)) await mkdir(this.sessionsRoot, { recursive: true });
    if (!existsSync(this.codegraphRoot)) await mkdir(this.codegraphRoot, { recursive: true });
  }

  // ── memory CRUD ─────────────────────────────────────────────────────

  async saveMemory(memory: Memory): Promise<void> {
    const { year, month } = partitionFor(memory.createdAt);
    const slug = slugify(memory.title);
    const filename = `${memory.id}-${slug}.md`;
    const dir = path.join(this.memoriesRoot, year, month);
    const target = path.join(dir, filename);

    // If the memory id already has an existing file (possibly under a
    // different partition because createdAt drifted), remove the old one.
    const existingPath = await this.findMemoryFile(memory.id, target);
    if (existingPath && existingPath !== target) {
      try {
        await rm(existingPath, { force: true });
      } catch {
        // ignore
      }
    }

    const content = memoryToMarkdown(memory);
    await atomicWrite(target, content);
    const st = await stat(target);
    this.memoryCache.set(memory.id, {
      filePath: target,
      meta: {
        id: memory.id,
        type: memory.type,
        title: memory.title,
        project: memory.project,
        tags: memory.tags,
        sessionId: memory.sessionId,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
        accessedAt: memory.accessedAt,
        summary: memory.summary,
      },
      body: memory.content,
      mtimeMs: st.mtimeMs,
    });
  }

  async getMemory(id: string): Promise<Memory | null> {
    const cached = this.memoryCache.get(id);
    if (cached) {
      const m = metaToMemory(cached.meta, cached.body);
      if (m) return m;
    }
    const found = await this.findMemoryFile(id);
    if (!found) return null;
    const text = await readFile(found, 'utf-8');
    const { meta, body } = parseFile(text);
    const st = await stat(found);
    this.memoryCache.set(id, { filePath: found, meta, body, mtimeMs: st.mtimeMs });
    return metaToMemory(meta, body);
  }

  async deleteMemory(id: string): Promise<boolean> {
    const found = await this.findMemoryFile(id);
    if (!found) return false;
    await rm(found, { force: true });
    this.memoryCache.delete(id);
    return true;
  }

  async updateAccessedAt(id: string): Promise<void> {
    const memory = await this.getMemory(id);
    if (!memory) return;
    memory.accessedAt = Date.now();
    await this.saveMemory(memory);
  }

  async listAllMemories(): Promise<Memory[]> {
    await this.ensureMemoryCache();
    const out: Memory[] = [];
    for (const entry of this.memoryCache.values()) {
      const m = metaToMemory(entry.meta, entry.body);
      if (m) out.push(m);
    }
    return out;
  }

  async listMemories(filter?: {
    type?: MemoryType;
    project?: string;
    tags?: string[];
    since?: number;
    until?: number;
    limit?: number;
    offset?: number;
  }): Promise<Memory[]> {
    const all = await this.listAllMemories();
    let filtered = all;
    if (filter?.type) filtered = filtered.filter((m) => m.type === filter.type);
    if (filter?.project !== undefined)
      filtered = filtered.filter((m) => m.project === filter.project);
    if (filter?.tags && filter.tags.length > 0) {
      const want = new Set(filter.tags);
      filtered = filtered.filter((m) => m.tags.some((t) => want.has(t)));
    }
    if (filter?.since !== undefined)
      filtered = filtered.filter((m) => m.createdAt >= filter.since!);
    if (filter?.until !== undefined)
      filtered = filtered.filter((m) => m.createdAt <= filter.until!);
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? Number.MAX_SAFE_INTEGER;
    return filtered.slice(offset, offset + limit);
  }

  // ── sessions ────────────────────────────────────────────────────────

  async saveSession(session: MemorySession): Promise<void> {
    const { year, month } = partitionFor(session.startedAt);
    const slug = slugify(session.project || 'session');
    const filename = `${session.id}-${slug}.md`;
    const target = path.join(this.sessionsRoot, year, month, filename);
    const existing = await this.findSessionFile(session.id, target);
    if (existing && existing !== target) {
      try {
        await rm(existing, { force: true });
      } catch {
        // ignore
      }
    }
    await atomicWrite(target, sessionToMarkdown(session));
    const st = await stat(target);
    this.sessionCache.set(session.id, {
      filePath: target,
      meta: {
        id: session.id,
        project: session.project,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        toolCalls: session.toolCalls,
      },
      body: session.summary ?? '',
      mtimeMs: st.mtimeMs,
    });
  }

  async getSession(id: string): Promise<MemorySession | null> {
    const cached = this.sessionCache.get(id);
    if (cached) return metaToSession(cached.meta, cached.body);
    const found = await this.findSessionFile(id);
    if (!found) return null;
    const text = await readFile(found, 'utf-8');
    const { meta, body } = parseFile(text);
    const st = await stat(found);
    this.sessionCache.set(id, { filePath: found, meta, body, mtimeMs: st.mtimeMs });
    return metaToSession(meta, body);
  }

  async listSessions(): Promise<MemorySession[]> {
    await this.ensureSessionCache();
    const out: MemorySession[] = [];
    for (const e of this.sessionCache.values()) {
      const s = metaToSession(e.meta, e.body);
      if (s) out.push(s);
    }
    out.sort((a, b) => b.startedAt - a.startedAt);
    return out;
  }

  async getActiveSession(): Promise<MemorySession | null> {
    const sessions = await this.listSessions();
    return sessions.find((s) => s.status === 'active') ?? null;
  }

  // ── stats ───────────────────────────────────────────────────────────

  async getStats(): Promise<{
    memoryCount: number;
    sessionCount: number;
    fileCount: number;
    totalBytes: number;
    oldestMemory?: number;
    newestMemory?: number;
  }> {
    const memories = await this.listAllMemories();
    const sessions = await this.listSessions();
    let totalBytes = 0;
    let fileCount = 0;
    for (const e of this.memoryCache.values()) {
      try {
        const st = statSync(e.filePath);
        totalBytes += st.size;
        fileCount++;
      } catch {
        // ignore
      }
    }
    for (const e of this.sessionCache.values()) {
      try {
        const st = statSync(e.filePath);
        totalBytes += st.size;
        fileCount++;
      } catch {
        // ignore
      }
    }
    let oldestMemory: number | undefined;
    let newestMemory: number | undefined;
    for (const m of memories) {
      if (oldestMemory === undefined || m.createdAt < oldestMemory) oldestMemory = m.createdAt;
      if (newestMemory === undefined || m.createdAt > newestMemory) newestMemory = m.createdAt;
    }
    return {
      memoryCount: memories.length,
      sessionCount: sessions.length,
      fileCount,
      totalBytes,
      oldestMemory,
      newestMemory,
    };
  }

  // ── codegraph (JSONL log) ───────────────────────────────────────────

  async appendCodeNode(node: CodeNode): Promise<void> {
    if (!existsSync(this.codegraphRoot)) await mkdir(this.codegraphRoot, { recursive: true });
    await appendFile(this.codegraphNodesFile, JSON.stringify(node) + '\n', 'utf-8');
  }

  async appendCodeEdge(edge: CodeEdge): Promise<void> {
    if (!existsSync(this.codegraphRoot)) await mkdir(this.codegraphRoot, { recursive: true });
    await appendFile(this.codegraphEdgesFile, JSON.stringify(edge) + '\n', 'utf-8');
  }

  async getCodeNodeHash(id: string): Promise<string | null> {
    if (!existsSync(this.codegraphNodesFile)) return null;
    const text = await readFile(this.codegraphNodesFile, 'utf-8');
    let last: string | null = null;
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const node = JSON.parse(line) as CodeNode;
        if (node.id === id) last = node.hash;
      } catch {
        // ignore malformed lines
      }
    }
    return last;
  }

  async getCodeNode(id: string): Promise<CodeNode | null> {
    if (!existsSync(this.codegraphNodesFile)) return null;
    const text = await readFile(this.codegraphNodesFile, 'utf-8');
    let last: CodeNode | null = null;
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const node = JSON.parse(line) as CodeNode;
        if (node.id === id) last = node;
      } catch {
        // ignore
      }
    }
    return last;
  }

  async getCodeNodeIdsByFile(filePath: string): Promise<string[]> {
    if (!existsSync(this.codegraphNodesFile)) return [];
    const text = await readFile(this.codegraphNodesFile, 'utf-8');
    const ids = new Set<string>();
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const node = JSON.parse(line) as CodeNode;
        if (node.filePath === filePath) ids.add(node.id);
      } catch {
        // ignore
      }
    }
    return Array.from(ids);
  }

  /**
   * Compact the codegraph nodes log by writing only the latest entry per id
   * and dropping any belonging to the supplied file path.
   */
  async deleteCodeNodesByFile(filePath: string): Promise<void> {
    if (!existsSync(this.codegraphNodesFile)) return;
    const text = await readFile(this.codegraphNodesFile, 'utf-8');
    const latest = new Map<string, CodeNode>();
    for (const line of text.split('\n')) {
      if (!line) continue;
      try {
        const node = JSON.parse(line) as CodeNode;
        if (node.filePath === filePath) {
          latest.delete(node.id);
        } else {
          latest.set(node.id, node);
        }
      } catch {
        // ignore malformed
      }
    }
    const out = Array.from(latest.values())
      .map((n) => JSON.stringify(n))
      .join('\n');
    await atomicWrite(this.codegraphNodesFile, out + (out ? '\n' : ''));
  }

  // ── internals ───────────────────────────────────────────────────────

  private async ensureMemoryCache(): Promise<void> {
    if (this.memoryCacheLoaded) return;
    this.memoryCache.clear();
    await this.walkAndCache(this.memoriesRoot, this.memoryCache);
    this.memoryCacheLoaded = true;
  }

  private async ensureSessionCache(): Promise<void> {
    if (this.sessionCacheLoaded) return;
    this.sessionCache.clear();
    await this.walkAndCache(this.sessionsRoot, this.sessionCache);
    this.sessionCacheLoaded = true;
  }

  private async walkAndCache(root: string, cache: Map<string, CachedEntry>): Promise<void> {
    if (!existsSync(root)) return;
    const stack: string[] = [root];
    while (stack.length) {
      const current = stack.pop()!;
      let entries: { name: string; isFile: () => boolean; isDirectory: () => boolean }[];
      try {
        entries = await readdir(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
        try {
          const text = await readFile(full, 'utf-8');
          const parsed = parseFile(text);
          const id = typeof parsed.meta.id === 'string' ? parsed.meta.id : null;
          if (!id) continue;
          const st = await stat(full);
          cache.set(id, {
            filePath: full,
            meta: parsed.meta,
            body: parsed.body,
            mtimeMs: st.mtimeMs,
          });
        } catch {
          // ignore unreadable files
        }
      }
    }
  }

  private async findMemoryFile(id: string, preferred?: string): Promise<string | null> {
    if (preferred && existsSync(preferred)) return preferred;
    await this.ensureMemoryCache();
    return this.memoryCache.get(id)?.filePath ?? null;
  }

  private async findSessionFile(id: string, preferred?: string): Promise<string | null> {
    if (preferred && existsSync(preferred)) return preferred;
    await this.ensureSessionCache();
    return this.sessionCache.get(id)?.filePath ?? null;
  }

  /** Force a cache rebuild from disk on next access. Useful after a migration. */
  invalidateCaches(): void {
    this.memoryCache.clear();
    this.sessionCache.clear();
    this.memoryCacheLoaded = false;
    this.sessionCacheLoaded = false;
  }
}

export function createFileStore(root: string): FileStore {
  return new FileStore(root);
}

/** Re-exposed for migration helpers; not part of the public API surface. */
export const __INTERNAL = {
  randomUUID,
};
