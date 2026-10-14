import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { encoding_for_model } from 'tiktoken';
import {
    applyOrchestrationMode,
    normalizeOrchestrationMode,
    readOrchestrationMode,
} from '../src/core/generators/orchestration-mode.js';
import {
    extractOrchestrationSection,
    findUserOrchestrationSection,
    generateClaudeMd,
    getClaudeMdPath,
} from '../src/core/claude/claude-md-generator.js';
import { generateCoreRules, generateLeanAgents } from '../src/core/generators/generator.js';
import { mergeClaudeMd } from '../src/core/merger.js';
import { createConfigManager } from '../src/core/state/config-manager.js';
import {
    CODEX_BLOCK_END,
    CODEX_BLOCK_START,
    clearOverride,
    getOverridePath,
    readOverrideContent,
    renderCodexBlock,
    syncCodexBlock,
} from '../src/core/state/override-manager.js';
import type { ProjectConfig } from '../src/types.js';

/**
 * v7.5 orchestration by judgment (C1/C2) and the Codex rules block (C9).
 * docs/analysis/multi-session-performance/04 F-020..F-031, 05 F-034.
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

// The v7.4.0 CLAUDE.md block's Orchestration section, as shipped.
const V74_SECTION = [
    '## Orchestration',
    'Gate first: act on Jev `routing` from the prompt hook, else from',
    '`rulebook_gate {prompt}`; unavailable or undecided → these rules. Main session never does the work itself — delegate each task to one subagent, model set',
    'per call: Fable 5.1 architecture, hard bugs, review; Opus 5.5 edits, tests, docs,',
    'refactors (never Fable for simple work); Haiku 4.5 research, summaries. Plan first;',
    'parallelize independent agents; read reports, not files. Subagents archive their task.',
    'Monitor; pause/restart stalled agents; review, then update CHANGELOG.',
    'See `.rulebook/specs/orchestration.md`.',
].join('\n');

async function writeRulebookJson(root: string, body: object): Promise<void> {
    await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
    await fs.writeFile(path.join(root, '.rulebook', 'rulebook.json'), JSON.stringify(body));
}

/** A v7.4-style CLAUDE.md whose block carries `section` as its Orchestration section. */
async function writeV74ClaudeMd(root: string, section: string): Promise<string> {
    const generated = await generateClaudeMd(root, { orchestration: 'orchestrator' });
    const current = extractOrchestrationSection(generated)!;
    const file = generated.replace(current, () => section) + '\n## My notes\nkeep me\n';
    await fs.writeFile(getClaudeMdPath(root), file);
    return file;
}

