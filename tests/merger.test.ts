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
        content: `<!-- OPENSPEC:START -->
OpenSpec content
<!-- OPENSPEC:END -->

<!-- PROJECT:START -->
Project content
<!-- PROJECT:END -->

<!-- VECTORIZER:START -->
Vectorizer content
<!-- VECTORIZER:END -->`,
        blocks: [
          {
            name: 'OPENSPEC',
            startLine: 0,
            endLine: 2,
            content: '<!-- OPENSPEC:START -->\nOpenSpec content\n<!-- OPENSPEC:END -->',
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

      expect(merged).toContain('<!-- OPENSPEC:START -->');
      expect(merged).toContain('OpenSpec content');
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
        content: `<!-- OPENSPEC:START -->
OpenSpec
<!-- OPENSPEC:END -->`,
        blocks: [
          {
            name: 'OPENSPEC',
            startLine: 0,
            endLine: 2,
            content: '<!-- OPENSPEC:START -->\nOpenSpec\n<!-- OPENSPEC:END -->',
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
      expect(merged).toContain('<!-- OPENSPEC:START -->');
      expect(merged).toContain('OpenSpec');
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
  });
});

