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
 * - Orchestration directive (v7.5): judgment by default — small, local work in
 *   the main session, delegation when it pays — and the v7.4 orchestrator
 *   protocol as an explicit opt-in; model routing per call in both.
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

    describe('orchestration directive (v7.5: judgment by default, orchestrator opt-in)', () => {
        const section = (claudeMd: string) =>
            claudeMd.slice(claudeMd.indexOf('## Orchestration'), claudeMd.indexOf('## Rulebook'));

        async function useOrchestrator(): Promise<void> {
            await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
            await fs.writeFile(
                path.join(projectRoot, '.rulebook', 'rulebook.json'),
                JSON.stringify({ orchestration: 'orchestrator' })
            );
        }

        it('CLAUDE.md (judgment) gives visible criteria, reasons and model routing', async () => {
            const s = section(await generateClaudeMd(projectRoot));

            expect(s).toMatch(/Do small, local work yourself \(files in context, ~3 or fewer/);
            expect(s).toMatch(/2\+ independent parts with disjoint files \(in parallel\)/);
            expect(s).toMatch(/broad exploration, long work, or past ~150k context/);
            expect(s).toMatch(/for context and parallelism, not speed/);
            expect(s).toMatch(/Brief fully \(files, decisions\)/);
            expect(s).toMatch(/Fable 5\.1 architecture, hard bugs, review/);
            expect(s).toMatch(/Opus 5\.5 edits, tests, docs/);
            expect(s).toMatch(/Haiku 4\.5 research/);
            expect(s).toMatch(/CHANGELOG per PR\/release, not per task/);
            expect(s).toContain('.rulebook/specs/orchestration.md');
            expect(s).not.toMatch(/never does the work itself/i);
            expect(s).not.toMatch(/Rulebook never blocks or\s+mandates orchestration/);
        });

        it('CLAUDE.md (orchestrator) keeps the v7.4 delegation text minus its contradictions', async () => {
            await useOrchestrator();
            const s = section(await generateClaudeMd(projectRoot));

            expect(s).toMatch(/main session never does the work itself/i);
            expect(s).toMatch(/delegate each task to one subagent/i);
            expect(s).toMatch(/model set per call/i);
            expect(s).toMatch(/Fable 5\.1 architecture, hard bugs, review/);
            expect(s).toMatch(/Opus 5\.5 edits, tests, docs, refactors/);
            expect(s).toMatch(/never Fable for simple work/);
            expect(s).toMatch(/Haiku 4\.5 research, summaries/);
            expect(s).toMatch(/read reports, not files/i);
            expect(s).toMatch(/archive their tracked task/i);
            expect(s).toMatch(/pause\/restart stalled agents/i);
            // F-023: the main session's own edits are named; no per-task review.
            expect(s).toMatch(/own edits: CHANGELOG, commits/);
            expect(s).not.toMatch(/review, then update/);
        });

        it('AGENTS.md (lean) carries the mode and indexes the orchestration spec', async () => {
            const judgment = await generateLeanAgents(config, projectRoot);
            expect(judgment).toMatch(/Orchestration by judgment/);
            expect(judgment).toMatch(/small, local work directly/i);
            expect(judgment).toMatch(/context and parallelism, not speed/i);
            expect(judgment).not.toMatch(/never does the work itself/i);
            expect(judgment).toContain(
                '- `/.rulebook/specs/orchestration.md` — orchestration & model routing'
            );

            await useOrchestrator();
            const orchestrator = await generateLeanAgents(config, projectRoot);
            expect(orchestrator).toMatch(/main session never does the work itself/i);
            expect(orchestrator).toMatch(/one subagent per task/i);
            expect(orchestrator).toMatch(/read reports, not files/i);
            expect(orchestrator).toMatch(/subagents archive\s+their tracked task/i);
            expect(orchestrator).toMatch(/pause\/restart stalled agents/i);
            expect(orchestrator).toContain('CHANGELOG');
            expect(orchestrator).not.toMatch(/orchestration is the model's choice/i);
        });

        it('orchestration spec (judgment) explains when to delegate and why', async () => {
            const spec = await generateCoreRules('orchestration');

            expect(spec.trim().startsWith('<!-- ORCHESTRATION:START -->')).toBe(true);
            expect(spec.trim().endsWith('<!-- ORCHESTRATION:END -->')).toBe(true);
            expect(spec).toMatch(/Mode: `judgment` \(the default\)/);
            expect(spec).toMatch(/about 3 or fewer will change/);
            expect(spec).toMatch(
                /2\+ independent parts with disjoint files — run them in parallel/
            );
            expect(spec).toMatch(/a main context past ~150k tokens/);
            expect(spec).toMatch(/it does not make work faster/);
            expect(spec).toMatch(/~20–40k tokens of\s+fresh context/);
            expect(spec).toMatch(/\*\*Fable 5\.1\*\* \| Architecture, complex bugs, code review/);
            expect(spec).toMatch(/\*\*Opus 5\.5\*\* \| Edits, tests, documentation, refactoring/);
            expect(spec).toMatch(/\*\*Haiku 4\.5\*\* \| Research, summaries/);
            expect(spec).toMatch(/Specify the model in every agent call/);
            expect(spec).toMatch(/Prefer a narrow installed agent/);
            expect(spec).toMatch(/check each `tasks\.md` item as it is completed/);
            expect(spec).toContain('rulebook_task {action:"archive"}');
            expect(spec).toMatch(/Pause or restart an agent that stalls/);
            expect(spec).toMatch(/TaskStop.*SendMessage/s);
            expect(spec).toMatch(
                /When the work has a rulebook task \(multi-session or multi-phase/
            );
            expect(spec).not.toMatch(/never executes the work itself/i);
            expect(spec).not.toMatch(/Delegate every task|including small ones/i);
            expect(spec).not.toContain('<!-- orchestration:');

            // generateModularAgents (via the lean generator) writes it unconditionally.
            await generateLeanAgents({ ...config, lightMode: true }, projectRoot);
            const written = await fs.readFile(
                path.join(projectRoot, '.rulebook', 'specs', 'orchestration.md'),
                'utf-8'
            );
            expect(written).toBe(spec.trim());
        });

        it('orchestration spec (orchestrator) keeps the full delegation protocol', async () => {
            const spec = await generateCoreRules('orchestration', 'orchestrator');

            expect(spec).toMatch(/Mode: `orchestrator` \(opt-in/);
            expect(spec).toMatch(/never executes\s+the work itself/i);
            expect(spec).toMatch(/A small fix goes out as a brief and comes\s+back as a report/);
            expect(spec).toMatch(/One subagent per task/);
            expect(spec).toMatch(/Run independent subagents in parallel/);
            expect(spec).toMatch(/Read the subagent's report, never the files/);
            expect(spec).toMatch(/own edits are the close-out/);
            expect(spec).toMatch(/Never finish an abandoned task in the main session/);
            expect(spec).not.toMatch(/including small ones/i);
        });

        it('MCP tool reference defers to the CLAUDE.md Orchestration section', async () => {
            await fs.writeFile(
                path.join(projectRoot, '.mcp.json'),
                JSON.stringify({ mcpServers: { rulebook: { command: 'rulebook' } } })
            );
            const result = await generateMcpReference(projectRoot);
            expect(result.written).toBe(true);

            const ref = await fs.readFile(result.path, 'utf-8');
            expect(ref).toMatch(
                /Who does the work follows the\s+Orchestration section of CLAUDE\.md/
            );
            expect(ref).not.toMatch(/your call/i);
            expect(ref).not.toMatch(/delegated per/i);
            expect(ref).toContain('| `mcp__rulebook__*` | `.mcp.json` |');
        });
    });

    describe('Jev gate is on demand (v7.5)', () => {
        it('CLAUDE.md carries no gate-first or manual-fallback rule', async () => {
            const claudeMd = await generateClaudeMd(projectRoot);
            expect(claudeMd).not.toMatch(/Gate first/);
            expect(claudeMd).not.toMatch(/rulebook_gate/);
        });

        it('orchestration spec documents the gate protocol as section 3', async () => {
            const spec = await generateCoreRules('orchestration');

            expect(spec).toContain('## 3. Jev gate (opt-in, on demand)');
            expect(spec).toMatch(/Nothing here runs by default/);
            expect(spec).toContain('rulebook_gate {prompt, notes?}');
            expect(spec).toMatch(/is an on-demand\s+MCP tool/);
            expect(spec).toMatch(/short\s+project description/);
            for (const id of [
                'kind',
                'needs_task',
                'existing_task',
                'model',
                'agent',
                'skill',
                'parallel',
                'needs_operator_decision',
                'in_project_scope',
                'risk_destructive_git',
                'risk_os_scheduling',
                'risk_secrets',
            ]) {
                expect(spec, id).toContain(`| \`${id}\` |`);
            }
            // Thresholds: choice confidence, yes/no bands, risk flags.
            expect(spec).toMatch(/choice is decided at confidence ≥ 0\.6/);
            expect(spec).toMatch(/true at\s+≥ 0\.7, false at ≤ 0\.3/);
            expect(spec).toMatch(/risk flag is true at ≥ 0\.5\s+and is never undecided/);
            // Follow-on rules — the four post-rules in gate.ts interpretAnswers().
            expect(spec).toMatch(/a small fix\s+needs no task/);
            expect(spec).toMatch(
                /an answer to an open question with an undecided existing task\s+goes to the task that owns the first open question/
            );
            expect(spec).toMatch(/a decided existing task\s+means a task/);
            expect(spec).toMatch(
                /an undecided `model` with a decided `agent` is derived from\s+section 2/
            );
            // Acting on routing, fallback, and call discipline.
            expect(spec).toMatch(/`needsOperatorDecision` — true: ask before acting/);
            expect(spec).toMatch(/an undecided or `unclear` `kind` is not a\s+reason to ask/);
            expect(spec).toContain('{action:"ask"}');
            expect(spec).toMatch(/Tier 1 prohibitions/);
            expect(spec).toMatch(/`available:false`[\s\S]*proceed under this spec/);
            expect(spec).toMatch(/advisory — it never blocks/);
            expect(spec).toMatch(/at most once per operator prompt/);
            expect(spec).toContain('subagents do not call the gate');
            expect(spec).toContain('RULEBOOK_GATE=off');
            // Prompt hook: opt-in, injects routing, one blocking case, fail-open.
            expect(spec).toMatch(/`gate\.promptHook\.enabled: true` in `rulebook\.json`/);
            expect(spec).toMatch(/`\.claude\/hooks\/jev-gate\.sh\s+prompt`/);
            expect(spec).toMatch(/act on that\s+routing and do not call the gate again/);
            expect(spec).not.toMatch(/Only when no hook routing is in context/);
            expect(spec).toMatch(
                /`risk_os_scheduling` at or above `gate\.promptHook\.blockThreshold`/
            );
            expect(spec).toMatch(/Destructive git\s+and secrets never block there/);
            expect(spec).toMatch(/The hook is fail-open/);
            expect(spec).toMatch(/`features\.logging`[\s\S]*`\.rulebook\/logs\/gate\.jsonl`/);
            expect(spec).toMatch(/no\s+prompt text, no key/);
            for (const h of [
                '## 4. Delegation',
                '## 5. Subagent contract',
                '## 6. Monitoring',
                '## 7. Close-out',
            ]) {
                expect(spec).toContain(h);
            }
        });
    });
});
