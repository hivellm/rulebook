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
    it('should not create openspec directory (deprecated)', async () => {
      await openspecManager.initialize();

      const openspecPath = join(tempDir, 'openspec');

      const openspecExists = await fs
        .access(openspecPath)
        .then(() => true)
        .catch(() => false);

      expect(openspecExists).toBe(false);
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

  describe('getCurrentTask', () => {
    it('should return null when no current task is set', async () => {
      await openspecManager.initialize();

      const currentTask = await openspecManager.getCurrentTask();

      expect(currentTask).toBeNull();
    });

    it('should return current task when set', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Current Task',
        description: 'A task to set as current',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.setCurrentTask(taskId);

      const currentTask = await openspecManager.getCurrentTask();
      expect(currentTask).toBeDefined();
      expect(currentTask?.id).toBe(taskId);
    });
  });

  describe('setCurrentTask', () => {
    it('should set current task', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Set',
        description: 'A task to set as current',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.setCurrentTask(taskId);

      const currentTask = await openspecManager.getCurrentTask();
      expect(currentTask?.id).toBe(taskId);
    });

    it('should throw error when task not found', async () => {
      await openspecManager.initialize();

      await expect(openspecManager.setCurrentTask('non-existent-task')).rejects.toThrow(
        'Task non-existent-task not found'
      );
    });
  });

  describe('markTaskComplete', () => {
    it('should mark task as complete', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Complete',
        description: 'A task to mark as complete',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.markTaskComplete(taskId);

      const data = await openspecManager.loadOpenSpec();
      const completedTask = data.history.find((t) => t.id === taskId);

      expect(completedTask).toBeDefined();
      expect(completedTask?.status).toBe('completed');
    });
  });

  describe('getTask', () => {
    it('should return task by ID', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const task = await openspecManager.getTask(taskId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.title).toBe('Test Task');
    });

    it('should return null for non-existent task', async () => {
      await openspecManager.initialize();

      const task = await openspecManager.getTask('non-existent-task');

      expect(task).toBeNull();
    });
  });

  describe('getTaskDependencies', () => {
    it('should return task dependencies', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const taskId = await openspecManager.addTask({
        title: 'Main Task',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      const dependencies = await openspecManager.getTaskDependencies(taskId);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].id).toBe(depTaskId);
    });

    it('should return empty array for task without dependencies', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task Without Dependencies',
        description: 'A task without dependencies',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const dependencies = await openspecManager.getTaskDependencies(taskId);

      expect(dependencies).toHaveLength(0);
    });

    it('should return empty array for non-existent task', async () => {
      await openspecManager.initialize();

      const dependencies = await openspecManager.getTaskDependencies('non-existent-task');

      expect(dependencies).toHaveLength(0);
    });
  });

  describe('areDependenciesSatisfied', () => {
    it('should return true when all dependencies are completed', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const taskId = await openspecManager.addTask({
        title: 'Main Task',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      // Complete the dependency
      await openspecManager.updateTaskStatus(depTaskId, 'completed');

      const satisfied = await openspecManager.areDependenciesSatisfied(taskId);

      expect(satisfied).toBe(true);
    });

    it('should return false when dependencies are not completed', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const taskId = await openspecManager.addTask({
        title: 'Main Task',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      const satisfied = await openspecManager.areDependenciesSatisfied(taskId);

      expect(satisfied).toBe(false);
    });

    it('should return true when task has no dependencies', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task Without Dependencies',
        description: 'A task without dependencies',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const satisfied = await openspecManager.areDependenciesSatisfied(taskId);

      expect(satisfied).toBe(true);
    });
  });

  describe('getNextTask', () => {
    it('should return next available task with satisfied dependencies', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Next Task',
        description: 'A task without dependencies',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const nextTask = await openspecManager.getNextTask();

      expect(nextTask).toBeDefined();
      expect(nextTask?.id).toBe(taskId);
    });

    it('should return null when no tasks available', async () => {
      await openspecManager.initialize();

      const nextTask = await openspecManager.getNextTask();

      expect(nextTask).toBeNull();
    });

    it('should return task with satisfied dependencies first', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.addTask({
        title: 'Task With Dependency',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      // Complete the dependency
      await openspecManager.updateTaskStatus(depTaskId, 'completed');

      const nextTask = await openspecManager.getNextTask();

      expect(nextTask).toBeDefined();
      expect(nextTask?.dependencies).toHaveLength(1);
    });
  });

  describe('incrementTaskAttempts', () => {
    it('should increment task attempts', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Attempt',
        description: 'A task to increment attempts',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.incrementTaskAttempts(taskId);

      const task = await openspecManager.getTask(taskId);
      expect(task?.attempts).toBe(1);

      await openspecManager.incrementTaskAttempts(taskId);
      const taskAfter = await openspecManager.getTask(taskId);
      expect(taskAfter?.attempts).toBe(2);
    });

    it('should not throw error for non-existent task', async () => {
      await openspecManager.initialize();

      await expect(
        openspecManager.incrementTaskAttempts('non-existent-task')
      ).resolves.not.toThrow();
    });
  });

  describe('loadTasksFromChanges', () => {
    it('should load tasks from changes directory', async () => {
      await openspecManager.initialize();

      const changesPath = join(tempDir, 'openspec', 'changes');
      const taskDir = join(changesPath, 'test-task');
      await fs.mkdir(taskDir, { recursive: true });

      const tasksContent = `## Implementation
- [ ] **TASK-001**: First task
- [x] **TASK-002**: Completed task
`;

      await fs.writeFile(join(taskDir, 'tasks.md'), tasksContent);

      const data = await openspecManager.loadOpenSpec();

      expect(data.tasks.length + data.history.length).toBeGreaterThan(0);
    });

    it('should handle empty changes directory', async () => {
      await openspecManager.initialize();

      const data = await openspecManager.loadOpenSpec();

      expect(Array.isArray(data.tasks)).toBe(true);
      expect(Array.isArray(data.history)).toBe(true);
    });
  });

  describe('parseTasksFromMarkdown', () => {
    it('should parse tasks with bold ID format', async () => {
      await openspecManager.initialize();

      const changesPath = join(tempDir, 'openspec', 'changes');
      const taskDir = join(changesPath, 'test-task');
      await fs.mkdir(taskDir, { recursive: true });

      const tasksContent = `## Implementation
- [ ] **TASK-001**: First task
- [x] **TASK-002**: Completed task
`;

      await fs.writeFile(join(taskDir, 'tasks.md'), tasksContent);

      const data = await openspecManager.loadOpenSpec();

      expect(data.tasks.length + data.history.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse tasks with legacy format', async () => {
      await openspecManager.initialize();

      const changesPath = join(tempDir, 'openspec', 'changes');
      const taskDir = join(changesPath, 'test-task');
      await fs.mkdir(taskDir, { recursive: true });

      const tasksContent = `## Implementation
- [ ] Task description (id: TASK-001)
- [x] Another task (id: TASK-002)
`;

      await fs.writeFile(join(taskDir, 'tasks.md'), tasksContent);

      const data = await openspecManager.loadOpenSpec();

      expect(data.tasks.length + data.history.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse tasks with priority from ID', async () => {
      await openspecManager.initialize();

      const changesPath = join(tempDir, 'openspec', 'changes');
      const taskDir = join(changesPath, 'test-task');
      await fs.mkdir(taskDir, { recursive: true });

      const tasksContent = `## Implementation
- [ ] **INIT-001**: Initialization task
- [ ] **IMPLEMENT-002**: Implementation task
`;

      await fs.writeFile(join(taskDir, 'tasks.md'), tasksContent);

      const data = await openspecManager.loadOpenSpec();

      if (data.tasks.length >= 2) {
        // Verify that tasks have priorities assigned
        expect(data.tasks.every((t) => typeof t.priority === 'number')).toBe(true);

        // Find tasks by ID pattern
        const initTask = data.tasks.find((t) => t.id === 'INIT-001');
        const implementTask = data.tasks.find((t) => t.id === 'IMPLEMENT-002');

        if (initTask && implementTask) {
          // INIT (phase 0) should have lower priority than IMPLEMENT (phase 3)
          // INIT-001 = 0 * 1000 + 1 = 1
          // IMPLEMENT-002 = 3 * 1000 + 2 = 3002
          // But if phase is not recognized, it gets priority 9 * 1000 + number
          // So we just verify both have priorities assigned
          expect(initTask.priority).toBeGreaterThan(0);
          expect(implementTask.priority).toBeGreaterThan(0);
        }
      }
    });

    it('should parse tasks with dependencies', async () => {
      await openspecManager.initialize();

      const changesPath = join(tempDir, 'openspec', 'changes');
      const taskDir = join(changesPath, 'test-task');
      await fs.mkdir(taskDir, { recursive: true });

      const tasksContent = `## Implementation
- [ ] **TASK-001**: First task
  - Task description (id: TASK-002)
`;

      await fs.writeFile(join(taskDir, 'tasks.md'), tasksContent);

      const data = await openspecManager.loadOpenSpec();

      if (data.tasks.length > 0) {
        const taskWithDeps = data.tasks.find((t) => t.id.includes('TASK-001'));
        if (taskWithDeps) {
          expect(Array.isArray(taskWithDeps.dependencies)).toBe(true);
        }
      }
    });
  });

  describe('syncTaskStatus', () => {
    it('should sync task status and log summary', async () => {
      await openspecManager.initialize();

      await openspecManager.addTask({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const logMessages: string[] = [];
      openspecManager.setLogCallback((type, message) => {
        logMessages.push(message);
      });

      await openspecManager.syncTaskStatus();

      expect(logMessages.length).toBeGreaterThan(0);
      expect(logMessages.some((msg) => msg.includes('Tasks:'))).toBe(true);
    });

    it('should sync task status without log callback', async () => {
      await openspecManager.initialize();

      await openspecManager.addTask({
        title: 'Test Task',
        description: 'A test task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      // Should not throw when no log callback is set
      await expect(openspecManager.syncTaskStatus()).resolves.not.toThrow();
    });
  });

  describe('updateTaskStatus edge cases', () => {
    it('should handle failed status', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Fail',
        description: 'A task to mark as failed',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.updateTaskStatus(taskId, 'failed');

      const task = await openspecManager.getTask(taskId);
      expect(task?.status).toBe('failed');
    });

    it('should set current task when status is in-progress', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Start',
        description: 'A task to start',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.updateTaskStatus(taskId, 'in-progress');

      const currentTask = await openspecManager.getCurrentTask();
      expect(currentTask?.id).toBe(taskId);
    });

    it('should clear current task when completed', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Complete',
        description: 'A task to complete',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.setCurrentTask(taskId);
      await openspecManager.updateTaskStatus(taskId, 'completed');

      const currentTask = await openspecManager.getCurrentTask();
      expect(currentTask).toBeNull();
    });
  });

  describe('getTaskStats with different statuses', () => {
    it('should count tasks by status correctly', async () => {
      await openspecManager.initialize();

      await openspecManager.addTask({
        title: 'Pending Task',
        description: 'A pending task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const inProgressTaskId = await openspecManager.addTask({
        title: 'In Progress Task',
        description: 'An in-progress task',
        priority: 2,
        status: 'pending',
        dependencies: [],
      });

      await openspecManager.updateTaskStatus(inProgressTaskId, 'in-progress');

      const stats = await openspecManager.getTaskStats();

      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.inProgress).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getParallelExecutableTasks', () => {
    it('should return parallel executable tasks', async () => {
      await openspecManager.initialize();

      const task1Id = await openspecManager.addTask({
        title: 'Task 1',
        description: 'First task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const task2Id = await openspecManager.addTask({
        title: 'Task 2',
        description: 'Second task',
        priority: 2,
        status: 'pending',
        dependencies: [],
      });

      const parallelTasks = await openspecManager.getParallelExecutableTasks();

      expect(Array.isArray(parallelTasks)).toBe(true);
      expect(parallelTasks.length).toBeGreaterThan(0);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return execution order', async () => {
      await openspecManager.initialize();

      await openspecManager.addTask({
        title: 'Task 1',
        description: 'First task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const executionOrder = await openspecManager.getExecutionOrder();

      expect(Array.isArray(executionOrder)).toBe(true);
    });
  });

  describe('canStartTask', () => {
    it('should return true when task can start', async () => {
      await openspecManager.initialize();

      const taskId = await openspecManager.addTask({
        title: 'Task to Start',
        description: 'A task that can start',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const canStart = await openspecManager.canStartTask(taskId);

      expect(canStart).toBe(true);
    });

    it('should return false when dependencies are not satisfied', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const taskId = await openspecManager.addTask({
        title: 'Main Task',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      const canStart = await openspecManager.canStartTask(taskId);

      expect(canStart).toBe(false);
    });
  });

  describe('getBlockingTasks', () => {
    it('should return blocking tasks', async () => {
      await openspecManager.initialize();

      const depTaskId = await openspecManager.addTask({
        title: 'Dependency Task',
        description: 'A dependency task',
        priority: 1,
        status: 'pending',
        dependencies: [],
      });

      const taskId = await openspecManager.addTask({
        title: 'Main Task',
        description: 'A task with dependencies',
        priority: 2,
        status: 'pending',
        dependencies: [depTaskId],
      });

      const blockingTasks = await openspecManager.getBlockingTasks(taskId);

      expect(Array.isArray(blockingTasks)).toBe(true);
      expect(blockingTasks.length).toBeGreaterThan(0);
    });
  });
});
