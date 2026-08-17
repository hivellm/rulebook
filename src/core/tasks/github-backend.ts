import { execFile } from 'child_process';
import { promisify } from 'util';
import {
    renderProposalTemplate,
    renderTasksTemplate,
    validateLoadedTask,
    type RulebookTask,
    type TaskValidationResult,
} from './task-manager.js';
import {
    DEFAULT_TASK_LABEL,
    STATUS_LABEL_PREFIX,
    type GitHubBackendOptions,
    type TaskBackend,
} from './task-backend.js';

const execFileAsync = promisify(execFile);

/**
 * GitHub-issues task backend.
 *
 * Each task is one labelled issue. The task's files live as marked sections of
 * the issue body, so the whole task travels with the issue and nothing is
 * written under `.rulebook/tasks/`. That is the point: parallel agents (and
 * agents on different machines) share one store instead of conflicting on files
 * in a worktree, and the task list is visible in the GitHub UI for free.
 *
 * Mapping:
 * - `proposal.md` / `tasks.md` / `design.md` / `specs/<m>/spec.md` → body sections
 * - status pending|in-progress|blocked|completed → `rulebook-status:<status>` label
 * - archive → close the issue (archived tasks are the closed ones)
 *
 * All `gh` calls pass arguments as an array, never through a shell, so task ids
 * and bodies cannot be interpreted as shell syntax.
 */
export class GitHubTaskBackend implements TaskBackend {
    private readonly repo?: string;
    private readonly label: string;

    constructor(options: GitHubBackendOptions = {}) {
        this.repo = options.repo;
        this.label = options.label || DEFAULT_TASK_LABEL;
    }

    // ── gh plumbing ──────────────────────────────────────────────────────

    private async gh(args: string[]): Promise<string> {
        const full = this.repo ? [...args, '--repo', this.repo] : args;
        try {
            const { stdout } = await execFileAsync('gh', full, {
                maxBuffer: 10 * 1024 * 1024,
                windowsHide: true,
            });
            return stdout;
        } catch (error) {
            const err = error as { code?: string; stderr?: string; message?: string };
            if (err.code === 'ENOENT') {
                throw new Error(
                    'GitHub task backend requires the `gh` CLI on PATH. Install it (https://cli.github.com) or set tasks.backend to "files".'
                );
            }
            const detail = (err.stderr || err.message || '').trim();
            throw new Error(`gh ${args.join(' ')} failed: ${detail}`);
        }
    }

    /** Verify `gh` is present and authenticated. Called once per initialize(). */
    async initialize(): Promise<void> {
        try {
            await execFileAsync('gh', ['auth', 'status'], { windowsHide: true });
        } catch (error) {
            const err = error as { code?: string; stderr?: string };
            if (err.code === 'ENOENT') {
                throw new Error(
                    'GitHub task backend requires the `gh` CLI on PATH. Install it (https://cli.github.com) or set tasks.backend to "files".'
                );
            }
            throw new Error(
                'GitHub task backend requires an authenticated `gh`. Run `gh auth login`, or set tasks.backend to "files".'
            );
        }
    }

    // ── body encoding ────────────────────────────────────────────────────

    private static section(name: string, content: string): string {
        return `<!-- rulebook:${name} -->\n${content.trim()}\n<!-- /rulebook:${name} -->`;
    }

    private static readSection(body: string, name: string): string | undefined {
        // Escape the name so a spec module like `a.b` cannot act as a pattern.
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = body.match(
            new RegExp(
                `<!-- rulebook:${escaped} -->\\n?([\\s\\S]*?)\\n?<!-- /rulebook:${escaped} -->`
            )
        );
        return match ? match[1] : undefined;
    }

    static encodeBody(task: Partial<RulebookTask>): string {
        const parts: string[] = [];
        if (task.proposal) parts.push(GitHubTaskBackend.section('proposal', task.proposal));
        if (task.tasks) parts.push(GitHubTaskBackend.section('tasks', task.tasks));
        if (task.design) parts.push(GitHubTaskBackend.section('design', task.design));
        for (const [module, spec] of Object.entries(task.specs ?? {})) {
            parts.push(GitHubTaskBackend.section(`spec:${module}`, spec));
        }
        return parts.join('\n\n') + '\n';
    }

