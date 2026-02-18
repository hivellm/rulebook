import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Tests for Claude Plugin Structure and Discovery
 * These tests verify the plugin structure follows Claude Code plugin requirements
 *
 * Correct structure:
 * project-root/
 * ├── .claude-plugin/
 * │   └── plugin.json        # Plugin manifest
 * ├── .mcp.json              # MCP config (at root, not in .claude-plugin)
 * ├── commands/              # Slash commands (at root)
 * │   └── *.md
 * └── skills/                # Skills (at root)
 *     └── skill-name/
 *         └── SKILL.md
 */
describe('Claude Plugin Structure', () => {
  const projectRoot = process.cwd();
  const pluginDir = path.join(projectRoot, '.claude-plugin');
  const marketplaceJsonPath = path.join(projectRoot, 'marketplace.json');

  describe('marketplace.json manifest', () => {
    it('should have marketplace.json at repository root', async () => {
      const exists = await fs
        .access(marketplaceJsonPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have valid marketplace.json structure', async () => {
      const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('owner');
      expect(manifest).toHaveProperty('plugins');
      expect(manifest.owner).toHaveProperty('name');
      expect(Array.isArray(manifest.plugins)).toBe(true);
      expect(manifest.plugins.length).toBeGreaterThan(0);
    });

    it('should have rulebook plugin entry in marketplace.json', async () => {
      const content = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const manifest = JSON.parse(content);

      const rulebookPlugin = manifest.plugins.find((p: any) => p.name === 'rulebook');
      expect(rulebookPlugin).toBeDefined();
      expect(rulebookPlugin).toHaveProperty('source');
      expect(rulebookPlugin).toHaveProperty('description');
      expect(rulebookPlugin).toHaveProperty('version');
    });

    it('should have matching version in marketplace.json and package.json', async () => {
      const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
      const packageContent = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8');

      const marketplace = JSON.parse(marketplaceContent);
      const pkg = JSON.parse(packageContent);

      const rulebookPlugin = marketplace.plugins.find((p: any) => p.name === 'rulebook');
      expect(rulebookPlugin.version).toBe(pkg.version);
    });
  });

  describe('plugin.json manifest', () => {
    it('should have valid plugin.json in .claude-plugin/', async () => {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.name).toBe('rulebook');
      expect(manifest.description).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(manifest.author).toBeDefined();
    });

    it('should have semantic version', async () => {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      const semverPattern = /^\d+\.\d+\.\d+$/;
      expect(manifest.version).toMatch(semverPattern);
    });

    it('should have author information', async () => {
      const manifestPath = path.join(pluginDir, 'plugin.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.author.name).toBe('HiveLLM');
    });
  });

  describe('Commands (at project root)', () => {
    const commandsDir = path.join(projectRoot, 'commands');

    it('should have commands/ directory at project root', async () => {
      const exists = await fs
        .access(commandsDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have rulebook-init command', async () => {
      const commandPath = path.join(commandsDir, 'rulebook-init.md');
      const content = await fs.readFile(commandPath, 'utf-8');

      expect(content).toContain('rulebook-init');
      expect(content).toContain('Initialize');
    });

    it('should have rulebook-skill command', async () => {
      const commandPath = path.join(commandsDir, 'rulebook-skill.md');
      const content = await fs.readFile(commandPath, 'utf-8');

      expect(content).toContain('rulebook-skill');
      expect(content).toContain('skill');
    });

    it('should have rulebook-task command', async () => {
      const commandPath = path.join(commandsDir, 'rulebook-task.md');
      const content = await fs.readFile(commandPath, 'utf-8');

      expect(content).toContain('rulebook-task');
      expect(content).toContain('task');
    });

    it('should have YAML frontmatter in all commands', async () => {
      const files = await fs.readdir(commandsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const content = await fs.readFile(path.join(commandsDir, file), 'utf-8');
        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/name:\s*.+/);
        expect(content).toMatch(/description:\s*.+/);
      }
    });
  });

  describe('Skills (at project root)', () => {
    const skillsDir = path.join(projectRoot, 'skills');

    it('should have skills/ directory at project root', async () => {
      const exists = await fs
        .access(skillsDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have rulebook-typescript skill', async () => {
      const skillPath = path.join(skillsDir, 'rulebook-typescript', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('TypeScript');
      expect(content).toContain('npm run type-check');
    });

    it('should have rulebook-task-management skill', async () => {
      const skillPath = path.join(skillsDir, 'rulebook-task-management', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('Task');
      expect(content).toContain('rulebook task create');
    });

    it('should have rulebook-quality-gates skill', async () => {
      const skillPath = path.join(skillsDir, 'rulebook-quality-gates', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('Quality');
      expect(content).toContain('Pre-Commit');
    });

    it('should have rulebook-git-workflow skill', async () => {
      const skillPath = path.join(skillsDir, 'rulebook-git-workflow', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('Git');
      expect(content).toContain('Commit');
    });

    it('should have rulebook-mcp skill', async () => {
      const skillPath = path.join(skillsDir, 'rulebook-mcp', 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf-8');

      expect(content).toContain('MCP');
      expect(content).toContain('rulebook_task_create');
    });

    it('should have YAML frontmatter with name and description in all skills', async () => {
      const skillDirs = [
        'rulebook-typescript',
        'rulebook-task-management',
        'rulebook-quality-gates',
        'rulebook-git-workflow',
        'rulebook-mcp',
      ];

      for (const skillDir of skillDirs) {
        const skillPath = path.join(skillsDir, skillDir, 'SKILL.md');
        const content = await fs.readFile(skillPath, 'utf-8');

        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/name:\s*rulebook-/);
        expect(content).toMatch(/description:\s*.+/);
      }
    });
  });

  describe('Plugin Discovery', () => {
    it('should have .claude-plugin/plugin.json', async () => {
      const pluginJsonPath = path.join(pluginDir, 'plugin.json');
      const exists = await fs
        .access(pluginJsonPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it('should have commands directory at root', async () => {
      const commandsDir = path.join(projectRoot, 'commands');
      const files = await fs.readdir(commandsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      expect(mdFiles.length).toBeGreaterThan(0);
    });

    it('should have skills directory with all Rulebook skills', async () => {
      const skillsDir = path.join(projectRoot, 'skills');
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });
      const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      // Original 5 skills
      expect(skillDirs).toContain('rulebook-typescript');
      expect(skillDirs).toContain('rulebook-task-management');
      expect(skillDirs).toContain('rulebook-quality-gates');
      expect(skillDirs).toContain('rulebook-git-workflow');
      expect(skillDirs).toContain('rulebook-mcp');
      // 7 task management MCP tool skills
      expect(skillDirs).toContain('rulebook-task-create');
      expect(skillDirs).toContain('rulebook-task-list');
      expect(skillDirs).toContain('rulebook-task-show');
      expect(skillDirs).toContain('rulebook-task-update');
      expect(skillDirs).toContain('rulebook-task-validate');
      expect(skillDirs).toContain('rulebook-task-archive');
      expect(skillDirs).toContain('rulebook-task-delete');
      // 6 skill management MCP tool skills
      expect(skillDirs).toContain('rulebook-skill-list');
      expect(skillDirs).toContain('rulebook-skill-show');
      expect(skillDirs).toContain('rulebook-skill-enable');
      expect(skillDirs).toContain('rulebook-skill-disable');
      expect(skillDirs).toContain('rulebook-skill-search');
      expect(skillDirs).toContain('rulebook-skill-validate');
      expect(skillDirs.length).toBe(18);
    });
  });

  describe('Version Sync', () => {
    it('should have matching version in plugin.json and package.json', async () => {
      const pluginManifest = JSON.parse(
        await fs.readFile(path.join(pluginDir, 'plugin.json'), 'utf-8')
      );
      const packageJson = JSON.parse(
        await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8')
      );

      expect(pluginManifest.version).toBe(packageJson.version);
    });
  });
});
