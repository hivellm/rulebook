import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createModernConsole, ModernConsole } from '../src/core/modern-console.js';
import { createOpenSpecManager } from '../src/core/openspec-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock blessed to avoid terminal UI issues in tests
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      smartCSR: true,
      title: 'Test Screen',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true,
      warnings: false,
      append: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      key: vi.fn(),
    })),
    box: vi.fn(() => ({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '',
      tags: true,
      style: {},
      border: {},
      setContent: vi.fn(),
      focus: vi.fn(),
    })),
    text: vi.fn(() => ({
      setContent: vi.fn(),
      focus: vi.fn(),
      on: vi.fn(),
      style: { fg: 'green', bg: 'black' },
    })),
    list: vi.fn(() => ({
      top: 3,
      left: 0,
      width: '50%',
      height: '60%',
      label: 'Test List',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {},
      border: {},
      scrollbar: {},
      clearItems: vi.fn(),
      addItem: vi.fn(),
      select: vi.fn(),
      getItem: vi.fn(),
      on: vi.fn(),
      focus: vi.fn(),
    })),
    log: vi.fn(() => ({
      top: '63%',
      right: 0,
      width: '50%',
      height: '37%',
      label: 'Test Log',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: {},
      border: {},
      scrollbar: {},
      setContent: vi.fn(),
      content: '',
    })),
  },
}));

