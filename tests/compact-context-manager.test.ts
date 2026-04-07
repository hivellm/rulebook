import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  seedCompactContext,
  getCompactContextPath,
  pickSeedTemplate,
} from '../src/core/compact-context-manager';

describe('compact-context-manager (v5.3.0 F-NEW-2)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-compact-ctx-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('pickSeedTemplate', () => {
    it('returns the matching language slug', () => {
      expect(pickSeedTemplate({ languages: [{ language: 'typescript', confidence: 1, indicators: [] }] })).toBe(
        'typescript'
      );
      expect(pickSeedTemplate({ languages: [{ language: 'rust', confidence: 1, indicators: [] }] })).toBe('rust');
    });

    it('maps C to cpp', () => {
      expect(pickSeedTemplate({ languages: [{ language: 'c', confidence: 1, indicators: [] }] })).toBe('cpp');
    });

    it('falls back to _default when no language matches', () => {
      expect(pickSeedTemplate({ languages: [] })).toBe('_default');
      expect(
        pickSeedTemplate({ languages: [{ language: 'haskell', confidence: 1, indicators: [] }] })
      ).toBe('_default');
    });
  });

  describe('seedCompactContext', () => {
    it('creates the file when absent', async () => {
      const result = await seedCompactContext(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1, indicators: [] }],
      });
      expect(result.seeded).toBe(true);
      expect(result.path).toBe(getCompactContextPath(projectRoot));

      const content = await fs.readFile(result.path, 'utf-8');
      expect(content).toContain('Post-compaction cheat sheet');
      expect(content).toContain('TypeScript');
    });

    it('never overwrites an existing file', async () => {
      const target = getCompactContextPath(projectRoot);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const userContent = '# My custom reminders\n\n- Remember X\n';
      await fs.writeFile(target, userContent);

      const result = await seedCompactContext(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1, indicators: [] }],
      });

      expect(result.seeded).toBe(false);
      const after = await fs.readFile(target, 'utf-8');
      expect(after).toBe(userContent);
    });

    it('uses _default when the detected language has no specific template', async () => {
      const result = await seedCompactContext(projectRoot, {
        languages: [{ language: 'haskell', confidence: 1, indicators: [] }],
      });
      expect(result.seeded).toBe(true);
      const content = await fs.readFile(result.path, 'utf-8');
      expect(content).toContain('Post-compaction cheat sheet');
    });
  });
});
