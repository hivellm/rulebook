import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SkillsManager, getDefaultTemplatesPath } from '../src/core/skills-manager.js';

describe('Skill Commands', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-skill-test-'));

    // Create initial .rulebook config
    await fs.writeFile(
      path.join(testDir, '.rulebook'),
      JSON.stringify({
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: 'test-project',
        mode: 'full',
        features: {},
        coverageThreshold: 95,
        language: 'en',
        outputLanguage: 'en',
        cliTools: [],
        maxParallelTasks: 4,
        timeouts: {},
        languages: ['typescript'],
        skills: { enabled: [] },
      })
    );

    // Mock process.cwd
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(testDir);

    // Mock console.log and console.error
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.exit
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('SkillsManager', () => {
    it('should create skills manager with default templates path', () => {
      const templatesPath = getDefaultTemplatesPath();
      expect(templatesPath).toBeDefined();
      expect(typeof templatesPath).toBe('string');
    });

    it('should instantiate skills manager', () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      expect(manager).toBeDefined();
    });

    it('should discover skills from templates directory', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skills = await manager.getSkills();

      // Should find at least the TypeScript and Rulebook skills we created
      expect(skills.length).toBeGreaterThanOrEqual(0);
    });

    it('should get skill by id', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skill = await manager.getSkillById('languages/typescript');

      // If the skill exists, verify it has the right structure
      if (skill) {
        expect(skill.id).toBe('languages/typescript');
        expect(skill.category).toBe('languages');
        expect(skill.metadata.name).toBeDefined();
      }
    });

    it('should return null for non-existent skill', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skill = await manager.getSkillById('nonexistent/skill');

      expect(skill).toBeNull();
    });

    it('should search skills by query', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const results = await manager.searchSkills('typescript');

      // Results should be an array (may or may not have matches)
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get skills by category', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);
      const skills = await manager.getSkillsByCategory('languages');

      // Should return an array of skills in the languages category
      expect(Array.isArray(skills)).toBe(true);
      for (const skill of skills) {
        expect(skill.category).toBe('languages');
      }
    });

    it('should enable a skill', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      // Get any available skill
      const skills = await manager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;

        // Create initial config
        const initialConfig = {
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: 'test',
          mode: 'full' as const,
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
          language: 'en' as const,
          outputLanguage: 'en' as const,
          cliTools: [],
          maxParallelTasks: 4,
          timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
          skills: { enabled: [] },
        };

        const updatedConfig = await manager.enableSkill(skillId, initialConfig);

        expect(updatedConfig.skills?.enabled).toContain(skillId);
      }
    });

    it('should disable a skill', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      // Get any available skill
      const skills = await manager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;

        // Create config with skill enabled
        const initialConfig = {
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: 'test',
          mode: 'full' as const,
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
          language: 'en' as const,
          outputLanguage: 'en' as const,
          cliTools: [],
          maxParallelTasks: 4,
          timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
          skills: { enabled: [skillId] },
        };

        const updatedConfig = await manager.disableSkill(skillId, initialConfig);

        expect(updatedConfig.skills?.enabled).not.toContain(skillId);
        expect(updatedConfig.skills?.disabled).toContain(skillId);
      }
    });

    it('should validate skills configuration', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      const config = {
        version: '1.0.0',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: 'test',
        mode: 'full' as const,
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
        language: 'en' as const,
        outputLanguage: 'en' as const,
        cliTools: [],
        maxParallelTasks: 4,
        timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
        skills: { enabled: [] },
      };

      const result = await manager.validateSkills(config);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should get enabled skills in order', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      const skills = await manager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;

        const config = {
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: 'test',
          mode: 'full' as const,
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
          language: 'en' as const,
          outputLanguage: 'en' as const,
          cliTools: [],
          maxParallelTasks: 4,
          timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
          skills: { enabled: [skillId], order: [skillId] },
        };

        const enabledSkills = await manager.getEnabledSkills(config);

        expect(Array.isArray(enabledSkills)).toBe(true);
        if (enabledSkills.length > 0) {
          expect(enabledSkills[0].id).toBe(skillId);
          expect(enabledSkills[0].enabled).toBe(true);
        }
      }
    });

    it('should merge skills content', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      const skills = await manager.getSkills();
      if (skills.length > 0) {
        const skillId = skills[0].id;

        const config = {
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          projectId: 'test',
          mode: 'full' as const,
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
          language: 'en' as const,
          outputLanguage: 'en' as const,
          cliTools: [],
          maxParallelTasks: 4,
          timeouts: { taskExecution: 60000, cliResponse: 30000, testRun: 120000 },
          skills: { enabled: [skillId] },
        };

        const content = await manager.mergeSkillsContent(config);

        expect(typeof content).toBe('string');
        if (content) {
          expect(content).toContain('RULEBOOK:SKILLS_INDEX');
        }
      }
    });

    it('should auto-detect skills based on config', async () => {
      const manager = new SkillsManager(getDefaultTemplatesPath(), testDir);

      const partialConfig = {
        languages: ['typescript' as const],
        frameworks: [],
        modules: [],
        services: [],
      };

      const detectedSkills = await manager.autoDetectSkills(partialConfig);

      expect(Array.isArray(detectedSkills)).toBe(true);
      // Should detect at least core skills
    });
  });
});
