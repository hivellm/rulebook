import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findRulebookFile, startRulebookMcpServer } from '../src/mcp/rulebook-server.js';
import { TaskManager } from '../src/core/task-manager.js';
import { promises as fs } from 'fs';
import { readFileSync, writeFileSync } from 'fs';
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
    };
    writeFileSync(join(testDir, '.rulebook'), JSON.stringify(rulebookConfig, null, 2));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('findRulebookFile', () => {
    it('should find .rulebook file in current directory', () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const found = findRulebookFile(testDir);
        expect(found).toBe(join(testDir, '.rulebook'));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should find .rulebook file in parent directory', async () => {
      const subDir = join(testDir, 'sub', 'dir');
      await fs.mkdir(subDir, { recursive: true });

      const found = findRulebookFile(subDir);
      expect(found).toBe(join(testDir, '.rulebook'));
    });

    it('should return null if .rulebook not found', () => {
      const emptyDir = join(tmpdir(), `empty-${Date.now()}`);
      const found = findRulebookFile(emptyDir);
      expect(found).toBeNull();
    });
  });

  describe('TaskManager Integration', () => {
    it('should create TaskManager with correct paths', () => {
      const taskManager = new TaskManager(testDir, 'rulebook');

      // TaskManager should be created successfully
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

    it('should delete tasks', async () => {
      const taskManager = new TaskManager(testDir, 'rulebook');
      await taskManager.initialize();

      await taskManager.createTask('test-delete-task');
      await taskManager.deleteTask('test-delete-task');

      const tasks = await taskManager.listTasks();
      expect(tasks.length).toBe(0);
    });
  });

  describe('Server Configuration', () => {
    it('should load configuration from .rulebook', () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const found = findRulebookFile(testDir);
        expect(found).toBe(join(testDir, '.rulebook'));

        const config = JSON.parse(readFileSync(join(testDir, '.rulebook'), 'utf8'));
        expect(config.mcp).toBeDefined();
        expect(config.mcp.enabled).toBe(true);
        expect(config.mcp.tasksDir).toBe('rulebook/tasks');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
