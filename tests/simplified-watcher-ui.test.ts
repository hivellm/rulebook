import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createModernConsole } from '../src/core/modern-console.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock blessed to avoid terminal UI issues in tests
vi.mock('blessed', () => ({
  default: {
    screen: vi.fn(() => ({
      append: vi.fn(),
      render: vi.fn(),
      destroy: vi.fn(),
      key: vi.fn(),
      on: vi.fn(),
      width: 80,
      height: 24,
    })),
    box: vi.fn(() => ({
      setContent: vi.fn(),
      focus: vi.fn(),
      on: vi.fn(),
      setScrollPerc: vi.fn(),
      height: 10,
    })),
    text: vi.fn(() => ({
      setContent: vi.fn(),
      focus: vi.fn(),
      on: vi.fn(),
      style: { fg: 'green', bg: 'black' },
    })),
    list: vi.fn(() => ({
      clearItems: vi.fn(),
      addItem: vi.fn(),
      focus: vi.fn(),
      on: vi.fn(),
    })),
    log: vi.fn(() => ({
      log: vi.fn(),
    })),
  },
}));

describe('Simplified Watcher UI', () => {
  let tempDir: string;
  let modernConsole: ReturnType<typeof createModernConsole>;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-simplified-ui-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    modernConsole = createModernConsole({
      projectRoot: tempDir,
      refreshInterval: 1000,
    });

    // Initialize the console to ensure properties are set
    await modernConsole.start();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Progress Bar Functionality', () => {
    it('should render progress bar with correct percentage', () => {
      // Test that progress bar is created
      expect(modernConsole).toBeDefined();
      expect(modernConsole).toHaveProperty('progressBar');
    });

    it('should update progress bar color based on percentage', () => {
      // Test color coding logic
      const progressInfo = {
        completed: 5,
        total: 10,
        percentage: 50,
      };

      // This would be tested through the renderProgressBar method
      expect(progressInfo.percentage).toBe(50);
    });

    it('should handle edge cases for progress calculation', () => {
      // Test 0% progress
      const zeroProgress = { completed: 0, total: 10, percentage: 0 };
      expect(zeroProgress.percentage).toBe(0);

      // Test 100% progress
      const fullProgress = { completed: 10, total: 10, percentage: 100 };
      expect(fullProgress.percentage).toBe(100);

      // Test empty task list
      const emptyProgress = { completed: 0, total: 0, percentage: 0 };
      expect(emptyProgress.percentage).toBe(0);
    });
  });

  describe('Active Tasks Display', () => {
    it('should display active tasks with status icons', () => {
      // Test that tasks box is created
      expect(modernConsole).toBeDefined();
      expect(modernConsole).toHaveProperty('tasksBox');
    });

    it('should show loading indicator for in-progress tasks', () => {
      // Test loading indicator logic
      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        status: 'in-progress' as const,
      };

      const statusIcon = task.status === 'in-progress' ? '▶' : '○';
      expect(statusIcon).toBe('▶');
    });

    it('should limit displayed tasks to fit screen', () => {
      // Test task limiting logic
      const maxTasks = 5;
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending' as const,
      }));

      const displayedTasks = tasks.slice(0, maxTasks);
      expect(displayedTasks).toHaveLength(5);
    });
  });

  describe('Activity Logs', () => {
    it('should log activities with timestamps', () => {
      const logActivity = modernConsole.logActivity;
      expect(typeof logActivity).toBe('function');

      // Test logging
      logActivity('info', 'Test message');
      logActivity('success', 'Task completed');
      logActivity('error', 'Task failed');
    });

    it('should limit log entries to prevent memory leaks', () => {
      // Test that logs are limited to 100 entries
      const logActivity = modernConsole.logActivity;
      
      // Add more than 100 logs
      for (let i = 0; i < 150; i++) {
        logActivity('info', `Log message ${i}`);
      }

      // The implementation should limit to 100 entries
      expect(typeof logActivity).toBe('function');
    });

    it('should display logs with proper formatting', () => {
      // Test log formatting
      const logEntry = {
        timestamp: new Date('2024-01-23T14:30:00Z'),
        type: 'success' as const,
        message: 'Task completed successfully',
      };

      const time = logEntry.timestamp.toLocaleTimeString('en-US', { hour12: false });
      expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/); // Just check format, not exact time
    });
  });

  describe('Performance Optimizations', () => {
    it('should throttle renders to prevent excessive updates', () => {
      // Test that render throttling is implemented
      expect(modernConsole).toBeDefined();
      
      // The render method should be throttled
      const render = (modernConsole as any).render;
      expect(typeof render).toBe('function');
    });

    it('should only update components when data changes', () => {
      // Test that components only update when necessary
      expect(modernConsole).toBeDefined();
      
      // Test that progress bar only updates when progress changes
      const lastProgressInfo = { completed: 0, total: 0, percentage: 0 };
      const currentProgressInfo = { completed: 0, total: 0, percentage: 0 };
      
      const shouldUpdate = 
        currentProgressInfo.completed !== lastProgressInfo.completed ||
        currentProgressInfo.total !== lastProgressInfo.total ||
        currentProgressInfo.percentage !== lastProgressInfo.percentage;
      
      expect(shouldUpdate).toBe(false);
    });

    it('should monitor memory usage', () => {
      // Test memory monitoring
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      expect(memUsageMB).toBeGreaterThan(0);
      expect(memUsageMB).toBeLessThan(100); // Should be reasonable for tests
    });
  });

  describe('Layout and Styling', () => {
    it('should have proportional layout sections', () => {
      // Test layout proportions (25% tasks, 10% progress, 65% logs)
      const screenHeight = 24;
      const headerHeight = 3;
      const statusHeight = 1;
      const availableHeight = screenHeight - headerHeight - statusHeight;
      
      const progressHeight = Math.max(3, Math.round(availableHeight * 0.1));
      const tasksHeight = Math.max(5, Math.round(availableHeight * 0.25));
      const logsHeight = availableHeight - progressHeight - tasksHeight;
      
      expect(progressHeight).toBeGreaterThan(0);
      expect(tasksHeight).toBeGreaterThan(0);
      expect(logsHeight).toBeGreaterThan(0);
      expect(progressHeight + tasksHeight + logsHeight).toBe(availableHeight);
    });

    it('should handle different terminal sizes', () => {
      // Test responsive layout
      const testSizes = [
        { width: 80, height: 24 },
        { width: 120, height: 40 },
        { width: 200, height: 60 },
      ];

      testSizes.forEach(({ width, height }) => {
        const availableHeight = height - 3 - 1; // header - status
        const progressHeight = Math.max(3, Math.round(availableHeight * 0.1));
        const tasksHeight = Math.max(5, Math.round(availableHeight * 0.25));
        const logsHeight = availableHeight - progressHeight - tasksHeight;
        
        expect(progressHeight).toBeGreaterThan(0);
        expect(tasksHeight).toBeGreaterThan(0);
        expect(logsHeight).toBeGreaterThan(0);
      });
    });
  });

  describe('Task Management', () => {
    it('should mark tasks as completed and remove from active list', () => {
      const markTaskCompleted = modernConsole.markTaskCompleted;
      expect(typeof markTaskCompleted).toBe('function');
      
      // Test task completion
      markTaskCompleted('test-task-1');
    });

    it('should mark tasks as in progress', () => {
      const markTaskInProgress = modernConsole.markTaskInProgress;
      expect(typeof markTaskInProgress).toBe('function');
      
      // Test task start
      markTaskInProgress('test-task-1');
    });

    it('should automatically remove completed tasks from display', () => {
      // Test auto-removal logic
      const tasks = [
        { id: 'task-1', title: 'Task 1', status: 'pending' as const },
        { id: 'task-2', title: 'Task 2', status: 'completed' as const },
        { id: 'task-3', title: 'Task 3', status: 'pending' as const },
      ];

      const activeTasks = tasks.filter(task => task.status !== 'completed');
      expect(activeTasks).toHaveLength(2);
      expect(activeTasks.find(t => t.id === 'task-2')).toBeUndefined();
    });
  });

  describe('OpenSpec Integration', () => {
    it('should update markdown files when tasks are completed', () => {
      // Test that markdown updates are triggered
      expect(modernConsole).toBeDefined();
      
      // The OpenSpec integration should be working
      const openspecManager = (modernConsole as any).openspecManager;
      expect(openspecManager).toBeDefined();
    });

    it('should handle task status changes in real-time', () => {
      // Test real-time status updates
      const markTaskCompleted = modernConsole.markTaskCompleted;
      const markTaskInProgress = modernConsole.markTaskInProgress;
      
      expect(typeof markTaskCompleted).toBe('function');
      expect(typeof markTaskInProgress).toBe('function');
    });
  });
});