    static decodeBody(body: string): Pick<RulebookTask, 'proposal' | 'tasks' | 'design' | 'specs'> {
        const specs: Record<string, string> = {};
        for (const match of body.matchAll(/<!-- rulebook:spec:([^\s]+?) -->/g)) {
            const module = match[1];
            const content = GitHubTaskBackend.readSection(body, `spec:${module}`);
            if (content !== undefined) specs[module] = content;
        }
        return {
            proposal: GitHubTaskBackend.readSection(body, 'proposal'),
            tasks: GitHubTaskBackend.readSection(body, 'tasks'),
            design: GitHubTaskBackend.readSection(body, 'design'),
            specs,
        };
    }

    // ── issue lookup ─────────────────────────────────────────────────────

    private async listIssues(state: 'open' | 'closed' | 'all'): Promise<GhIssue[]> {
        const stdout = await this.gh([
            'issue',
            'list',
            '--label',
            this.label,
            '--state',
            state,
            '--limit',
            '500',
            '--json',
            'number,title,body,state,labels,createdAt,updatedAt,closedAt',
        ]);
        try {
            return JSON.parse(stdout || '[]') as GhIssue[];
        } catch {
            throw new Error(`gh issue list returned invalid JSON: ${stdout.slice(0, 200)}`);
        }
    }

    private async findIssue(taskId: string): Promise<GhIssue | undefined> {
        const issues = await this.listIssues('all');
        return issues.find((i) => i.title === taskId);
    }

    private static statusOf(issue: GhIssue): RulebookTask['status'] {
        const label = issue.labels?.find((l) => l.name.startsWith(STATUS_LABEL_PREFIX));
        const value = label?.name.slice(STATUS_LABEL_PREFIX.length);
        if (value === 'in-progress' || value === 'completed' || value === 'blocked') return value;
        // A closed issue with no status label is a completed task.
        return issue.state?.toUpperCase() === 'CLOSED' ? 'completed' : 'pending';
    }

    private static toTask(issue: GhIssue): RulebookTask {
        const decoded = GitHubTaskBackend.decodeBody(issue.body || '');
        const task: RulebookTask = {
            id: issue.title,
            title: issue.title,
            status: GitHubTaskBackend.statusOf(issue),
            createdAt: issue.createdAt || new Date().toISOString(),
            updatedAt: issue.updatedAt || new Date().toISOString(),
            ...decoded,
        };
        if (issue.closedAt) task.archivedAt = issue.closedAt.split('T')[0];
        return task;
    }

    // ── TaskBackend ──────────────────────────────────────────────────────

    validateTaskId(taskId: string): { valid: boolean; error?: string } {
        if (!/^phase\d+[a-z]?_/.test(taskId)) {
            return {
                valid: false,
                error: `Task ID "${taskId}" must start with a phase prefix (e.g., phase0_, phase1_, phase2a_). Example: phase1_add-user-auth`,
            };
        }
        return { valid: true };
    }

    extractPhase(taskId: string): { phase: number; subletter: string } {
        const match = taskId.match(/^phase(\d+)([a-z])?_/);
        if (!match) return { phase: Infinity, subletter: '' };
        return { phase: parseInt(match[1], 10), subletter: match[2] || '' };
    }

    async createTask(taskId: string): Promise<void> {
        const nameValidation = this.validateTaskId(taskId);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }

        if (await this.findIssue(taskId)) {
            throw new Error(`Task ${taskId} already exists`);
        }

        const body = GitHubTaskBackend.encodeBody({
            proposal: renderProposalTemplate(taskId),
            tasks: renderTasksTemplate(),
        });

