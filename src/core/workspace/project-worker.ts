/**
 * ProjectWorker -- Encapsulates all per-project managers.
 *
 * Lazy-initialized: managers are created on first access.
 * Tracks idle time for lifecycle management.
 */

import { join } from 'node:path';
import { TaskManager } from '../task-manager.js';
import { ConfigManager } from '../config-manager.js';
import { SkillsManager, getDefaultTemplatesPath } from '../skills-manager.js';
import type { RulebookConfig } from '../../types.js';

export class ProjectWorker {
  readonly projectId: string;
  readonly projectRoot: string;

  private taskManager: TaskManager | null = null;
  private configManager: ConfigManager | null = null;
  private skillsManager: SkillsManager | null = null;
  private memoryManager: Awaited<
    ReturnType<typeof import('../../memory/memory-manager.js').createMemoryManager>
  > | null = null;
  private bgIndexer: { stop(): void } | null = null;

  private _lastAccessedAt: number = Date.now();
  private _initialized = false;
  private _rulebookConfig: RulebookConfig | null = null;

  constructor(projectId: string, projectRoot: string) {
    this.projectId = projectId;
    this.projectRoot = projectRoot;
  }

  /** Whether initialize() has completed successfully. */
  get initialized(): boolean {
    return this._initialized;
  }

  /** Timestamp of the last access to any getter or touch(). */
  get lastAccessedAt(): number {
    return this._lastAccessedAt;
  }

  /** Update the last-accessed timestamp to now. */
  touch(): void {
    this._lastAccessedAt = Date.now();
  }

  /** Returns true if the worker has been idle longer than `timeoutMs`. */
  isIdle(timeoutMs: number): boolean {
    return Date.now() - this._lastAccessedAt > timeoutMs;
  }

  /**
   * Initialize all per-project managers.
   * Idempotent -- subsequent calls are no-ops.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    this.configManager = new ConfigManager(this.projectRoot);
    this._rulebookConfig = await this.configManager.loadConfig();
    this.taskManager = new TaskManager(this.projectRoot, '.rulebook');
    this.skillsManager = new SkillsManager(getDefaultTemplatesPath(), this.projectRoot);

    // Lazy-load memory if enabled in project config
    if (this._rulebookConfig.memory?.enabled) {
      try {
        const { createMemoryManager } = await import('../../memory/memory-manager.js');
        const dbPath = join(
          this.projectRoot,
          this._rulebookConfig.memory.dbPath ?? '.rulebook/memory/memory.db'
        );
        console.error(`[rulebook-mcp] Memory DB (${this.projectId}): ${dbPath}`);
        this.memoryManager = createMemoryManager(this.projectRoot, this._rulebookConfig.memory);
      } catch {
        // Memory init failures are non-fatal
      }
    }

    this._initialized = true;
    this.touch();
  }

  /** Gracefully shut down all managers and release resources. */
  async shutdown(): Promise<void> {
    if (this.bgIndexer) {
      this.bgIndexer.stop();
      this.bgIndexer = null;
    }
    if (this.memoryManager) {
      await this.memoryManager.close();
      this.memoryManager = null;
    }
    this._initialized = false;
  }

  /** Returns the TaskManager for this project. Throws if not initialized. */
  getTaskManager(): TaskManager {
    this.touch();
    if (!this.taskManager) throw new Error(`Worker ${this.projectId} not initialized`);
    return this.taskManager;
  }

  /** Returns the MemoryManager, or null if memory is disabled. */
  getMemoryManager(): typeof this.memoryManager {
    this.touch();
    return this.memoryManager;
  }

  /** Returns the SkillsManager for this project. Throws if not initialized. */
  getSkillsManager(): SkillsManager {
    this.touch();
    if (!this.skillsManager) throw new Error(`Worker ${this.projectId} not initialized`);
    return this.skillsManager;
  }

  /** Returns the ConfigManager for this project. Throws if not initialized. */
  getConfigManager(): ConfigManager {
    this.touch();
    if (!this.configManager) throw new Error(`Worker ${this.projectId} not initialized`);
    return this.configManager;
  }

  /** Returns the loaded RulebookConfig, or null if not initialized. */
  getRulebookConfig(): RulebookConfig | null {
    return this._rulebookConfig;
  }
}
