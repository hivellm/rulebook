import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  generateRules,
  listRulesWithSource,
  getRulesDir,
  getRulePath,
  resolveRuleLanguage,
  hasGeneratedSentinel,
  readRuleTemplate,
  SUPPORTED_RULE_LANGUAGES,
  GENERATED_SENTINEL,
} from '../src/core/rules-generator';

describe('rules-generator (v5.3.0 F2)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-rules-gen-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('resolveRuleLanguage', () => {
    it('maps canonical slugs to themselves', () => {
      expect(resolveRuleLanguage('typescript')).toBe('typescript');
      expect(resolveRuleLanguage('rust')).toBe('rust');
      expect(resolveRuleLanguage('cpp')).toBe('cpp');
      expect(resolveRuleLanguage('csharp')).toBe('csharp');
    });

    it('maps aliases to the canonical template', () => {
      expect(resolveRuleLanguage('c')).toBe('cpp');
      expect(resolveRuleLanguage('c++')).toBe('cpp');
      expect(resolveRuleLanguage('cs')).toBe('csharp');
      expect(resolveRuleLanguage('c#')).toBe('csharp');
      expect(resolveRuleLanguage('ts')).toBe('typescript');
      expect(resolveRuleLanguage('js')).toBe('javascript');
      expect(resolveRuleLanguage('py')).toBe('python');
      expect(resolveRuleLanguage('rs')).toBe('rust');
    });

    it('is case-insensitive', () => {
      expect(resolveRuleLanguage('TypeScript')).toBe('typescript');
      expect(resolveRuleLanguage('RUST')).toBe('rust');
    });

    it('returns null for unsupported languages', () => {
      expect(resolveRuleLanguage('cobol')).toBeNull();
      expect(resolveRuleLanguage('haskell')).toBeNull();
      expect(resolveRuleLanguage('')).toBeNull();
    });
  });

  describe('readRuleTemplate', () => {
    it('reads every shipped template without error', async () => {
      for (const lang of SUPPORTED_RULE_LANGUAGES) {
        const content = await readRuleTemplate(lang);
        expect(content).toContain('paths:');
        expect(content).toContain(GENERATED_SENTINEL);
      }
    });

    it('all shipped templates begin with YAML frontmatter containing paths:', async () => {
      for (const lang of SUPPORTED_RULE_LANGUAGES) {
        const content = await readRuleTemplate(lang);
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/\npaths:\n/);
      }
    });
  });

  describe('hasGeneratedSentinel', () => {
    it('returns true when the sentinel is present', () => {
      const content = `---\npaths:\n  - "**/*.ts"\n---\n<!-- ${GENERATED_SENTINEL} -->\n# Rules`;
      expect(hasGeneratedSentinel(content)).toBe(true);
    });

    it('returns false when the sentinel is missing', () => {
      const content = `---\npaths:\n  - "**/*.ts"\n---\n# User-authored rules`;
      expect(hasGeneratedSentinel(content)).toBe(false);
    });
  });

  describe('generateRules', () => {
    it('creates .claude/rules/ when it does not exist', async () => {
      await generateRules(projectRoot, { languages: [] });
      const exists = await fs
        .stat(getRulesDir(projectRoot))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('writes a rule file for each supported detected language', async () => {
      const result = await generateRules(projectRoot, {
        languages: [
          { language: 'typescript', confidence: 1.0, indicators: [] },
          { language: 'rust', confidence: 1.0, indicators: [] },
        ],
      });

      expect(result.written).toHaveLength(2);
      expect(result.written.some((p) => p.endsWith('typescript.md'))).toBe(true);
      expect(result.written.some((p) => p.endsWith('rust.md'))).toBe(true);

      const tsContent = await fs.readFile(getRulePath(projectRoot, 'typescript'), 'utf-8');
      expect(tsContent).toContain(GENERATED_SENTINEL);
      expect(tsContent).toContain('paths:');
    });

    it('classifies detected languages without a template as unsupported', async () => {
      const result = await generateRules(projectRoot, {
        languages: [
          { language: 'typescript', confidence: 1.0, indicators: [] },
          { language: 'haskell', confidence: 1.0, indicators: [] },
          { language: 'lua', confidence: 1.0, indicators: [] },
        ],
      });

      expect(result.written).toHaveLength(1);
      expect(result.unsupported).toEqual(['haskell', 'lua']);
    });

    it('resolves aliases (c → cpp, c# → csharp) without duplicates', async () => {
      const result = await generateRules(projectRoot, {
        languages: [
          { language: 'cpp', confidence: 1.0, indicators: [] },
          { language: 'c', confidence: 1.0, indicators: [] },
        ],
      });

      // Both cpp and c map to cpp.md → should only write once
      expect(result.written).toHaveLength(1);
      expect(result.written[0]).toMatch(/cpp\.md$/);
    });

    it('preserves user-authored rule files without the generated sentinel', async () => {
      const rulesDir = getRulesDir(projectRoot);
      await fs.mkdir(rulesDir, { recursive: true });
      const userRule = `---\npaths:\n  - "**/*.ts"\n---\n# My custom TypeScript rules\n- Use 4-space indent\n`;
      await fs.writeFile(path.join(rulesDir, 'typescript.md'), userRule);

      const result = await generateRules(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
      });

      expect(result.written).toHaveLength(0);
      expect(result.preserved).toHaveLength(1);
      expect(result.preserved[0]).toMatch(/typescript\.md$/);

      // User content must be unchanged
      const onDisk = await fs.readFile(path.join(rulesDir, 'typescript.md'), 'utf-8');
      expect(onDisk).toBe(userRule);
    });

    it('overwrites previously generated rule files (ones with the sentinel)', async () => {
      // First generation
      await generateRules(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
      });
      const target = getRulePath(projectRoot, 'typescript');
      const first = await fs.readFile(target, 'utf-8');
      expect(hasGeneratedSentinel(first)).toBe(true);

      // Tamper with the file but keep the sentinel
      await fs.writeFile(target, first + '\n## Extra user note (oops)\n');

      // Second generation — should regenerate because sentinel is still there
      const result = await generateRules(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
      });
      expect(result.written).toHaveLength(1);
      const second = await fs.readFile(target, 'utf-8');
      expect(second).not.toContain('Extra user note (oops)');
    });

    it('is idempotent: running twice on the same project produces identical output', async () => {
      const langs = {
        languages: [
          { language: 'typescript' as const, confidence: 1.0, indicators: [] },
          { language: 'python' as const, confidence: 1.0, indicators: [] },
        ],
      };
      await generateRules(projectRoot, langs);
      const firstSnapshot = await fs.readFile(
        getRulePath(projectRoot, 'typescript'),
        'utf-8'
      );

      await generateRules(projectRoot, langs);
      const secondSnapshot = await fs.readFile(
        getRulePath(projectRoot, 'typescript'),
        'utf-8'
      );

      expect(secondSnapshot).toBe(firstSnapshot);
    });
  });

  describe('listRulesWithSource', () => {
    it('returns an empty array when .claude/rules/ does not exist', async () => {
      const result = await listRulesWithSource(projectRoot);
      expect(result).toEqual([]);
    });

    it('classifies generated and user rules correctly', async () => {
      const rulesDir = getRulesDir(projectRoot);
      await fs.mkdir(rulesDir, { recursive: true });

      // User-authored rule
      await fs.writeFile(
        path.join(rulesDir, 'my-custom.md'),
        `---\npaths:\n  - "**/*.md"\n---\n# User rule\n`
      );

      // Generate a TypeScript rule
      await generateRules(projectRoot, {
        languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
      });

      const listed = await listRulesWithSource(projectRoot);
      expect(listed).toHaveLength(2);

      const ts = listed.find((r) => r.name === 'typescript');
      const custom = listed.find((r) => r.name === 'my-custom');
      expect(ts?.source).toBe('generated');
      expect(custom?.source).toBe('user');
    });

    it('extracts the paths: frontmatter array', async () => {
      await generateRules(projectRoot, {
        languages: [{ language: 'rust', confidence: 1.0, indicators: [] }],
      });

      const listed = await listRulesWithSource(projectRoot);
      const rust = listed.find((r) => r.name === 'rust');
      expect(rust?.paths).toBeDefined();
      expect(rust?.paths).toContain('**/*.rs');
      expect(rust?.paths).toContain('Cargo.toml');
    });

    it('sorts results alphabetically by name', async () => {
      await generateRules(projectRoot, {
        languages: [
          { language: 'rust', confidence: 1.0, indicators: [] },
          { language: 'go', confidence: 1.0, indicators: [] },
          { language: 'python', confidence: 1.0, indicators: [] },
        ],
      });

      const listed = await listRulesWithSource(projectRoot);
      const names = listed.map((r) => r.name);
      expect(names).toEqual([...names].sort());
    });
  });
});