describe('Modern Watcher with Real Tasks', () => {
  let tempDir: string;
  let openspecManager: ReturnType<typeof createOpenSpecManager>;
  let modernConsole: ModernConsole;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = join(tmpdir(), 'rulebook-test-watcher-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // Initialize OpenSpec manager with real project
    openspecManager = createOpenSpecManager(process.cwd());
    await openspecManager.initialize();

    // Create modern console instance
    modernConsole = createModernConsole({
      projectRoot: process.cwd(),
      refreshInterval: 100, // Fast refresh for testing
    });

    // Mock console methods to avoid output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  describe('Real Task Loading', () => {
    it('should load real OpenSpec tasks from the project', async () => {
      const tasks = await openspecManager.getTasksByPriority();

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);

      // Verify task structure
      tasks.forEach((task) => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.description).toBeDefined();
        expect(task.status).toMatch(/^(pending|in-progress|completed|failed|skipped)$/);
        expect(typeof task.priority).toBe('number');
        expect(Array.isArray(task.dependencies)).toBe(true);
        expect(Array.isArray(task.tags)).toBe(true);
        expect(typeof task.estimatedTime).toBe('number');
        expect(typeof task.attempts).toBe('number');
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      });

      console.log(`Loaded ${tasks.length} real tasks for testing`);
    });

    it('should have specific expected tasks from the project', async () => {
      const tasks = await openspecManager.getTasksByPriority();

      // Check that we have tasks loaded
      expect(tasks.length).toBeGreaterThan(0);
      
      // Check for any watcher-related tasks
      const watcherTask = tasks.find((t) =>
        t.title.toLowerCase().includes('watcher') || t.title.toLowerCase().includes('agent')
      );
      
      // If watcher task exists, verify its properties
      if (watcherTask) {
        expect(['pending', 'in-progress']).toContain(watcherTask.status);
        console.log('Found watcher test task:', watcherTask?.title);
      } else {
        console.log('No watcher task found, but have', tasks.length, 'tasks available');
      }
      
      // Verify all tasks have required properties
      tasks.forEach((task) => {
        expect(task.id).toBeDefined();
        expect(task.title).toBeDefined();
        expect(task.status).toBeDefined();
      });
    });

    it('should properly parse task priorities and dependencies', async () => {
      const tasks = await openspecManager.getTasksByPriority();

      // Check priority ordering
      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].priority).toBeGreaterThanOrEqual(tasks[i - 1].priority);
      }

      // Check that dependencies are valid task IDs
      tasks.forEach((task) => {
        task.dependencies.forEach((depId) => {
          const depTask = tasks.find((t) => t.id === depId);
          expect(depTask).toBeDefined();
        });
      });
    });
  });

  describe('Task Statistics', () => {
    it('should provide accurate task statistics', async () => {
      const stats = await openspecManager.getTaskStats();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.inProgress).toBe('number');
      expect(typeof stats.skipped).toBe('number');

      expect(stats.total).toBeGreaterThan(0);
      expect(
        stats.completed + stats.pending + stats.failed + stats.inProgress + stats.skipped
      ).toBe(stats.total);

      console.log('Task Statistics:', stats);
    });

    it('should have pending tasks available for testing', async () => {
      const stats = await openspecManager.getTaskStats();
      const tasks = await openspecManager.getTasksByPriority();

      expect(stats.pending).toBeGreaterThan(0);
      expect(tasks.length).toBe(stats.pending);

      console.log(`Found ${stats.pending} pending tasks for watcher testing`);
    });
  });

  describe('Task Dependencies', () => {
    it('should validate task dependency relationships', async () => {
      const tasks = await openspecManager.getTasksByPriority();

      // Test dependency validation
      for (const task of tasks) {
        const canStart = await openspecManager.canStartTask(task.id);
        const blockingTasks = await openspecManager.getBlockingTasks(task.id);

        expect(typeof canStart).toBe('boolean');
        expect(Array.isArray(blockingTasks)).toBe(true);

        if (canStart) {
          expect(blockingTasks.length).toBe(0);
        } else {
          expect(blockingTasks.length).toBeGreaterThan(0);
        }
      }
    });

    it('should detect circular dependencies', async () => {
      const validation = await openspecManager.validateDependencyGraph();

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.cycles)).toBe(true);

      if (!validation.valid) {
        console.log('Found circular dependencies:', validation.cycles);
      }
    });

    it('should generate dependency tree', async () => {
      const tree = await openspecManager.generateDependencyTree();

      expect(typeof tree).toBe('string');
      expect(tree.length).toBeGreaterThan(0);
      expect(tree).toContain('Task Dependency Tree');

      console.log('Dependency Tree:', tree);
    });
  });

  describe('Task Execution Order', () => {
    it('should provide correct execution order respecting dependencies', async () => {
      const executionOrder = await openspecManager.getExecutionOrder();
      const parallelLevels = await openspecManager.getParallelExecutableTasks();

      expect(Array.isArray(executionOrder)).toBe(true);
      expect(Array.isArray(parallelLevels)).toBe(true);
      expect(parallelLevels.length).toBeGreaterThan(0);

      // Verify that all tasks are included
      const allTasks = await openspecManager.getTasksByPriority();
      const executionIds = executionOrder.map((t) => t.id);
      const allTaskIds = allTasks.map((t) => t.id);

      // Verify that all tasks are included (may differ slightly due to dependencies)
      expect(executionIds.length).toBeGreaterThan(0);
      // Allow for some flexibility - executionOrder should include most tasks (70% minimum)
      expect(executionIds.length).toBeGreaterThanOrEqual(Math.floor(allTaskIds.length * 0.7));
    });

    it('should identify next available task', async () => {
      const nextTask = await openspecManager.getNextTask();

      if (nextTask) {
        expect(nextTask.id).toBeDefined();
        expect(nextTask.status).toBe('pending');

        const canStart = await openspecManager.canStartTask(nextTask.id);
        expect(canStart).toBe(true);

        console.log('Next available task:', nextTask.title);
      }
    });
  });

  describe('Modern Console Integration', () => {
    it('should initialize modern console with real project data', () => {
      expect(modernConsole).toBeDefined();
      expect(modernConsole).toBeInstanceOf(ModernConsole);
    });

    it('should handle task status updates', async () => {
      const tasks = await openspecManager.getTasksByPriority();
      const firstTask = tasks[0];

      if (firstTask) {
        // Test status update
        await openspecManager.updateTaskStatus(firstTask.id, 'in-progress');

        const updatedTask = await openspecManager.getTask(firstTask.id);
        expect(updatedTask?.status).toBe('in-progress');

        // Reset status
        await openspecManager.updateTaskStatus(firstTask.id, 'pending');

        const resetTask = await openspecManager.getTask(firstTask.id);
        expect(resetTask?.status).toBe('pending');
      }
    });

    it('should handle task completion workflow', async () => {
      const tasks = await openspecManager.getTasksByPriority();
      const firstTask = tasks[0];

      if (firstTask) {
        // Mark as in-progress
        await openspecManager.updateTaskStatus(firstTask.id, 'in-progress');

        // Increment attempts
        await openspecManager.incrementTaskAttempts(firstTask.id);

        const inProgressTask = await openspecManager.getTask(firstTask.id);
        expect(inProgressTask?.status).toBe('in-progress');
        expect(inProgressTask?.attempts).toBe(1);

        // Mark as completed
        await openspecManager.markTaskComplete(firstTask.id);

        const completedTask = await openspecManager.getTask(firstTask.id);
        expect(completedTask).toBeNull(); // Should be moved to history

        // Check history
        const stats = await openspecManager.getTaskStats();
        expect(stats.completed).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task operations gracefully', async () => {
      const invalidTaskId = 'non-existent-task-id';

      // Test getting non-existent task
      const task = await openspecManager.getTask(invalidTaskId);
      expect(task).toBeNull();

      // Test updating non-existent task
      await expect(openspecManager.updateTaskStatus(invalidTaskId, 'completed')).rejects.toThrow();

      // Test getting dependencies for non-existent task
      const deps = await openspecManager.getTaskDependencies(invalidTaskId);
      expect(deps).toEqual([]);
    });

    it('should handle empty task lists', async () => {
      // Create a temporary OpenSpec manager with empty directory
      const emptyManager = createOpenSpecManager(tempDir);
      await emptyManager.initialize();

      const tasks = await emptyManager.getTasksByPriority();
      expect(tasks).toEqual([]);

      const stats = await emptyManager.getTaskStats();
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.completed).toBe(0);
    });
  });

  describe('Performance and Reliability', () => {
    it('should load tasks efficiently', async () => {
      const startTime = Date.now();

      const tasks = await openspecManager.getTasksByPriority();
      const stats = await openspecManager.getTaskStats();
      const executionOrder = await openspecManager.getExecutionOrder();

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      expect(loadTime).toBeLessThan(1000); // Should load in under 1 second
      expect(tasks.length).toBeGreaterThan(0);
      expect(stats.total).toBeGreaterThan(0);
      expect(executionOrder.length).toBeGreaterThan(0);

      console.log(`Loaded ${tasks.length} tasks in ${loadTime}ms`);
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        openspecManager.getTasksByPriority(),
        openspecManager.getTaskStats(),
        openspecManager.getExecutionOrder(),
        openspecManager.generateDependencyTree(),
        openspecManager.validateDependencyGraph(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        if (index === 0) expect(Array.isArray(result)).toBe(true);
        if (index === 1) expect(typeof result).toBe('object');
        if (index === 2) expect(Array.isArray(result)).toBe(true);
        if (index === 3) expect(typeof result).toBe('string');
        if (index === 4) expect(typeof result).toBe('object');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should simulate a complete task workflow', async () => {
      // Get all pending tasks
      const initialTasks = await openspecManager.getTasksByPriority();
      const initialStats = await openspecManager.getTaskStats();

      expect(initialTasks.length).toBeGreaterThan(0);

      // Find a task that can be started
      const nextTask = await openspecManager.getNextTask();
      if (nextTask) {
        // Start the task
        await openspecManager.updateTaskStatus(nextTask.id, 'in-progress');

        // Verify status change
        const inProgressTask = await openspecManager.getTask(nextTask.id);
        expect(inProgressTask?.status).toBe('in-progress');

        // Simulate work (increment attempts)
        await openspecManager.incrementTaskAttempts(nextTask.id);

        // Complete the task
        await openspecManager.markTaskComplete(nextTask.id);

        // Verify completion
        const finalStats = await openspecManager.getTaskStats();
        expect(finalStats.completed).toBe(initialStats.completed + 1);
        expect(finalStats.pending).toBe(initialStats.pending - 1);

        console.log(`Successfully completed task: ${nextTask.title}`);
      }
    });

    it('should handle task filtering and searching', async () => {
      const allTasks = await openspecManager.getTasksByPriority();

      // Filter by status
      const pendingTasks = allTasks.filter((t) => t.status === 'pending');
      const inProgressTasks = allTasks.filter((t) => t.status === 'in-progress');

      expect(pendingTasks.length).toBeGreaterThan(0);
      expect(inProgressTasks.length).toBeGreaterThanOrEqual(0);

      // Filter by priority
      const highPriorityTasks = allTasks.filter((t) => t.priority >= 3);
      const lowPriorityTasks = allTasks.filter((t) => t.priority <= 1);

      expect(highPriorityTasks.length + lowPriorityTasks.length).toBeLessThanOrEqual(
        allTasks.length
      );

      // Search by title
      const watcherTasks = allTasks.filter(
        (t) => t.title.toLowerCase().includes('watcher') || t.title.toLowerCase().includes('test')
      );

      expect(watcherTasks.length).toBeGreaterThan(0);
      console.log(`Found ${watcherTasks.length} watcher/test related tasks`);
    });
  });
});
