import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface TaskInfo {
    id: string;
    status: 'active' | 'completed' | 'archived';
    hasProposal: boolean;
    taskCount: number;
    completedCount: number;
}

export interface MemoryStats {
    totalMemories: number;
    dbSizeBytes: number;
    types: Record<string, number>;
}

export interface IndexerStatus {
    running: boolean;
    queue: number;
    processed: number;
    errors: number;
}

export interface RalphStatus {
    running: boolean;
    currentTask: string | null;
    iteration: number;
    totalTasks: number;
    completedTasks: number;
}

export interface MemorySearchResult {
    id: string;
    title: string;
    type: string;
    score: number;
}

export class RulebookClient {
    constructor(private workspaceRoot: string) { }

    /**
     * Run a rulebook CLI command and return parsed JSON, or null on failure
     */
    private exec(args: string): string | null {
        try {
            const result = execSync(`npx --no-install rulebook ${args}`, {
                cwd: this.workspaceRoot,
                timeout: 10000,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            return result.trim();
        } catch {
            return null;
        }
    }

    private execJson<T>(args: string): T | null {
        const raw = this.exec(args);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    /**
     * List tasks by reading the filesystem directly (faster than CLI)
     */
    listTasks(): TaskInfo[] {
        const tasksDir = join(this.workspaceRoot, '.rulebook', 'tasks');
        if (!existsSync(tasksDir)) return [];

        const tasks: TaskInfo[] = [];

        try {
            const entries = readdirSync(tasksDir);
            for (const entry of entries) {
                if (entry === 'archive') continue;
                const taskPath = join(tasksDir, entry);
                if (!statSync(taskPath).isDirectory()) continue;

                const tasksFile = join(taskPath, 'tasks.md');
                let taskCount = 0;
                let completedCount = 0;

                if (existsSync(tasksFile)) {
                    const content = readFileSync(tasksFile, 'utf-8');
                    const lines = content.split('\n');
                    for (const line of lines) {
                        if (line.match(/- \[[ x/]\]/)) {
                            taskCount++;
                            if (line.includes('[x]')) completedCount++;
                        }
                    }
                }

                tasks.push({
                    id: entry,
                    status: completedCount === taskCount && taskCount > 0 ? 'completed' : 'active',
                    hasProposal: existsSync(join(taskPath, 'proposal.md')),
                    taskCount,
                    completedCount,
                });
            }
        } catch {
            // Ignore errors
        }

        return tasks;
    }

    /**
     * Get task details
     */
    getTaskDetails(taskId: string): string | null {
        const tasksFile = join(this.workspaceRoot, '.rulebook', 'tasks', taskId, 'tasks.md');
        if (!existsSync(tasksFile)) return null;
        return readFileSync(tasksFile, 'utf-8');
    }

    /**
     * Get Ralph status from filesystem
     */
    getRalphStatus(): RalphStatus {
        const ralphDir = join(this.workspaceRoot, '.rulebook', 'ralph');
        const lockFile = join(ralphDir, 'ralph.lock');
        const stateFile = join(ralphDir, 'state.json');

        const status: RalphStatus = {
            running: false,
            currentTask: null,
            iteration: 0,
            totalTasks: 0,
            completedTasks: 0,
        };

        if (existsSync(lockFile)) {
            status.running = true;
            try {
                const lock = JSON.parse(readFileSync(lockFile, 'utf-8'));
                status.currentTask = lock.taskId || null;
                status.iteration = lock.iteration || 0;
            } catch { /* ignore */ }
        }

        if (existsSync(stateFile)) {
            try {
                const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
                status.totalTasks = state.total_tasks || 0;
                status.completedTasks = state.completed_tasks || 0;
            } catch { /* ignore */ }
        }

        return status;
    }

    /**
     * Get memory stats from filesystem
     */
    getMemoryStats(): MemoryStats {
        const dbPath = join(this.workspaceRoot, '.rulebook', 'memory', 'memory.db');
        const stats: MemoryStats = {
            totalMemories: 0,
            dbSizeBytes: 0,
            types: {},
        };

        if (existsSync(dbPath)) {
            try {
                stats.dbSizeBytes = statSync(dbPath).size;
            } catch { /* ignore */ }
        }

        // For detailed stats we'd need to query SQLite — use CLI
        const raw = this.exec('memory stats --json 2>/dev/null');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                stats.totalMemories = parsed.count || 0;
                stats.types = parsed.types || {};
            } catch { /* ignore */ }
        }

        return stats;
    }

    /**
     * Search memories via CLI
     */
    searchMemory(query: string): MemorySearchResult[] {
        const raw = this.exec(`memory search "${query.replace(/"/g, '\\"')}" --json 2>/dev/null`);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    /**
     * Get indexer status (from memory DB status)
     */
    getIndexerStatus(): IndexerStatus {
        const dbPath = join(this.workspaceRoot, '.rulebook', 'memory', 'memory.db');
        return {
            running: existsSync(dbPath),
            queue: 0,
            processed: 0,
            errors: 0,
        };
    }

    /**
     * Trigger reindex
     */
    async reindexCodebase(): Promise<boolean> {
        // Delete the memory DB to force full reindex on next MCP server start
        const dbPath = join(this.workspaceRoot, '.rulebook', 'memory', 'memory.db');
        try {
            if (existsSync(dbPath)) {
                const { unlinkSync } = await import('fs');
                unlinkSync(dbPath);
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clear memory
     */
    async clearMemory(): Promise<boolean> {
        return this.reindexCodebase(); // Same effect — delete DB
    }
}
