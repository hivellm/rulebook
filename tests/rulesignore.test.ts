import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseRulesIgnore, filterRules } from '../src/utils/rulesignore';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('rulesignore', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('parseRulesIgnore', () => {
    it('should parse .rulesignore file', async () => {
      const content = `# Comment
coverage-threshold
rust/edition-2024
typescript/*`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const result = await parseRulesIgnore(testDir);

      expect(result.patterns).toEqual(['coverage-threshold', 'rust/edition-2024', 'typescript/*']);
    });

    it('should handle empty lines and comments', async () => {
      const content = `# Header comment

coverage-threshold

# Another comment
rust/edition-2024

`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const result = await parseRulesIgnore(testDir);

      expect(result.patterns).toEqual(['coverage-threshold', 'rust/edition-2024']);
    });

    it('should return empty patterns when file does not exist', async () => {
      const result = await parseRulesIgnore(testDir);

      expect(result.patterns).toEqual([]);
    });

    it('should match exact rule names', async () => {
      const content = `coverage-threshold`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const result = await parseRulesIgnore(testDir);

      expect(result.isIgnored('coverage-threshold')).toBe(true);
      expect(result.isIgnored('coverage-threshold-other')).toBe(false);
      expect(result.isIgnored('other')).toBe(false);
    });

    it('should match wildcard patterns', async () => {
      const content = `typescript/*`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const result = await parseRulesIgnore(testDir);

      expect(result.isIgnored('typescript/strict-mode')).toBe(true);
      expect(result.isIgnored('typescript/eslint')).toBe(true);
      expect(result.isIgnored('typescript')).toBe(false);
      expect(result.isIgnored('rust/clippy')).toBe(false);
    });

    it('should match glob patterns', async () => {
      const content = `*-threshold`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const result = await parseRulesIgnore(testDir);

      expect(result.isIgnored('coverage-threshold')).toBe(true);
      expect(result.isIgnored('performance-threshold')).toBe(true);
      expect(result.isIgnored('threshold')).toBe(false);
    });
  });

  describe('filterRules', () => {
    it('should filter ignored rules', async () => {
      const content = `coverage-threshold
typescript/*`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const rulesIgnore = await parseRulesIgnore(testDir);
      const rules = [
        { name: 'coverage-threshold', value: 95 },
        { name: 'rust/clippy', value: true },
        { name: 'typescript/strict', value: true },
        { name: 'typescript/eslint', value: true },
      ];

      const filtered = filterRules(rules, rulesIgnore);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('rust/clippy');
    });

    it('should not filter when no patterns match', async () => {
      const content = `python/*`;
      await fs.writeFile(path.join(testDir, '.rulesignore'), content);

      const rulesIgnore = await parseRulesIgnore(testDir);
      const rules = [
        { name: 'coverage-threshold', value: 95 },
        { name: 'rust/clippy', value: true },
        { name: 'typescript/strict', value: true },
      ];

      const filtered = filterRules(rules, rulesIgnore);

      expect(filtered).toHaveLength(3);
    });
  });
});
