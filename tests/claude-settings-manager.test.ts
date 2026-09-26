import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
} from '../src/core/claude/claude-settings-manager';

const V7_DESIRE = { taskScaffoldingGuard: true, fullAutonomyPermissions: true };

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

    describe('Jev prompt hook (UserPromptSubmit, v7.4)', () => {
        const JEV_DESIRE = { ...V7_DESIRE, jevPromptGate: true };
        const JEV_COMMAND = `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${JEV_GATE_SCRIPT} prompt`;

        async function readSettings() {
            return JSON.parse(await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8'));
        }

        it('upserts exactly one UserPromptSubmit entry with a timeout and installs the LF script', async () => {
            await applyClaudeSettings(projectRoot, JEV_DESIRE);
            const content = await readSettings();
            expect(content.hooks.UserPromptSubmit).toEqual([
                { hooks: [{ type: 'command', command: JEV_COMMAND, timeout: 8 }] },
            ]);
            const buf = await fs.readFile(path.join(projectRoot, '.claude/hooks', JEV_GATE_SCRIPT));
            expect(buf.length).toBeGreaterThan(0);
            expect(buf.includes(0x0d)).toBe(false);
        });

        it('derives the timeout from the configured deadline', async () => {
            await applyClaudeSettings(projectRoot, {
                ...JEV_DESIRE,
                jevPromptGateDeadlineMs: 8500,
            });
            const content = await readSettings();
            expect(content.hooks.UserPromptSubmit[0].hooks[0].timeout).toBe(12);
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
            expect(list[1].hooks[0].command).toBe(JEV_COMMAND);
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
