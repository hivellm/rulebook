import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  applyClaudeSettings,
  getClaudeSettingsPath,
} from '../src/core/claude-settings-manager';

describe('claude-settings-manager (v5.3.0 F-NEW-1)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-claude-settings-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('applyClaudeSettings with teamEnforcement', () => {
    it('creates .claude/settings.json with the hook and env var when none exists', async () => {
      const result = await applyClaudeSettings(projectRoot, { teamEnforcement: true });
      expect(result.changed).toBe(true);
      const content = JSON.parse(await fs.readFile(result.path, 'utf-8'));

      expect(content.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
      expect(content.hooks.PreToolUse).toHaveLength(1);
      expect(content.hooks.PreToolUse[0].matcher).toBe('Agent');
      expect(content.hooks.PreToolUse[0].hooks[0].type).toBe('command');
      expect(content.hooks.PreToolUse[0].hooks[0].command).toContain(
        'enforce-team-for-background-agents.sh'
      );
    });

    it('installs the hook scripts into .claude/hooks/', async () => {
      await applyClaudeSettings(projectRoot, { teamEnforcement: true });

      const sh = await fs
        .stat(path.join(projectRoot, '.claude/hooks/enforce-team-for-background-agents.sh'))
        .then(() => true)
        .catch(() => false);
      const ps1 = await fs
        .stat(path.join(projectRoot, '.claude/hooks/enforce-team-for-background-agents.ps1'))
        .then(() => true)
        .catch(() => false);

      expect(sh).toBe(true);
      expect(ps1).toBe(true);
    });

    it('merges into an existing settings.json without touching unrelated keys', async () => {
      const existing = {
        permissions: { defaultMode: 'bypassPermissions', allow: ['Read(*)'] },
        env: { MY_CUSTOM: 'value' },
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] },
          ],
        },
      };
      const target = getClaudeSettingsPath(projectRoot);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, JSON.stringify(existing));

      await applyClaudeSettings(projectRoot, { teamEnforcement: true });
      const after = JSON.parse(await fs.readFile(target, 'utf-8'));

      // Custom keys preserved
      expect(after.permissions.defaultMode).toBe('bypassPermissions');
      expect(after.env.MY_CUSTOM).toBe('value');

      // Custom hook preserved, rulebook hook appended
      expect(after.hooks.PreToolUse).toHaveLength(2);
      const bashHook = after.hooks.PreToolUse.find((h: { matcher?: string }) => h.matcher === 'Bash');
      const agentHook = after.hooks.PreToolUse.find((h: { matcher?: string }) => h.matcher === 'Agent');
      expect(bashHook).toBeDefined();
      expect(agentHook).toBeDefined();

      // Env var added
      expect(after.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
    });

    it('is idempotent: a second apply does not duplicate the hook', async () => {
      await applyClaudeSettings(projectRoot, { teamEnforcement: true });
      const r2 = await applyClaudeSettings(projectRoot, { teamEnforcement: true });

      const content = JSON.parse(await fs.readFile(r2.path, 'utf-8'));
      const agentHooks = content.hooks.PreToolUse.filter((h: { matcher?: string }) => h.matcher === 'Agent');
      expect(agentHooks).toHaveLength(1);

      // Second apply produces no textual change
      expect(r2.changed).toBe(false);
    });

    it('removes the hook when teamEnforcement is turned off', async () => {
      await applyClaudeSettings(projectRoot, { teamEnforcement: true });
      await applyClaudeSettings(projectRoot, { teamEnforcement: false });

      const after = JSON.parse(await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8'));
      expect(after.hooks?.PreToolUse).toBeUndefined();
    });

    it('rejects settings.json that is not valid JSON', async () => {
      const target = getClaudeSettingsPath(projectRoot);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, 'this is not json');

      await expect(
        applyClaudeSettings(projectRoot, { teamEnforcement: true })
      ).rejects.toThrow(/not valid JSON/);
    });
  });
});
