import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    generateOpencodeConfig,
    generateOpencodeCommands,
    generateOpencodeAgents,
    generateOpencodeSkills,
    normalizeOpencodeSkillName,
    generateOpencodeIntegration,
} from '../src/core/ide/opencode-generator';

const REPO_ROOT = path.resolve(__dirname, '..');

describe('opencode-generator', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-opencode-gen-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    describe('normalizeOpencodeSkillName', () => {
        it('lowercases and hyphenates', () => {
            expect(normalizeOpencodeSkillName('Rulebook_Terse_Commit')).toBe(
                'rulebook-terse-commit'
            );
        });
        it('strips leading/trailing hyphens', () => {
            expect(normalizeOpencodeSkillName('---foo---')).toBe('foo');
        });
        it('collapses multiple non-alphanumerics', () => {
            expect(normalizeOpencodeSkillName('a   b__c')).toBe('a-b-c');
        });
        it('truncates to 64 chars', () => {
            const out = normalizeOpencodeSkillName('a'.repeat(200));
            expect(out.length).toBeLessThanOrEqual(64);
        });
        it('falls back to "skill" if input has no alphanumerics', () => {
            expect(normalizeOpencodeSkillName('---')).toBe('skill');
        });
    });

    describe('generateOpencodeConfig', () => {
        it('creates opencode.json with $schema, mcp.rulebook, instructions when missing', async () => {
            await fs.writeFile(path.join(dir, 'AGENTS.md'), '# rules');
            const result = await generateOpencodeConfig(dir);
            expect(result.configPath).toBe(path.join(dir, 'opencode.json'));

            const cfg = JSON.parse(await fs.readFile(result.configPath, 'utf-8'));
            expect(cfg.$schema).toBe('https://opencode.ai/config.json');
            expect(cfg.mcp.rulebook.type).toBe('local');
            expect(Array.isArray(cfg.mcp.rulebook.command)).toBe(true);
            expect(cfg.mcp.rulebook.enabled).toBe(true);
            expect(cfg.instructions).toContain('AGENTS.md');
        });

        it('preserves user keys when opencode.json already exists', async () => {
            await fs.writeFile(
                path.join(dir, 'opencode.json'),
                JSON.stringify(
                    { model: 'anthropic/claude-opus-4-7', theme: 'dark', custom: true },
                    null,
                    2
                )
            );
            await generateOpencodeConfig(dir);
            const cfg = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
            expect(cfg.model).toBe('anthropic/claude-opus-4-7');
            expect(cfg.theme).toBe('dark');
            expect(cfg.custom).toBe(true);
            expect(cfg.mcp.rulebook).toBeDefined();
        });

        it('mirrors .mcp.json rulebook command when present', async () => {
            await fs.writeFile(
                path.join(dir, '.mcp.json'),
                JSON.stringify(
                    {
                        mcpServers: {
                            rulebook: { command: 'node', args: ['./dist/index.js', 'mcp-server'] },
                        },
                    },
                    null,
                    2
                )
            );
            await generateOpencodeConfig(dir);
            const cfg = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
            expect(cfg.mcp.rulebook.command).toEqual(['node', './dist/index.js', 'mcp-server']);
        });

        it('de-duplicates instructions on re-run', async () => {
            await fs.writeFile(path.join(dir, 'AGENTS.md'), 'x');
            await generateOpencodeConfig(dir);
            await generateOpencodeConfig(dir);
            const cfg = JSON.parse(await fs.readFile(path.join(dir, 'opencode.json'), 'utf-8'));
            const occurrences = cfg.instructions.filter((i: string) => i === 'AGENTS.md').length;
            expect(occurrences).toBe(1);
        });

        it('writes .opencode/.rulebook-managed.json sidecar', async () => {
            await generateOpencodeConfig(dir);
            const sidecar = JSON.parse(
                await fs.readFile(path.join(dir, '.opencode', '.rulebook-managed.json'), 'utf-8')
            );
            expect(sidecar._rulebook_managed).toBe(true);
            expect(sidecar.mcpServers).toContain('rulebook');
            expect(sidecar.topLevel).toContain('$schema');
            expect(sidecar.topLevel).toContain('instructions');
        });
    });

    describe('generateOpencodeCommands', () => {
        it('generates command files with the rulebook marker', async () => {
            const result = await generateOpencodeCommands(dir);
            expect(result.written.length).toBeGreaterThan(0);
            const sample = result.written[0];
            const content = await fs.readFile(sample, 'utf-8');
            expect(content).toContain('<!-- RULEBOOK:START -->');
            expect(content.startsWith('---\n')).toBe(true);
        });

        it('preserves user-owned command files (no marker)', async () => {
            const cmdDir = path.join(dir, '.opencode', 'commands');
            await fs.mkdir(cmdDir, { recursive: true });
            const userPath = path.join(cmdDir, 'rulebook-task-create.md');
            await fs.writeFile(userPath, '# user-owned\n');

            const result = await generateOpencodeCommands(dir);
            expect(result.preserved).toContain(userPath);
            const content = await fs.readFile(userPath, 'utf-8');
            expect(content).toBe('# user-owned\n');
        });

        it('refreshes managed command files', async () => {
            const result1 = await generateOpencodeCommands(dir);
            const target = result1.written[0];
            const before = await fs.readFile(target, 'utf-8');
            await fs.writeFile(
                target,
                before.replace('<!-- RULEBOOK:START -->', '<!-- RULEBOOK:START -->\nstale')
            );
            const result2 = await generateOpencodeCommands(dir);
            expect(result2.written).toContain(target);
            const after = await fs.readFile(target, 'utf-8');
            expect(after).not.toContain('stale');
        });
    });

    describe('generateOpencodeAgents', () => {
        it('emits agent files with model tier mapped and permission block', async () => {
            const result = await generateOpencodeAgents(dir);
            expect(result.written.length).toBeGreaterThan(0);
            const researcher = path.join(dir, '.opencode', 'agents', 'researcher.md');
            const content = await fs.readFile(researcher, 'utf-8');
            expect(content).toMatch(/model: anthropic\/claude-haiku-4-5/);
            expect(content).toMatch(/permission:/);
            expect(content).toMatch(/edit: deny/);
            expect(content).toMatch(/bash: ask/);
        });

        it('marks team-lead as primary mode', async () => {
            await generateOpencodeAgents(dir);
            const teamLead = path.join(dir, '.opencode', 'agents', 'team-lead.md');
            if (await fileExists(teamLead)) {
                const content = await fs.readFile(teamLead, 'utf-8');
                expect(content).toMatch(/mode: primary/);
            }
        });
    });

    describe('generateOpencodeSkills', () => {
        it('emits skills with normalized names and bounded descriptions', async () => {
            const result = await generateOpencodeSkills(dir);
            expect(result.written.length).toBeGreaterThan(0);
            for (const file of result.written) {
                const content = await fs.readFile(file, 'utf-8');
                const m = content.match(/^name:\s*(\S+)/m);
                expect(m).not.toBeNull();
                expect(m![1]).toMatch(/^[a-z0-9](?:-?[a-z0-9])*$/);
                const d = content.match(/^description:\s*(.+)$/m);
                if (d) {
                    // Strip outer quotes for length check
                    const desc = d[1].replace(/^"(.*)"$/, '$1');
                    expect(desc.length).toBeGreaterThan(0);
                    expect(desc.length).toBeLessThanOrEqual(1024);
                }
            }
        });

        it('cleans up orphaned managed skill directories', async () => {
            const orphanDir = path.join(dir, '.opencode', 'skills', 'no-longer-a-source');
            await fs.mkdir(orphanDir, { recursive: true });
            await fs.writeFile(
                path.join(orphanDir, 'SKILL.md'),
                '<!-- RULEBOOK:START -->\nstale\n<!-- RULEBOOK:END -->\n'
            );
            const result = await generateOpencodeSkills(dir);
            expect(result.orphaned.some((p) => p.endsWith('no-longer-a-source'))).toBe(true);
            expect(await fileExists(orphanDir)).toBe(false);
        });
    });

    describe('generateOpencodeIntegration', () => {
        it('runs all four generators end-to-end', async () => {
            const result = await generateOpencodeIntegration(dir);
            expect(result.configPath).toBeDefined();
            expect(result.managedKeysPath).toBeDefined();
            expect(result.commands.length).toBeGreaterThan(0);
            expect(result.agents.length).toBeGreaterThan(0);
            expect(result.skills.length).toBeGreaterThan(0);
        });
    });
});

async function fileExists(p: string): Promise<boolean> {
    try {
        await fs.stat(p);
        return true;
    } catch {
        return false;
    }
}

// Note: tests reference REPO_ROOT to ensure templates dir resolves from compiled
// path; not used directly because the generator computes it via __dirname.
void REPO_ROOT;
