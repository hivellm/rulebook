import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { encoding_for_model } from 'tiktoken';
import { generateClaudeMd } from '../src/core/claude/claude-md-generator.js';
import { generateLeanAgents } from '../src/core/generators/generator.js';
import { generateRules, getRulesDir } from '../src/core/generators/rules-generator.js';
import type { ProjectConfig } from '../src/types.js';

/**
 * v7 context budget guard (docs/analysis/v7-performance/05-budget-and-metrics.md).
 *
 * Total budget: ≤2,500 tokens always-loaded per session, of which ≤900 is
 * reserved for MCP tool schemas (enforced by the phase3 MCP benchmark). This
 * test guards the FILE-BASED share — everything the generators emit that
 * Claude Code auto-loads at session start: CLAUDE.md + AGENTS.md +
 * AGENTS.override.md + any `.claude/rules/*.md` without `paths:` frontmatter.
 */
const FILE_CONTEXT_BUDGET = 1600;

const config: ProjectConfig = {
    languages: ['typescript'],
    modules: [],
    projectType: 'application',
    coverageThreshold: 75,
    strictDocs: true,
    generateWorkflows: false,
    agentsMode: 'lean',
};

describe('v7 context budget (F-001)', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-budget-'));
        await fs.writeFile(
            path.join(projectRoot, 'AGENTS.override.md'),
            '# Project-Specific Overrides\n\nAdd your custom rules here.\n'
        );
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    it('generated always-loaded context stays within the v7 file budget', async () => {
        const claudeMd = await generateClaudeMd(projectRoot);
        const agentsMd = await generateLeanAgents(config, projectRoot);
        await generateRules(projectRoot, {
            languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
        });

        const enc = encoding_for_model('gpt-4');
        try {
            let total = enc.encode(claudeMd).length + enc.encode(agentsMd).length;
            total += enc.encode(
                await fs.readFile(path.join(projectRoot, 'AGENTS.override.md'), 'utf-8')
            ).length;

            // Rules without paths: frontmatter are always loaded — count them.
            const rulesDir = getRulesDir(projectRoot);
            for (const f of await fs.readdir(rulesDir)) {
                const content = await fs.readFile(path.join(rulesDir, f), 'utf-8');
                if (!/^---\r?\n[\s\S]*?^paths:/m.test(content)) {
                    total += enc.encode(content).length;
                }
            }

            expect(total).toBeLessThanOrEqual(FILE_CONTEXT_BUDGET);
        } finally {
            enc.free();
        }
    });

    it('every generated .claude/rules file is path-scoped (zero always-on rules)', async () => {
        await generateRules(projectRoot, {
            languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
        });

        const rulesDir = getRulesDir(projectRoot);
        const files = await fs.readdir(rulesDir);
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) {
            const content = await fs.readFile(path.join(rulesDir, f), 'utf-8');
            expect(content, `${f} must carry paths: frontmatter`).toMatch(
                /^---\r?\n[\s\S]*?^paths:/m
            );
        }
    });

    it('generated context never denies or mandates orchestration (P0)', async () => {
        const claudeMd = await generateClaudeMd(projectRoot);
        const agentsMd = await generateLeanAgents(config, projectRoot);
        const all = claudeMd + '\n' + agentsMd;

        // Forbidden v6 directives: nothing may block or mandate subagents/teams.
        expect(all).not.toMatch(/must (use|go through) a Team/i);
        expect(all).not.toMatch(/Never implement directly/i);
        expect(all).not.toMatch(/blocked by the enforcement hook/i);
        expect(all).not.toMatch(/Delegate by default/i);
        // No total-order execution mandate (issue #18): order = dependencies.
        expect(all).not.toMatch(/execute in (the )?(exact )?listed order/i);
        expect(all).not.toMatch(/order, not a menu/i);
        expect(all).not.toMatch(/sequentially/i);
        // No blanket branch-switching ban (issue #20).
        expect(all).not.toMatch(/never switch branches on your own/i);
        // The affirmative freedom line must be present.
        expect(claudeMd).toMatch(/never blocks or\s+mandates orchestration/);
    });

    it('generated CLAUDE.md does not import AGENTS.md or rule essays', async () => {
        const claudeMd = await generateClaudeMd(projectRoot);
        expect(claudeMd).not.toMatch(/^@AGENTS\.md$/m);
        expect(claudeMd).not.toMatch(/^@\.rulebook\/STATE\.md$/m);
        expect(claudeMd).not.toMatch(/^@\.rulebook\/PLANS\.md$/m);
        // The single allowed import: user-owned overrides.
        expect(claudeMd).toContain('@AGENTS.override.md');
    });
});
