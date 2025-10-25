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
      const tasksPath = join(openspecPath, 'tasks.json');
      
      const openspecExists = await fs.access(openspecPath).then(() => true).catch(() => false);
      const tasksExists = await fs.access(tasksPath).then(() => true).catch(() => false);
      
      expect(openspecExists).toBe(true);
      expect(tasksExists).toBe(true);
    });

    it('should create initial tasks', async () => {
      await openspecManager.initialize();
      
      const data = await openspecManager.loadOpenSpec();
      
      expect(data.tasks.length).toBeGreaterThan(0);
      expect(data.metadata.totalTasks).toBe(data.tasks.length);
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
          completedTasks: expect.any(Number)
        }
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
        tags: ['test']
      });
      
      expect(taskId).toBeDefined();
      
      const task = await openspecManager.getTask(taskId);
      expect(task).toMatchObject({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending'
      });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      await openspecManager.initialize();
      
      const tasks = await openspecManager.getTasksByPriority();
      const firstTask = tasks[0];
      
      await openspecManager.updateTaskStatus(firstTask.id, 'in-progress');
      
      const updatedTask = await openspecManager.getTask(firstTask.id);
      expect(updatedTask?.status).toBe('in-progress');
    });

    it('should move completed tasks to history', async () => {
      await openspecManager.initialize();
      
      const tasks = await openspecManager.getTasksByPriority();
      const firstTask = tasks[0];
      
      await openspecManager.updateTaskStatus(firstTask.id, 'completed');
      
      const data = await openspecManager.loadOpenSpec();
      const completedTask = data.history.find(t => t.id === firstTask.id);
      
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
        skipped: expect.any(Number)
      });
      
      expect(stats.total).toBe(stats.pending + stats.inProgress + stats.completed + stats.failed + stats.skipped);
    });
  });

  describe('validateDependencyGraph', () => {
    it('should validate dependency graph', async () => {
      await openspecManager.initialize();
      
      const validation = await openspecManager.validateDependencyGraph();
      
      expect(validation).toMatchObject({
        valid: expect.any(Boolean),
        cycles: expect.any(Array)
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
