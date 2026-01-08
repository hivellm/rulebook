import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SkillsManager, getDefaultTemplatesPath } from '../src/core/skills-manager.js';
import { createConfigManager } from '../src/core/config-manager.js';

/**
 * Tests for MCP Skills Management Functions
 * These tests verify the underlying functionality used by MCP skill functions
 */
describe('MCP Skills Functions', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-mcp-skills-test-'));

    // Create .rulebook config with skills enabled
    const config = {
      version: '2.0.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: 'test-project',
      mode: 'full',
      features: {
        watcher: false,
        agent: false,
        logging: false,
        telemetry: false,
        notifications: false,
        dryRun: false,
        gitHooks: false,
        repl: false,
        templates: false,
        context: false,
        health: false,
        plugins: false,
        parallel: false,
        smartContinue: false,
      },
      coverageThreshold: 95,
      language: 'en',
      outputLanguage: 'en',
      cliTools: [],
      maxParallelTasks: 4,
      timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
      languages: ['typescript'],
      skills: { enabled: [] },
    };

    await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(config, null, 2));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('rulebook_skill_list functionality', () => {
    it('should list all available skills', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skills = await skillsManager.getSkills();

      expect(Array.isArray(skills)).toBe(true);
      // Skills should have required properties
      for (const skill of skills) {
        expect(skill.id).toBeDefined();
        expect(skill.category).toBeDefined();
        expect(skill.metadata.name).toBeDefined();
        expect(skill.metadata.description).toBeDefined();
      }
    });

    it('should filter skills by category', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const languageSkills = await skillsManager.getSkillsByCategory('languages');

      expect(Array.isArray(languageSkills)).toBe(true);
      for (const skill of languageSkills) {
        expect(skill.category).toBe('languages');
      }
    });

    it('should return empty array for invalid category', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skills = await skillsManager.getSkillsByCategory('invalid-category' as any);

      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBe(0);
    });
  });

  describe('rulebook_skill_show functionality', () => {
    it('should show skill details by ID', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skills = await skillsManager.getSkills();

      if (skills.length > 0) {
        const skillId = skills[0].id;
        const skill = await skillsManager.getSkillById(skillId);

        expect(skill).not.toBeNull();
        expect(skill?.id).toBe(skillId);
        expect(skill?.metadata).toBeDefined();
        expect(skill?.content).toBeDefined();
      }
    });

    it('should return null for non-existent skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skill = await skillsManager.getSkillById('nonexistent/skill');

      expect(skill).toBeNull();
    });
  });

  describe('rulebook_skill_enable functionality', () => {
    it('should enable a skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;
        let config = await configManager.loadConfig();

        // Enable the skill
        config = await skillsManager.enableSkill(skillId, config);

        expect(config.skills?.enabled).toContain(skillId);
      }
    });

    it('should not duplicate already enabled skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;
        let config = await configManager.loadConfig();

        // Enable the skill twice
        config = await skillsManager.enableSkill(skillId, config);
        config = await skillsManager.enableSkill(skillId, config);

        // Should only appear once
        const count = config.skills?.enabled.filter((id) => id === skillId).length;
        expect(count).toBe(1);
      }
    });

    it('should throw error for non-existent skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      await expect(skillsManager.enableSkill('nonexistent/skill', config)).rejects.toThrow(
        'Skill not found'
      );
    });
  });

  describe('rulebook_skill_disable functionality', () => {
    it('should disable an enabled skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;
        let config = await configManager.loadConfig();

        // Enable then disable
        config = await skillsManager.enableSkill(skillId, config);
        config = await skillsManager.disableSkill(skillId, config);

        expect(config.skills?.enabled).not.toContain(skillId);
        expect(config.skills?.disabled).toContain(skillId);
      }
    });

    it('should throw error for non-existent skill', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      await expect(skillsManager.disableSkill('nonexistent/skill', config)).rejects.toThrow(
        'Skill not found'
      );
    });
  });

  describe('rulebook_skill_search functionality', () => {
    it('should search skills by name', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const results = await skillsManager.searchSkills('typescript');

      expect(Array.isArray(results)).toBe(true);
      // If there are results, they should match the query
      for (const skill of results) {
        const matchesName = skill.metadata.name.toLowerCase().includes('typescript');
        const matchesDescription = skill.metadata.description.toLowerCase().includes('typescript');
        const matchesTags = skill.metadata.tags?.some((t) =>
          t.toLowerCase().includes('typescript')
        );
        const matchesId = skill.id.toLowerCase().includes('typescript');

        expect(matchesName || matchesDescription || matchesTags || matchesId).toBe(true);
      }
    });

    it('should return empty array for no matches', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const results = await skillsManager.searchSkills('xyznonexistentquery123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should be case-insensitive', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const lowerResults = await skillsManager.searchSkills('typescript');
      const upperResults = await skillsManager.searchSkills('TYPESCRIPT');
      const mixedResults = await skillsManager.searchSkills('TypeScript');

      // All should return the same results
      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
    });
  });

  describe('rulebook_skill_validate functionality', () => {
    it('should validate empty skills config', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      const result = await skillsManager.validateSkills(config);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should validate config with enabled skills', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        let config = await configManager.loadConfig();
        config = await skillsManager.enableSkill(skills[0].id, config);

        const result = await skillsManager.validateSkills(config);

        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
      }
    });

    it('should detect invalid skill IDs', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      // Manually add invalid skill ID
      config.skills = {
        enabled: ['nonexistent/invalid-skill'],
      };

      const result = await skillsManager.validateSkills(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with ConfigManager', () => {
    it('should persist skill changes through ConfigManager', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;
        let config = await configManager.loadConfig();

        // Enable skill and save
        config = await skillsManager.enableSkill(skillId, config);
        await configManager.saveConfig(config);

        // Reload and verify
        const reloadedConfig = await configManager.loadConfig();
        expect(reloadedConfig.skills?.enabled).toContain(skillId);
      }
    });

    it('should handle skills in auto-detect mode', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      const partialConfig = {
        languages: ['typescript' as const],
        frameworks: [],
        modules: [],
        services: [],
      };

      const detectedSkills = await skillsManager.autoDetectSkills(partialConfig);

      expect(Array.isArray(detectedSkills)).toBe(true);
      // Should detect TypeScript skill if it exists
      // Also should include core skills
    });
  });
});
