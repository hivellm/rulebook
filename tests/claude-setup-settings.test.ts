import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  applyClaudeSettings,
  getClaudeSettingsPath,
} from '../src/core/claude/claude-settings-manager';

async function readSettings(dir: string): Promise<Record<string, unknown>> {
  const raw = await fs.readFile(getClaudeSettingsPath(dir), 'utf-8');
  return JSON.parse(raw);
}

describe('claude-settings-manager — rulebook claude setup flags', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-claude-setup-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('permissionsAllowlist', () => {
    it('adds the safe read-only allowlist', async () => {
      await applyClaudeSettings(testDir, { permissionsAllowlist: true });
      const settings = await readSettings(testDir);
      const allow = (settings.permissions as { allow: string[] }).allow;
      expect(allow).toContain('Bash(git status:*)');
      expect(allow).toContain('Bash(grep:*)');
      expect(allow).toContain('mcp__rulebook');
    });

    it('preserves existing user allow entries', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.writeFile(
        getClaudeSettingsPath(testDir),
        JSON.stringify({ permissions: { allow: ['Bash(custom:*)'] } }, null, 2)
      );
      await applyClaudeSettings(testDir, { permissionsAllowlist: true });
      const allow = (
        (await readSettings(testDir)).permissions as { allow: string[] }
      ).allow;
      expect(allow).toContain('Bash(custom:*)');
      expect(allow).toContain('mcp__rulebook');
    });

    it('does not duplicate on repeated apply', async () => {
      await applyClaudeSettings(testDir, { permissionsAllowlist: true });
      await applyClaudeSettings(testDir, { permissionsAllowlist: true });
      const allow = (
        (await readSettings(testDir)).permissions as { allow: string[] }
      ).allow;
      const occurrences = allow.filter((r) => r === 'mcp__rulebook').length;
      expect(occurrences).toBe(1);
    });
  });

  describe('statusLine', () => {
    it('sets a command statusLine when absent', async () => {
      await applyClaudeSettings(testDir, { statusLine: true });
      const settings = await readSettings(testDir);
      const sl = settings.statusLine as { type: string; command: string };
      expect(sl.type).toBe('command');
      expect(sl.command).toContain('git branch');
    });

    it('does not clobber a user-authored statusLine', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.writeFile(
        getClaudeSettingsPath(testDir),
        JSON.stringify({ statusLine: { type: 'command', command: 'mine' } }, null, 2)
      );
      await applyClaudeSettings(testDir, { statusLine: true });
      const sl = (await readSettings(testDir)).statusLine as { command: string };
      expect(sl.command).toBe('mine');
    });
  });

  describe('defaultModel', () => {
    it('sets the model when absent', async () => {
      await applyClaudeSettings(testDir, { defaultModel: 'sonnet' });
      expect((await readSettings(testDir)).model).toBe('sonnet');
    });

    it('does not override an explicit user model', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.writeFile(
        getClaudeSettingsPath(testDir),
        JSON.stringify({ model: 'opus' }, null, 2)
      );
      await applyClaudeSettings(testDir, { defaultModel: 'sonnet' });
      expect((await readSettings(testDir)).model).toBe('opus');
    });

    it('leaves model unset when defaultModel is undefined', async () => {
      await applyClaudeSettings(testDir, { permissionsAllowlist: true });
      expect((await readSettings(testDir)).model).toBeUndefined();
    });
  });

  it('applies the full setup bundle together', async () => {
    await applyClaudeSettings(testDir, {
      teamEnforcement: true,
      sessionHandoff: true,
      qualityEnforcement: true,
      terseMode: true,
      permissionsAllowlist: true,
      statusLine: true,
      defaultModel: 'sonnet',
    });
    const settings = await readSettings(testDir);
    expect(settings.permissions).toBeDefined();
    expect(settings.statusLine).toBeDefined();
    expect(settings.model).toBe('sonnet');
    expect(settings.hooks).toBeDefined();
  });
});
