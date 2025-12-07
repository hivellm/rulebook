import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findRulebookFile } from '../src/mcp/rulebook-server.js';
import { TaskManager } from '../src/core/task-manager.js';
import { SkillsManager } from '../src/core/skills-manager.js';
import { ConfigManager } from '../src/core/config-manager.js';
import { promises as fs } from 'fs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP Server', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-mcp-server-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create .rulebook file for testing
    const rulebookConfig = {
      mcp: {
        enabled: true,
        tasksDir: 'rulebook/tasks',
        archiveDir: 'rulebook/archive',
      },
      skills: {
        enabled: ['languages/typescript', 'core/rulebook'],
      },
    };
    writeFileSync(join(testDir, '.rulebook'), JSON.stringify(rulebookConfig, null, 2));

    // Create directories
    await fs.mkdir(join(testDir, 'rulebook/tasks'), { recursive: true });
    await fs.mkdir(join(testDir, 'rulebook/archive'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('findRulebookFile', () => {
    it('should find .rulebook file in current directory', () => {
      const found = findRulebookFile(testDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });

    it('should find .rulebook file in parent directory', async () => {
      const subDir = join(testDir, 'sub', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const found = findRulebookFile(subDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });

    it('should return null if .rulebook not found', async () => {
      const emptyDir = join(tmpdir(), `empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      try {
        const found = findRulebookFile(emptyDir);
        expect(found).toBeNull();
      } finally {
        await fs.rm(emptyDir, { recursive: true, force: true });
      }
    });

    it('should walk up directories until root', async () => {
      const deepDir = join(testDir, 'a', 'b', 'c', 'd', 'e');
      await fs.mkdir(deepDir, { recursive: true });

      const found = findRulebookFile(deepDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });
  });

  describe('TaskManager Integration', () => {
    it('should create TaskManager with correct paths', () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      expect(taskManager).toBeDefined();
    });

    it('should create and list tasks', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-task-1');
      const tasks = await taskManager.listTasks();

      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('test-task-1');
    });

    it('should show task details', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-show-task');
      const task = await taskManager.showTask('test-show-task');

      expect(task).toBeDefined();
      expect(task?.id).toBe('test-show-task');
      expect(task?.status).toBe('pending');
    });

    it('should update task status', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-update-task');
      await taskManager.updateTaskStatus('test-update-task', 'in-progress');

      const task = await taskManager.showTask('test-update-task');
      expect(task?.status).toBe('in-progress');
    });

    it('should validate tasks', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-validate-task');
      const validation = await taskManager.validateTask('test-validate-task');

      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
    });

    it('should archive tasks', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-archive-task');
      await taskManager.updateTaskStatus('test-archive-task', 'completed');
      await taskManager.archiveTask('test-archive-task', true);

      const tasks = await taskManager.listTasks(false);
      expect(tasks.find((t) => t.id === 'test-archive-task')).toBeUndefined();

      const archivedTasks = await taskManager.listTasks(true);
      expect(archivedTasks.find((t) => t.id === 'test-archive-task')).toBeDefined();
    });

    it('should delete tasks', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-delete-task');
      await taskManager.deleteTask('test-delete-task');

      const tasks = await taskManager.listTasks();
      expect(tasks.length).toBe(0);
    });

    it('should filter tasks by status', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('task-1');
      await taskManager.createTask('task-2');
      await taskManager.updateTaskStatus('task-2', 'in-progress');

      const allTasks = await taskManager.listTasks();
      expect(allTasks.length).toBe(2);

      const inProgressTasks = allTasks.filter((t) => t.status === 'in-progress');
      expect(inProgressTasks.length).toBe(1);
      expect(inProgressTasks[0].id).toBe('task-2');
    });
  });

  describe('SkillsManager Integration', () => {
    it('should create SkillsManager', () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      expect(skillsManager).toBeDefined();
    });

    it('should get skills list', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const skills = await skillsManager.getSkills();
      expect(Array.isArray(skills)).toBe(true);
    });

    it('should search skills', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const results = await skillsManager.searchSkills('typescript');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should enable and disable skills', async () => {
      const configManager = new ConfigManager(testDir);
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);

      let config = await configManager.loadConfig();
      const initialEnabled = config.skills?.enabled || [];

      config = await skillsManager.enableSkill('languages/python', config);
      expect(config.skills?.enabled).toContain('languages/python');

      config = await skillsManager.disableSkill('languages/python', config);
      expect(config.skills?.enabled).not.toContain('languages/python');
    });

    it('should validate skills configuration', async () => {
      const configManager = new ConfigManager(testDir);
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);

      const config = await configManager.loadConfig();
      const validation = await skillsManager.validateSkills(config);

      expect(validation).toBeDefined();
      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('ConfigManager Integration', () => {
    it('should load configuration from .rulebook', async () => {
      const configManager = new ConfigManager(testDir);
      const config = await configManager.loadConfig();

      expect(config.mcp).toBeDefined();
      expect(config.mcp?.enabled).toBe(true);
      expect(config.mcp?.tasksDir).toBe('rulebook/tasks');
    });

    it('should save configuration', async () => {
      const configManager = new ConfigManager(testDir);
      let config = await configManager.loadConfig();

      config.mcp = {
        enabled: false,
        tasksDir: 'custom/tasks',
        archiveDir: 'custom/archive',
      };

      await configManager.saveConfig(config);

      const reloadedConfig = await configManager.loadConfig();
      expect(reloadedConfig.mcp?.enabled).toBe(false);
      expect(reloadedConfig.mcp?.tasksDir).toBe('custom/tasks');
    });
  });

  describe('MCP Tool Simulations', () => {
    it('should simulate rulebook_task_create tool behavior', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      const taskId = 'simulated-task';
      await taskManager.createTask(taskId);

      const tasks = await taskManager.listTasks();
      expect(tasks.find((t) => t.id === taskId)).toBeDefined();
    });

    it('should simulate rulebook_task_list tool with filters', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('task-a');
      await taskManager.createTask('task-b');
      await taskManager.updateTaskStatus('task-b', 'completed');

      const allTasks = await taskManager.listTasks(false);
      const completedTasks = allTasks.filter((t) => t.status === 'completed');

      expect(completedTasks.length).toBe(1);
      expect(completedTasks[0].id).toBe('task-b');
    });

    it('should simulate rulebook_skill_list tool', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const configManager = new ConfigManager(testDir);

      const skills = await skillsManager.getSkills();
      const config = await configManager.loadConfig();
      const enabledIds = new Set(config.skills?.enabled || []);

      const filteredSkills = skills.map((s) => ({
        id: s.id,
        name: s.metadata.name,
        enabled: enabledIds.has(s.id),
      }));

      expect(Array.isArray(filteredSkills)).toBe(true);
      expect(filteredSkills.length).toBeGreaterThan(0);
    });

    it('should simulate rulebook_skill_show tool', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const skills = await skillsManager.getSkills();

      if (skills.length > 0) {
        const skillId = skills[0].id;
        const skill = await skillsManager.getSkillById(skillId);

        expect(skill).toBeDefined();
        expect(skill?.id).toBe(skillId);
      }
    });

    it('should simulate rulebook_skill_enable tool', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const configManager = new ConfigManager(testDir);

      let config = await configManager.loadConfig();
      config = await skillsManager.enableSkill('languages/python', config);
      await configManager.saveConfig(config);

      const validation = await skillsManager.validateSkills(config);
      expect(validation).toBeDefined();
    });

    it('should simulate rulebook_skill_search tool', async () => {
      const skillsManager = new SkillsManager(join(process.cwd(), 'templates'), testDir);
      const configManager = new ConfigManager(testDir);

      const query = 'typescript';
      const skills = await skillsManager.searchSkills(query);
      const config = await configManager.loadConfig();
      const enabledIds = new Set(config.skills?.enabled || []);

      const results = skills.map((s) => ({
        id: s.id,
        name: s.metadata.name,
        enabled: enabledIds.has(s.id),
      }));

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
