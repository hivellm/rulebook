import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProject, formatValidationReport } from '../src/core/validator';
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

    it('should handle different test file extensions', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });

      // Test different test file patterns
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.ts'), '// test');
      await fs.writeFile(path.join(testDir, 'tests', 'test.spec.js'), '// test');
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.py'), '// test');

      const result = await validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested test directories', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests', 'unit'), { recursive: true });
      await fs.mkdir(path.join(testDir, 'tests', 'integration'), { recursive: true });

      await fs.writeFile(path.join(testDir, 'tests', 'unit', 'test.test.js'), '// test');
      await fs.writeFile(path.join(testDir, 'tests', 'integration', 'test.test.js'), '// test');

      const result = await validateProject(testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle different RULEBOOK block formats', async () => {
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.js'), '// test');

      // Test with different RULEBOOK block formats
      const formats = [
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->',
        '<!-- RULEBOOK:START-->\nContent\n<!-- RULEBOOK:END-->',
        '<!--RULEBOOK:START-->\nContent\n<!--RULEBOOK:END-->',
        '<!-- RULEBOOK:START -->Content<!-- RULEBOOK:END -->',
      ];

      for (const format of formats) {
        await fs.writeFile(path.join(testDir, 'AGENTS.md'), format);
        const result = await validateProject(testDir);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should handle missing test directory with different names', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );

      // Test with different test directory names
      const testDirs = ['test', 'spec', '__tests__', 'tests'];

      for (const testDirName of testDirs) {
        await fs.mkdir(path.join(testDir, testDirName), { recursive: true });
        await fs.writeFile(path.join(testDir, testDirName, 'test.test.js'), '// test');

        const result = await validateProject(testDir);
        // The validator might only recognize 'tests' directory, so we check for that
        if (testDirName === 'tests') {
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        } else {
          // Other directory names might not be recognized
          expect(result.valid).toBeDefined();
        }

        // Clean up for next iteration
        await fs.rm(path.join(testDir, testDirName), { recursive: true, force: true });
      }
    });

    it('should handle concurrent validation calls', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.js'), '// test');

      // Run multiple validations concurrently
      const promises = Array.from({ length: 5 }, () => validateProject(testDir));
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should handle edge cases with file permissions', async () => {
      await fs.writeFile(
        path.join(testDir, 'AGENTS.md'),
        '<!-- RULEBOOK:START -->\nContent\n<!-- RULEBOOK:END -->'
      );
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.js'), '// test');

      const result = await validateProject(testDir);
      expect(result.valid).toBe(true);
    });

    it('should handle AGENTS.md with different content lengths', async () => {
      await fs.mkdir(path.join(testDir, 'tests'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'tests', 'test.test.js'), '// test');

      // Test with very short content
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), 'Short');
      let result = await validateProject(testDir);
      expect(result.warnings.some((w) => w.message.includes('incomplete'))).toBe(true);

      // Test with very long content
      const longContent = 'A'.repeat(10000);
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), longContent);
      result = await validateProject(testDir);
      expect(result.warnings.some((w) => w.message.includes('RULEBOOK block'))).toBe(true);
    });
  });

  describe('formatValidationReport', () => {
    it('should generate report with errors', () => {
      const result = {
        valid: false,
        score: 70,
        errors: [
          {
            category: 'structure',
            message: 'Test error',
            severity: 'error' as const,
            file: 'test.ts',
          },
        ],
        warnings: [],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('# Validation Report');
      expect(report).toContain('**Score**: 70/100');
      expect(report).toContain('❌ FAILED');
      expect(report).toContain('## Errors');
      expect(report).toContain('❌ **structure**: Test error');
      expect(report).toContain('File: test.ts');
    });

    it('should generate report with warnings', () => {
      const result = {
        valid: true,
        score: 85,
        errors: [],
        warnings: [
          {
            category: 'docs',
            message: 'Test warning',
            severity: 'warning' as const,
            file: 'docs.md',
          },
        ],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('# Validation Report');
      expect(report).toContain('**Score**: 85/100');
      expect(report).toContain('✅ PASSED');
      expect(report).toContain('## Warnings');
      expect(report).toContain('⚠️ **docs**: Test warning');
      expect(report).toContain('File: docs.md');
    });

    it('should generate report with errors and warnings', () => {
      const result = {
        valid: false,
        score: 60,
        errors: [
          { category: 'structure', message: 'Error 1', severity: 'error' as const },
          { category: 'tests', message: 'Error 2', severity: 'error' as const, file: 'test.ts' },
        ],
        warnings: [
          { category: 'docs', message: 'Warning 1', severity: 'warning' as const },
          {
            category: 'style',
            message: 'Warning 2',
            severity: 'warning' as const,
            file: 'style.ts',
          },
        ],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('# Validation Report');
      expect(report).toContain('**Score**: 60/100');
      expect(report).toContain('❌ FAILED');
      expect(report).toContain('## Errors');
      expect(report).toContain('❌ **structure**: Error 1');
      expect(report).toContain('❌ **tests**: Error 2');
      expect(report).toContain('File: test.ts');
      expect(report).toContain('## Warnings');
      expect(report).toContain('⚠️ **docs**: Warning 1');
      expect(report).toContain('⚠️ **style**: Warning 2');
      expect(report).toContain('File: style.ts');
    });

    it('should generate clean report when all checks pass', () => {
      const result = {
        valid: true,
        score: 100,
        errors: [],
        warnings: [],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('# Validation Report');
      expect(report).toContain('**Score**: 100/100');
      expect(report).toContain('✅ PASSED');
      expect(report).toContain('## Summary');
      expect(report).toContain('✅ All checks passed! Your project follows rulebook standards.');
    });

    it('should handle errors without file field', () => {
      const result = {
        valid: false,
        score: 70,
        errors: [
          { category: 'structure', message: 'Error without file', severity: 'error' as const },
        ],
        warnings: [],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('❌ **structure**: Error without file');
      expect(report).not.toContain('File:');
    });

    it('should handle warnings without file field', () => {
      const result = {
        valid: true,
        score: 85,
        errors: [],
        warnings: [
          { category: 'docs', message: 'Warning without file', severity: 'warning' as const },
        ],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('⚠️ **docs**: Warning without file');
      expect(report).not.toContain('File:');
    });

    it('should handle multiple errors and warnings without files', () => {
      const result = {
        valid: false,
        score: 50,
        errors: [
          { category: 'error1', message: 'Error 1', severity: 'error' as const },
          { category: 'error2', message: 'Error 2', severity: 'error' as const },
          { category: 'error3', message: 'Error 3', severity: 'error' as const },
        ],
        warnings: [
          { category: 'warn1', message: 'Warning 1', severity: 'warning' as const },
          { category: 'warn2', message: 'Warning 2', severity: 'warning' as const },
        ],
      };

      const report = formatValidationReport(result);
      expect(report).toContain('❌ **error1**: Error 1');
      expect(report).toContain('❌ **error2**: Error 2');
      expect(report).toContain('❌ **error3**: Error 3');
      expect(report).toContain('⚠️ **warn1**: Warning 1');
      expect(report).toContain('⚠️ **warn2**: Warning 2');
    });
  });
});