describe('orchestration mode (v7.5)', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-orch-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    describe('applyOrchestrationMode', () => {
        const template = [
            'shared top',
            '<!-- orchestration:judgment -->',
            'judgment line',
            '<!-- orchestration:orchestrator -->',
            'orchestrator line',
            '<!-- /orchestration -->',
            'shared bottom',
        ].join('\n');

        it('keeps the active variant and drops the other one and every marker', () => {
            expect(applyOrchestrationMode(template, 'judgment')).toBe(
                'shared top\njudgment line\nshared bottom'
            );
            expect(applyOrchestrationMode(template, 'orchestrator')).toBe(
                'shared top\norchestrator line\nshared bottom'
            );
        });

        it('leaves templates without markers untouched', () => {
            expect(applyOrchestrationMode('a\nb\n', 'orchestrator')).toBe('a\nb\n');
        });
    });

    describe('config', () => {
        it('defaults to judgment when absent or unknown', async () => {
            expect(normalizeOrchestrationMode(undefined)).toBe('judgment');
            expect(normalizeOrchestrationMode('swarm')).toBe('judgment');
            expect(normalizeOrchestrationMode('orchestrator')).toBe('orchestrator');
            expect(await readOrchestrationMode(root)).toBe('judgment');
            await writeRulebookJson(root, { orchestration: 'orchestrator' });
            expect(await readOrchestrationMode(root)).toBe('orchestrator');
        });

        it('reading the mode never creates a config', async () => {
            await readOrchestrationMode(root);
            await expect(fs.access(path.join(root, '.rulebook'))).rejects.toThrow();
        });

        it('new configs store judgment; migration fills it in and keeps an explicit orchestrator', async () => {
            const fresh = await createConfigManager(root).initializeConfig();
            expect(fresh.orchestration).toBe('judgment');

            await writeRulebookJson(root, { version: '7.4.0', mode: 'full', features: {} });
            expect((await createConfigManager(root).loadConfig()).orchestration).toBe('judgment');

            await writeRulebookJson(root, { version: '7.4.0', orchestration: 'orchestrator' });
            expect((await createConfigManager(root).loadConfig()).orchestration).toBe(
                'orchestrator'
            );
        });
    });

    describe('generated text follows the mode', () => {
        it('judgment (default): visible criteria, routing, no delegation mandate', async () => {
            const claudeMd = await generateClaudeMd(root);
            const section = extractOrchestrationSection(claudeMd)!;
            expect(section).toMatch(/Do small, local work yourself/);
            expect(section).toMatch(/~3 or fewer to change/);
            expect(section).toMatch(/2\+ independent parts with disjoint files/);
            expect(section).toMatch(/past ~150k context/);
            expect(section).toMatch(/for context and parallelism, not speed/);
            expect(section).toMatch(/~20–40k tokens/);
            expect(section).toMatch(/outcome, files changed, checks run, open risks/);
            expect(section).toMatch(/Prefer narrow agents to general-purpose/);
            expect(section).toMatch(/one progress line per dispatch and hand-back/);
            expect(section).toMatch(/Fable 5\.1 architecture, hard bugs, review/);
            expect(section).toMatch(/CHANGELOG per PR\/release, not per task/);
            expect(section).not.toContain('<!--');
        });

        it('orchestrator: the v7.4 delegation text without its contradictions', async () => {
            await writeRulebookJson(root, { orchestration: 'orchestrator' });
            const section = extractOrchestrationSection(await generateClaudeMd(root))!;
            expect(section).toMatch(/Main session never does the work itself/);
            expect(section).toMatch(/delegate each task to one subagent/);
            expect(section).toMatch(/model set per call/);
            expect(section).toMatch(/never Fable for simple work/);
            expect(section).toMatch(/read reports, not files/);
            expect(section).toMatch(/pause\/restart stalled agents/);
            // F-023: who edits the CHANGELOG, small fixes, per-task review.
            expect(section).toMatch(/own edits: CHANGELOG, commits/);
            expect(section).toMatch(/small fix: a brief, no task/);
            expect(section).not.toMatch(/review, then update/);
            expect(section).not.toMatch(/including small ones/);
        });

        it('the lean AGENTS.md and the spec render the configured mode', async () => {
            await writeRulebookJson(root, { orchestration: 'orchestrator' });
            const agentsMd = await generateLeanAgents(config, root);
            expect(agentsMd).toMatch(/Main session never does the work itself/);
            expect(agentsMd).not.toMatch(/Orchestration by judgment/);
            const spec = await fs.readFile(
                path.join(root, '.rulebook', 'specs', 'orchestration.md'),
                'utf-8'
            );
            expect(spec).toMatch(/Mode: `orchestrator`/);
            expect(spec).not.toContain('<!-- orchestration:');
        });
    });

    describe('update keeps a user-edited Orchestration section (F-031)', () => {
        it('regenerates a section rulebook shipped (v7.4.0) in the configured mode', async () => {
            await writeV74ClaudeMd(root, V74_SECTION);
            const result = await mergeClaudeMd(root);
            expect(result.keptOrchestration).toBe(false);

            const after = await fs.readFile(getClaudeMdPath(root), 'utf-8');
            expect(after).not.toContain('Gate first');
            expect(after).toMatch(/Do small, local work yourself/);
            expect(after).toContain('## My notes\nkeep me');
        });

        it('keeps an edited section verbatim and reports it', async () => {
            const mine =
                '## Orchestration\nThe main session does the work itself (user decision 2026-10-08).';
            await writeV74ClaudeMd(root, mine);
            expect(await findUserOrchestrationSection(mine)).toBe(mine);

            const result = await mergeClaudeMd(root);
            expect(result.keptOrchestration).toBe(true);
            const after = await fs.readFile(getClaudeMdPath(root), 'utf-8');
            expect(after).toContain(mine);
            expect(after).not.toMatch(/Do small, local work yourself/);
            // The rest of the block is still regenerated.
            expect(after).not.toContain('Gate first');

            // Idempotent: a second update keeps it again, with no drift.
            await mergeClaudeMd(root);
            expect(await fs.readFile(getClaudeMdPath(root), 'utf-8')).toBe(after);
        });

        it('a section generated for the other mode follows a mode switch', async () => {
            await mergeClaudeMd(root); // judgment text
            await writeRulebookJson(root, { orchestration: 'orchestrator' });
            const result = await mergeClaudeMd(root);
            expect(result.keptOrchestration).toBe(false);
            const after = await fs.readFile(getClaudeMdPath(root), 'utf-8');
            expect(after).toMatch(/Main session never does the work itself/);
        });

        it('leaves orchestration instructions in AGENTS.override.md alone', async () => {
            const override = '# Overrides\n\n- Agents opt-in — implement directly.\n';
            await fs.writeFile(getOverridePath(root), override);
            await mergeClaudeMd(root);
            await syncCodexBlock(root);
            const after = await fs.readFile(getOverridePath(root), 'utf-8');
            expect(after.endsWith(override)).toBe(true);
        });
    });
});