        await this.gh([
            'issue',
            'create',
            '--title',
            taskId,
            '--body',
            body,
            '--label',
            this.label,
            '--label',
            `${STATUS_LABEL_PREFIX}pending`,
        ]);
    }

    async listTasks(includeArchived: boolean = false): Promise<RulebookTask[]> {
        const issues = await this.listIssues(includeArchived ? 'all' : 'open');
        return issues.map((i) => GitHubTaskBackend.toTask(i));
    }

    async loadTask(taskId: string): Promise<RulebookTask | null> {
        const issue = await this.findIssue(taskId);
        return issue ? GitHubTaskBackend.toTask(issue) : null;
    }

    async showTask(taskId: string): Promise<RulebookTask | null> {
        return this.loadTask(taskId);
    }

    async validateTask(taskId: string): Promise<TaskValidationResult> {
        return validateLoadedTask(await this.loadTask(taskId), taskId);
    }

    async updateTaskStatus(taskId: string, status: RulebookTask['status']): Promise<void> {
        const issue = await this.findIssue(taskId);
        if (!issue) throw new Error(`Task ${taskId} not found`);

        const args = [
            'issue',
            'edit',
            String(issue.number),
            '--add-label',
            `${STATUS_LABEL_PREFIX}${status}`,
        ];
        for (const existing of issue.labels ?? []) {
            if (
                existing.name.startsWith(STATUS_LABEL_PREFIX) &&
                existing.name !== `${STATUS_LABEL_PREFIX}${status}`
            ) {
                args.push('--remove-label', existing.name);
            }
        }
        await this.gh(args);
    }

    /**
     * Archive = close the issue. Validation matches the file backend, including
     * the tail waiver: the rationale is appended to the issue body so it stays
     * as auditable as the archived tasks.md is on disk.
     */
    async archiveTask(
        taskId: string,
        skipValidation: boolean = false,
        tailWaiver?: string
    ): Promise<void> {
        const issue = await this.findIssue(taskId);
        if (!issue) throw new Error(`Task ${taskId} not found`);

        if (!skipValidation) {
            const validation = validateLoadedTask(GitHubTaskBackend.toTask(issue), taskId);
            if (!validation.valid) {
                throw new Error(`Task validation failed:\n${validation.errors.join('\n')}`);
            }
            const tailWarning = validation.warnings.find((w) =>
                w.startsWith('Task tail items unchecked')
            );
            if (tailWarning && !tailWaiver) {
                throw new Error(
                    `${tailWarning}\nPass tailWaiver (one line on why the tail does not apply) to archive anyway.`
                );
            }
            if (tailWarning && tailWaiver) {
                const waived = `${issue.body || ''}\n\n<!-- tail-waiver: ${tailWaiver.replace(/-->/g, '')} -->\n`;
                try {
                    await this.gh(['issue', 'edit', String(issue.number), '--body', waived]);
                } catch {
                    // waiver recording is best-effort, exactly as on the file side
                }
            }
        }

        await this.gh(['issue', 'close', String(issue.number)]);
    }

    async deleteTask(taskId: string): Promise<void> {
        const issue = await this.findIssue(taskId);
        if (!issue) throw new Error(`Task ${taskId} not found`);
        await this.gh(['issue', 'delete', String(issue.number), '--yes']);
    }

    async getTaskMetadata(taskId: string): Promise<Record<string, unknown> | null> {
        const issue = await this.findIssue(taskId);
        if (!issue) return null;
        return {
            status: GitHubTaskBackend.statusOf(issue),
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            issue: issue.number,
        };
    }

    /**
     * No-op: GitHub renders the task list itself, so there is no README index to
     * regenerate. Present because the file backend has one and callers call it
     * unconditionally.
     */
    async updateReadme(): Promise<void> {
        return;
    }
}

interface GhIssue {
    number: number;
    title: string;
    body?: string;
    state?: string;
    labels?: Array<{ name: string }>;
    createdAt?: string;
    updatedAt?: string;
    closedAt?: string | null;
}

export function createGitHubTaskBackend(options: GitHubBackendOptions = {}): GitHubTaskBackend {
    return new GitHubTaskBackend(options);
}
