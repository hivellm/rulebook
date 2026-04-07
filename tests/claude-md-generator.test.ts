import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  generateClaudeMd,
  getClaudeMdPath,
  hasV2Sentinels,
  writeClaudeMd,
  CLAUDE_MD_SENTINEL_START,
  CLAUDE_MD_SENTINEL_END,
} from '../src/core/claude-md-generator';
import { mergeClaudeMd } from '../src/core/merger';

describe('claude-md-generator (v5.3.0)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-claude-md-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('generateClaudeMd', () => {
    it('produces a file under the 200-line Anthropic budget', async () => {
      const content = await generateClaudeMd(projectRoot);
      const lineCount = content.split('\n').length;
      expect(lineCount).toBeLessThan(200);
    });

    it('always wraps content in v5.3.0 RULEBOOK sentinels', async () => {
      const content = await generateClaudeMd(projectRoot);
      expect(content).toContain(CLAUDE_MD_SENTINEL_START);
      expect(content).toContain(CLAUDE_MD_SENTINEL_END);
      expect(hasV2Sentinels(content)).toBe(true);
    });

    it('always emits the @AGENTS.md import', async () => {
      const content = await generateClaudeMd(projectRoot);
      expect(content).toContain('@AGENTS.md');
    });

    it('comments out conditional imports whose targets are absent', async () => {
      const content = await generateClaudeMd(projectRoot);
      // None of the conditional files exist in a fresh tmpdir
      expect(content).toContain('@AGENTS.override.md (skipped');
      expect(content).toContain('@.rulebook/STATE.md (skipped');
      expect(content).toContain('@.rulebook/PLANS.md (skipped');
    });

    it('keeps conditional imports whose targets exist', async () => {
      await fs.writeFile(path.join(projectRoot, 'AGENTS.override.md'), '# override');
      await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
      await fs.writeFile(path.join(projectRoot, '.rulebook', 'STATE.md'), '# state');

      const content = await generateClaudeMd(projectRoot);

      // These two should remain as live @import lines (no skipped marker)
      expect(content).toMatch(/^@AGENTS\.override\.md\s*$/m);
      expect(content).toMatch(/^@\.rulebook\/STATE\.md\s*$/m);
      // PLANS still missing, must be skipped
      expect(content).toContain('@.rulebook/PLANS.md (skipped');
    });

    it('keepAllImports option leaves the template untouched', async () => {
      const content = await generateClaudeMd(projectRoot, { keepAllImports: true });
      expect(content).toMatch(/^@AGENTS\.override\.md\s*$/m);
      expect(content).toMatch(/^@\.rulebook\/STATE\.md\s*$/m);
      expect(content).toMatch(/^@\.rulebook\/PLANS\.md\s*$/m);
    });
  });

  describe('writeClaudeMd', () => {
    it('writes to <root>/CLAUDE.md and reports no backup on first write', async () => {
      const content = await generateClaudeMd(projectRoot);
      const result = await writeClaudeMd(projectRoot, content);

      expect(result.path).toBe(getClaudeMdPath(projectRoot));
      expect(result.backupPath).toBeNull();
      const onDisk = await fs.readFile(result.path, 'utf-8');
      expect(onDisk).toBe(content);
    });

    it('creates a .backup-<timestamp> snapshot when overwriting', async () => {
      const target = getClaudeMdPath(projectRoot);
      await fs.writeFile(target, '# pre-existing CLAUDE.md\nuser content\n');

      const content = await generateClaudeMd(projectRoot);
      const result = await writeClaudeMd(projectRoot, content);

      expect(result.backupPath).not.toBeNull();
      expect(result.backupPath).toMatch(/CLAUDE\.md\.backup-/);
      const backup = await fs.readFile(result.backupPath!, 'utf-8');
      expect(backup).toContain('pre-existing CLAUDE.md');
    });
  });

  describe('mergeClaudeMd', () => {
    it('creates the file when none exists', async () => {
      const result = await mergeClaudeMd(projectRoot);
      expect(result.mode).toBe('create');
      expect(result.backupPath).toBeNull();
      const written = await fs.readFile(result.path, 'utf-8');
      expect(hasV2Sentinels(written)).toBe(true);
    });

    it('replaces the v5.3.0 block in-place when sentinels exist', async () => {
      // First write — creates the file
      await mergeClaudeMd(projectRoot);
      const target = getClaudeMdPath(projectRoot);

      // Append user content outside the sentinels
      const beforeMerge = await fs.readFile(target, 'utf-8');
      const userTail = '\n\n## My Custom Section\nThis must survive regeneration.\n';
      await fs.writeFile(target, beforeMerge + userTail);

      // Second merge — should replace the block but preserve the tail
      const result = await mergeClaudeMd(projectRoot);
      expect(result.mode).toBe('replace');
      expect(result.backupPath).not.toBeNull();

      const after = await fs.readFile(target, 'utf-8');
      expect(after).toContain('## My Custom Section');
      expect(after).toContain('This must survive regeneration.');
      expect(hasV2Sentinels(after)).toBe(true);

      // The sentinels should appear exactly once each
      const startCount = (after.match(/RULEBOOK:START v5\.3\.0/g) ?? []).length;
      const endCount = (after.match(/RULEBOOK:END/g) ?? []).length;
      expect(startCount).toBe(1);
      expect(endCount).toBe(1);
    });

    it('migrates a legacy v5.2 CLAUDE.md into AGENTS.override.md and writes a fresh CLAUDE.md', async () => {
      const target = getClaudeMdPath(projectRoot);
      const legacy =
        '# CLAUDE.md\n\nLegacy v5.2 directives.\n- Use spaces, not tabs\n- Falcor is the rendering ground truth\n';
      await fs.writeFile(target, legacy);

      const result = await mergeClaudeMd(projectRoot);

      // Mode + bookkeeping
      expect(result.mode).toBe('migrate');
      expect(result.backupPath).not.toBeNull();
      expect(result.overridePath).not.toBeNull();

      // Backup contains the original content
      const backup = await fs.readFile(result.backupPath!, 'utf-8');
      expect(backup).toContain('Legacy v5.2 directives.');
      expect(backup).toContain('Falcor is the rendering ground truth');

      // The new CLAUDE.md is the clean v5.3.0 template — no legacy content inline
      const newClaude = await fs.readFile(target, 'utf-8');
      expect(hasV2Sentinels(newClaude)).toBe(true);
      expect(newClaude).not.toContain('Falcor is the rendering ground truth');
      // And it imports @AGENTS.override.md (not commented), so the migrated
      // content is re-loaded by Claude Code at session start.
      expect(newClaude).toMatch(/^@AGENTS\.override\.md\s*$/m);

      // The override file now contains the migrated block inside the OVERRIDE sentinels
      const override = await fs.readFile(result.overridePath!, 'utf-8');
      expect(override).toContain('<!-- OVERRIDE:START -->');
      expect(override).toContain('<!-- OVERRIDE:END -->');
      expect(override).toContain('MIGRATED-FROM-CLAUDE-MD');
      expect(override).toContain('Legacy v5.2 directives.');
      expect(override).toContain('Falcor is the rendering ground truth');

      // Migration block must be before the END sentinel (i.e. inside the override)
      const migIdx = override.indexOf('MIGRATED-FROM-CLAUDE-MD');
      const endIdx = override.indexOf('<!-- OVERRIDE:END -->');
      expect(migIdx).toBeGreaterThan(-1);
      expect(endIdx).toBeGreaterThan(migIdx);
    });

    it('migration is idempotent: a second migrate does not duplicate the block', async () => {
      const target = getClaudeMdPath(projectRoot);
      const legacy = '# CLAUDE.md\n\nLegacy line A\n';
      await fs.writeFile(target, legacy);

      // First migration
      const first = await mergeClaudeMd(projectRoot);
      expect(first.mode).toBe('migrate');

      // Force the legacy state again (a paranoid second pass with the same legacy file)
      await fs.writeFile(target, legacy);
      const second = await mergeClaudeMd(projectRoot);
      expect(second.mode).toBe('migrate');

      const override = await fs.readFile(second.overridePath!, 'utf-8');
      const occurrences = (override.match(/MIGRATED-FROM-CLAUDE-MD on/g) ?? []).length;
      expect(occurrences).toBe(1);
    });

    it('is idempotent: a second replace produces no drift outside the block', async () => {
      // Create with user tail
      await mergeClaudeMd(projectRoot);
      const target = getClaudeMdPath(projectRoot);
      const tail = '\n\n## Tail\nstable\n';
      const initial = (await fs.readFile(target, 'utf-8')) + tail;
      await fs.writeFile(target, initial);

      await mergeClaudeMd(projectRoot);
      const first = await fs.readFile(target, 'utf-8');

      await mergeClaudeMd(projectRoot);
      const second = await fs.readFile(target, 'utf-8');

      expect(second).toBe(first);
      expect(second).toContain('## Tail');
      expect(second).toContain('stable');
    });
  });

  describe('hasV2Sentinels', () => {
    it('returns true when both sentinels are present', () => {
      const sample = `<!-- RULEBOOK:START v5.3.0 -->\nbody\n<!-- RULEBOOK:END -->`;
      expect(hasV2Sentinels(sample)).toBe(true);
    });

    it('returns false when missing the start sentinel', () => {
      expect(hasV2Sentinels('plain text\n<!-- RULEBOOK:END -->')).toBe(false);
    });

    it('returns false when missing the end sentinel', () => {
      expect(hasV2Sentinels('<!-- RULEBOOK:START v5.3.0 -->\nbody')).toBe(false);
    });
  });
});
