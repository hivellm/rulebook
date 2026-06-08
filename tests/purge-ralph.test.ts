import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { purgeLegacyRalphArtifacts } from '../src/cli/commands/update.js';

describe('purgeLegacyRalphArtifacts', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'rb-ralph-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('removes the ralph history dir, scripts, slash commands, and cursor rule', async () => {
    mkdirSync(join(root, '.rulebook', 'ralph'), { recursive: true });
    writeFileSync(join(root, '.rulebook', 'ralph', 'history.json'), '{}');
    mkdirSync(join(root, '.rulebook', 'scripts'), { recursive: true });
    writeFileSync(join(root, '.rulebook', 'scripts', 'ralph-history.sh'), '#');
    writeFileSync(join(root, '.rulebook', 'scripts', 'ralph-history.bat'), '@echo');
    writeFileSync(join(root, '.rulebook', 'scripts', 'keep-me.sh'), '#');
    mkdirSync(join(root, '.claude', 'commands'), { recursive: true });
    writeFileSync(join(root, '.claude', 'commands', 'ralph-run.md'), '#');
    writeFileSync(join(root, '.claude', 'commands', 'handoff.md'), '#');
    mkdirSync(join(root, '.cursor', 'rules'), { recursive: true });
    writeFileSync(join(root, '.cursor', 'rules', 'ralph.mdc'), '#');

    const removed = await purgeLegacyRalphArtifacts(root);

    expect(removed).toContain('.rulebook/ralph/');
    expect(removed).toContain('.rulebook/scripts/ralph-history.sh');
    expect(removed).toContain('.rulebook/scripts/ralph-history.bat');
    expect(removed).toContain('.claude/commands/ralph-run.md');
    expect(removed).toContain('.cursor/rules/ralph.mdc');

    expect(existsSync(join(root, '.rulebook', 'ralph'))).toBe(false);
    expect(existsSync(join(root, '.rulebook', 'scripts', 'ralph-history.sh'))).toBe(false);
    expect(existsSync(join(root, '.cursor', 'rules', 'ralph.mdc'))).toBe(false);

    // Non-ralph files are preserved.
    expect(existsSync(join(root, '.rulebook', 'scripts', 'keep-me.sh'))).toBe(true);
    expect(existsSync(join(root, '.claude', 'commands', 'handoff.md'))).toBe(true);
  });

  it('is a no-op on a project with no ralph artifacts', async () => {
    const removed = await purgeLegacyRalphArtifacts(root);
    expect(removed).toEqual([]);
  });
});
