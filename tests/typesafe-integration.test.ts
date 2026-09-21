import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    isTypesafePluginInstalled,
    installTypesafePlugin,
    setupTypesafeIntegration,
    hasTypesafeToken,
    typesafeTokenInstructions,
    typesafeManualInstall,
    renderTypesafeRule,
    removeTypesafeRule,
    getTypesafeRulePath,
    getInstalledPluginsPath,
    TYPESAFE_PLUGIN_ID,
    TYPESAFE_MARKETPLACE,
    TYPESAFE_ENV_VAR,
    TYPESAFE_KEYS_URL,
    TYPESAFE_RULE_MARKER,
    type CommandRunner,
} from '../src/core/claude/typesafe-integration.js';

/**
 * v7.3 — TypeSafe (Jev) integration. The Claude CLI is replaced by a
 * recording runner; the plugin registry lives in a throwaway home dir.
 */

async function writeRegistry(homeDir: string, plugins: Record<string, unknown>): Promise<void> {
    const file = getInstalledPluginsPath(homeDir);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ version: 2, plugins }, null, 2));
}

function recordingRunner(fail?: (cmd: string, args: readonly string[]) => Error | undefined): {
    runner: CommandRunner;
    calls: string[];
} {
    const calls: string[] = [];
    const runner: CommandRunner = async (cmd, args) => {
        calls.push([cmd, ...args].join(' '));
        const err = fail?.(cmd, args);
        if (err) throw err;
        return { stdout: '', stderr: '' };
    };
    return { runner, calls };
}

describe('typesafe integration', () => {
    let homeDir: string;
    let projectRoot: string;

    beforeEach(async () => {
        homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-ts-home-'));
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-ts-proj-'));
    });

    afterEach(async () => {
        await fs.rm(homeDir, { recursive: true, force: true });
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    describe('detection', () => {
        it('reads the plugin registry', async () => {
            await writeRegistry(homeDir, {
                [TYPESAFE_PLUGIN_ID]: [{ scope: 'user', version: '0.5.7' }],
            });
            expect(await isTypesafePluginInstalled(homeDir)).toBe(true);
        });

        it('treats a missing registry, an empty entry and bad JSON as not installed', async () => {
            expect(await isTypesafePluginInstalled(homeDir)).toBe(false);
            await writeRegistry(homeDir, { [TYPESAFE_PLUGIN_ID]: [] });
            expect(await isTypesafePluginInstalled(homeDir)).toBe(false);
            await fs.writeFile(getInstalledPluginsPath(homeDir), '{not json');
            expect(await isTypesafePluginInstalled(homeDir)).toBe(false);
        });
    });

    describe('install', () => {
        it('runs marketplace add then plugin install, in that order', async () => {
            const { runner, calls } = recordingRunner();
            await installTypesafePlugin(runner);
            expect(calls).toEqual([
                `claude plugin marketplace add ${TYPESAFE_MARKETPLACE}`,
                `claude plugin install ${TYPESAFE_PLUGIN_ID}`,
            ]);
        });

        it('tolerates an already-registered marketplace', async () => {
            const { runner, calls } = recordingRunner((_c, args) =>
                args.includes('marketplace')
                    ? Object.assign(new Error('x'), { stderr: 'Marketplace already exists' })
                    : undefined
            );
            await installTypesafePlugin(runner);
            expect(calls).toHaveLength(2);
        });

        it('reports a missing claude CLI with the manual commands', async () => {
            const { runner } = recordingRunner(() =>
                Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
            );
            await expect(installTypesafePlugin(runner)).rejects.toThrow(
                /`claude` CLI not found on PATH.*Run by hand: claude plugin marketplace add/
            );
            expect(typesafeManualInstall()).toBe(
                `claude plugin marketplace add ${TYPESAFE_MARKETPLACE} && claude plugin install ${TYPESAFE_PLUGIN_ID}`
            );
        });
    });

    describe('setup', () => {
        it('does not reinstall an installed plugin and writes the rule', async () => {
            await writeRegistry(homeDir, { [TYPESAFE_PLUGIN_ID]: [{ version: '0.5.7' }] });
            const { runner, calls } = recordingRunner();
            const result = await setupTypesafeIntegration(projectRoot, {
                homeDir,
                runner,
                env: { [TYPESAFE_ENV_VAR]: 'ts_test' },
            });
            expect(calls).toEqual([]);
            expect(result).toMatchObject({
                installed: true,
                installedNow: false,
                tokenPresent: true,
                rulePath: getTypesafeRulePath(projectRoot),
            });
            expect(result.installError).toBeUndefined();
            const rule = await fs.readFile(result.rulePath, 'utf-8');
            expect(rule.startsWith(TYPESAFE_RULE_MARKER)).toBe(true);
            expect(rule).toContain('/typesafe:typesafe-ai');
            expect(rule).toContain(TYPESAFE_ENV_VAR);
            expect(rule).toContain(TYPESAFE_KEYS_URL);
            expect(rule).not.toMatch(/ts_test/);
        });

        it('installs when missing and reports installedNow', async () => {
            const { runner, calls } = recordingRunner();
            const result = await setupTypesafeIntegration(projectRoot, {
                homeDir,
                runner,
                env: {},
            });
            expect(calls).toHaveLength(2);
            expect(result.installed).toBe(true);
            expect(result.installedNow).toBe(true);
            expect(result.tokenPresent).toBe(false);
        });

        it('keeps going when the CLI is absent: error recorded, rule still written', async () => {
            const { runner } = recordingRunner(() =>
                Object.assign(new Error('spawn claude ENOENT'), { code: 'ENOENT' })
            );
            const result = await setupTypesafeIntegration(projectRoot, {
                homeDir,
                runner,
                env: {},
            });
            expect(result.installed).toBe(false);
            expect(result.installError).toMatch(/Run by hand/);
            await expect(fs.stat(result.rulePath)).resolves.toBeTruthy();
        });
    });

    describe('token and rule file', () => {
        it('checks the environment variable and never writes the key', () => {
            expect(hasTypesafeToken({})).toBe(false);
            expect(hasTypesafeToken({ [TYPESAFE_ENV_VAR]: '  ' })).toBe(false);
            expect(hasTypesafeToken({ [TYPESAFE_ENV_VAR]: 'ts_x' })).toBe(true);
            const text = typesafeTokenInstructions().join('\n');
            expect(text).toContain(TYPESAFE_KEYS_URL);
            expect(text).toContain(`export ${TYPESAFE_ENV_VAR}=`);
            expect(text).toMatch(/never commit/i);
            expect(renderTypesafeRule()).not.toContain('ts_');
        });

        it('removes only a rulebook-owned rule file', async () => {
            const rulePath = getTypesafeRulePath(projectRoot);
            await fs.mkdir(path.dirname(rulePath), { recursive: true });
            await fs.writeFile(rulePath, '# my own typesafe notes\n');
            expect(await removeTypesafeRule(projectRoot)).toBe(false);
            await expect(fs.stat(rulePath)).resolves.toBeTruthy();

            await fs.writeFile(rulePath, renderTypesafeRule());
            expect(await removeTypesafeRule(projectRoot)).toBe(true);
            await expect(fs.stat(rulePath)).rejects.toThrow();
            expect(await removeTypesafeRule(projectRoot)).toBe(false);
        });
    });
});
