import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Hermetic: no npm registry call, and no Claude Code setup outside the
// temp project. Claude Code counts as installed so the TypeSafe step runs
// (with --no-typesafe it only records the "no" and touches project files).
vi.mock('../src/utils/update-check.js', () => ({ checkForUpdate: vi.fn(async () => null) }));
vi.mock('../src/core/claude/claude-mcp.js', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/core/claude/claude-mcp.js')>()),
    isClaudeCodeInstalled: vi.fn(async () => true),
    setupClaudeCodeIntegration: vi.fn(async () => ({ detected: false })),
}));

import { initCommand } from '../src/cli/commands/init.js';
import { updateSingleProject } from '../src/cli/commands/update.js';
import type { RulebookConfig } from '../src/types.js';

/** `rulebook init` then `rulebook update`, run for real in a temp TypeScript project. */
describe('rulebook update after init', () => {
    const originalCwd = process.cwd();
    let projectRoot: string;

    const init = () => initCommand({ yes: true, typesafe: false });
    const update = () => updateSingleProject(projectRoot, { yes: true, typesafe: false });
    const configPath = () => path.join(projectRoot, '.rulebook', 'rulebook.json');
    const readConfig = async (): Promise<RulebookConfig> =>
        JSON.parse(await fs.readFile(configPath(), 'utf-8'));
    const writeConfig = (config: RulebookConfig) =>
        fs.writeFile(configPath(), JSON.stringify(config, null, 2));
    const claudeBackups = async () =>
        (await fs.readdir(path.join(projectRoot, '.rulebook', 'backup')).catch(() => [])).filter(
            (name) => name.startsWith('CLAUDE.md.backup-')
        );

    beforeEach(async () => {
        projectRoot = await fs.realpath(
            await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-update-flow-'))
        );
        await fs.writeFile(
            path.join(projectRoot, 'package.json'),
            JSON.stringify({ name: 'demo', version: '1.0.0' })
        );
        await fs.writeFile(path.join(projectRoot, 'tsconfig.json'), '{}');
        await fs.mkdir(path.join(projectRoot, 'src'));
        await fs.writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const x = 1;\n');
        process.chdir(projectRoot);
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        process.chdir(originalCwd);
        await fs.rm(projectRoot, { recursive: true, force: true, maxRetries: 5 });
    });

    // Regression: update wrote its detection in an early updateConfig that the
    // config rebuild then replaced, so a newly detected language and its skill
    // were never saved.
    it('saves a newly detected language and its skill, keeping user settings', async () => {
        await init();
        const initial = await readConfig();
        expect(initial.languages).toEqual(['typescript']);
        expect(initial.skills?.enabled).toContain('core/rulebook');

        await fs.writeFile(path.join(projectRoot, 'Cargo.toml'), '[package]\nname = "demo"\n');
        await fs.writeFile(path.join(projectRoot, 'src', 'main.rs'), 'fn main() {}\n');
        await writeConfig({
            ...initial,
            rulebookDir: '.rb',
            skills: {
                enabled: initial.skills!.enabled.filter((id) => id !== 'core/rulebook'),
                disabled: ['core/rulebook'],
            },
        });

        await update();

        const updated = await readConfig();
        expect(updated.languages).toEqual(expect.arrayContaining(['typescript', 'rust']));
        expect(updated.skills?.enabled).toEqual(
            expect.arrayContaining(['languages/typescript', 'languages/rust'])
        );
        expect(updated.skills?.enabled).not.toContain('core/rulebook');
        expect(updated.skills?.disabled).toEqual(['core/rulebook']);
        expect(updated.rulebookDir).toBe('.rb');
    });

    it('saves the TypeSafe and auto-approve decisions taken after the config rebuild', async () => {
        await init();
        const { permissions: _dropped, ...withoutPermissions } = await readConfig();
        await writeConfig(withoutPermissions as RulebookConfig);

        await update();

        const updated = await readConfig();
        expect(updated.permissions?.autoApprove).toBe(true);
        expect(updated.integrations?.typesafe?.enabled).toBe(false);
    });

    // Regression: the first update after init backed up CLAUDE.md although the
    // user had changed nothing (only the generated block differed).
    it('writes no CLAUDE.md backup on the first or a later unchanged update', async () => {
        await init();
        const afterInit = await fs.readFile(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');

        await update();
        const afterUpdate = await fs.readFile(path.join(projectRoot, 'CLAUDE.md'), 'utf-8');
        expect(afterUpdate).not.toBe(afterInit); // the generated block did change
        expect(await claudeBackups()).toEqual([]);

        await update();
        expect(await claudeBackups()).toEqual([]);
    });

    it('backs up CLAUDE.md once after the user edits outside the generated block', async () => {
        await init();
        await fs.appendFile(path.join(projectRoot, 'CLAUDE.md'), '\n## Mine\nkeep me\n');

        await update();
        const backups = await claudeBackups();
        expect(backups).toHaveLength(1);
        const backup = path.join(projectRoot, '.rulebook', 'backup', backups[0]);
        expect(await fs.readFile(backup, 'utf-8')).toContain('keep me');

        await update();
        expect(await claudeBackups()).toHaveLength(1);
    });

    it('backs up a legacy CLAUDE.md without the generated block before migrating it', async () => {
        await init();
        await fs.writeFile(path.join(projectRoot, 'CLAUDE.md'), '# CLAUDE.md\n\nLegacy rules.\n');

        await update();

        const backups = await claudeBackups();
        expect(backups).toHaveLength(1);
        const backup = path.join(projectRoot, '.rulebook', 'backup', backups[0]);
        expect(await fs.readFile(backup, 'utf-8')).toContain('Legacy rules.');
    });
});