describe('Codex rules block in AGENTS.override.md (v7.5, F-034)', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-codex-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    it('writes nothing when there is no override (Codex reads AGENTS.md then)', async () => {
        expect(await syncCodexBlock(root)).toBe('no-override');
        await expect(fs.access(getOverridePath(root))).rejects.toThrow();
    });

    it('puts the block on top and keeps the user content byte-for-byte', async () => {
        const user = '# Project-Specific Overrides\n\n- Run `npm run e2e` before merging.\n';
        await fs.writeFile(getOverridePath(root), user);

        expect(await syncCodexBlock(root)).toBe('added');
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after.startsWith(CODEX_BLOCK_START)).toBe(true);
        expect(after.endsWith(user)).toBe(true);
        expect(after).toContain('## Rulebook rules (Codex)');
        expect(after).toMatch(/No OS schedules/);
        expect(after).toMatch(/Never delete\s+or move a `\.git`/);
        expect(after).toMatch(/need Codex\s+trust and Codex tool names/);

        // Idempotent.
        expect(await syncCodexBlock(root)).toBe('unchanged');
        expect(await fs.readFile(getOverridePath(root), 'utf-8')).toBe(after);
    });

    it('refreshes the block in place when the mode changes', async () => {
        const user = 'my rules\n';
        await fs.writeFile(getOverridePath(root), user);
        await syncCodexBlock(root);
        await writeRulebookJson(root, { orchestration: 'orchestrator' });

        expect(await syncCodexBlock(root)).toBe('updated');
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after).toMatch(/Orchestrator mode/);
        expect(after.split(CODEX_BLOCK_START)).toHaveLength(2);
        expect(after.endsWith(user)).toBe(true);
    });

    it('keeps CRLF overrides CRLF', async () => {
        const user = '# Overrides\r\n\r\n- rule\r\n';
        await fs.writeFile(getOverridePath(root), user);
        await syncCodexBlock(root);
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after.replace(/\r\n/g, '')).not.toContain('\n');
        expect(after.endsWith(user)).toBe(true);
        expect(await syncCodexBlock(root)).toBe('unchanged');
    });

    it('never leaks into the override content AGENTS.md embeds', async () => {
        await fs.writeFile(getOverridePath(root), '- custom rule one\n');
        await syncCodexBlock(root);
        const content = await readOverrideContent(root);
        expect(content).toBe('- custom rule one');
        const agentsMd = await generateLeanAgents(config, root);
        expect(agentsMd).not.toContain('Rulebook rules (Codex)');
    });

    it('is one HTML comment: Codex reads it raw, Claude Code strips it', async () => {
        for (const mode of ['judgment', 'orchestrator'] as const) {
            await writeRulebookJson(root, { orchestration: mode });
            const block = await renderCodexBlock(root);
            expect(block.startsWith(CODEX_BLOCK_START), mode).toBe(true);
            expect(block.endsWith(`${CODEX_BLOCK_END}\n`), mode).toBe(true);
            // Nothing inside may open or close a comment, or the rest would leak.
            expect(block.split('<!--'), mode).toHaveLength(2);
            expect(block.split('-->'), mode).toHaveLength(2);
        }
        const user = '# Project-Specific Overrides\n\n- custom rule\n';
        await fs.writeFile(getOverridePath(root), user);
        await syncCodexBlock(root);
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after).toContain('## Rulebook rules (Codex)');
        // What Claude Code injects for the @import: block-level comments dropped.
        expect(after.replace(/<!--[\s\S]*?-->/g, '').trim()).toBe(user.trim());
    });

    it.each([
        ['LF', '\n'],
        ['CRLF', '\r\n'],
    ])('replaces a v7.5.0 block (visible, own END comment) in place (%s)', async (_, eol) => {
        const user = ['# Project-Specific Overrides', '', '- custom rule', ''].join(eol);
        const v750 = [
            '<!-- RULEBOOK-CODEX:START — generated by rulebook update; your own rules go below this block -->',
            '## Rulebook rules (Codex)',
            '',
            '- a v7.5.0 rule',
            '<!-- RULEBOOK-CODEX:END -->',
            '',
            user,
        ].join(eol);
        await fs.writeFile(getOverridePath(root), v750);

        expect(await syncCodexBlock(root)).toBe('updated');
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after.startsWith(CODEX_BLOCK_START)).toBe(true);
        expect(after.endsWith(`${CODEX_BLOCK_END}${eol}${eol}${user}`)).toBe(true);
        expect(after.split(CODEX_BLOCK_START)).toHaveLength(2);
        expect(after).not.toContain('a v7.5.0 rule');
        expect(after).not.toContain('<!-- RULEBOOK-CODEX:END -->');
        expect(after.replace(/<!--[\s\S]*?-->/g, '').trim()).toBe(user.trim());
        expect(await syncCodexBlock(root)).toBe('unchanged');
    });

    it('survives `rulebook override clear`', async () => {
        await fs.writeFile(getOverridePath(root), '- custom\n');
        await syncCodexBlock(root);
        await clearOverride(root);
        const after = await fs.readFile(getOverridePath(root), 'utf-8');
        expect(after.startsWith(CODEX_BLOCK_START)).toBe(true);
        expect(after).not.toContain('- custom');
    });

    it('stays small (≤ 400 tokens) in both modes', async () => {
        const enc = encoding_for_model('gpt-4');
        try {
            for (const mode of ['judgment', 'orchestrator'] as const) {
                await writeRulebookJson(root, { orchestration: mode });
                const block = await renderCodexBlock(root);
                expect(enc.encode(block).length, mode).toBeLessThanOrEqual(400);
            }
        } finally {
            enc.free();
        }
    });

    it('the orchestration spec documents the on-demand gate and close-out in both modes', async () => {
        for (const mode of ['judgment', 'orchestrator'] as const) {
            const spec = await generateCoreRules('orchestration', mode);
            expect(spec, mode).toContain('## 3. Jev gate (opt-in, on demand)');
            expect(spec, mode).not.toMatch(/Only when no hook routing is in context/);
            expect(spec, mode).toMatch(/This is\s+the only routing field that asks the operator/);
            expect(spec, mode).toMatch(/\*\*CHANGELOG\*\* — per PR or release/);
            expect(spec, mode).toMatch(/\*\*Diff review\*\* — once per PR/);
            expect(spec, mode).toMatch(/\*\*Task archive\*\* — only for tracked multi-session/);
            expect(spec, mode).toMatch(
                /full quality\s+gate \(type-check → lint → full suite\) runs before a commit batch and before\s+push/
            );
            expect(spec, mode).toMatch(/outcome, files changed, checks run, open\s+risks/);
            expect(spec, mode).toMatch(/one line to the operator after each dispatch/);
        }
    });
});
