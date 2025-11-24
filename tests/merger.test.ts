import { describe, it, expect } from 'vitest';
import { mergeAgents, mergeFullAgents } from '../src/core/merger';
import type { ExistingAgentsInfo, ProjectConfig } from '../src/types';

describe('merger', () => {
  const baseConfig: ProjectConfig = {
    languages: ['rust'],
    modules: ['vectorizer'],
    ides: ['cursor'],
    projectType: 'application',
    coverageThreshold: 95,
    strictDocs: true,
    generateWorkflows: true,
  };

  describe('mergeAgents', () => {
    it('should replace existing RULEBOOK block', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->
# Old Rules
Old content
<!-- RULEBOOK:END -->

<!-- OTHER:START -->
Other content
<!-- OTHER:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 3,
            content: '<!-- RULEBOOK:START -->\n# Old Rules\nOld content\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'OTHER',
            startLine: 5,
            endLine: 7,
            content: '<!-- OTHER:START -->\nOther content\n<!-- OTHER:END -->',
          },
        ],
      };

      const merged = await mergeAgents(existing, baseConfig);

      expect(merged).toContain('<!-- RULEBOOK:START -->');
      expect(merged).toContain('<!-- RULEBOOK:END -->');
      expect(merged).toContain('# Project Rules');
      expect(merged).toContain('<!-- OTHER:START -->');
      expect(merged).toContain('Other content');
      expect(merged).not.toContain('# Old Rules');
      expect(merged).not.toContain('Old content');
    });

    it('should insert RULEBOOK block at beginning if not present', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- OTHER:START -->
Other content
<!-- OTHER:END -->`,
        blocks: [
          {
            name: 'OTHER',
            startLine: 0,
            endLine: 2,
            content: '<!-- OTHER:START -->\nOther content\n<!-- OTHER:END -->',
          },
        ],
      };

      const merged = await mergeAgents(existing, baseConfig);

      expect(merged).toContain('<!-- RULEBOOK:START -->');
      expect(merged).toContain('<!-- RULEBOOK:END -->');
      expect(merged).toContain('# Project Rules');
      expect(merged).toContain('<!-- OTHER:START -->');
      expect(merged.indexOf('<!-- RULEBOOK:START -->')).toBeLessThan(
        merged.indexOf('<!-- OTHER:START -->')
      );
    });

    it('should preserve all other blocks', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- VECTORIZER:START -->
Vectorizer content
<!-- VECTORIZER:END -->

<!-- PROJECT:START -->
Project content
<!-- PROJECT:END -->

<!-- VECTORIZER:START -->
Vectorizer content
<!-- VECTORIZER:END -->`,
        blocks: [
          {
            name: 'VECTORIZER',
            startLine: 0,
            endLine: 2,
            content: '<!-- VECTORIZER:START -->\nVectorizer content\n<!-- VECTORIZER:END -->',
          },
          {
            name: 'PROJECT',
            startLine: 4,
            endLine: 6,
            content: '<!-- PROJECT:START -->\nProject content\n<!-- PROJECT:END -->',
          },
          {
            name: 'VECTORIZER',
            startLine: 8,
            endLine: 10,
            content: '<!-- VECTORIZER:START -->\nVectorizer content\n<!-- VECTORIZER:END -->',
          },
        ],
      };

      const merged = await mergeAgents(existing, baseConfig);

      expect(merged).toContain('<!-- VECTORIZER:START -->');
      expect(merged).toContain('Vectorizer content');
      expect(merged).toContain('<!-- PROJECT:START -->');
      expect(merged).toContain('Project content');
      expect(merged).toContain('<!-- VECTORIZER:START -->');
      expect(merged).toContain('Vectorizer content');
    });
  });

  describe('mergeFullAgents', () => {
    it('should merge RULEBOOK and all specified sections', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- VECTORIZER:START -->
Vectorizer
<!-- VECTORIZER:END -->`,
        blocks: [
          {
            name: 'VECTORIZER',
            startLine: 0,
            endLine: 2,
            content: '<!-- VECTORIZER:START -->\nVectorizer\n<!-- VECTORIZER:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['rust', 'typescript'],
        modules: ['vectorizer'],
      };

      const merged = await mergeFullAgents(existing, config);

      // Should have RULEBOOK
      expect(merged).toContain('<!-- RULEBOOK:START -->');
      expect(merged).toContain('<!-- RULEBOOK:END -->');

      // Should have language blocks
      expect(merged).toContain('<!-- RUST:START -->');
      expect(merged).toContain('<!-- TYPESCRIPT:START -->');

      // Should have module blocks
      expect(merged).toContain('<!-- VECTORIZER:START -->');

      // Should preserve existing blocks
      expect(merged).toContain('<!-- VECTORIZER:START -->');
      expect(merged).toContain('Vectorizer');
    });

    it('should update existing language blocks', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RUST:START -->
Old Rust rules
<!-- RUST:END -->`,
        blocks: [
          {
            name: 'RUST',
            startLine: 0,
            endLine: 2,
            content: '<!-- RUST:START -->\nOld Rust rules\n<!-- RUST:END -->',
          },
        ],
      };

      const merged = await mergeFullAgents(existing, baseConfig);

      expect(merged).toContain('<!-- RUST:START -->');
      expect(merged).toContain('<!-- RUST:END -->');
      expect(merged).toContain('# Rust Project Rules');
      expect(merged).not.toContain('Old Rust rules');
    });

    it('should migrate embedded templates when modular mode enabled', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- TYPESCRIPT:START -->
TypeScript content
<!-- TYPESCRIPT:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'TYPESCRIPT',
            startLine: 2,
            endLine: 4,
            content: '<!-- TYPESCRIPT:START -->\nTypeScript content\n<!-- TYPESCRIPT:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: [],
        modular: true,
      };

      const projectRoot = '/tmp/test-migration';
      const merged = await mergeFullAgents(existing, config, projectRoot);

      // Should generate modular format with references
      expect(merged).toContain('/rulebook/TYPESCRIPT.md');
      expect(merged).toContain('<!-- RULEBOOK:START -->');
    });

    it('should use legacy merge when modular is false', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- TYPESCRIPT:START -->
TypeScript content
<!-- TYPESCRIPT:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'TYPESCRIPT',
            startLine: 2,
            endLine: 4,
            content: '<!-- TYPESCRIPT:START -->\nTypeScript content\n<!-- TYPESCRIPT:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: [],
        modular: false, // Explicitly disable modular
      };

      const merged = await mergeFullAgents(existing, config);

      // Should use legacy embedded format
      // In legacy mode, content is embedded, not referenced
      expect(merged).toContain('<!-- TYPESCRIPT:START -->');
    });

    it('should use modular generation when modular enabled and projectRoot provided', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: ['vectorizer'],
        modular: true,
      };

      const projectRoot = '/tmp/test-modular';
      const merged = await mergeFullAgents(existing, config, projectRoot);

      // Should generate modular format
      expect(merged).toContain('/rulebook/TYPESCRIPT.md');
      expect(merged).toContain('/rulebook/VECTORIZER.md');
    });

    it('should use legacy merge when modular enabled but no projectRoot', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- TYPESCRIPT:START -->
TypeScript content
<!-- TYPESCRIPT:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'TYPESCRIPT',
            startLine: 2,
            endLine: 4,
            content: '<!-- TYPESCRIPT:START -->\nTypeScript content\n<!-- TYPESCRIPT:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: [],
        modular: true,
      };

      // No projectRoot provided
      const merged = await mergeFullAgents(existing, config);

      // Should fall back to legacy merge
      expect(merged).toContain('<!-- TYPESCRIPT:START -->');
    });

    it('should not migrate when no embedded templates detected', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n# Project Rules\n<!-- RULEBOOK:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 2,
            content: '<!-- RULEBOOK:START -->\n# Project Rules\n<!-- RULEBOOK:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: [],
        modular: true,
      };

      const projectRoot = '/tmp/test-no-migration';
      const merged = await mergeFullAgents(existing, config, projectRoot);

      // Should use modular generation (not migration)
      expect(merged).toContain('<!-- RULEBOOK:START -->');
    });

    it('should handle migration when needsMigration but modular is false', async () => {
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- TYPESCRIPT:START -->
TypeScript content
<!-- TYPESCRIPT:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'TYPESCRIPT',
            startLine: 2,
            endLine: 4,
            content: '<!-- TYPESCRIPT:START -->\nTypeScript content\n<!-- TYPESCRIPT:END -->',
          },
        ],
      };

      const config: ProjectConfig = {
        ...baseConfig,
        languages: ['typescript'],
        modules: [],
        modular: false, // Explicitly false
      };

      const projectRoot = '/tmp/test-no-migration';
      const merged = await mergeFullAgents(existing, config, projectRoot);

      // Should use legacy merge (modular is false)
      // In legacy mode, content is embedded, not referenced
      expect(merged).toContain('<!-- TYPESCRIPT:START -->');
    });
  });

  describe('mergeLanguageRules', () => {
    it('should replace existing language block', async () => {
      const { mergeLanguageRules } = await import('../src/core/merger');
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- RUST:START -->
Old Rust rules
<!-- RUST:END -->
<!-- OTHER:START -->
Other content
<!-- OTHER:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'RUST',
            startLine: 2,
            endLine: 4,
            content: '<!-- RUST:START -->\nOld Rust rules\n<!-- RUST:END -->',
          },
          {
            name: 'OTHER',
            startLine: 6,
            endLine: 8,
            content: '<!-- OTHER:START -->\nOther content\n<!-- OTHER:END -->',
          },
        ],
      };

      const merged = await mergeLanguageRules(existing, 'rust');

      expect(merged).toContain('<!-- RUST:START -->');
      expect(merged).toContain('# Rust Project Rules');
      expect(merged).not.toContain('Old Rust rules');
      expect(merged).toContain('<!-- OTHER:START -->');
      expect(merged).toContain('Other content');
    });

    it('should append language block when not found', async () => {
      const { mergeLanguageRules } = await import('../src/core/merger');
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
        ],
      };

      const merged = await mergeLanguageRules(existing, 'typescript');

      expect(merged).toContain('<!-- TYPESCRIPT:START -->');
      expect(merged).toContain('# TypeScript Project Rules');
      expect(merged).toContain('<!-- RULEBOOK:START -->');
    });
  });

  describe('mergeModuleRules', () => {
    it('should replace existing module block', async () => {
      const { mergeModuleRules } = await import('../src/core/merger');
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->
<!-- VECTORIZER:START -->
Old Vectorizer rules
<!-- VECTORIZER:END -->
<!-- OTHER:START -->
Other content
<!-- OTHER:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
          {
            name: 'VECTORIZER',
            startLine: 2,
            endLine: 4,
            content: '<!-- VECTORIZER:START -->\nOld Vectorizer rules\n<!-- VECTORIZER:END -->',
          },
          {
            name: 'OTHER',
            startLine: 6,
            endLine: 8,
            content: '<!-- OTHER:START -->\nOther content\n<!-- OTHER:END -->',
          },
        ],
      };

      const merged = await mergeModuleRules(existing, 'vectorizer');

      expect(merged).toContain('<!-- VECTORIZER:START -->');
      expect(merged).toContain('# Vectorizer Instructions');
      expect(merged).not.toContain('Old Vectorizer rules');
      expect(merged).toContain('<!-- OTHER:START -->');
      expect(merged).toContain('Other content');
    });

    it('should append module block when not found', async () => {
      const { mergeModuleRules } = await import('../src/core/merger');
      const existing: ExistingAgentsInfo = {
        exists: true,
        path: '/test/AGENTS.md',
        content: `<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->`,
        blocks: [
          {
            name: 'RULEBOOK',
            startLine: 0,
            endLine: 1,
            content: '<!-- RULEBOOK:START -->\n<!-- RULEBOOK:END -->',
          },
        ],
      };

      const merged = await mergeModuleRules(existing, 'vectorizer');

      expect(merged).toContain('<!-- VECTORIZER:START -->');
      expect(merged).toContain('# Vectorizer Instructions');
      expect(merged).toContain('<!-- RULEBOOK:START -->');
    });
  });
});
