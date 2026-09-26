import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { encoding_for_model } from 'tiktoken';
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
import { decideTypesafe, reportTypesafe, runTypesafeStep } from '../src/cli/commands/typesafe.js';
import { ConfigManager } from '../src/core/state/config-manager.js';

/**
 * v7.3 — TypeSafe (Jev) integration; on by default since v7.4. The Claude CLI is replaced by a
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
        it('checks the environment variable and never writes the key', async () => {
            expect(await hasTypesafeToken(undefined, {})).toBe(false);
            expect(await hasTypesafeToken(undefined, { [TYPESAFE_ENV_VAR]: '  ' })).toBe(false);
            expect(await hasTypesafeToken(undefined, { [TYPESAFE_ENV_VAR]: 'ts_x' })).toBe(true);
            expect(await hasTypesafeToken(projectRoot, {})).toBe(false); // no .env
            const text = typesafeTokenInstructions().join('\n');
            expect(text).toContain(TYPESAFE_KEYS_URL);
            expect(text).toContain(`export ${TYPESAFE_ENV_VAR}=`);
            expect(text).toMatch(/never commit/i);
            expect(text).toContain('rulebook_gate');
            expect(text).toMatch(/\.env/);
            expect(renderTypesafeRule()).not.toContain('ts_');
        });

        it("finds the key in the project's .env without exposing it", async () => {
            const fake = 'ts_fakeDotEnvValue123';
            const before = process.env[TYPESAFE_ENV_VAR];
            const dotEnv = path.join(projectRoot, '.env');

            await fs.writeFile(dotEnv, `OTHER=1\nexport ${TYPESAFE_ENV_VAR}="${fake}"\n`);
            expect(await hasTypesafeToken(projectRoot, {})).toBe(true);
            await fs.writeFile(dotEnv, `${TYPESAFE_ENV_VAR} = '${fake}'\r\n`);
            expect(await hasTypesafeToken(projectRoot, {})).toBe(true);
            await fs.writeFile(dotEnv, `${TYPESAFE_ENV_VAR}=""\nNOT_${TYPESAFE_ENV_VAR}=x\n`);
            expect(await hasTypesafeToken(projectRoot, {})).toBe(false);
            await fs.writeFile(dotEnv, `${TYPESAFE_ENV_VAR}=${fake}\n`);

            await writeRegistry(homeDir, { [TYPESAFE_PLUGIN_ID]: [{ version: '0.5.7' }] });
            const logs: string[] = [];
            const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
                logs.push(args.map(String).join(' '));
            });
            try {
                const result = await setupTypesafeIntegration(projectRoot, {
                    homeDir,
                    runner: recordingRunner().runner,
                    env: {},
                });
                expect(result.tokenPresent).toBe(true);
                reportTypesafe(result);
                expect(JSON.stringify(result)).not.toContain(fake);
                expect(await fs.readFile(result.rulePath, 'utf-8')).not.toContain(fake);
            } finally {
                spy.mockRestore();
            }
            expect(logs.join('\n')).not.toContain(fake);
            expect(process.env[TYPESAFE_ENV_VAR]).toBe(before);
        });

        it('keeps the always-loaded rule within ~90 tokens', () => {
            const rule = renderTypesafeRule();
            expect(rule.startsWith(TYPESAFE_RULE_MARKER)).toBe(true);
            expect(rule).toContain('rulebook_gate');
            expect(rule).toContain(TYPESAFE_ENV_VAR);
            expect(rule).toContain('/typesafe:typesafe-ai');
            expect(rule).toMatch(/never commit/i);
            // Real token count, same tokenizer as context-budget.test.ts (88 at v7.4.0, with the prompt hook line).
            const enc = encoding_for_model('gpt-4');
            try {
                expect(enc.encode(rule).length).toBeLessThanOrEqual(90);
            } finally {
                enc.free();
            }
            expect(rule.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(60);
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

    describe('report', () => {
        function capture(fn: () => void): string[] {
            const logs: string[] = [];
            const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
                logs.push(args.map(String).join(' '));
            });
            try {
                fn();
            } finally {
                spy.mockRestore();
            }
            return logs;
        }

        it('prints one line when the plugin is installed and the key is present', () => {
            const logs = capture(() =>
                reportTypesafe({
                    installed: true,
                    installedNow: false,
                    tokenPresent: true,
                    rulePath: getTypesafeRulePath(projectRoot),
                })
            );
            expect(logs).toHaveLength(1);
            expect(logs[0]).toContain(TYPESAFE_PLUGIN_ID);
        });

        it('prints the key instructions once when the key is missing', () => {
            const logs = capture(() =>
                reportTypesafe({
                    installed: true,
                    installedNow: false,
                    tokenPresent: false,
                    rulePath: getTypesafeRulePath(projectRoot),
                })
            );
            const text = logs.join('\n');
            expect(text.split(TYPESAFE_KEYS_URL)).toHaveLength(2);
            expect(text).toContain('rulebook_gate');
        });
    });

    describe('decideTypesafe (v7.4: on by default)', () => {
        const FIXED = '2026-01-01T00:00:00.000Z';

        async function stored(): Promise<{ enabled: boolean; askedAt?: string } | undefined> {
            return (await new ConfigManager(projectRoot).loadConfig()).integrations?.typesafe;
        }
        async function store(enabled: boolean): Promise<void> {
            await new ConfigManager(projectRoot).updateConfig({
                integrations: { typesafe: { enabled, askedAt: FIXED } },
            });
        }

        it('nothing stored, no flag → enabled and persisted', async () => {
            const decision = await decideTypesafe(new ConfigManager(projectRoot), {});
            expect(decision).toEqual({ enabled: true, asked: false });
            const saved = await stored();
            expect(saved?.enabled).toBe(true);
            expect(saved?.askedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('--typesafe → enabled and persisted, even over a stored "no"', async () => {
            await store(false);
            const decision = await decideTypesafe(new ConfigManager(projectRoot), { flag: true });
            expect(decision.enabled).toBe(true);
            expect((await stored())?.enabled).toBe(true);
        });

        it('--no-typesafe → disabled and persisted, even over a stored "yes"', async () => {
            await store(true);
            const decision = await decideTypesafe(new ConfigManager(projectRoot), { flag: false });
            expect(decision.enabled).toBe(false);
            expect((await stored())?.enabled).toBe(false);
        });

        it('a stored "no" stays "no" without a flag', async () => {
            await store(false);
            const decision = await decideTypesafe(new ConfigManager(projectRoot), {});
            expect(decision.enabled).toBe(false);
            expect(await stored()).toEqual({ enabled: false, askedAt: FIXED });
        });

        it('a stored "yes" is honoured without rewriting it', async () => {
            await store(true);
            const decision = await decideTypesafe(new ConfigManager(projectRoot), {});
            expect(decision.enabled).toBe(true);
            expect(await stored()).toEqual({ enabled: true, askedAt: FIXED });
        });
    });

    describe('runTypesafeStep (init/update)', () => {
        it('without Claude Code: one gray line, nothing decided, persisted or installed', async () => {
            const logs: string[] = [];
            const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
                logs.push(args.map(String).join(' '));
            });
            let outcome: string;
            try {
                outcome = await runTypesafeStep(new ConfigManager(projectRoot), projectRoot, {
                    claudeDetected: false,
                    retireWhenDisabled: true,
                });
            } finally {
                spy.mockRestore();
            }
            expect(outcome).toBe('skipped');
            expect(logs).toHaveLength(1);
            expect(logs[0]).toContain('TypeSafe skipped: Claude Code not detected');
            // No rulebook.json (so no integrations.typesafe) and no rule file.
            expect(await fs.readdir(projectRoot)).toEqual([]);
        });

        it('with Claude Code and a stored "no": disabled, the stored answer kept', async () => {
            await new ConfigManager(projectRoot).updateConfig({
                integrations: { typesafe: { enabled: false } },
            });
            const outcome = await runTypesafeStep(new ConfigManager(projectRoot), projectRoot, {
                claudeDetected: true,
            });
            expect(outcome).toBe('disabled');
            expect(
                (await new ConfigManager(projectRoot).loadConfig()).integrations?.typesafe
            ).toEqual({ enabled: false });
        });
    });
});
