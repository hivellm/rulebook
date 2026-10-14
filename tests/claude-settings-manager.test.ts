import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    getClaudeSettingsPath,
    AUTO_APPROVE_PERMISSIONS,
    AUTO_APPROVE_QUESTION,
    decideAutoApprove,
    FULL_AUTONOMY_PERMISSIONS,
    GUARD_SCRIPT,
    JEV_GATE_SCRIPT,
    OS_SCHEDULING_DENY_RULES,
    OS_SCHEDULING_GUARD_SCRIPT,
    removeJevPromptGate,
    resolveAutoApprove,
    resolveHookMain,
    TASK_SCAFFOLDING_IF_RULES,
    TOOL_GATE_SCRIPTS,
    type HookMainTarget,
} from '../src/core/claude/claude-settings-manager';
import type { RulebookConfig } from '../src/types';

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
            const on = await applyClaudeSettings(projectRoot, JEV_DESIRE);
            expect(on.removedHooks).toEqual([]);
            const off = await applyClaudeSettings(projectRoot, V7_DESIRE);
            expect((await readSettings()).hooks.UserPromptSubmit).toBeUndefined();
            expect(off.removedHooks).toEqual([
                `settings.json UserPromptSubmit: node ${HOOK_MAIN.arg} prompt-gate`,
            ]);
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
            expect(list).toHaveLength(2);
            expect(list[0].hooks[0].command).toContain(GUARD_SCRIPT);
            expect(list[1]).toEqual({
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
            expect(list).toHaveLength(1);
        });

        describe('scripts only the gate runs (jev-gate.sh, no-os-scheduling.sh)', () => {
            const hookFile = (name: string) => path.join(projectRoot, '.claude/hooks', name);
            const exists = (name: string) =>
                fs.access(hookFile(name)).then(
                    () => true,
                    () => false
                );
            const OFF = { ...ALL_DESIRE, jevToolGate: undefined };

            it('installs neither without the gate', async () => {
                const result = await applyClaudeSettings(projectRoot, OFF);
                expect(result.removedScripts).toEqual([]);
                for (const name of TOOL_GATE_SCRIPTS) expect(await exists(name), name).toBe(false);
                expect(await exists(GUARD_SCRIPT)).toBe(true);
            });

            it('installs both with the gate (LF endings) next to its PreToolUse entry', async () => {
                const result = await applyClaudeSettings(projectRoot, ALL_DESIRE);
                expect(result.removedScripts).toEqual([]);
                for (const name of TOOL_GATE_SCRIPTS) {
                    const buf = await fs.readFile(hookFile(name));
                    expect(buf.length, name).toBeGreaterThan(0);
                    expect(buf.includes(0x0d), name).toBe(false);
                }
                expect(toolEntries((await readSettings()).hooks.PreToolUse)).toHaveLength(1);
            });

            it('skips the OS-scheduling guard when osSchedulingGuard is off', async () => {
                await applyClaudeSettings(projectRoot, { ...ALL_DESIRE, osSchedulingGuard: false });
                expect(await exists(JEV_GATE_SCRIPT)).toBe(true);
                expect(await exists(OS_SCHEDULING_GUARD_SCRIPT)).toBe(false);
            });

            it('turning the gate off removes unedited copies and reports them, once', async () => {
                await applyClaudeSettings(projectRoot, ALL_DESIRE);
                // A copy with CRLF endings (a Windows checkout) is still unedited.
                const guard = await fs.readFile(hookFile(OS_SCHEDULING_GUARD_SCRIPT), 'utf-8');
                await fs.writeFile(
                    hookFile(OS_SCHEDULING_GUARD_SCRIPT),
                    guard.replace(/\n/g, '\r\n')
                );

                const result = await applyClaudeSettings(projectRoot, OFF);
                expect(result.removedScripts).toEqual(
                    TOOL_GATE_SCRIPTS.map((name) => `.claude/hooks/${name}`)
                );
                for (const name of TOOL_GATE_SCRIPTS) expect(await exists(name), name).toBe(false);
                expect(toolEntries((await readSettings()).hooks.PreToolUse)).toHaveLength(0);

                expect((await applyClaudeSettings(projectRoot, OFF)).removedScripts).toEqual([]);
            });

            it('keeps an edited copy', async () => {
                await applyClaudeSettings(projectRoot, ALL_DESIRE);
                const edited =
                    (await fs.readFile(hookFile(OS_SCHEDULING_GUARD_SCRIPT), 'utf-8')) +
                    '# my local tweak\n';
                await fs.writeFile(hookFile(OS_SCHEDULING_GUARD_SCRIPT), edited);

                const result = await applyClaudeSettings(projectRoot, OFF);
                expect(result.removedScripts).toEqual([`.claude/hooks/${JEV_GATE_SCRIPT}`]);
                expect(await fs.readFile(hookFile(OS_SCHEDULING_GUARD_SCRIPT), 'utf-8')).toBe(
                    edited
                );
            });
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
            expect(s.hooks.PreToolUse).toHaveLength(1);
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

    describe('v7.5 guards to permissions', () => {
        const GUARD_COMMAND = `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${GUARD_SCRIPT}`;
        const FULL = {
            taskScaffoldingGuard: true,
            osSchedulingGuard: true,
            fullAutonomyPermissions: true,
            autoApprove: true,
        };

        async function readSettings() {
            return JSON.parse(await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8'));
        }
        async function writeSettings(value: unknown) {
            const target = getClaudeSettingsPath(projectRoot);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, JSON.stringify(value, null, 2) + '\n');
        }

        it('gates the scaffolding guard with one `if` handler per tool', async () => {
            await applyClaudeSettings(projectRoot, FULL);
            expect((await readSettings()).hooks.PreToolUse).toEqual([
                {
                    matcher: 'Edit|Write',
                    hooks: [
                        {
                            type: 'command',
                            if: 'Edit(**/.rulebook/tasks/**)',
                            command: GUARD_COMMAND,
                        },
                        {
                            type: 'command',
                            if: 'Write(**/.rulebook/tasks/**)',
                            command: GUARD_COMMAND,
                        },
                    ],
                },
            ]);
            expect(TASK_SCAFFOLDING_IF_RULES).toEqual([
                'Edit(**/.rulebook/tasks/**)',
                'Write(**/.rulebook/tasks/**)',
            ]);
        });

        it('deny rules: Bash, PowerShell and Edit paths — never Write(path)', () => {
            for (const rule of [
                'Bash(crontab *)',
                'Bash(at *)',
                'Bash(batch *)',
                'Bash(schtasks *)',
                'Bash(systemctl *.timer*)',
                'Bash(systemd-run *--on-*)',
                'Bash(launchctl load *)',
                'PowerShell(Register-ScheduledTask *)',
                'PowerShell(Register-ScheduledJob *)',
                'Edit(//etc/cron*/**)',
                'Edit(//var/spool/cron/**)',
                'Edit(//etc/systemd/**/*.timer)',
                'Edit(~/.config/systemd/user/*.timer)',
            ]) {
                expect(OS_SCHEDULING_DENY_RULES).toContain(rule);
            }
            for (const rule of OS_SCHEDULING_DENY_RULES) {
                expect(rule).toMatch(/^(Bash|PowerShell|Edit)\(.+\)$/);
                if (rule.startsWith('Edit(')) expect(rule).toMatch(/^Edit\((\/\/|~\/)/);
            }
            expect(new Set(OS_SCHEDULING_DENY_RULES).size).toBe(OS_SCHEDULING_DENY_RULES.length);
        });

        it('autoApprove true: Bash/Edit/Write allow rules, acceptEdits when absent', async () => {
            await applyClaudeSettings(projectRoot, FULL);
            const { permissions } = await readSettings();
            for (const rule of [...AUTO_APPROVE_PERMISSIONS, ...FULL_AUTONOMY_PERMISSIONS]) {
                expect(permissions.allow).toContain(rule);
            }
            expect(permissions.deny).toEqual([...OS_SCHEDULING_DENY_RULES]);
            expect(permissions.defaultMode).toBe('acceptEdits');
        });

        it('autoApprove false: no Bash/Edit/Write allow rules and no defaultMode set', async () => {
            await applyClaudeSettings(projectRoot, { ...FULL, autoApprove: false });
            const { permissions } = await readSettings();
            for (const rule of AUTO_APPROVE_PERMISSIONS) {
                expect(permissions.allow).not.toContain(rule);
            }
            for (const rule of FULL_AUTONOMY_PERMISSIONS) {
                expect(permissions.allow).toContain(rule);
            }
            expect(permissions.defaultMode).toBeUndefined();
        });

        it('toggling autoApprove removes only rulebook-owned rules; user entries stay in order', async () => {
            await writeSettings({
                permissions: {
                    defaultMode: 'acceptEdits',
                    allow: ['Bash(npm test *)', 'Bash(*)', 'mcp__custom'],
                    deny: ['Read(./.env)'],
                    ask: ['Bash(git push *)'],
                },
            });
            await applyClaudeSettings(projectRoot, FULL);
            let { permissions } = await readSettings();
            expect(permissions.allow.slice(0, 3)).toEqual([
                'Bash(npm test *)',
                'Bash(*)',
                'mcp__custom',
            ]);
            expect(permissions.deny).toEqual(['Read(./.env)', ...OS_SCHEDULING_DENY_RULES]);

            await applyClaudeSettings(projectRoot, { ...FULL, autoApprove: false });
            ({ permissions } = await readSettings());
            expect(permissions.allow).toEqual([
                'Bash(npm test *)',
                'mcp__custom',
                ...FULL_AUTONOMY_PERMISSIONS,
            ]);
            expect(permissions.ask).toEqual(['Bash(git push *)']);
            expect(permissions.defaultMode).toBe('acceptEdits'); // user value, never removed

            await applyClaudeSettings(projectRoot, { ...FULL, osSchedulingGuard: false });
            ({ permissions } = await readSettings());
            expect(permissions.deny).toEqual(['Read(./.env)']);
        });

        it('autoApprove absent leaves Bash/Edit/Write entries as they are', async () => {
            await writeSettings({ permissions: { allow: ['Bash(*)'] } });
            await applyClaudeSettings(projectRoot, { ...FULL, autoApprove: undefined });
            const { permissions } = await readSettings();
            expect(permissions.allow).toContain('Bash(*)');
            expect(permissions.allow).not.toContain('Edit(*)');
        });

        it('migrates a 7.4 settings.json: scheduling hook out, deny rules in, allow list unchanged', async () => {
            const allow74 = [
                'Bash(*)',
                'Read(*)',
                'Edit(*)',
                'Write(*)',
                'Glob(*)',
                'Grep(*)',
                'Agent(*)',
                'WebFetch(*)',
                'WebSearch',
                'TodoWrite',
                'mcp__rulebook',
            ];
            await writeSettings({
                hooks: {
                    PreToolUse: [
                        {
                            matcher: 'Bash',
                            hooks: [{ type: 'command', command: 'bash my-hook.sh' }],
                        },
                        {
                            matcher: 'Edit|Write',
                            hooks: [{ type: 'command', command: GUARD_COMMAND }],
                        },
                        {
                            matcher: 'Bash|Edit|Write',
                            hooks: [
                                {
                                    type: 'command',
                                    command: `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${OS_SCHEDULING_GUARD_SCRIPT}`,
                                },
                            ],
                        },
                    ],
                },
                permissions: { allow: allow74, defaultMode: 'acceptEdits' },
            });

            const r1 = await applyClaudeSettings(projectRoot, FULL);
            expect(r1.changed).toBe(true);
            const s = await readSettings();
            expect(JSON.stringify(s.hooks)).not.toContain(OS_SCHEDULING_GUARD_SCRIPT);
            expect(s.hooks.PreToolUse).toHaveLength(2);
            expect(s.hooks.PreToolUse[0]).toEqual({
                matcher: 'Bash',
                hooks: [{ type: 'command', command: 'bash my-hook.sh' }],
            });
            expect(s.hooks.PreToolUse[1].hooks.map((h: { if: string }) => h.if)).toEqual([
                ...TASK_SCAFFOLDING_IF_RULES,
            ]);
            expect(s.permissions.allow).toEqual(allow74);
            expect(s.permissions.deny).toEqual([...OS_SCHEDULING_DENY_RULES]);

            const before = await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8');
            const r2 = await applyClaudeSettings(projectRoot, FULL);
            expect(r2.changed).toBe(false);
            expect(await fs.readFile(r2.path, 'utf-8')).toBe(before);
        });
    });

    describe('permissions.autoApprove decision (rulebook.json)', () => {
        function fakeConfig(initial: Partial<RulebookConfig>) {
            let config = { ...initial } as RulebookConfig;
            const updates: Array<Partial<RulebookConfig>> = [];
            return {
                updates,
                get config() {
                    return config;
                },
                async loadConfig() {
                    return config;
                },
                async updateConfig(u: Partial<RulebookConfig>) {
                    updates.push(u);
                    config = { ...config, ...u };
                    return config;
                },
            };
        }

        it('resolveAutoApprove defaults to true and honours a stored false', () => {
            expect(resolveAutoApprove(null)).toBe(true);
            expect(resolveAutoApprove({})).toBe(true);
            expect(resolveAutoApprove({ permissions: { autoApprove: false } })).toBe(false);
        });

        it('a stored answer is returned without asking or writing', async () => {
            const cm = fakeConfig({ permissions: { autoApprove: false } });
            let asked = false;
            const ask = async () => {
                asked = true;
                return true;
            };
            expect(await decideAutoApprove(cm, ask)).toBe(false);
            expect(asked).toBe(false);
            expect(cm.updates).toHaveLength(0);
        });

        it('absent + interactive: asks once and records the answer', async () => {
            const cm = fakeConfig({});
            expect(await decideAutoApprove(cm, async () => false)).toBe(false);
            expect(cm.config.permissions).toEqual({ autoApprove: false });
            // Asked once: the next run reads the stored answer.
            expect(await decideAutoApprove(cm, async () => true)).toBe(false);
            expect(cm.updates).toHaveLength(1);
        });

        it('absent + --yes / non-interactive: true, recorded', async () => {
            const cm = fakeConfig({});
            expect(await decideAutoApprove(cm)).toBe(true);
            expect(cm.config.permissions).toEqual({ autoApprove: true });
        });

        it('asks the documented question', () => {
            expect(AUTO_APPROVE_QUESTION).toBe(
                "Rulebook's guards auto-approved Bash/Edit/Write until 7.4. Keep that?"
            );
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
