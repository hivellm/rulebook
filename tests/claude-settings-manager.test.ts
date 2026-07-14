import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    getClaudeSettingsPath,
    FULL_AUTONOMY_PERMISSIONS,
    GUARD_SCRIPT,
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
        it('never wires Stop, UserPromptSubmit, SessionStart, or PreToolUse-Agent hooks', async () => {
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
            expect(
                after.permissions.allow.filter((r: string) => r === 'Bash(*)')
            ).toHaveLength(1);
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

        await expect(applyClaudeSettings(projectRoot, V7_DESIRE)).rejects.toThrow(
            /not valid JSON/
        );
    });
});
