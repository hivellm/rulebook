import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateAICLIFiles } from '../src/core/workflow-generator.js';
import type { ProjectConfig } from '../src/types.js';

/**
 * Tests for AI CLI Integration Files
 * These tests verify that the CLI configuration files are generated correctly
 */
describe('AI CLI Integration Files', () => {
  let testDir: string;
  let config: ProjectConfig;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-cli-integration-test-'));

    config = {
      languages: ['typescript'],
      modules: [],
      services: [],
      frameworks: ['nestjs'],
      ides: ['cursor'],
      projectType: 'application',
      coverageThreshold: 95,
      strictDocs: true,
      generateWorkflows: true,
      includeGitWorkflow: true,
      gitPushMode: 'manual',
      installGitHooks: false,
      minimal: false,
      modular: true,
    };
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('generateAICLIFiles', () => {
    it('should generate CLAUDE.md for Claude Code CLI', async () => {
      const files = await generateAICLIFiles(config, testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const exists = await fs
        .access(claudePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
      expect(files).toContain(claudePath);

      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('Claude Code');
      expect(content).toContain('AGENTS.md');
    });

    it('should generate CODEX.md for Codex CLI', async () => {
      const files = await generateAICLIFiles(config, testDir);

      const codexPath = path.join(testDir, 'CODEX.md');
      const exists = await fs
        .access(codexPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
      expect(files).toContain(codexPath);

      const content = await fs.readFile(codexPath, 'utf-8');
      expect(content).toContain('Codex');
      expect(content).toContain('AGENTS.md');
    });

    it('should generate GEMINI.md for Gemini CLI', async () => {
      const files = await generateAICLIFiles(config, testDir);

      const geminiPath = path.join(testDir, 'GEMINI.md');
      const exists = await fs
        .access(geminiPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
      expect(files).toContain(geminiPath);

      const content = await fs.readFile(geminiPath, 'utf-8');
      expect(content).toContain('Gemini');
      expect(content).toContain('AGENTS.md');
    });

    it('should generate gemini-extension.json for Gemini CLI extension', async () => {
      const files = await generateAICLIFiles(config, testDir);

      const geminiExtPath = path.join(testDir, 'gemini-extension.json');
      const exists = await fs
        .access(geminiExtPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
      expect(files).toContain(geminiExtPath);

      const content = await fs.readFile(geminiExtPath, 'utf-8');
      const jsonContent = JSON.parse(content);

      expect(jsonContent).toBeDefined();
      expect(jsonContent.name).toBeDefined();
    });

    it('should not overwrite existing files', async () => {
      // Create existing CLAUDE.md
      const claudePath = path.join(testDir, 'CLAUDE.md');
      const customContent = '# Custom CLAUDE.md content';
      await fs.writeFile(claudePath, customContent);

      const files = await generateAICLIFiles(config, testDir);

      // Should not include the path since it wasn't generated
      expect(files).not.toContain(claudePath);

      // Content should be preserved
      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should generate all files in correct directory', async () => {
      await generateAICLIFiles(config, testDir);

      const expectedFiles = ['CLAUDE.md', 'CODEX.md', 'GEMINI.md', 'gemini-extension.json'];

      for (const file of expectedFiles) {
        const filePath = path.join(testDir, file);
        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('CLAUDE.md content', () => {
    it('should include project languages', async () => {
      config.languages = ['typescript', 'python'];
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('Typescript');
      expect(content).toContain('Python');
    });

    it('should reference AGENTS.md for framework rules', async () => {
      config.frameworks = ['nestjs', 'react'];
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      // Frameworks are in AGENTS.md, CLAUDE.md should reference it
      expect(content).toContain('AGENTS.md');
    });

    it('should reference AGENTS.md for full rules', async () => {
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('AGENTS.md');
    });
  });

  describe('CODEX.md content', () => {
    it('should include project languages', async () => {
      config.languages = ['go', 'rust'];
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'CODEX.md'), 'utf-8');
      expect(content).toContain('Go');
      expect(content).toContain('Rust');
    });

    it('should reference rulebook standards', async () => {
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'CODEX.md'), 'utf-8');
      expect(content).toContain('rulebook');
    });
  });

  describe('GEMINI.md content', () => {
    it('should include project languages', async () => {
      config.languages = ['java', 'kotlin'];
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'GEMINI.md'), 'utf-8');
      expect(content).toContain('Java');
      expect(content).toContain('Kotlin');
    });

    it('should reference AGENTS.md', async () => {
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'GEMINI.md'), 'utf-8');
      expect(content).toContain('AGENTS.md');
    });
  });

  describe('gemini-extension.json content', () => {
    it('should have valid JSON structure', async () => {
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'gemini-extension.json'), 'utf-8');
      const jsonContent = JSON.parse(content);

      expect(jsonContent.name).toBeDefined();
      expect(jsonContent.version).toBeDefined();
      expect(jsonContent.description).toBeDefined();
    });

    it('should include project name from directory', async () => {
      await generateAICLIFiles(config, testDir);

      const content = await fs.readFile(path.join(testDir, 'gemini-extension.json'), 'utf-8');
      const jsonContent = JSON.parse(content);

      expect(jsonContent.name).toBeDefined();
      expect(typeof jsonContent.name).toBe('string');
    });
  });

  describe('Template Files Existence', () => {
    it('should have CLAUDE.md template', async () => {
      const { fileURLToPath } = await import('url');
      const { dirname } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const templatesDir = path.join(__dirname, '..', 'templates', 'cli');

      const claudeTemplatePath = path.join(templatesDir, 'CLAUDE.md');
      const exists = await fs
        .access(claudeTemplatePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should have CODEX.md template', async () => {
      const { fileURLToPath } = await import('url');
      const { dirname } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const templatesDir = path.join(__dirname, '..', 'templates', 'cli');

      const codexTemplatePath = path.join(templatesDir, 'CODEX.md');
      const exists = await fs
        .access(codexTemplatePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should have GEMINI.md template', async () => {
      const { fileURLToPath } = await import('url');
      const { dirname } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const templatesDir = path.join(__dirname, '..', 'templates', 'cli');

      const geminiTemplatePath = path.join(templatesDir, 'GEMINI.md');
      const exists = await fs
        .access(geminiTemplatePath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });
  });
});
