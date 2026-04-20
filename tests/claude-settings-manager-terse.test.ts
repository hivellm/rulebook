/**
 * Integration tests for the `terseMode` branch of claude-settings-manager.
 *
 * Verifies that enabling terseMode produces the correct settings.json
 * structure and copies the terse shell + PowerShell hooks into the
 * project's `.claude/hooks/` directory. Complements the existing
 * `claude-settings-manager.test.ts` which covers the other desire flags.
 *
 * The hooks are pure bash / PowerShell (templates/hooks/terse-*.sh +
 * terse-*.ps1) — no compiled JS is involved, matching Rulebook's
 * existing hook convention.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { applyClaudeSettings } from '../src/core/claude-settings-manager.js';

const ROOT = resolve(__dirname, '..');

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-terse-settings-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('claude-settings-manager — terseMode enabled', () => {
  it('writes settings.json with SessionStart + UserPromptSubmit hooks', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );

    expect(Array.isArray(settings.hooks?.SessionStart)).toBe(true);
    expect(Array.isArray(settings.hooks?.UserPromptSubmit)).toBe(true);
  });

  it('SessionStart hook invokes terse-activate.sh via bash', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const commands = (settings.hooks?.SessionStart ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);

    expect(commands.some((c: string) => /bash .*terse-activate\.sh/.test(c))).toBe(true);
  });

  it('UserPromptSubmit hook invokes terse-mode-tracker.sh via bash', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const commands = (settings.hooks?.UserPromptSubmit ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);

    expect(commands.some((c: string) => /bash .*terse-mode-tracker\.sh/.test(c))).toBe(true);
  });

  it('copies both .sh + .ps1 variants into .claude/hooks/', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const hookDir = join(projectRoot, '.claude', 'hooks');
    for (const name of [
      'terse-activate.sh',
      'terse-activate.ps1',
      'terse-mode-tracker.sh',
      'terse-mode-tracker.ps1',
    ]) {
      expect(existsSync(join(hookDir, name)), `missing ${name}`).toBe(true);
    }
  });

  it('copied hooks match template content byte-for-byte', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const installed = join(projectRoot, '.claude', 'hooks', 'terse-activate.sh');
    const source = join(ROOT, 'templates', 'hooks', 'terse-activate.sh');
    expect(readFileSync(installed, 'utf8')).toBe(readFileSync(source, 'utf8'));
  });

  it('is idempotent — re-applying produces the same settings + files', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const first = readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8');
    await applyClaudeSettings(projectRoot, { terseMode: true });
    const second = readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8');
    expect(second).toBe(first);
  });
});

describe('claude-settings-manager — terseMode disabled removes entries', () => {
  it('disabling after enabling strips the hook entries from settings.json', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true });
    await applyClaudeSettings(projectRoot, { terseMode: false });

    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const sessionStart = settings.hooks?.SessionStart ?? [];
    const userPromptSubmit = settings.hooks?.UserPromptSubmit ?? [];

    const hasTerseActivate = sessionStart
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .some((h: { command: string }) => h.command.includes('terse-activate.sh'));
    const hasTracker = userPromptSubmit
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .some((h: { command: string }) => h.command.includes('terse-mode-tracker.sh'));

    expect(hasTerseActivate).toBe(false);
    expect(hasTracker).toBe(false);
  });
});

describe('claude-settings-manager — terseMode does not collide with other hooks', () => {
  it('terseMode + sessionHandoff coexist in SessionStart', async () => {
    await applyClaudeSettings(projectRoot, { terseMode: true, sessionHandoff: true });
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const commands = (settings.hooks?.SessionStart ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);

    expect(commands.some((c: string) => c.includes('terse-activate.sh'))).toBe(true);
    expect(commands.some((c: string) => c.includes('resume-from-handoff.sh'))).toBe(true);
  });

  it('terseMode + compactContextReinject coexist in SessionStart', async () => {
    await applyClaudeSettings(projectRoot, {
      terseMode: true,
      compactContextReinject: true,
    });
    const settings = JSON.parse(
      readFileSync(join(projectRoot, '.claude', 'settings.json'), 'utf8')
    );
    const commands = (settings.hooks?.SessionStart ?? [])
      .flatMap((e: { hooks: { command: string }[] }) => e.hooks)
      .map((h: { command: string }) => h.command);

    expect(commands.some((c: string) => c.includes('terse-activate.sh'))).toBe(true);
    expect(commands.some((c: string) => c.includes('on-compact-reinject.sh'))).toBe(true);
  });
});
