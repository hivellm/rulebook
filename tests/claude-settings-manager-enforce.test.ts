/**
 * Integration tests for the consolidated `qualityEnforcement` PreToolUse
 * hook (v5.6.0).
 *
 * Verifies that enabling qualityEnforcement registers a single
 * `enforce-pre-tool.sh` entry with the `Edit|Write|Bash` matcher (so the
 * hook is not spawned for Read/Glob/Grep/Agent/MCP tool calls), and that
 * stale legacy signatures from older rulebook versions are stripped on
 * every sync.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyClaudeSettings } from '../src/core/claude/claude-settings-manager.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-enforce-settings-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

function readSettings(root: string) {
  return JSON.parse(readFileSync(join(root, '.claude', 'settings.json'), 'utf8'));
}

describe('claude-settings-manager — qualityEnforcement enabled', () => {
  it('registers a single enforce-pre-tool.sh entry under PreToolUse', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const settings = readSettings(projectRoot);
    const entries = settings.hooks?.PreToolUse ?? [];
    const matches = entries.filter((e: { hooks: { command: string }[] }) =>
      e.hooks.some((h) => h.command.includes('enforce-pre-tool.sh'))
    );
    expect(matches.length).toBe(1);
  });

  it('uses matcher "Edit|Write|Bash" so Read/Glob/Grep never spawn the hook', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const settings = readSettings(projectRoot);
    const entry = (settings.hooks?.PreToolUse ?? []).find(
      (e: { hooks: { command: string }[] }) =>
        e.hooks.some((h) => h.command.includes('enforce-pre-tool.sh'))
    );
    expect(entry).toBeDefined();
    expect(entry.matcher).toBe('Edit|Write|Bash');
  });

  it('does NOT register the three legacy enforce scripts', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const settings = readSettings(projectRoot);
    const commands = (settings.hooks?.PreToolUse ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);
    for (const legacy of [
      'enforce-no-deferred',
      'enforce-no-shortcuts',
      'enforce-mcp-for-tasks',
    ]) {
      expect(commands.some((c: string) => c.includes(legacy))).toBe(false);
    }
  });

  it('copies enforce-pre-tool.sh into .claude/hooks/', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const installed = join(projectRoot, '.claude', 'hooks', 'enforce-pre-tool.sh');
    const content = readFileSync(installed, 'utf8');
    // Sanity-check the consolidated script has the three deny tags
    // (no need to match the filename — that's already asserted by readFileSync).
    expect(content).toMatch(/DENY_DEFERRED/);
    expect(content).toMatch(/DENY_TODO/);
    expect(content).toMatch(/DENY_MCP/);
  });

  it('is idempotent — re-applying produces the same settings', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const first = readFileSync(
      join(projectRoot, '.claude', 'settings.json'),
      'utf8'
    );
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const second = readFileSync(
      join(projectRoot, '.claude', 'settings.json'),
      'utf8'
    );
    expect(second).toBe(first);
  });
});

describe('claude-settings-manager — legacy migration', () => {
  it('strips enforce-no-deferred / no-shortcuts / mcp-for-tasks entries on sync', async () => {
    // Seed a settings.json with all three legacy entries already present,
    // simulating a user upgrading from v5.5.x.
    mkdirSync(join(projectRoot, '.claude'), { recursive: true });
    const legacy = {
      hooks: {
        PreToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: 'bash /old/.claude/hooks/enforce-no-deferred.sh',
              },
            ],
          },
          {
            hooks: [
              {
                type: 'command',
                command: 'bash /old/.claude/hooks/enforce-no-shortcuts.sh',
              },
            ],
          },
          {
            hooks: [
              {
                type: 'command',
                command: 'bash /old/.claude/hooks/enforce-mcp-for-tasks.sh',
              },
            ],
          },
        ],
      },
    };
    writeFileSync(
      join(projectRoot, '.claude', 'settings.json'),
      JSON.stringify(legacy, null, 2) + '\n'
    );

    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    const settings = readSettings(projectRoot);
    const commands = (settings.hooks?.PreToolUse ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);
    for (const legacyName of [
      'enforce-no-deferred',
      'enforce-no-shortcuts',
      'enforce-mcp-for-tasks',
    ]) {
      expect(commands.some((c: string) => c.includes(legacyName))).toBe(false);
    }
    expect(commands.some((c: string) => c.includes('enforce-pre-tool.sh'))).toBe(
      true
    );
  });

  it('strips legacy entries even when qualityEnforcement is disabled', async () => {
    mkdirSync(join(projectRoot, '.claude'), { recursive: true });
    const legacy = {
      hooks: {
        PreToolUse: [
          {
            hooks: [
              {
                type: 'command',
                command: 'bash /old/.claude/hooks/enforce-no-deferred.sh',
              },
            ],
          },
        ],
      },
    };
    writeFileSync(
      join(projectRoot, '.claude', 'settings.json'),
      JSON.stringify(legacy, null, 2) + '\n'
    );

    await applyClaudeSettings(projectRoot, { qualityEnforcement: false });
    const settings = readSettings(projectRoot);
    const commands = (settings.hooks?.PreToolUse ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);
    expect(commands.some((c: string) => c.includes('enforce-no-deferred'))).toBe(
      false
    );
  });
});

describe('claude-settings-manager — qualityEnforcement disabled', () => {
  it('removes the enforce-pre-tool.sh entry after disable', async () => {
    await applyClaudeSettings(projectRoot, { qualityEnforcement: true });
    await applyClaudeSettings(projectRoot, { qualityEnforcement: false });

    const settings = readSettings(projectRoot);
    const commands = (settings.hooks?.PreToolUse ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);
    expect(commands.some((c: string) => c.includes('enforce-pre-tool.sh'))).toBe(
      false
    );
  });
});
