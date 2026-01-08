import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createConfigManager } from '../src/core/config-manager.js';
import { SkillsManager, getDefaultTemplatesPath } from '../src/core/skills-manager.js';

/**
 * Backward Compatibility Tests for v2.0
 * These tests verify that v1.x configurations work correctly with v2.0
 */
describe('Backward Compatibility v1.x to v2.0', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-compat-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('ConfigManager with v1.x configs', () => {
    it('should load v1.x config without skills section', async () => {
      // v1.x config format - no skills section
      const v1Config = {
        version: '1.0.0',
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
        // Note: No skills section - this is v1.x format
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const configManager = createConfigManager(testDir);
      const loadedConfig = await configManager.loadConfig();

      expect(loadedConfig.version).toBe('1.0.0');
      expect(loadedConfig.languages).toContain('typescript');
      // skills should be undefined or have default values
      expect(loadedConfig.skills === undefined || loadedConfig.skills?.enabled !== undefined).toBe(
        true
      );
    });

    it('should save and load config with skills section added', async () => {
      // Start with v1.x config
      const v1Config = {
        version: '1.0.0',
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
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const configManager = createConfigManager(testDir);
      let config = await configManager.loadConfig();

      // Add skills section (simulating update to v2.0)
      config.version = '2.0.0';
      config.skills = { enabled: ['languages/typescript'] };
      await configManager.saveConfig(config);

      // Reload and verify
      const reloadedConfig = await configManager.loadConfig();
      expect(reloadedConfig.version).toBe('2.0.0');
      expect(reloadedConfig.skills?.enabled).toContain('languages/typescript');
    });

    it('should handle config with empty skills object', async () => {
      const configWithEmptySkills = {
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

      await fs.writeFile(
        path.join(testDir, '.rulebook'),
        JSON.stringify(configWithEmptySkills, null, 2)
      );

      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      expect(config.skills).toBeDefined();
      expect(config.skills?.enabled).toEqual([]);
    });

    it('should handle config with only enabled skills (no disabled/order)', async () => {
      const configWithOnlyEnabled = {
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
        skills: { enabled: ['core/rulebook'] }, // No disabled or order fields
      };

      await fs.writeFile(
        path.join(testDir, '.rulebook'),
        JSON.stringify(configWithOnlyEnabled, null, 2)
      );

      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      expect(config.skills).toBeDefined();
      expect(config.skills?.enabled).toContain('core/rulebook');
      // disabled and order should be undefined (optional fields)
      expect(config.skills?.disabled).toBeUndefined();
      expect(config.skills?.order).toBeUndefined();
    });
  });

  describe('SkillsManager with v1.x configs', () => {
    it('should handle config without skills section', async () => {
      // v1.x config format - no skills section
      const v1Config = {
        version: '1.0.0',
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
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      // getEnabledSkills should handle config without skills section
      const enabledSkills = await skillsManager.getEnabledSkills(config);
      expect(Array.isArray(enabledSkills)).toBe(true);
    });

    it('should enable skill on v1.x config and add skills section', async () => {
      const v1Config = {
        version: '1.0.0',
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
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      let config = await configManager.loadConfig();

      // Get a real skill ID
      const skills = await skillsManager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;

        // Enable skill - should add skills section
        config = await skillsManager.enableSkill(skillId, config);

        expect(config.skills).toBeDefined();
        expect(config.skills?.enabled).toContain(skillId);
      }
    });

    it('should validate config without skills section', async () => {
      const v1Config = {
        version: '1.0.0',
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
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      // Validate should work on config without skills
      const result = await skillsManager.validateSkills(config);
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should auto-detect skills from partial config (v1.x style)', async () => {
      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      // Partial config like v1.x would have (no skills section)
      const partialConfig = {
        languages: ['typescript' as const],
        frameworks: [],
        modules: [],
        services: [],
      };

      const detectedSkills = await skillsManager.autoDetectSkills(partialConfig);

      expect(Array.isArray(detectedSkills)).toBe(true);
      // Should detect at least core skills
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed skills array', async () => {
      const configWithMalformed = {
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
        skills: {
          enabled: ['valid/skill', '', 'another/valid'],
        },
      };

      await fs.writeFile(
        path.join(testDir, '.rulebook'),
        JSON.stringify(configWithMalformed, null, 2)
      );

      const skillsManager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const configManager = createConfigManager(testDir);
      const config = await configManager.loadConfig();

      // Validation should detect issues
      const result = await skillsManager.validateSkills(config);
      expect(result).toBeDefined();
      // May have errors for invalid skill IDs
    });

    it('should preserve other config fields when adding skills', async () => {
      const v1Config = {
        version: '1.0.0',
        installedAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        projectId: 'custom-project-id',
        mode: 'minimal',
        features: {
          watcher: true,
          agent: true,
          logging: true,
          telemetry: false,
          notifications: true,
          dryRun: false,
          gitHooks: true,
          repl: false,
          templates: true,
          context: true,
          health: true,
          plugins: false,
          parallel: true,
          smartContinue: true,
        },
        coverageThreshold: 80,
        language: 'pt-BR',
        outputLanguage: 'pt-BR',
        cliTools: ['cursor', 'claude-code'],
        maxParallelTasks: 8,
        timeouts: { taskExecution: 120000, cliResponse: 60000, testRun: 300000 },
        languages: ['typescript', 'python'],
        frameworks: ['nestjs'],
        modules: ['supabase'],
        services: ['postgresql'],
      };

      await fs.writeFile(path.join(testDir, '.rulebook'), JSON.stringify(v1Config, null, 2));

      const configManager = createConfigManager(testDir);
      let config = await configManager.loadConfig();

      // Add skills section
      config.skills = { enabled: ['core/rulebook'] };
      await configManager.saveConfig(config);

      // Reload and verify all original fields preserved
      const reloadedConfig = await configManager.loadConfig();

      expect(reloadedConfig.projectId).toBe('custom-project-id');
      expect(reloadedConfig.mode).toBe('minimal');
      expect(reloadedConfig.features?.watcher).toBe(true);
      expect(reloadedConfig.coverageThreshold).toBe(80);
      expect(reloadedConfig.language).toBe('pt-BR');
      expect(reloadedConfig.cliTools).toContain('cursor');
      expect(reloadedConfig.maxParallelTasks).toBe(8);
      expect(reloadedConfig.languages).toContain('python');
      expect(reloadedConfig.skills?.enabled).toContain('core/rulebook');
    });

    it('should handle missing .rulebook file gracefully', async () => {
      // Don't create .rulebook file
      const configManager = createConfigManager(testDir);

      // Config manager creates default config when file is missing
      // This is intentional behavior - it should not crash
      const config = await configManager.loadConfig();
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      // Default config should have empty or undefined skills
      expect(config.skills === undefined || Array.isArray(config.skills?.enabled)).toBe(true);
    });
  });
});
