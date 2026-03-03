import { existsSync, statSync, watch } from 'fs';
import { extname, join, resolve } from 'path';
import type { MemoryManager } from '../../memory/memory-manager.js';
import { CodeParser } from './file-parser.js';
import type { IndexerConfig } from './indexer-types.js';

export class BackgroundIndexer {
    private memoryManager: MemoryManager;
    private parser: CodeParser;
    private config: IndexerConfig;
    private projectRoot: string;
    private isProcessing = false;
    private processQueue: Set<string> = new Set();
    private debounceTimer: NodeJS.Timeout | null = null;
    private watchControllers: Set<import('fs').FSWatcher> = new Set();

    // Stats
    private processedCount = 0;
    private errorCount = 0;

    constructor(memoryManager: MemoryManager, projectRoot: string, config: Partial<IndexerConfig> = {}) {
        this.memoryManager = memoryManager;
        this.projectRoot = resolve(projectRoot);
        this.parser = new CodeParser();
        this.config = {
            enabled: config.enabled ?? true,
            watchPaths: config.watchPaths ?? ['.'],
            ignorePatterns: config.ignorePatterns ?? ['node_modules', '.git', 'dist', 'build', '.rulebook', 'coverage'],
            chunkSize: config.chunkSize ?? 1500,
            debounceMs: config.debounceMs ?? 3000,
        };
    }

    public start(): void {
        if (!this.config.enabled) return;
        console.log(`[BackgroundIndexer] Starting watcher on: ${this.projectRoot}`);

        // Very naive watcher for V1 (Node.js native Recursive FS Watcher when available, otherwise basic)
        // Production ready app should probably use `chokidar` here, but sticking to native limits deps
        try {
            const watcher = watch(this.projectRoot, { recursive: true }, (_, filename) => {
                if (!filename) return;
                this.handleFileChange(filename);
            });

            watcher.on('error', (error) => {
                console.error('[BackgroundIndexer] Watcher error:', error);
            });

            this.watchControllers.add(watcher);
        } catch (e) {
            console.warn(`[BackgroundIndexer] Recursive FS watch failed. Falling back to targeted watching may be required. Error: ${e}`);
        }
    }

    public stop(): void {
        this.watchControllers.forEach(w => w.close());
        this.watchControllers.clear();
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        console.log('[BackgroundIndexer] Stopped');
    }

    public getStatus(): { queue: number; processed: number; errors: number; isProcessing: boolean } {
        return {
            queue: this.processQueue.size,
            processed: this.processedCount,
            errors: this.errorCount,
            isProcessing: this.isProcessing
        };
    }

    private isIgnored(filePath: string): boolean {
        // Basic ignore check
        const normalizedPath = filePath.replace(/\\/g, '/');
        for (const pattern of this.config.ignorePatterns) {
            if (normalizedPath.includes(`/${pattern}/`) || normalizedPath.startsWith(`${pattern}/`) || normalizedPath.includes(`\\${pattern}\\`)) {
                return true;
            }
        }

        // Ignore non-code files or assets
        const ext = extname(filePath).toLowerCase();
        const ignoredExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp3', '.mp4', '.sqlite', '.db', '.pdf'];
        if (ignoredExts.includes(ext)) {
            return true;
        }

        return false;
    }

    private handleFileChange(filename: string): void {
        const fullPath = join(this.projectRoot, filename);

        if (this.isIgnored(filename)) return;

        this.processQueue.add(fullPath);

        // Debounce the queue processor
        if (this.debounceTimer) clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
            this.processNextBatch();
        }, this.config.debounceMs);
    }

    private async processNextBatch(): Promise<void> {
        if (this.isProcessing || this.processQueue.size === 0) return;
        this.isProcessing = true;

        const batch = Array.from(this.processQueue);
        this.processQueue.clear();

        console.log(`[BackgroundIndexer] Processing batch of ${batch.length} files...`);

        for (const filePath of batch) {
            try {
                if (!existsSync(filePath)) {
                    // File was deleted
                    await this.memoryManager.deleteCodeNodesByFile(filePath);
                    continue;
                }

                const stats = statSync(filePath);
                if (!stats.isFile()) continue;

                // Parse
                const { nodes, edges } = this.parser.parseFile(filePath);

                // 1. Flush old Nodes/Edges for this file (Cascade handles Edges)
                await this.memoryManager.deleteCodeNodesByFile(filePath);

                // 2. Insert new Nodes
                for (const node of nodes) {
                    await this.memoryManager.saveCodeNode(node);
                }

                // 3. Insert new Edges
                for (const edge of edges) {
                    await this.memoryManager.saveCodeEdge(edge);
                }

                this.processedCount++;
            } catch (e) {
                console.error(`[BackgroundIndexer] Error processing ${filePath}:`, e);
                this.errorCount++;
            }
        }

        this.isProcessing = false;

        // If more accumulated while processing, trigger again
        if (this.processQueue.size > 0) {
            this.handleFileChange('__trigger_batch__');
        }
    }
}
