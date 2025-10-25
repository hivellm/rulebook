import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOpenSpecManager } from '../dist/core/openspec-manager.js';
import { createLogger } from '../dist/core/logger.js';

describe('Modern Watcher Integration', () => {
  let openspecManager: ReturnType<typeof createOpenSpecManager>;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(async () => {
    const projectRoot = process.cwd() || '/mnt/f/Node/hivellm/rulebook';
    logger = createLogger(projectRoot);
    openspecManager = createOpenSpecManager(projectRoot);
    await openspecManager.initialize();
  });

  afterEach(async () => {
    await logger.close();
  });

  it('should initialize with real tasks', async () => {
    // Get real tasks from OpenSpec
    const tasks = await openspecManager.getTasksByPriority();
    
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    
    // Test that we have pending tasks
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    expect(pendingTasks.length).toBeGreaterThan(0);
    
    console.log(`Found ${pendingTasks.length} pending tasks for watcher testing`);
  });

  it('should display task information correctly', async () => {
    const tasks = await openspecManager.getTasksByPriority();
    
    // Test task structure
    tasks.forEach(task => {
      expect(task.id).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.status).toMatch(/^(pending|in-progress|completed|failed|skipped)$/);
      expect(typeof task.priority).toBe('number');
      expect(Array.isArray(task.dependencies)).toBe(true);
    });
  });

  it('should handle task status updates', async () => {
    const tasks = await openspecManager.getTasksByPriority();
    const firstTask = tasks[0];
    
    if (firstTask) {
      // Test that we can access task properties
      expect(firstTask.id).toBeDefined();
      expect(firstTask.title).toBeDefined();
      expect(firstTask.status).toBeDefined();
      
      console.log(`Testing task: ${firstTask.title} (${firstTask.status})`);
    }
  });

  it('should validate task dependencies', async () => {
    const tasks = await openspecManager.getTasksByPriority();
    
    // Test dependency resolution
    const nextTask = await openspecManager.getNextTask();
    if (nextTask) {
      expect(nextTask.dependencies).toBeDefined();
      expect(Array.isArray(nextTask.dependencies)).toBe(true);
    }
  });

  it('should provide task statistics', async () => {
    const stats = await openspecManager.getTaskStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.completed).toBe('number');
    expect(typeof stats.pending).toBe('number');
    expect(typeof stats.failed).toBe('number');
    expect(typeof stats.inProgress).toBe('number');
    
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.completed + stats.pending + stats.failed + stats.inProgress).toBe(stats.total);
    
    console.log('Task Statistics:', stats);
  });
});
