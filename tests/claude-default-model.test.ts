import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * v7.4 — `rulebook claude` writes `opus` as the default model into
 * .claude/settings.json when none is configured; an explicit `--model` wins.
 * The integration installer and TypeSafe step are mocked so the command's own
 * model resolution is exercised without touching ~/.claude.
 */

const { applyClaudeSettingsMock } = vi.hoisted(() => ({
    applyClaudeSettingsMock: vi.fn(async (..._args: unknown[]) => undefined),
}));

vi.mock('../src/core/claude/claude-mcp.js', () => ({
    setupClaudeCodeIntegration: vi.fn(async () => ({
        detected: true,
        mcpConfigured: false,
        skillsInstalled: [],
        devSkillsInstalled: [],
        agentDefinitionsInstalled: [],
        workflowDefinitionsInstalled: [],
    })),
}));

vi.mock('../src/core/claude/claude-settings-manager.js', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('../src/core/claude/claude-settings-manager.js')>();
    return { ...actual, applyClaudeSettings: applyClaudeSettingsMock };
});

vi.mock('../src/cli/commands/typesafe.js', () => ({
    decideTypesafe: vi.fn(async () => ({ enabled: false })),
    applyTypesafe: vi.fn(async () => undefined),
}));

import { claudeSetupCommand, DEFAULT_CLAUDE_MODEL } from '../src/cli/commands/claude.js';

describe('rulebook claude — default model (v7.4)', () => {
    let logSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        applyClaudeSettingsMock.mockClear();
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it('should use opus as the default model constant', () => {
        expect(DEFAULT_CLAUDE_MODEL).toBe('opus');
    });

    it('should write opus when no --model is given', async () => {
        await claudeSetupCommand({});
        expect(applyClaudeSettingsMock).toHaveBeenCalledTimes(1);
        const [, opts] = applyClaudeSettingsMock.mock.calls[0] as unknown as [
            string,
            { defaultModel?: string },
        ];
        expect(opts.defaultModel).toBe('opus');
    });

    it('should let an explicit --model win over the default', async () => {
        await claudeSetupCommand({ model: 'haiku' });
        const [, opts] = applyClaudeSettingsMock.mock.calls[0] as unknown as [
            string,
            { defaultModel?: string },
        ];
        expect(opts.defaultModel).toBe('haiku');
    });

    it('should advertise the default model in the CLI help text', async () => {
        const src = await fs.readFile(path.join(__dirname, '..', 'src', 'index.ts'), 'utf-8');
        expect(src).toContain('(default: ${DEFAULT_CLAUDE_MODEL})');
        expect(src).not.toMatch(/default: sonnet/);
    });
});

describe('applyClaudeSettings — default model written to settings.json', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-claude-model-'));
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should write the default model when settings.json has none', async () => {
        const { applyClaudeSettings, getClaudeSettingsPath } = await vi.importActual<
            typeof import('../src/core/claude/claude-settings-manager.js')
        >('../src/core/claude/claude-settings-manager.js');
        await applyClaudeSettings(testDir, { defaultModel: DEFAULT_CLAUDE_MODEL });
        const settings = JSON.parse(await fs.readFile(getClaudeSettingsPath(testDir), 'utf-8'));
        expect(settings.model).toBe('opus');
    });
});
