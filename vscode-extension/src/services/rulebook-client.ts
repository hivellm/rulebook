import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { basename, join } from 'path';

// better-sqlite3 is a native module — require at runtime with graceful fallback
// eslint-disable-next-line @typescript-eslint/no-var-requires
let Database: any;
try { Database = require('better-sqlite3'); } catch { Database = null; }

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

    /** Get memory stats (aggregated across all roots) */
    getMemoryStats(): MemoryStats {
        const stats: MemoryStats = { totalMemories: 0, dbSizeBytes: 0, types: {} };

        for (const root of this.roots) {
            const dbPath = join(root, '.rulebook', 'memory', 'memory.db');
            if (!existsSync(dbPath)) continue;

            try { stats.dbSizeBytes += statSync(dbPath).size; } catch { /* ignore */ }

            if (!Database) continue;
            let db: any;
            try {
                db = new Database(dbPath, { readonly: true, fileMustExist: true });
                const countRow = db.prepare('SELECT COUNT(*) as count FROM memories').get() as { count: number } | undefined;
                if (countRow) stats.totalMemories += countRow.count;

                const typeRows = db.prepare('SELECT type, COUNT(*) as count FROM memories GROUP BY type').all() as Array<{ type: string; count: number }>;
                for (const row of typeRows) {
                    stats.types[row.type] = (stats.types[row.type] || 0) + row.count;
                }
            } catch { /* DB may be locked or schema differs */ }
            finally {
                try { db?.close(); } catch { /* ignore */ }
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

    /** List analyses from docs/analysis/<slug>/manifest.json across all roots */
    listAnalyses(): Array<{ slug: string; topic: string; createdAt: string }> {
        const results: Array<{ slug: string; topic: string; createdAt: string }> = [];

        for (const root of this.roots) {
            const analysisDir = join(root, 'docs', 'analysis');
            if (!existsSync(analysisDir)) continue;

            try {
                const entries = readdirSync(analysisDir);
                for (const entry of entries) {
                    const manifestPath = join(analysisDir, entry, 'manifest.json');
                    if (!existsSync(manifestPath)) continue;
                    try {
                        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
                        results.push({
                            slug: entry,
                            topic: manifest.topic || entry,
                            createdAt: manifest.createdAt || '',
                        });
                    } catch { /* skip malformed manifest */ }
                }
            } catch { /* ignore */ }
        }

        return results;
    }

    /** Run inline doctor checks without shelling out to the CLI */
    runDoctor(): { checks: Array<{ name: string; status: string; message: string }>; passCount: number; warnCount: number; failCount: number } {
        const checks: Array<{ name: string; status: string; message: string }> = [];

        for (const root of this.roots) {
            // Check CLAUDE.md line count
            const claudeMd = join(root, 'CLAUDE.md');
            if (existsSync(claudeMd)) {
                try {
                    const lines = readFileSync(claudeMd, 'utf-8').split('\n').length;
                    if (lines > 500) {
                        checks.push({ name: 'CLAUDE.md size', status: 'warn', message: `${lines} lines — consider trimming (>500)` });
                    } else {
                        checks.push({ name: 'CLAUDE.md size', status: 'pass', message: `${lines} lines` });
                    }
                } catch {
                    checks.push({ name: 'CLAUDE.md size', status: 'fail', message: 'Cannot read CLAUDE.md' });
                }
            } else {
                checks.push({ name: 'CLAUDE.md', status: 'warn', message: 'CLAUDE.md not found' });
            }

            // Check required files
            const requiredFiles = ['CLAUDE.md', '.rulebook'];
            for (const file of requiredFiles) {
                const filePath = join(root, file);
                if (existsSync(filePath)) {
                    checks.push({ name: `Required: ${file}`, status: 'pass', message: 'Present' });
                } else {
                    checks.push({ name: `Required: ${file}`, status: 'fail', message: `Missing: ${file}` });
                }
            }

            // Check @imports in CLAUDE.md
            if (existsSync(claudeMd)) {
                try {
                    const content = readFileSync(claudeMd, 'utf-8');
                    const imports = content.match(/@import\s+(.+)/g) || [];
                    let allImportsExist = true;
                    for (const imp of imports) {
                        const importPath = imp.replace(/@import\s+/, '').trim();
                        const fullPath = join(root, importPath);
                        if (!existsSync(fullPath)) {
                            checks.push({ name: `@import ${importPath}`, status: 'fail', message: 'Referenced file not found' });
                            allImportsExist = false;
                        }
                    }
                    if (imports.length > 0 && allImportsExist) {
                        checks.push({ name: '@imports', status: 'pass', message: `${imports.length} imports all resolve` });
                    }
                } catch { /* ignore */ }
            }

            // Check STATE.md staleness (warn if older than 7 days)
            const stateMd = join(root, '.rulebook', 'STATE.md');
            if (existsSync(stateMd)) {
                try {
                    const mtime = statSync(stateMd).mtimeMs;
                    const ageDays = (Date.now() - mtime) / (1000 * 60 * 60 * 24);
                    if (ageDays > 7) {
                        checks.push({ name: 'STATE.md staleness', status: 'warn', message: `Last updated ${ageDays.toFixed(0)} days ago` });
                    } else {
                        checks.push({ name: 'STATE.md staleness', status: 'pass', message: `Updated ${ageDays.toFixed(0)} days ago` });
                    }
                } catch {
                    checks.push({ name: 'STATE.md staleness', status: 'warn', message: 'Cannot stat STATE.md' });
                }
            } else {
                checks.push({ name: 'STATE.md', status: 'warn', message: 'STATE.md not found in .rulebook/' });
            }
        }

        const passCount = checks.filter(c => c.status === 'pass').length;
        const warnCount = checks.filter(c => c.status === 'warn').length;
        const failCount = checks.filter(c => c.status === 'fail').length;
        return { checks, passCount, warnCount, failCount };
    }

    /** Get context usage estimate from the most recent Claude Code JSONL transcript */
    getContextUsage(): { pct: number; transcriptBytes: number } {
        const projectsDir = join(homedir(), '.claude', 'projects');
        if (!existsSync(projectsDir)) return { pct: 0, transcriptBytes: 0 };

        let latestMtime = 0;
        let latestSize = 0;

        try {
            const projects = readdirSync(projectsDir);
            for (const project of projects) {
                const projectPath = join(projectsDir, project);
                try {
                    const sessions = readdirSync(projectPath);
                    for (const session of sessions) {
                        const sessionPath = join(projectPath, session);
                        try {
                            const files = readdirSync(sessionPath).filter(f => f.endsWith('.jsonl'));
                            for (const file of files) {
                                const filePath = join(sessionPath, file);
                                try {
                                    const st = statSync(filePath);
                                    if (st.mtimeMs > latestMtime) {
                                        latestMtime = st.mtimeMs;
                                        latestSize = st.size;
                                    }
                                } catch { /* skip */ }
                            }
                        } catch { /* skip */ }
                    }
                } catch { /* skip */ }
            }
        } catch { /* ignore */ }

        const pct = Math.min(100, Math.floor(latestSize * 100 / 800000));
        return { pct, transcriptBytes: latestSize };
    }

    /** Read telemetry stats from .rulebook/telemetry/*.ndjson across all roots */
    getTelemetryStats(): { totalCalls: number; tools: Record<string, { calls: number; avgLatencyMs: number; errorRate: number }> } {
        const toolMap: Record<string, { calls: number; totalLatencyMs: number; errors: number }> = {};
        let totalCalls = 0;

        for (const root of this.roots) {
            const telemetryDir = join(root, '.rulebook', 'telemetry');
            if (!existsSync(telemetryDir)) continue;

            try {
                const files = readdirSync(telemetryDir).filter(f => f.endsWith('.ndjson'));
                for (const file of files) {
                    const filePath = join(telemetryDir, file);
                    try {
                        const lines = readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim());
                        for (const line of lines) {
                            try {
                                const entry = JSON.parse(line);
                                const toolName: string = entry.tool || entry.name || 'unknown';
                                const latencyMs: number = entry.latencyMs || entry.duration_ms || 0;
                                const isError: boolean = entry.error === true || entry.status === 'error';

                                if (!toolMap[toolName]) {
                                    toolMap[toolName] = { calls: 0, totalLatencyMs: 0, errors: 0 };
                                }
                                toolMap[toolName].calls++;
                                toolMap[toolName].totalLatencyMs += latencyMs;
                                if (isError) toolMap[toolName].errors++;
                                totalCalls++;
                            } catch { /* skip malformed lines */ }
                        }
                    } catch { /* skip unreadable files */ }
                }
            } catch { /* ignore */ }
        }

        const tools: Record<string, { calls: number; avgLatencyMs: number; errorRate: number }> = {};
        for (const [name, data] of Object.entries(toolMap)) {
            tools[name] = {
                calls: data.calls,
                avgLatencyMs: data.calls > 0 ? Math.round(data.totalLatencyMs / data.calls) : 0,
                errorRate: data.calls > 0 ? data.errors / data.calls : 0,
            };
        }

        return { totalCalls, tools };
    }
}
