import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  findRulebookConfig,
  acquirePidLock,
  releasePidLock,
  cleanStalePidFiles,
} from '../src/mcp/rulebook-server.js';
import { TaskManager } from '../src/core/task-manager.js';
import { SkillsManager } from '../src/core/skills-manager.js';
import { ConfigManager } from '../src/core/config-manager.js';
import { promises as fs } from 'fs';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Skip on Windows due to module import hanging issues
const isWindows = process.platform === 'win32';
const describeOrSkip = isWindows ? describe.skip : describe;

describeOrSkip('MCP Server', () => {
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

  describe('findRulebookConfig', () => {
    it('should find .rulebook file in current directory', () => {
      const found = findRulebookConfig(testDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });

    it('should find .rulebook file in parent directory', async () => {
      const subDir = join(testDir, 'sub', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const found = findRulebookConfig(subDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });

    it('should return null if .rulebook not found', async () => {
      const emptyDir = join(tmpdir(), `empty-${Date.now()}`);
      await fs.mkdir(emptyDir, { recursive: true });

      try {
        const found = findRulebookConfig(emptyDir);
        expect(found).toBeNull();
      } finally {
        await fs.rm(emptyDir, { recursive: true, force: true });
      }
    });

    it('should walk up directories until root', async () => {
      const deepDir = join(testDir, 'a', 'b', 'c', 'd', 'e');
      await fs.mkdir(deepDir, { recursive: true });

      const found = findRulebookConfig(deepDir);
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

// PID file tests are platform-independent — run on all OSes including Windows
describe('PID File Lock (per-session)', () => {
  let pidTestDir: string;

  beforeEach(async () => {
    pidTestDir = join(tmpdir(), `rulebook-pid-test-${Date.now()}`);
    await fs.mkdir(join(pidTestDir, '.rulebook'), { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(pidTestDir)) {
      await fs.rm(pidTestDir, { recursive: true, force: true });
    }
  });

  it('should create session-scoped PID file with current process PID', () => {
    const pidPath = acquirePidLock(pidTestDir);
    expect(existsSync(pidPath)).toBe(true);

    // File should be named mcp-server.<pid>.pid
    expect(pidPath).toContain(`mcp-server.${process.pid}.pid`);

    const content = readFileSync(pidPath, 'utf8').trim();
    expect(parseInt(content, 10)).toBe(process.pid);

    releasePidLock(pidPath);
  });

  it('should release PID file on shutdown', () => {
    const pidPath = acquirePidLock(pidTestDir);
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
    expect(existsSync(pidPath)).toBe(false);
  });

  it('should not release PID file if content was changed to another PID', () => {
    const pidPath = acquirePidLock(pidTestDir);

    // Simulate content overwrite (unlikely but defensive)
    writeFileSync(pidPath, '999999999', 'utf8');

    releasePidLock(pidPath);
    // Should NOT have been deleted since PID doesn't match
    expect(existsSync(pidPath)).toBe(true);
    expect(readFileSync(pidPath, 'utf8').trim()).toBe('999999999');
  });

  it('should allow multiple concurrent instances (no process.exit)', () => {
    // Simulate another alive instance by writing a PID file for current process
    const otherPidPath = join(pidTestDir, '.rulebook', `mcp-server.${process.pid}.pid`);
    writeFileSync(otherPidPath, String(process.pid), 'utf8');

    // acquirePidLock should NOT exit — just register (same PID in test, overwrites)
    const pidPath = acquirePidLock(pidTestDir);
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
  });

  it('should clean stale PID files from dead processes on startup', () => {
    // Write PID files for processes that don't exist
    const stale1 = join(pidTestDir, '.rulebook', 'mcp-server.999999991.pid');
    const stale2 = join(pidTestDir, '.rulebook', 'mcp-server.999999992.pid');
    writeFileSync(stale1, '999999991', 'utf8');
    writeFileSync(stale2, '999999992', 'utf8');

    // acquirePidLock cleans stale files on startup
    const pidPath = acquirePidLock(pidTestDir);

    expect(existsSync(stale1)).toBe(false);
    expect(existsSync(stale2)).toBe(false);
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
  });

  it('should clean legacy mcp-server.pid if stale', () => {
    const legacyPath = join(pidTestDir, '.rulebook', 'mcp-server.pid');
    writeFileSync(legacyPath, '999999999', 'utf8');

    const pidPath = acquirePidLock(pidTestDir);

    // Legacy stale file should be cleaned
    expect(existsSync(legacyPath)).toBe(false);
    // Our session PID file should exist
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
  });

  it('should not remove legacy mcp-server.pid if process is alive', () => {
    const legacyPath = join(pidTestDir, '.rulebook', 'mcp-server.pid');
    // Write current process PID (alive) as legacy format
    writeFileSync(legacyPath, String(process.pid), 'utf8');

    const pidPath = acquirePidLock(pidTestDir);

    // Legacy file should be preserved (process is alive)
    expect(existsSync(legacyPath)).toBe(true);
    // Our session PID file should also exist
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
  });

  it('should handle corrupt legacy PID file gracefully', () => {
    const legacyPath = join(pidTestDir, '.rulebook', 'mcp-server.pid');
    writeFileSync(legacyPath, 'not-a-number', 'utf8');

    const pidPath = acquirePidLock(pidTestDir);

    // Corrupt legacy file should be removed
    expect(existsSync(legacyPath)).toBe(false);
    expect(existsSync(pidPath)).toBe(true);

    releasePidLock(pidPath);
  });

  it('should create .rulebook directory if it does not exist', async () => {
    const freshDir = join(tmpdir(), `rulebook-pid-fresh-${Date.now()}`);
    await fs.mkdir(freshDir, { recursive: true });

    try {
      const pidPath = acquirePidLock(freshDir);
      expect(existsSync(pidPath)).toBe(true);
      releasePidLock(pidPath);
    } finally {
      await fs.rm(freshDir, { recursive: true, force: true });
    }
  });

  describe('cleanStalePidFiles', () => {
    it('should remove only stale PID files', () => {
      // Stale file (dead PID)
      const stalePath = join(pidTestDir, '.rulebook', 'mcp-server.999999999.pid');
      writeFileSync(stalePath, '999999999', 'utf8');

      // Alive file (current process)
      const alivePath = join(pidTestDir, '.rulebook', `mcp-server.${process.pid}.pid`);
      writeFileSync(alivePath, String(process.pid), 'utf8');

      cleanStalePidFiles(pidTestDir);

      expect(existsSync(stalePath)).toBe(false);
      expect(existsSync(alivePath)).toBe(true);
    });

    it('should handle non-existent .rulebook directory', () => {
      const emptyDir = join(tmpdir(), `rulebook-pid-empty-${Date.now()}`);
      // Should not throw
      expect(() => cleanStalePidFiles(emptyDir)).not.toThrow();
    });

    it('should not touch non-PID files', () => {
      const otherFile = join(pidTestDir, '.rulebook', 'config.json');
      writeFileSync(otherFile, '{}', 'utf8');

      cleanStalePidFiles(pidTestDir);

      expect(existsSync(otherFile)).toBe(true);
    });
  });
});
