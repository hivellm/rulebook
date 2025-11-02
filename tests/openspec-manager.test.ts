import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOpenSpecManager } from '../src/core/openspec-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('OpenSpecManager', () => {
  let tempDir: string;
  let openspecManager: ReturnType<typeof createOpenSpecManager>;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-openspec-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    openspecManager = createOpenSpecManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialize', () => {
    it('should create openspec directory structure', async () => {
      await openspecManager.initialize();

      const openspecPath = join(tempDir, 'openspec');
      const changesPath = join(openspecPath, 'changes');
      const specsPath = join(openspecPath, 'specs');

      const openspecExists = await fs
        .access(openspecPath)
        .then(() => true)
        .catch(() => false);
      const changesExists = await fs
        .access(changesPath)
        .then(() => true)
        .catch(() => false);
      const specsExists = await fs
        .access(specsPath)
        .then(() => true)
        .catch(() => false);

      expect(openspecExists).toBe(true);
      expect(changesExists).toBe(true);
      expect(specsExists).toBe(true);
    });

    it('should create initial tasks', async () => {
      await openspecManager.initialize();

      const data = await openspecManager.loadOpenSpec();

      // When there are no task files, tasks array should be initialized (can be empty)
      expect(Array.isArray(data.tasks)).toBe(true);
      expect(Array.isArray(data.history)).toBe(true);
      expect(data.metadata.totalTasks).toBe(data.tasks.length + data.history.length);
    });
  });

  describe('loadOpenSpec', () => {
    it('should load OpenSpec data', async () => {
      await openspecManager.initialize();

      const data = await openspecManager.loadOpenSpec();

      expect(data).toMatchObject({
        tasks: expect.any(Array),
        history: expect.any(Array),
        metadata: {
          version: '1.0.0',
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
        },
      });
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks ordered by priority', async () => {
      await openspecManager.initialize();

      const tasks = await openspecManager.getTasksByPriority();

      expect(Array.isArray(tasks)).toBe(true);

      // Check if tasks are ordered by priority
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].priority).toBeGreaterThanOrEqual(tasks[i - 1].priority);
      }
    });
  });

  describe('addTask', () => {
    it('should add new task', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
        dependencies: [],
        estimatedTime: 300,
        tags: ['test'],
      });

      expect(taskId).toBeDefined();

      const task = await openspecManager.getTask(taskId);
      expect(task).toMatchObject({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      await openspecManager.initialize();

      // First, add a task to update
      const taskId = await openspecManager.addTask({
        title: 'Task to Update',
        description: 'A task to test status updates',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.updateTaskStatus(taskId, 'in-progress');

      const updatedTask = await openspecManager.getTask(taskId);
      expect(updatedTask?.status).toBe('in-progress');
    });

    it('should move completed tasks to history', async () => {
      await openspecManager.initialize();

      // First, add a task to complete
      const taskId = await openspecManager.addTask({
        title: 'Task to Complete',
        description: 'A task to test completion',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.updateTaskStatus(taskId, 'completed');

      const data = await openspecManager.loadOpenSpec();
      const completedTask = data.history.find((t) => t.id === taskId);

      expect(completedTask).toBeDefined();
      expect(completedTask?.status).toBe('completed');
    });
  });

  describe('getTaskStats', () => {
    it('should return task statistics', async () => {
      await openspecManager.initialize();

      const stats = await openspecManager.getTaskStats();

      expect(stats).toMatchObject({
        total: expect.any(Number),
        pending: expect.any(Number),
        inProgress: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        skipped: expect.any(Number),
      });

      expect(stats.total).toBe(
        stats.pending + stats.inProgress + stats.completed + stats.failed + stats.skipped
      );
    });
  });

  describe('validateDependencyGraph', () => {
    it('should validate dependency graph', async () => {
      await openspecManager.initialize();

      const validation = await openspecManager.validateDependencyGraph();

      expect(validation).toMatchObject({
        valid: expect.any(Boolean),
        cycles: expect.any(Array),
      });
    });
  });

  describe('generateDependencyTree', () => {
    it('should generate dependency tree', async () => {
      await openspecManager.initialize();

      const tree = await openspecManager.generateDependencyTree();

      expect(typeof tree).toBe('string');
      expect(tree).toContain('Task Dependency Tree');
    });
  });

});
