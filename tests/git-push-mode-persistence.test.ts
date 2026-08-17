import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateGitRules, readGitPushModeFromSpec } from '../src/core/generators/generator.js';
import { createConfigManager } from '../src/core/state/config-manager.js';

/**
 * Regression: `rulebook update` silently reset a project's git push mode.
 *
 * `gitPushMode` lived only on the in-memory ProjectConfig and was never written
 * to `.rulebook/rulebook.json`, so `mergedConfig.gitPushMode || 'manual'` in the
 * generator resolved to 'manual' on every update. A repo on AUTO was rewritten
 * to MANUAL with no prompt and no warning.
 *
 * The fix persists the value and, for repos installed before it existed,
 * recovers the mode from the stamped spec header.
 */
describe('git push mode persistence', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-pushmode-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    async function writeGitSpec(mode: 'manual' | 'prompt' | 'auto', rulebookDir = '.rulebook') {
        const specsDir = path.join(projectRoot, rulebookDir, 'specs');
        await fs.mkdir(specsDir, { recursive: true });
        await fs.writeFile(path.join(specsDir, 'git.md'), await generateGitRules(mode));
    }

    describe('readGitPushModeFromSpec', () => {
        it.each(['manual', 'prompt', 'auto'] as const)(
            'recovers %s from a spec the generator itself produced',
            async (mode) => {
                await writeGitSpec(mode);
                expect(await readGitPushModeFromSpec(projectRoot)).toBe(mode);
            }
        );

        it('returns undefined when no git spec exists (genuinely new project)', async () => {
            expect(await readGitPushModeFromSpec(projectRoot)).toBeUndefined();
        });

        it('returns undefined when the spec carries no recognizable header', async () => {
            const specsDir = path.join(projectRoot, '.rulebook', 'specs');
            await fs.mkdir(specsDir, { recursive: true });
            await fs.writeFile(
                path.join(specsDir, 'git.md'),
                '# Git Workflow Rules\n\nNo header.\n'
            );

            expect(await readGitPushModeFromSpec(projectRoot)).toBeUndefined();
        });

        it('honours a custom rulebook directory', async () => {
            await writeGitSpec('auto', '.myrules');

            expect(await readGitPushModeFromSpec(projectRoot, '.myrules')).toBe('auto');
            // ...and does not find it under the default location.
            expect(await readGitPushModeFromSpec(projectRoot)).toBeUndefined();
        });
    });

    describe('update resolution order', () => {
        // Mirrors the resolution in src/cli/commands/update.ts.
        const resolve = async (persisted: 'manual' | 'prompt' | 'auto' | undefined) =>
            persisted ?? (await readGitPushModeFromSpec(projectRoot)) ?? 'manual';

        it('prefers the persisted value over the spec', async () => {
            await writeGitSpec('manual');
            expect(await resolve('auto')).toBe('auto');
        });

        it('falls back to the spec when the config predates the persisted key', async () => {
            await writeGitSpec('auto');
            expect(await resolve(undefined)).toBe('auto');
        });

        it('defaults to manual only when there is neither', async () => {
            expect(await resolve(undefined)).toBe('manual');
        });

        it('survives a config save/reload cycle', async () => {
            const configManager = createConfigManager(projectRoot);
            await configManager.updateConfig({ gitPushMode: 'auto' });

            // A fresh manager reads from disk rather than the in-memory cache.
            const reloaded = await createConfigManager(projectRoot).loadConfig();
            expect(reloaded.gitPushMode).toBe('auto');
        });

        it('regenerating with the resolved mode round-trips (AUTO stays AUTO)', async () => {
            await writeGitSpec('auto');

            const resolved = await resolve(undefined);
            await fs.writeFile(
                path.join(projectRoot, '.rulebook', 'specs', 'git.md'),
                await generateGitRules(resolved)
            );

            const after = await fs.readFile(
                path.join(projectRoot, '.rulebook', 'specs', 'git.md'),
                'utf-8'
            );
            expect(after).toContain('**AI Assistant Git Push Mode**: AUTO');
            expect(after).not.toContain('Never execute `git push` commands automatically');
        });
    });
});
