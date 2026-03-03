import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { basename, join } from 'path';

/** Read the last assistant text and tool call count from a subagent JSONL file */
function readAgentActivity(jsonlPath: string): { text: string | null; timestamp: string | null; toolCallCount: number } {
    const result = { text: null as string | null, timestamp: null as string | null, toolCallCount: 0 };
    try {
        const content = readFileSync(jsonlPath, { encoding: 'utf-8' });
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
            try {
                const d = JSON.parse(line);
                const msg = d?.message;
                if (!msg) continue;
                if (msg.role === 'assistant') {
                    const blocks: any[] = Array.isArray(msg.content) ? msg.content : [];
                    for (const block of blocks) {
                        if (block?.type === 'tool_use') result.toolCallCount++;
                        if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
                            result.text = block.text.trim().replace(/\s+/g, ' ').slice(0, 200);
                            result.timestamp = d.timestamp ?? null;
                        }
                    }
                }
            } catch { /* skip malformed lines */ }
        }
    } catch { /* file unreadable */ }
    return result;
}

export interface AgentMember {
    name: string;
    agentType: string;
    currentTask: string | null;
    taskStatus: string | null;
    /** Last assistant text snippet from the agent's JSONL transcript (max 200 chars) */
    lastActivity: string | null;
    /** ISO timestamp of the last activity */
    lastActivityAt: string | null;
    /** Number of tool calls made so far */
    toolCallCount: number;
    /** Agent's joinedAt timestamp (ms) — used to locate the JSONL file */
    joinedAt: number;
}

