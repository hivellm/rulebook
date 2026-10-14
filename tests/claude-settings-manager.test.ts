import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    getClaudeSettingsPath,
    FULL_AUTONOMY_PERMISSIONS,
    GUARD_SCRIPT,
    JEV_GATE_SCRIPT,
    removeJevPromptGate,
    resolveHookMain,
    type HookMainTarget,
} from '../src/core/claude/claude-settings-manager';

const V7_DESIRE = { taskScaffoldingGuard: true, fullAutonomyPermissions: true };
/** A resolved prompt-hook entry, so these tests never look for a real install. */
const HOOK_MAIN: HookMainTarget = {
    arg: '${CLAUDE_PROJECT_DIR}/node_modules/@hivehub/rulebook/dist/cli/hook-main.js',
    path: '/unused',
    source: 'project',
};

describe('claude-settings-manager (v7)', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-claude-settings-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    describe('task scaffolding guard', () => {
        it('creates settings.json with exactly one PreToolUse Edit|Write guard', async () => {
            const result = await applyClaudeSettings(projectRoot, V7_DESIRE);
            expect(result.changed).toBe(true);
            const content = JSON.parse(await fs.readFile(result.path, 'utf-8'));

            expect(content.hooks.PreToolUse).toHaveLength(1);
            expect(content.hooks.PreToolUse[0].matcher).toBe('Edit|Write');
            expect(content.hooks.PreToolUse[0].hooks[0].command).toContain(GUARD_SCRIPT);
        });

        it('installs the guard script into .claude/hooks/ with LF endings', async () => {
            await applyClaudeSettings(projectRoot, V7_DESIRE);
            const scriptPath = path.join(projectRoot, '.claude/hooks', GUARD_SCRIPT);
            const buf = await fs.readFile(scriptPath);
            expect(buf.length).toBeGreaterThan(0);
            expect(buf.includes(0x0d), 'CRLF would crash bash on macOS/Linux').toBe(false);
        });

        it('is idempotent: a second apply changes nothing and does not duplicate', async () => {
            await applyClaudeSettings(projectRoot, V7_DESIRE);
            const r2 = await applyClaudeSettings(projectRoot, V7_DESIRE);
            expect(r2.changed).toBe(false);
            const content = JSON.parse(await fs.readFile(r2.path, 'utf-8'));
            expect(content.hooks.PreToolUse).toHaveLength(1);
        });

        it('removes the guard when the desire is off', async () => {
            await applyClaudeSettings(projectRoot, V7_DESIRE);
            await applyClaudeSettings(projectRoot, { taskScaffoldingGuard: false });
            const after = JSON.parse(
                await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8')
            );
            expect(after.hooks?.PreToolUse).toBeUndefined();
        });
    });

    describe('hook audit (F-002/P0 — acceptance check 2)', () => {
        it('never wires Stop, SessionStart, or PreToolUse-Agent hooks; UserPromptSubmit only on request', async () => {
            await applyClaudeSettings(projectRoot, { ...V7_DESIRE, teamsEnv: true });
            const content = JSON.parse(
                await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8')
            );

            expect(content.hooks?.Stop).toBeUndefined();
            expect(content.hooks?.UserPromptSubmit).toBeUndefined();
            expect(content.hooks?.SessionStart).toBeUndefined();
            const agentMatchers = (content.hooks?.PreToolUse ?? []).filter(
                (h: { matcher?: string }) => h.matcher === 'Agent'
            );
            expect(agentMatchers).toHaveLength(0);
        });

        it('strips every retired v5/v6 hook signature on sync', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(
                target,
                JSON.stringify({
                    hooks: {
                        PreToolUse: [
                            {
                                matcher: 'Agent',
                                hooks: [
                                    {
                                        type: 'command',
                                        command:
                                            'bash .claude/hooks/enforce-team-for-background-agents.sh',
                                    },
                                ],
                            },
                            {
                                matcher: 'Edit|Write',
                                hooks: [
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/enforce-pre-tool.sh',
                                    },
                                ],
                            },
                        ],
                        Stop: [
                            {
                                hooks: [
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/check-context-and-handoff.sh',
                                    },
                                ],
                            },
                        ],
                        SessionStart: [
                            {
                                hooks: [
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/resume-from-handoff.sh',
                                    },
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/terse-activate.sh',
                                    },
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/update-check.sh',
                                    },
                                ],
                            },
                        ],
                        UserPromptSubmit: [
                            {
                                hooks: [
                                    {
                                        type: 'command',
                                        command: 'bash .claude/hooks/terse-mode-tracker.sh',
                                    },
                                ],
                            },
                        ],
                    },
                })
            );

            await applyClaudeSettings(projectRoot, V7_DESIRE);
            const after = JSON.parse(await fs.readFile(target, 'utf-8'));

            expect(after.hooks.Stop).toBeUndefined();
            expect(after.hooks.SessionStart).toBeUndefined();
            expect(after.hooks.UserPromptSubmit).toBeUndefined();
            expect(after.hooks.PreToolUse).toHaveLength(1);
            expect(after.hooks.PreToolUse[0].hooks[0].command).toContain(GUARD_SCRIPT);
        });
    });

    describe('Jev prompt hook (UserPromptSubmit, exec form since v7.5)', () => {
        const JEV_DESIRE = { ...V7_DESIRE, jevPromptGate: true, hookMain: HOOK_MAIN };
        const JEV_HOOK = {
            type: 'command',
            command: 'node',
            args: [HOOK_MAIN.arg, 'prompt-gate'],
            timeout: 3,
        };

        async function readSettings() {
            return JSON.parse(await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8'));
        }

        it('upserts exactly one exec-form entry (node + hook-main.js, no shell) with a timeout', async () => {
            const result = await applyClaudeSettings(projectRoot, JEV_DESIRE);
            expect(result.warnings).toEqual([]);
            const content = await readSettings();
            expect(content.hooks.UserPromptSubmit).toEqual([{ hooks: [JEV_HOOK] }]);
            // The bash wrapper is installed only for the tool gate now.
            await expect(
                fs.access(path.join(projectRoot, '.claude/hooks', JEV_GATE_SCRIPT))
            ).rejects.toThrow();
        });

        it('replaces a v7.4 wrapper entry with the exec-form entry', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            const legacy = {
                hooks: [
                    {
                        type: 'command',
                        command: `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${JEV_GATE_SCRIPT} prompt`,
                        timeout: 8,
                    },
                ],
            };
            await fs.writeFile(target, JSON.stringify({ hooks: { UserPromptSubmit: [legacy] } }));
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            expect((await readSettings()).hooks.UserPromptSubmit).toEqual([{ hooks: [JEV_HOOK] }]);
        });

        it('no loadable hook entry → no hook, an existing one removed, and a warning', async () => {
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            const result = await applyClaudeSettings(projectRoot, {
                ...JEV_DESIRE,
                hookMain: null,
            });
            expect((await readSettings()).hooks.UserPromptSubmit).toBeUndefined();
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toMatch(/Jev prompt hook not installed.*npm i -D/);
        });

        it('derives the timeout from the configured deadline', async () => {
            await applyClaudeSettings(projectRoot, {
                ...JEV_DESIRE,
                jevPromptGateDeadlineMs: 8500,
            });
            const content = await readSettings();
            expect(content.hooks.UserPromptSubmit[0].hooks[0].timeout).toBe(10);
        });

        it('is idempotent: a second apply leaves the file byte-identical', async () => {
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            const before = await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8');
            const r2 = await applyClaudeSettings(projectRoot, JEV_DESIRE);
            expect(r2.changed).toBe(false);
            expect(await fs.readFile(r2.path, 'utf-8')).toBe(before);
            expect((await readSettings()).hooks.UserPromptSubmit).toHaveLength(1);
        });

        it('keeps user UserPromptSubmit hooks first and unchanged', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            const userEntry = { hooks: [{ type: 'command', command: 'bash my-hook.sh' }] };
            await fs.writeFile(
                target,
                JSON.stringify({ hooks: { UserPromptSubmit: [userEntry] } }, null, 2) + '\n'
            );
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            const list = (await readSettings()).hooks.UserPromptSubmit;
            expect(list).toHaveLength(2);
            expect(list[0]).toEqual(userEntry);
            expect(list[1].hooks[0]).toEqual(JEV_HOOK);
        });

        it('removes the entry when the toggle is off and drops an empty event key', async () => {
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            await applyClaudeSettings(projectRoot, V7_DESIRE);
            expect((await readSettings()).hooks.UserPromptSubmit).toBeUndefined();
        });

        it('removeJevPromptGate drops only the jev-gate entry', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            const userEntry = { hooks: [{ type: 'command', command: 'bash my-hook.sh' }] };
            await fs.writeFile(
                target,
                JSON.stringify({ hooks: { UserPromptSubmit: [userEntry] } })
            );
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            const withGuards = await readSettings();

            expect(await removeJevPromptGate(projectRoot)).toBe(true);
            const after = await readSettings();
            expect(after.hooks.UserPromptSubmit).toEqual([userEntry]);
            expect(after.hooks.PreToolUse).toEqual(withGuards.hooks.PreToolUse);
            expect(await removeJevPromptGate(projectRoot)).toBe(false);
        });
    });

    describe('resolveHookMain (install-time hook entry resolution)', () => {
        const ENTRY = ['dist', 'cli', 'hook-main.js'];
        const PKG = ['node_modules', '@hivehub', 'rulebook'];
        const anyValid = async () => true;

        async function touch(...parts: string[]): Promise<string> {
            const file = path.join(...parts);
            await fs.mkdir(path.dirname(file), { recursive: true });
            await fs.writeFile(file, '');
            return file;
        }

        it("prefers the project's node_modules, named via ${CLAUDE_PROJECT_DIR}", async () => {
            const file = await touch(projectRoot, ...PKG, ...ENTRY);
            const global = vi.fn(async () => null);
            expect(
                await resolveHookMain(projectRoot, { validate: anyValid, globalRoot: global })
            ).toEqual({
                arg: '${CLAUDE_PROJECT_DIR}/node_modules/@hivehub/rulebook/dist/cli/hook-main.js',
                path: file,
                source: 'project',
            });
            expect(global).not.toHaveBeenCalled();
        });

        it("uses the rulebook repo's own build only when package.json is @hivehub/rulebook", async () => {
            const file = await touch(projectRoot, ...ENTRY);
            const none = async () => null;
            await fs.writeFile(
                path.join(projectRoot, 'package.json'),
                JSON.stringify({ name: 'other-app' })
            );
            expect(
                await resolveHookMain(projectRoot, { validate: anyValid, globalRoot: none })
            ).toBeNull();
            await fs.writeFile(
                path.join(projectRoot, 'package.json'),
                JSON.stringify({ name: '@hivehub/rulebook' })
            );
            expect(
                await resolveHookMain(projectRoot, { validate: anyValid, globalRoot: none })
            ).toEqual({
                arg: '${CLAUDE_PROJECT_DIR}/dist/cli/hook-main.js',
                path: file,
                source: 'self',
            });
        });

        it('falls back to the global install, by absolute path', async () => {
            const globalRoot = path.join(projectRoot, 'global-root');
            const file = await touch(globalRoot, '@hivehub', 'rulebook', ...ENTRY);
            expect(
                await resolveHookMain(projectRoot, {
                    validate: anyValid,
                    globalRoot: async () => globalRoot,
                })
            ).toEqual({ arg: file, path: file, source: 'global' });
        });

        it('skips a candidate that does not load (node <entry> --check fails)', async () => {
            const globalRoot = path.join(projectRoot, 'global-root');
            await touch(projectRoot, ...PKG, ...ENTRY);
            const good = await touch(globalRoot, '@hivehub', 'rulebook', ...ENTRY);
            await fs.writeFile(good, "if (process.argv[2] !== '--check') process.exit(2);\n");
            const broken = path.join(projectRoot, ...PKG, ...ENTRY);
            await fs.writeFile(broken, "throw new Error('Cannot find module x');\n");
            const target = await resolveHookMain(projectRoot, {
                globalRoot: async () => globalRoot,
            });
            expect(target).toMatchObject({ source: 'global', path: good });
        });

        it('nothing found → null', async () => {
            expect(
                await resolveHookMain(projectRoot, {
                    validate: anyValid,
                    globalRoot: async () => null,
                })
            ).toBeNull();
        });
    });

    describe('Jev tool gate (PreToolUse, v7.4)', () => {
        const TOOL = { matcher: 'Bash|Edit|Write', timeoutSec: 4 };
        const ALL_DESIRE = { ...V7_DESIRE, osSchedulingGuard: true, jevToolGate: TOOL };
        const TOOL_COMMAND = `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${JEV_GATE_SCRIPT} tool`;
        const PROMPT_ARGS = [HOOK_MAIN.arg, 'prompt-gate'];

        async function readSettings() {
            return JSON.parse(await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8'));
        }
        const toolEntries = (list: Array<{ hooks: Array<{ command: string }> }>) =>
            list.filter((e) => e.hooks.some((h) => h.command === TOOL_COMMAND));

        it('upserts one PreToolUse entry after the guards, with matcher and timeout, idempotently', async () => {
            await applyClaudeSettings(projectRoot, ALL_DESIRE);
            const before = await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8');
            const list = (await readSettings()).hooks.PreToolUse;
            expect(list).toHaveLength(3);
            expect(list[0].hooks[0].command).toContain(GUARD_SCRIPT);
            expect(list[1].hooks[0].command).toContain('no-os-scheduling.sh');
            expect(list[2]).toEqual({
                matcher: 'Bash|Edit|Write',
                hooks: [{ type: 'command', command: TOOL_COMMAND, timeout: 4 }],
            });
            const buf = await fs.readFile(path.join(projectRoot, '.claude/hooks', JEV_GATE_SCRIPT));
            expect(buf.includes(0x0d)).toBe(false);

            const r2 = await applyClaudeSettings(projectRoot, ALL_DESIRE);
            expect(r2.changed).toBe(false);
            expect(await fs.readFile(r2.path, 'utf-8')).toBe(before);
        });

        it('uses a custom matcher; a second run reports changed: false', async () => {
            const desire = { ...ALL_DESIRE, jevToolGate: { matcher: 'Bash', timeoutSec: 4 } };
            await applyClaudeSettings(projectRoot, desire);
            const entries = toolEntries((await readSettings()).hooks.PreToolUse);
            expect(entries).toHaveLength(1);
            expect(entries[0].matcher).toBe('Bash');
            expect((await applyClaudeSettings(projectRoot, desire)).changed).toBe(false);
        });

        it('keeps user PreToolUse hooks first and unchanged', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            const userEntry = {
                matcher: 'Bash',
                hooks: [{ type: 'command', command: 'bash my-bash-hook.sh' }],
            };
            await fs.writeFile(
                target,
                JSON.stringify({ hooks: { PreToolUse: [userEntry] } }, null, 2) + '\n'
            );
            await applyClaudeSettings(projectRoot, ALL_DESIRE);
            await applyClaudeSettings(projectRoot, ALL_DESIRE);
            const list = (await readSettings()).hooks.PreToolUse;
            expect(list[0]).toEqual(userEntry);
            expect(toolEntries(list)).toHaveLength(1);
            expect(list[list.length - 1].hooks[0].command).toBe(TOOL_COMMAND);
        });

        it('is removed when disabled, leaving the guards', async () => {
            await applyClaudeSettings(projectRoot, ALL_DESIRE);
            await applyClaudeSettings(projectRoot, { ...ALL_DESIRE, jevToolGate: undefined });
            const list = (await readSettings()).hooks.PreToolUse;
            expect(toolEntries(list)).toHaveLength(0);
            expect(list).toHaveLength(2);
        });

        it('prompt and tool entries are independent: toggling one never removes the other', async () => {
            const both = { ...ALL_DESIRE, jevPromptGate: true, hookMain: HOOK_MAIN };
            await applyClaudeSettings(projectRoot, both);
            let s = await readSettings();
            expect(s.hooks.UserPromptSubmit[0].hooks[0].args).toEqual(PROMPT_ARGS);
            expect(toolEntries(s.hooks.PreToolUse)).toHaveLength(1);

            await applyClaudeSettings(projectRoot, { ...both, jevToolGate: undefined });
            s = await readSettings();
            expect(s.hooks.UserPromptSubmit[0].hooks[0].args).toEqual(PROMPT_ARGS);
            expect(toolEntries(s.hooks.PreToolUse)).toHaveLength(0);

            await applyClaudeSettings(projectRoot, { ...both, jevPromptGate: false });
            s = await readSettings();
            expect(s.hooks.UserPromptSubmit).toBeUndefined();
            expect(toolEntries(s.hooks.PreToolUse)).toHaveLength(1);
            // The tool gate alone still installs the wrapper script.
            await fs.access(path.join(projectRoot, '.claude/hooks', JEV_GATE_SCRIPT));
        });

        it('an existing phase-2 install (prompt entry only) stays idempotent', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            const promptOnly = {
                ...V7_DESIRE,
                osSchedulingGuard: true,
                jevPromptGate: true,
                hookMain: HOOK_MAIN,
            };
            await applyClaudeSettings(projectRoot, promptOnly);
            const before = await fs.readFile(target, 'utf-8');
            const r2 = await applyClaudeSettings(projectRoot, promptOnly);
            expect(r2.changed).toBe(false);
            expect(await fs.readFile(target, 'utf-8')).toBe(before);
            expect(toolEntries((await readSettings()).hooks.PreToolUse)).toHaveLength(0);
        });

        it('removeJevPromptGate (TypeSafe opted out) drops both Jev entries only', async () => {
            await applyClaudeSettings(projectRoot, {
                ...ALL_DESIRE,
                jevPromptGate: true,
                hookMain: HOOK_MAIN,
            });
            expect(await removeJevPromptGate(projectRoot)).toBe(true);
            const s = await readSettings();
            expect(s.hooks.UserPromptSubmit).toBeUndefined();
            expect(toolEntries(s.hooks.PreToolUse)).toHaveLength(0);
            expect(s.hooks.PreToolUse).toHaveLength(2);
        });
    });

    describe('full-autonomy permissions (F-011 — acceptance check 6)', () => {
        it('adds the full allow set and defaultMode acceptEdits when absent', async () => {
            await applyClaudeSettings(projectRoot, V7_DESIRE);
            const content = JSON.parse(
                await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8')
            );

            expect(content.permissions.defaultMode).toBe('acceptEdits');
            for (const rule of FULL_AUTONOMY_PERMISSIONS) {
                expect(content.permissions.allow).toContain(rule);
            }
        });

        it('never removes or tightens user-authored permissions', async () => {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(
                target,
                JSON.stringify({
                    permissions: {
                        defaultMode: 'bypassPermissions',
                        allow: ['mcp__custom', 'Bash(*)'],
                        deny: ['WebFetch(domain:evil.com)'],
                    },
                    env: { MY_CUSTOM: 'value' },
                })
            );

            await applyClaudeSettings(projectRoot, V7_DESIRE);
            const after = JSON.parse(await fs.readFile(target, 'utf-8'));

            // User defaultMode wins (never overwritten)
            expect(after.permissions.defaultMode).toBe('bypassPermissions');
            // User rules preserved, no duplicates, new rules appended
            expect(after.permissions.allow).toContain('mcp__custom');
            expect(after.permissions.allow.filter((r: string) => r === 'Bash(*)')).toHaveLength(1);
            expect(after.permissions.deny).toContain('WebFetch(domain:evil.com)');
            expect(after.env.MY_CUSTOM).toBe('value');
        });
    });

    describe('teams env (feature enable, never enforcement)', () => {
        it('sets the env var without wiring any Agent hook', async () => {
            await applyClaudeSettings(projectRoot, { teamsEnv: true });
            const content = JSON.parse(
                await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8')
            );
            expect(content.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
            expect(content.hooks).toBeUndefined();
        });
    });

    it('preserves unrelated custom hooks', async () => {
        const target = getClaudeSettingsPath(projectRoot);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(
            target,
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
                    ],
                },
            })
        );

        await applyClaudeSettings(projectRoot, V7_DESIRE);
        const after = JSON.parse(await fs.readFile(target, 'utf-8'));
        const custom = after.hooks.PreToolUse.find(
            (h: { matcher?: string }) => h.matcher === 'Bash'
        );
        expect(custom).toBeDefined();
        expect(after.hooks.PreToolUse).toHaveLength(2);
    });

    it('rejects settings.json that is not valid JSON', async () => {
        const target = getClaudeSettingsPath(projectRoot);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, 'this is not json');

        await expect(applyClaudeSettings(projectRoot, V7_DESIRE)).rejects.toThrow(/not valid JSON/);
    });
});
