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
import { generateMcpReference } from '../src/core/docs/mcp-reference-generator.js';
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
 * - Orchestrator directive (v7.4): the main session delegates every task to a
 *   model-routed subagent, monitors it, and keeps the CHANGELOG.
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

        it('prohibitions forbid OS-level scheduling and point to the application (v7.3)', async () => {
            const prohibitions = await generateCoreRules('prohibitions');
            expect(prohibitions).toMatch(/## 7\. No OS-level scheduling/);
            expect(prohibitions).toMatch(/lives in the application/i);
            for (const term of ['crontab', 'systemd timers', 'launchd', 'schtasks']) {
                expect(prohibitions).toContain(term);
            }

            const claudeMd = await generateClaudeMd(projectRoot);
            expect(claudeMd).toMatch(/No OS schedules .*scheduling lives in the app/i);
            const agentsMd = await generateLeanAgents(config, projectRoot);
            expect(agentsMd).toMatch(/No OS schedules[\s\S]*scheduling lives in the app/i);
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

    describe('orchestrator directive (v7.4)', () => {
        it('CLAUDE.md makes the main session an orchestrator with model routing', async () => {
            const claudeMd = await generateClaudeMd(projectRoot);
            const section = claudeMd.slice(
                claudeMd.indexOf('## Orchestration'),
                claudeMd.indexOf('## Rulebook')
            );

            expect(section).toMatch(/main session never does the work itself/i);
            expect(section).toMatch(/delegate each task to one subagent/i);
            expect(section).toMatch(/model set\s+per call/i);
            expect(section).toMatch(/Fable 5\.1 architecture, hard bugs, review/);
            expect(section).toMatch(/Opus 5\.5 edits, tests, docs/);
            expect(section).toMatch(/never Fable for simple work/);
            expect(section).toMatch(/Haiku 4\.5 research, summaries/);
            expect(section).toMatch(/read reports, not files/i);
            expect(section).toMatch(/archive\s+their task/i);
            expect(section).toMatch(/pause\/restart stalled agents/i);
            expect(section).toContain('CHANGELOG');
            expect(section).toContain('.rulebook/specs/orchestration.md');
            // The v7.0–v7.3 "your call" line must be gone.
            expect(claudeMd).not.toMatch(/Rulebook never blocks or\s+mandates orchestration/);
        });

        it('AGENTS.md (lean) carries the directive and indexes the orchestration spec', async () => {
            const agentsMd = await generateLeanAgents(config, projectRoot);

            expect(agentsMd).toMatch(/main session never does the work itself/i);
            expect(agentsMd).toMatch(/one subagent per task/i);
            expect(agentsMd).toMatch(/read reports, not files/i);
            expect(agentsMd).toMatch(/subagents archive their task/i);
            expect(agentsMd).toMatch(/pause\/restart stalled\s+agents/i);
            expect(agentsMd).toContain('CHANGELOG');
            expect(agentsMd).toContain(
                '- `/.rulebook/specs/orchestration.md` — orchestration & model routing'
            );
            expect(agentsMd).not.toMatch(/orchestration is the model's choice/i);
        });

        it('orchestration spec carries the full protocol and is written to specs/', async () => {
            const spec = await generateCoreRules('orchestration');

            expect(spec.trim().startsWith('<!-- ORCHESTRATION:START -->')).toBe(true);
            expect(spec.trim().endsWith('<!-- ORCHESTRATION:END -->')).toBe(true);
            expect(spec).toMatch(/never executes the work itself/i);
            expect(spec).toMatch(/Delegate every task to a subagent/i);
            expect(spec).toMatch(/\*\*Fable 5\.1\*\* \| Architecture, complex bugs, code review/);
            expect(spec).toMatch(/\*\*Opus 5\.5\*\* \| Edits, tests, documentation, refactoring/);
            expect(spec).toMatch(/\*\*Haiku 4\.5\*\* \| Research, summaries/);
            expect(spec).toMatch(/Never use Fable for simple work/);
            expect(spec).toMatch(/Specify the model in every agent call/);
            expect(spec).toMatch(/One subagent per task/);
            expect(spec).toMatch(/Run independent subagents in parallel/);
            expect(spec).toMatch(/Read the subagent's report, never the files/);
            expect(spec).toMatch(/check each `tasks\.md` item as it is completed/);
            expect(spec).toMatch(/type-check → lint → tests/);
            expect(spec).toContain('rulebook_task {action:"archive"}');
            expect(spec).toMatch(/Pause or restart an agent that stalls/);
            expect(spec).toMatch(/TaskStop.*SendMessage/s);
            expect(spec).toMatch(/Updates `CHANGELOG\.md`/);
            // Small fixes are delegated too, but without the rulebook task cycle.
            expect(spec).toMatch(/including small ones/);
            expect(spec).toMatch(/small fix goes\s+out as a brief and comes back as a report/i);
            expect(spec).toMatch(
                /When the work has a rulebook task \(multi-session or multi-phase/
            );

            // generateModularAgents (via the lean generator) writes it unconditionally.
            await generateLeanAgents({ ...config, lightMode: true }, projectRoot);
            const written = await fs.readFile(
                path.join(projectRoot, '.rulebook', 'specs', 'orchestration.md'),
                'utf-8'
            );
            expect(written).toBe(spec.trim());
        });

        it('MCP tool reference defers to the CLAUDE.md Orchestration section', async () => {
            await fs.writeFile(
                path.join(projectRoot, '.mcp.json'),
                JSON.stringify({ mcpServers: { rulebook: { command: 'rulebook' } } })
            );
            const result = await generateMcpReference(projectRoot);
            expect(result.written).toBe(true);

            const ref = await fs.readFile(result.path, 'utf-8');
            expect(ref).toMatch(/delegated per the\s+Orchestration section of CLAUDE\.md/);
            expect(ref).not.toMatch(/your call/i);
            expect(ref).toContain('| `mcp__rulebook__*` | `.mcp.json` |');
        });
    });
});
