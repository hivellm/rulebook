import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    getClaudeSettingsPath,
} from '../src/core/claude/claude-settings-manager';

async function readSettings(dir: string): Promise<Record<string, any>> {
    const raw = await fs.readFile(getClaudeSettingsPath(dir), 'utf-8');
    return JSON.parse(raw);
}

describe('claude-settings-manager — rulebook claude setup flags (v7)', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-claude-setup-'));
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('statusLine', () => {
        it('sets a command statusLine when absent', async () => {
            await applyClaudeSettings(testDir, { statusLine: true });
            const settings = await readSettings(testDir);
            expect(settings.statusLine.type).toBe('command');
            expect(settings.statusLine.command).toContain('git branch --show-current');
        });

        it('never clobbers a user-authored statusLine', async () => {
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
            await fs.writeFile(
                getClaudeSettingsPath(testDir),
                JSON.stringify({ statusLine: { type: 'command', command: 'echo mine' } })
            );
            await applyClaudeSettings(testDir, { statusLine: true });
            const settings = await readSettings(testDir);
            expect(settings.statusLine.command).toBe('echo mine');
        });
    });

    describe('defaultModel', () => {
        it('sets the model when absent', async () => {
            await applyClaudeSettings(testDir, { defaultModel: 'claude-sonnet-5' });
            const settings = await readSettings(testDir);
            expect(settings.model).toBe('claude-sonnet-5');
        });

        it('respects an explicit user model choice', async () => {
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
            await fs.writeFile(
                getClaudeSettingsPath(testDir),
                JSON.stringify({ model: 'claude-opus-4-8' })
            );
            await applyClaudeSettings(testDir, { defaultModel: 'claude-sonnet-5' });
            const settings = await readSettings(testDir);
            expect(settings.model).toBe('claude-opus-4-8');
        });
    });
});
