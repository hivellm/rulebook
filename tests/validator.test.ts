import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProject } from '../src/core/validator';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('validator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validateProject', () => {
    it('should fail when AGENTS.md is missing', async () => {
      const result = await validateProject(testDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('AGENTS.md not found'))).toBe(true);
    });

    it('should warn when AGENTS.md lacks RULEBOOK block', async () => {
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), '# Some other content');

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('RULEBOOK block'))).toBe(true);
    });

    it('should warn when AGENTS.md is too short', async () => {
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), 'Short content');

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('incomplete'))).toBe(true);
    });

    it('should fail when /tests directory is missing', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );

      const result = await validateProject(testDir);

      expect(result.errors.some((e) => e.message.includes('/tests directory not found'))).toBe(
        true
      );
    });

    it('should warn when /docs directory is missing', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'));

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('/docs directory not found'))).toBe(
        true
      );
    });

    it('should warn when important docs are missing', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'));
      await fs.mkdir(path.join(testDir, 'docs'));

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('ROADMAP.md not found'))).toBe(true);
    });

    it('should pass with complete project structure', async () => {
      // Create AGENTS.md
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\n'.repeat(50) + 'Content\n<!-- RULEBOOK:END -->'
      );

      // Create tests directory
      await fs.mkdir(path.join(testDir, 'tests'));

      // Create docs directory with important files
      await fs.mkdir(path.join(testDir, 'docs'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'docs', 'ROADMAP.md'), '# Roadmap');
      await fs.writeFile(path.join(testDir, 'docs', 'ARCHITECTURE.md'), '# Architecture');
      await fs.mkdir(path.join(testDir, 'docs', 'specs'));

      const result = await validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should warn about excessive .rulesignore patterns', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\n'.repeat(50) + '\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'));

      // Create .rulesignore with many patterns
      const patterns = Array.from({ length: 15 }, (_, i) => `rule-${i}`).join('\n');
      await fs.writeFile(path.join(testDir, '.rulesignore'), patterns);

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('rules ignored'))).toBe(true);
    });

    it('should warn about wildcard .rulesignore', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\n'.repeat(50) + '\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'));

      await fs.writeFile(path.join(testDir, '.rulesignore'), '*');

      const result = await validateProject(testDir);

      expect(result.warnings.some((w) => w.message.includes('ignores all rules'))).toBe(true);
    });

    it('should calculate score correctly', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\n'.repeat(50) + '\n<!-- RULEBOOK:END -->'
      );

      const result = await validateProject(testDir);

      // 1 error (/tests missing) = -10 points
      // Several warnings = -5 each
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
