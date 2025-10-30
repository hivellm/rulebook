import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateWorkflows, generateIDEFiles } from '../src/core/workflow-generator';
import type { ProjectConfig } from '../src/types';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileExists } from '../src/utils/file-system';

describe('workflow-generator', () => {
  let testDir: string;

  const baseConfig: ProjectConfig = {
    languages: ['rust'],
    modules: ['vectorizer'],
    ides: ['cursor'],
    projectType: 'application',
    coverageThreshold: 95,
    strictDocs: true,
    generateWorkflows: true,
  };

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('generateWorkflows', () => {
    it('should generate Rust workflows', async () => {
      const config = { ...baseConfig, languages: ['rust'] };

      const workflows = await generateWorkflows(config, testDir);

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows.some((w) => w.includes('rust-test.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('rust-lint.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(true);
    });

    it('should generate TypeScript workflows', async () => {
      const config = { ...baseConfig, languages: ['typescript'] };

      const workflows = await generateWorkflows(config, testDir);

      expect(workflows.some((w) => w.includes('typescript-test.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('typescript-lint.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(true);
    });

    it('should generate Python workflows', async () => {
      const config = { ...baseConfig, languages: ['python'] };

      const workflows = await generateWorkflows(config, testDir);

      expect(workflows.some((w) => w.includes('python-test.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('python-lint.yml'))).toBe(true);
    });

    it('should generate workflows for multiple languages', async () => {
      const config = { ...baseConfig, languages: ['rust', 'typescript', 'python'] };

      const workflows = await generateWorkflows(config, testDir);

      expect(workflows.length).toBeGreaterThanOrEqual(7);
    });

    it('should create .github/workflows directory', async () => {
      const config = { ...baseConfig };

      await generateWorkflows(config, testDir);

      const workflowsDir = path.join(testDir, '.github', 'workflows');
      const exists = await fileExists(workflowsDir);
      expect(exists).toBe(true);
    });

    it('should not overwrite existing workflows', async () => {
      const config = { ...baseConfig };
      const workflowsDir = path.join(testDir, '.github', 'workflows');
      await fs.mkdir(workflowsDir, { recursive: true });

      const customContent = '# Custom workflow';
      await fs.writeFile(path.join(workflowsDir, 'rust-test.yml'), customContent);

      await generateWorkflows(config, testDir);

      const content = await fs.readFile(path.join(workflowsDir, 'rust-test.yml'), 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should generate minimal workflows without lint or codespell', async () => {
      const config = { ...baseConfig, languages: ['typescript'], minimal: true };

      const workflows = await generateWorkflows(config, testDir, { mode: 'minimal' });

      expect(workflows.some((w) => w.includes('typescript-test.yml'))).toBe(true);
      expect(workflows.some((w) => w.includes('typescript-lint.yml'))).toBe(false);
      expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(false);
    });
  });

  describe('generateIDEFiles', () => {
    it('should generate .cursorrules for Cursor', async () => {
      const config = { ...baseConfig, ides: ['cursor'] };

      const files = await generateIDEFiles(config, testDir);

      expect(files.some((f) => f.endsWith('.cursorrules'))).toBe(true);

      const cursorRules = await fs.readFile(path.join(testDir, '.cursorrules'), 'utf-8');
      expect(cursorRules).toContain('@hivellm/rulebook');
      expect(cursorRules).toContain('95%+ coverage');
    });

    it('should generate .windsurfrules for Windsurf', async () => {
      const config = { ...baseConfig, ides: ['windsurf'] };

      const files = await generateIDEFiles(config, testDir);

      expect(files.some((f) => f.endsWith('.windsurfrules'))).toBe(true);

      const windsurfRules = await fs.readFile(path.join(testDir, '.windsurfrules'), 'utf-8');
      expect(windsurfRules).toContain('@hivellm/rulebook');
    });

    it('should generate VS Code settings', async () => {
      const config = { ...baseConfig, ides: ['vscode'] };

      const files = await generateIDEFiles(config, testDir);

      // Normalize paths for cross-platform compatibility
      const normalizedFiles = files.map((f) => path.normalize(f));
      const expectedPath = path.normalize(path.join(testDir, '.vscode', 'settings.json'));
      expect(normalizedFiles).toContain(expectedPath);

      const settingsPath = path.join(testDir, '.vscode', 'settings.json');
      const settings = await fs.readFile(settingsPath, 'utf-8');
      const parsed = JSON.parse(settings);
      expect(parsed['editor.formatOnSave']).toBe(true);
    });

    it('should generate Copilot instructions', async () => {
      const config = { ...baseConfig, ides: ['copilot'] };

      const files = await generateIDEFiles(config, testDir);

      expect(files.some((f) => f.includes('copilot-instructions.md'))).toBe(true);

      const copilotPath = path.join(testDir, '.github', 'copilot-instructions.md');
      const content = await fs.readFile(copilotPath, 'utf-8');
      expect(content).toContain('AGENTS.md');
    });

    it('should not overwrite existing IDE files', async () => {
      const config = { ...baseConfig, ides: ['cursor'] };

      const customContent = '# Custom cursor rules';
      await fs.writeFile(path.join(testDir, '.cursorrules'), customContent);

      const files = await generateIDEFiles(config, testDir);

      expect(files).toHaveLength(0);

      const content = await fs.readFile(path.join(testDir, '.cursorrules'), 'utf-8');
      expect(content).toBe(customContent);
    });

    it('should respect coverage threshold in generated files', async () => {
      const config = { ...baseConfig, ides: ['cursor'], coverageThreshold: 85 };

      await generateIDEFiles(config, testDir);

      const cursorRules = await fs.readFile(path.join(testDir, '.cursorrules'), 'utf-8');
      expect(cursorRules).toContain('85%+ coverage');
    });
  });
});
