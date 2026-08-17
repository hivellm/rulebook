import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateClaudeMd } from '../src/core/claude/claude-md-generator.js';
import {
    generateLeanAgents,
    generateGitRules,
    generateCoreRules,
} from '../src/core/generators/generator.js';
import type { ProjectConfig } from '../src/types.js';

/**
 * Directive guards.
 *
 * These assert that specific safety and style clauses survive from the
 * templates into generated output. A template edit that drops one of them is
 * silent otherwise — the generators keep working and the rule just disappears
 * from every project that runs `rulebook update`.
 *
 * - Worktree / `.git` clauses (phase12): a consumer repo lost its `.git`
 *   because rulebook blessed `git worktree` with no placement or teardown
 *   rules attached.
 * - Communication clauses (phase13): plain wording and short answers.
 */

const config: ProjectConfig = {
    languages: ['typescript'],
    modules: [],
    projectType: 'application',
    coverageThreshold: 75,
    strictDocs: true,
    generateWorkflows: false,
    agentsMode: 'lean',
};

describe('directive guards', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-directives-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    describe('worktree and .git safety (phase12)', () => {
        it('CLAUDE.md keeps worktrees outside the repo tree and bans rm -rf / .git deletion', async () => {
            const claudeMd = await generateClaudeMd(projectRoot);

            expect(claudeMd).toMatch(/worktrees live outside the repo tree/i);
            expect(claudeMd).toContain('git worktree remove');
            expect(claudeMd).toMatch(/never `rm -rf` a worktree/i);
            expect(claudeMd).toMatch(/never delete or move a `\.git`/i);
        });

        it('AGENTS.md (lean) carries the same clause for non-Claude tools', async () => {
            const agentsMd = await generateLeanAgents(config, projectRoot);

            expect(agentsMd).toMatch(/never delete or move a `\.git`/i);
            expect(agentsMd).toContain('git worktree remove');
            expect(agentsMd).toMatch(/never `rm -rf`/i);
        });

        it('git spec documents placement, removal, and that the danger is the cleanup step', async () => {
            const gitRules = await generateGitRules('manual');

            expect(gitRules).toContain('## Worktrees');
            expect(gitRules).toContain('git worktree add ../<repo>-wt-<name>');
            expect(gitRules).toContain('git worktree prune');
            expect(gitRules).toMatch(/never.*`rm -rf` a worktree path/is);
            // The reproduced fact: `add` is safe, cleanup is what destroys.
            expect(gitRules).toMatch(/destruction is always in the cleanup step/i);
        });

        it('git spec forbids recursive deletes of computed paths and .git destruction', async () => {
            const gitRules = await generateGitRules('manual');

            expect(gitRules).toMatch(/`rm -rf` on a computed\/variable path/i);
            expect(gitRules).toMatch(/deleting, moving, or overwriting `\.git`/i);
        });

        it('prohibitions scope worktree autonomy to create/use and keep teardown under #3', async () => {
            const prohibitions = await generateCoreRules('prohibitions');

            // The blessing must no longer be unqualified.
            expect(prohibitions).not.toMatch(/and `git worktree` for parallel work\./);
            expect(prohibitions).toMatch(/OUTSIDE the repository tree/i);
            expect(prohibitions).toMatch(/tearing one down\s+is a deletion and stays under #3/i);
            expect(prohibitions).toMatch(/`\.git` directory is forbidden\s+outright/i);
        });
    });

    describe('task tracking line (phase11)', () => {
        it('names the MCP tool in the default file backend', async () => {
            const claudeMd = await generateClaudeMd(projectRoot);

            expect(claudeMd).toContain('track via the `rulebook` MCP (`rulebook_task`)');
            // The placeholder must always be substituted, never shipped raw.
            expect(claudeMd).not.toContain('TASK_TRACKING_LINE');
        });

        it('names GitHub issues and the label when the project is in github mode', async () => {
            await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
            await fs.writeFile(
                path.join(projectRoot, '.rulebook', 'rulebook.json'),
                JSON.stringify({ tasks: { backend: 'github', label: 'my-tasks' } })
            );

            const claudeMd = await generateClaudeMd(projectRoot);

            expect(claudeMd).toContain('tracked as GitHub issues (label `my-tasks`)');
            expect(claudeMd).not.toContain('TASK_TRACKING_LINE');
        });

        it('falls back to the default label when github mode names none', async () => {
            await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
            await fs.writeFile(
                path.join(projectRoot, '.rulebook', 'rulebook.json'),
                JSON.stringify({ tasks: { backend: 'github' } })
            );

            expect(await generateClaudeMd(projectRoot)).toContain('label `rulebook-task`');
        });
    });

    describe('communication style (phase13)', () => {
        it('CLAUDE.md carries the plain-language section', async () => {
            const claudeMd = await generateClaudeMd(projectRoot);

            expect(claudeMd).toContain('## Communication');
            expect(claudeMd).toMatch(/plain words over jargon/i);
            expect(claudeMd).toMatch(/answer first, reasoning after/i);
            expect(claudeMd).toMatch(/length follows\s+the result, not the effort/i);
        });

        it('AGENTS.md (lean) carries the same rule for non-Claude tools', async () => {
            const agentsMd = await generateLeanAgents(config, projectRoot);

            expect(agentsMd).toMatch(/answers are plain and short/i);
            expect(agentsMd).toMatch(/plain words over jargon/i);
        });
    });
});