export interface AgentTeam {
    teamName: string;
    description: string;
    members: AgentMember[];
    createdAt: number;
}

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
    private roots: string[];

    constructor(workspaceRoots: string[]) {
        this.roots = workspaceRoots;
    }

    get primaryRoot(): string {
        return this.roots[0];
    }

    private exec(args: string, cwd?: string): string | null {
        try {
            const result = execSync(`npx --no-install rulebook ${args}`, {
                cwd: cwd || this.primaryRoot,
                timeout: 10000,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            return result.trim();
        } catch {
            return null;
        }
    }

    /** List tasks from ALL workspace folders */
    listTasks(): TaskInfo[] {
        const tasks: TaskInfo[] = [];

        for (const root of this.roots) {
            const tasksDir = join(root, '.rulebook', 'tasks');
            if (!existsSync(tasksDir)) continue;

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
                        for (const line of content.split('\n')) {
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
            } catch { /* ignore */ }
        }

        return tasks;
    }

    /** Get task details (searches all roots) */
    getTaskDetails(taskId: string): string | null {
        for (const root of this.roots) {
            const f = join(root, '.rulebook', 'tasks', taskId, 'tasks.md');
            if (existsSync(f)) return readFileSync(f, 'utf-8');
        }
        return null;
    }

    /** Get Ralph status (aggregated across all roots) */
    getRalphStatus(): RalphStatus {
        const status: RalphStatus = {
            running: false, currentTask: null, iteration: 0, totalTasks: 0, completedTasks: 0,
        };

        for (const root of this.roots) {
            const lockFile = join(root, '.rulebook', 'ralph', 'ralph.lock');
            const stateFile = join(root, '.rulebook', 'ralph', 'state.json');

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
                    status.totalTasks += state.total_tasks || 0;
                    status.completedTasks += state.completed_tasks || 0;
                } catch { /* ignore */ }
            }
        }

        return status;
    }

    /** Get memory stats (aggregated across all roots) */
    getMemoryStats(): MemoryStats {
        const stats: MemoryStats = { totalMemories: 0, dbSizeBytes: 0, types: {} };

        for (const root of this.roots) {
            const dbPath = join(root, '.rulebook', 'memory', 'memory.db');
            if (existsSync(dbPath)) {
                try { stats.dbSizeBytes += statSync(dbPath).size; } catch { /* ignore */ }
            }
        }

        return stats;
    }

    /** Search memories via CLI */
    searchMemory(query: string): MemorySearchResult[] {
        const raw = this.exec(`memory search "${query.replace(/"/g, '\\"')}" --json 2>/dev/null`);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
    }

    /** Get indexer status (checks all roots) */
    getIndexerStatus(): IndexerStatus {
        let hasDb = false;
        for (const root of this.roots) {
            if (existsSync(join(root, '.rulebook', 'memory', 'memory.db'))) hasDb = true;
        }
        return { running: hasDb, queue: 0, processed: 0, errors: 0 };
    }

    /** Normalize a path for cross-platform comparison (lowercase, forward slashes) */
    private normalizePath(p: string): string {
        return p.replace(/\\/g, '/').toLowerCase();
    }

    /** Find the project folder name inside ~/.claude/projects/ that contains a given sessionId directory */
    private findProjectDirForSession(projectsDir: string, sessionId: string): string {
        if (!existsSync(projectsDir)) return '';
        try {
            for (const proj of readdirSync(projectsDir)) {
                const candidate = join(projectsDir, proj, sessionId, 'subagents');
                if (existsSync(candidate)) return proj;
            }
        } catch { /* ignore */ }
        return '';
    }

    /** List active agent teams from ~/.claude/teams/, filtered to current workspace */
    listAgents(): AgentTeam[] {
        const teams: AgentTeam[] = [];
        const teamsDir = join(homedir(), '.claude', 'teams');
        if (!existsSync(teamsDir)) return teams;

        // Normalize workspace roots for comparison
        const normalizedRoots = this.roots.map(r => this.normalizePath(r));

        try {
            const entries = readdirSync(teamsDir);
            for (const entry of entries) {
                const configPath = join(teamsDir, entry, 'config.json');
                if (!existsSync(configPath)) continue;

                try {
                    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

                    // Filter: only show teams whose lead or any member cwd matches this workspace
                    const rawMembers: any[] = config.members || [];
                    const cwds = rawMembers.map((m: any) => this.normalizePath(m.cwd || ''));
                    const belongsToWorkspace = cwds.some(cwd =>
                        normalizedRoots.some(root => cwd.startsWith(root) || root.startsWith(cwd))
                    );
                    if (!belongsToWorkspace) continue;
                    const tasksDir = join(homedir(), '.claude', 'tasks', entry);

                    // Build task lookup: member name → current task info
                    const taskByMember = new Map<string, { desc: string; status: string }>();
                    if (existsSync(tasksDir)) {
                        try {
                            for (const tf of readdirSync(tasksDir).filter(f => f.endsWith('.json'))) {
                                const task = JSON.parse(readFileSync(join(tasksDir, tf), 'utf-8'));
                                if (task.subject && task.status !== 'completed') {
                                    // subject is the member name
                                    taskByMember.set(task.subject, {
                                        desc: (task.description || '').slice(0, 80).replace(/\n/g, ' '),
                                        status: task.status || 'unknown',
                                    });
                                }
                            }
                        } catch { /* ignore */ }
                    }

                    // Find subagent JSONL files in the lead session directory
                    const leadSessionId: string | undefined = config.leadSessionId;
                    const projectsDir = join(homedir(), '.claude', 'projects');
                    const subagentDir = leadSessionId
                        ? join(projectsDir, this.findProjectDirForSession(projectsDir, leadSessionId), leadSessionId, 'subagents')
                        : '';

                    // Build a map: joinedAt(ms) -> JSONL path (sorted by first-line timestamp)
                    const jsonlByJoinedAt = new Map<number, string>();
                    if (subagentDir && existsSync(subagentDir)) {
                        try {
                            const jsonlFiles = readdirSync(subagentDir).filter(f => f.endsWith('.jsonl'));
                            for (const jf of jsonlFiles) {
                                const jfPath = join(subagentDir, jf);
                                try {
                                    const firstLine = readFileSync(jfPath, { encoding: 'utf-8' }).split('\n').find(l => l.trim());
                                    if (firstLine) {
                                        const d = JSON.parse(firstLine);
                                        if (d.timestamp) {
                                            const ms = new Date(d.timestamp).getTime();
                                            if (!isNaN(ms)) jsonlByJoinedAt.set(ms, jfPath);
                                        }
                                    }
                                } catch { /* skip */ }
                            }
                        } catch { /* ignore */ }
                    }

                    const members: AgentMember[] = rawMembers.map((m: any) => {
                        const t = taskByMember.get(m.name);
                        const joinedAt: number = m.joinedAt ?? 0;
                        const jsonlPath = jsonlByJoinedAt.get(joinedAt);
                        const activity = jsonlPath ? readAgentActivity(jsonlPath) : { text: null, timestamp: null, toolCallCount: 0 };
                        return {
                            name: m.name,
                            agentType: m.agentType || '',
                            currentTask: t?.desc ?? null,
                            taskStatus: t?.status ?? null,
                            lastActivity: activity.text,
                            lastActivityAt: activity.timestamp,
                            toolCallCount: activity.toolCallCount,
                            joinedAt,
                        };
                    });

                    teams.push({
                        teamName: config.name || entry,
                        description: config.description || '',
                        members,
                        createdAt: config.createdAt || 0,
                    });
                } catch { /* ignore */ }
            }
        } catch { /* ignore */ }

        // Most recently created team first
        teams.sort((a, b) => b.createdAt - a.createdAt);
        return teams;
    }

    /** Archive a task (finds the right root) */
    archiveTask(taskId: string): boolean {
        for (const root of this.roots) {
            if (existsSync(join(root, '.rulebook', 'tasks', taskId))) {
                return this.exec(`task archive ${taskId}`, root) !== null;
            }
        }
        return false;
    }

    /** Trigger reindex (all roots) */
    async reindexCodebase(): Promise<boolean> {
        let ok = false;
        for (const root of this.roots) {
            const dbPath = join(root, '.rulebook', 'memory', 'memory.db');
            try {
                if (existsSync(dbPath)) {
                    const { unlinkSync } = await import('fs');
                    unlinkSync(dbPath);
                    ok = true;
                }
            } catch { /* ignore */ }
        }
        return ok;
    }

    async clearMemory(): Promise<boolean> {
        return this.reindexCodebase();
    }
}
