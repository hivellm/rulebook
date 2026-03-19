import { existsSync, statSync } from 'fs';
import { extname, resolve } from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
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
  private watcher: FSWatcher | null = null;

  // Stats
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    memoryManager: MemoryManager,
    projectRoot: string,
    config: Partial<IndexerConfig> = {}
  ) {
    this.memoryManager = memoryManager;
    this.projectRoot = resolve(projectRoot);
    this.parser = new CodeParser();
    this.config = {
      enabled: config.enabled ?? true,
      watchPaths: config.watchPaths ?? ['.'],
      ignorePatterns: config.ignorePatterns ?? [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.rulebook',
        'coverage',
      ],
      chunkSize: config.chunkSize ?? 1500,
      debounceMs: config.debounceMs ?? 3000,
    };
  }

  public start(): void {
    if (!this.config.enabled) return;
    console.error(`[BackgroundIndexer] Starting watcher on: ${this.projectRoot}`);

    // Use chokidar for reliable cross-platform file watching with proper ignore support.
    // Unlike fs.watch({ recursive: true }), chokidar filters at the OS watcher level,
    // preventing node_modules events from ever reaching the event loop.
    const ignoredGlobs = this.config.ignorePatterns.map(p => `**/${p}/**`);
    // Also ignore binary/asset files at the watcher level
    ignoredGlobs.push(
      '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.ico',
      '**/*.mp3', '**/*.mp4', '**/*.pdf', '**/*.lock',
      '**/*.sqlite', '**/*.sqlite-wal', '**/*.sqlite-shm', '**/*.sqlite-journal',
      '**/*.db', '**/*.db-wal', '**/*.db-shm', '**/*.db-journal',
    );

    this.watcher = chokidar.watch(this.projectRoot, {
      ignored: ignoredGlobs,
      persistent: true,
      ignoreInitial: true,
      depth: 8,
      // Reduce CPU usage: aggregate events over 500ms
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('change', (filePath: string) => this.handleFileChange(filePath))
      .on('add', (filePath: string) => this.handleFileChange(filePath))
      .on('unlink', (filePath: string) => this.handleFileChange(filePath))
      .on('error', (error: unknown) => {
        console.error('[BackgroundIndexer] Watcher error:', error);
      });
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    console.error('[BackgroundIndexer] Stopped');
  }

  public getStatus(): { queue: number; processed: number; errors: number; isProcessing: boolean } {
    return {
      queue: this.processQueue.size,
      processed: this.processedCount,
      errors: this.errorCount,
      isProcessing: this.isProcessing,
    };
  }

  private isCodeFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const codeExts = [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
      '.py', '.rs', '.go', '.java', '.kt', '.scala',
      '.cs', '.cpp', '.cc', '.c', '.h', '.hpp',
      '.swift', '.rb', '.php', '.ex', '.erl', '.zig',
      '.sol', '.dart', '.lua', '.hs', '.r', '.R',
      '.sh', '.bash', '.zsh', '.yaml', '.yml', '.json',
      '.toml', '.md', '.mdx',
    ];
    return codeExts.includes(ext);
  }

  private handleFileChange(fullPath: string): void {
    if (!this.isCodeFile(fullPath)) return;

    this.processQueue.add(fullPath);

    // Debounce the queue processor
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.processNextBatch();
    }, this.config.debounceMs);
  }

  // Max time for a single file to be indexed before we skip it
  private static readonly PER_FILE_TIMEOUT_MS = 5000;
  // Max batch size to prevent long blocking runs
  private static readonly MAX_BATCH_SIZE = 20;

  private async processNextBatch(): Promise<void> {
    if (this.isProcessing || this.processQueue.size === 0) return;
    this.isProcessing = true;

    // Cap batch size to prevent the indexer from monopolizing the event loop
    const allQueued = Array.from(this.processQueue);
    const batch = allQueued.slice(0, BackgroundIndexer.MAX_BATCH_SIZE);
    for (const f of batch) this.processQueue.delete(f);

    console.error(
      `[BackgroundIndexer] Processing batch of ${batch.length} files (${this.processQueue.size} remaining)...`
    );

    for (const filePath of batch) {
      try {
        await this.processFile(filePath);
        this.processedCount++;
      } catch (e) {
        console.error(`[BackgroundIndexer] Error processing ${filePath}:`, e);
        this.errorCount++;
      }
    }

    this.isProcessing = false;

    // If more accumulated while processing, schedule next batch directly
    if (this.processQueue.size > 0) {
      this.debounceTimer = setTimeout(() => {
        this.processNextBatch();
      }, 100);
    }
  }

  /**
   * Process a single file with a timeout guard.
   * If processing takes longer than PER_FILE_TIMEOUT_MS, skip it.
   */
  private processFile(filePath: string): Promise<void> {
    const work = async () => {
      if (!existsSync(filePath)) {
        // File was deleted
        await this.memoryManager.deleteCodeNodesByFile(filePath);
        return;
      }

      const stats = statSync(filePath);
      if (!stats.isFile()) return;

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
    };

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Indexing timed out after ${BackgroundIndexer.PER_FILE_TIMEOUT_MS}ms`));
      }, BackgroundIndexer.PER_FILE_TIMEOUT_MS);

      work().then(
        () => {
          clearTimeout(timer);
          resolve();
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }
}
