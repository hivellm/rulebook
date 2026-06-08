/**
 * BM25 search and timeline operations over the file-based memory store.
 *
 * No vectorizer, no HNSW. The implementation tokenizes each memory body +
 * title + summary + tags, computes term frequencies and inverse-document
 * frequencies on demand, then ranks candidates with BM25.
 *
 * For corpora >1000 memories the caller may opt into an inverted-index
 * sidecar (`<root>/.index.json`) refreshed lazily on save.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { FileStore } from './file-store.js';
import type {
    Memory,
    MemorySearchOptions,
    MemorySearchResult,
    MemoryType,
    TimelineEntry,
} from './memory-types.js';

const BM25_K1 = 1.5;
const BM25_B = 0.75;
const TAG_BOOST = 1.5;

const STOPWORDS = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'is',
    'are',
    'was',
    'were',
    'of',
    'to',
    'for',
    'with',
    'on',
    'in',
    'at',
    'by',
    'from',
    'as',
    'this',
    'that',
    'it',
    'be',
    'been',
    'has',
    'have',
    'had',
    'do',
    'does',
    'did',
    'will',
    'not',
    'no',
]);

export function tokenize(text: string): string[] {
    if (!text) return [];
    return text
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface IndexedDoc {
    id: string;
    termFreq: Map<string, number>;
    length: number;
    tagSet: Set<string>;
    memory: Memory;
}

interface CorpusIndex {
    docs: IndexedDoc[];
    docFreq: Map<string, number>;
    avgLength: number;
}

function buildIndex(memories: Memory[]): CorpusIndex {
    const docs: IndexedDoc[] = [];
    const docFreq = new Map<string, number>();
    let totalLength = 0;

    for (const m of memories) {
        const text = [m.title, m.summary ?? '', m.content].filter(Boolean).join(' ');
        const tokens = tokenize(text);
        const tf = new Map<string, number>();
        for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);
        const tagSet = new Set(m.tags.map((t) => t.toLowerCase()));
        docs.push({ id: m.id, termFreq: tf, length: tokens.length, tagSet, memory: m });
        for (const term of tf.keys()) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
        totalLength += tokens.length;
    }

    const avgLength = docs.length > 0 ? totalLength / docs.length : 1;
    return { docs, docFreq, avgLength };
}

function bm25Score(doc: IndexedDoc, queryTerms: string[], index: CorpusIndex): number {
    const N = index.docs.length || 1;
    let score = 0;
    for (const term of queryTerms) {
        const df = index.docFreq.get(term) ?? 0;
        if (df === 0) continue;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const tf = doc.termFreq.get(term) ?? 0;
        if (tf === 0) continue;
        const denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / index.avgLength));
        score += idf * ((tf * (BM25_K1 + 1)) / denom);
    }
    // Tag boost
    let tagHits = 0;
    for (const term of queryTerms) {
        if (doc.tagSet.has(term)) tagHits++;
    }
    if (tagHits > 0) score *= 1 + TAG_BOOST * (tagHits / queryTerms.length);
    return score;
}

/**
 * Threshold above which `FileSearch` persists an inverted-index sidecar
 * (`<root>/.index.json`) alongside the markdown corpus. Small corpora
 * (the common case) skip the file entirely — building the index in
 * memory per-search is faster than re-reading a sidecar at that scale.
 */
const INDEX_THRESHOLD = 1000;

interface InvertedIndex {
    // Per-term posting list: docId -> term frequency
    terms: Record<string, Record<string, number>>;
    docs: Array<{ id: string; length: number; tags: string[] }>;
    avgLength: number;
    size: number;
}

export class FileSearch {
    constructor(private store: FileStore) {}

    /**
     * Refresh `<root>/.index.json` when the corpus is large enough to make
     * persisted indexing worthwhile. No-op below `INDEX_THRESHOLD`.
     */
    async maybeRebuildIndex(): Promise<{ written: boolean; size: number }> {
        const stats = await this.store.getStats();
        if (stats.memoryCount < INDEX_THRESHOLD) return { written: false, size: stats.memoryCount };

        const memories = await this.store.listAllMemories();
        const index = buildIndex(memories);
        const flat: InvertedIndex = {
            terms: {},
            docs: index.docs.map((d) => ({
                id: d.id,
                length: d.length,
                tags: Array.from(d.tagSet),
            })),
            avgLength: index.avgLength,
            size: index.docs.length,
        };
        for (const doc of index.docs) {
            for (const [term, tf] of doc.termFreq) {
                if (!flat.terms[term]) flat.terms[term] = {};
                flat.terms[term][doc.id] = tf;
            }
        }
        const indexPath = path.join(this.store.root, '.index.json');
        if (!existsSync(this.store.root)) await mkdir(this.store.root, { recursive: true });
        await writeFile(indexPath, JSON.stringify(flat), 'utf-8');
        return { written: true, size: flat.size };
    }

    /** Read the sidecar inverted index if present. */
    async loadIndex(): Promise<InvertedIndex | null> {
        const indexPath = path.join(this.store.root, '.index.json');
        if (!existsSync(indexPath)) return null;
        try {
            const text = await readFile(indexPath, 'utf-8');
            return JSON.parse(text) as InvertedIndex;
        } catch {
            return null;
        }
    }

    async search(options: MemorySearchOptions): Promise<MemorySearchResult[]> {
        const limit = options.limit ?? 20;
        const queryTerms = tokenize(options.query);
        if (queryTerms.length === 0) return [];

        const memories = await this.store.listMemories({
            type: options.type,
            project: options.project,
        });
        const index = buildIndex(memories);

        const scored: Array<{ doc: IndexedDoc; score: number }> = [];
        for (const doc of index.docs) {
            const s = bm25Score(doc, queryTerms, index);
            if (s > 0) scored.push({ doc, score: s });
        }
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map((entry) => ({
            id: entry.doc.id,
            title: entry.doc.memory.title,
            type: entry.doc.memory.type,
            score: entry.score,
            matchType: 'bm25' as const,
            createdAt: entry.doc.memory.createdAt,
        }));
    }

    async getTimeline(memoryId: string, window: number = 5): Promise<TimelineEntry[]> {
        const all = await this.store.listAllMemories();
        if (all.length === 0) return [];
        all.sort((a, b) => a.createdAt - b.createdAt);
        const idx = all.findIndex((m) => m.id === memoryId);
        if (idx < 0) return [];
        const start = Math.max(0, idx - window);
        const end = Math.min(all.length, idx + window + 1);
        const slice = all.slice(start, end);
        const anchor = all[idx];
        return slice.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.type as MemoryType,
            createdAt: m.createdAt,
            position:
                m.id === memoryId
                    ? ('anchor' as const)
                    : m.createdAt < anchor.createdAt
                      ? ('before' as const)
                      : ('after' as const),
            distanceFromAnchor: Math.abs(m.createdAt - anchor.createdAt),
        }));
    }

    async getFullDetails(ids: string[]): Promise<Memory[]> {
        const out: Memory[] = [];
        for (const id of ids) {
            const m = await this.store.getMemory(id);
            if (m) {
                await this.store.updateAccessedAt(id);
                out.push(m);
            }
        }
        return out;
    }
}

export function createFileSearch(store: FileStore): FileSearch {
    return new FileSearch(store);
}
