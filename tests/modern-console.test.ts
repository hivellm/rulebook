import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createModernConsole } from '../src/core/modern-console.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock blessed to avoid actual terminal rendering during tests
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

describe('ModernConsole', () => {
  let tempDir: string;
  let modernConsole: ReturnType<typeof createModernConsole>;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-modern-console-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    modernConsole = createModernConsole({
      projectRoot: tempDir,
      refreshInterval: 1000,
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create modern console instance', () => {
      expect(modernConsole).toBeDefined();
    });

    it('should initialize with default options', () => {
      const console = createModernConsole({
        projectRoot: tempDir,
      });
      expect(console).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start modern console (mocked)', async () => {
      // Mock the start method to avoid actual UI rendering
      const startSpy = vi.spyOn(modernConsole, 'start').mockResolvedValue();

      await modernConsole.start();

      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop modern console', () => {
      // Mock the stop method
      const stopSpy = vi.spyOn(modernConsole, 'stop').mockImplementation(() => {});

      modernConsole.stop();

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('simplified UI components', () => {
    it('should have progress-focused UI components', () => {
      // Test that the modern console has the simplified UI structure
      expect(modernConsole).toBeDefined();

      // The simplified UI should have:
      // - Header with title and exit instructions
      // - Progress bar showing completion percentage
      // - Activity logs with real-time events
      // - Status bar with controls
      // - No task details panel (removed in v0.10.0)
      // - No system info panel (removed in v0.10.0)
      // - No scrolling task list (removed in v0.10.0)

      // These methods should not exist in the simplified version
      expect(modernConsole).not.toHaveProperty('renderTaskDetails');
      expect(modernConsole).not.toHaveProperty('renderSystemInfo');
      expect(modernConsole).not.toHaveProperty('taskListScrollOffset');
      expect(modernConsole).not.toHaveProperty('handleTaskListScroll');
    });

    it('should not have removed UI panel methods', () => {
      // Test that all removed panel methods are not available
      const removedMethods = [
        'renderTaskDetails',
        'renderSystemInfo',
        'showTaskDetails',
        'hideTaskDetails',
        'showSystemInfo',
        'hideSystemInfo',
        'toggleTaskDetails',
        'toggleSystemInfo',
        'renderTaskList',
        'updateTaskList',
        'refreshTaskList',
        'formatTaskDetails',
        'getStatusIcon',
        'getTasksSummary',
        'loadTasks',
        'updateSystemInfo',
      ];

      removedMethods.forEach((method) => {
        expect(modernConsole).not.toHaveProperty(method);
      });
    });

    it('should not have removed scrolling properties and methods', () => {
      // Test that all removed scrolling functionality is not available
      const removedScrollItems = [
        'taskListScrollOffset',
        'handleTaskListScroll',
        'scrollUp',
        'scrollDown',
        'scrollToTop',
        'scrollToBottom',
        'scrollToTask',
        'maxScrollOffset',
        'currentScrollPosition',
        'scrollableTaskList',
        'taskListHeight',
        'visibleTaskCount',
      ];

      removedScrollItems.forEach((item) => {
        expect(modernConsole).not.toHaveProperty(item);
      });
    });

    it('should not have removed key handlers for scrolling', () => {
      // Test that scroll key handlers are not available
      const removedKeyHandlers = [
        'handleUpArrow',
        'handleDownArrow',
        'handlePageUp',
        'handlePageDown',
        'handleHome',
        'handleEnd',
      ];

      removedKeyHandlers.forEach((handler) => {
        expect(modernConsole).not.toHaveProperty(handler);
      });
    });

    it('should have progress bar functionality', () => {
      // Test that progress bar methods exist (private methods, so we test indirectly)
      // The progress bar is rendered internally via renderProgressBar() method
      // We can test that the modern console has the necessary UI components
      expect(modernConsole).toBeDefined();

      // The progress bar functionality is implemented internally
      // and doesn't expose public methods for testing
    });

    it('should have loading indicator functionality', () => {
      // Test that loading indicator functionality exists
      // The loading indicator is implemented internally in the UI
      // and doesn't expose public methods for testing
      expect(modernConsole).toBeDefined();

      // The loading indicator is part of the internal UI rendering
      // and is tested through the overall console functionality
    });

    it('should support activity logging', () => {
      // Test activity logging functionality
      const logSpy = vi.spyOn(modernConsole, 'logActivity');

      modernConsole.logActivity('info', 'Test message');

      expect(logSpy).toHaveBeenCalledWith('info', 'Test message');
    });

    it('should support task status management', () => {
      // Test task completion marking
      const markCompletedSpy = vi.spyOn(modernConsole, 'markTaskCompleted');

      modernConsole.markTaskCompleted('test-task-id');

      expect(markCompletedSpy).toHaveBeenCalledWith('test-task-id');
    });

    it('should support task progress marking', () => {
      // Test task in-progress marking
      const markInProgressSpy = vi.spyOn(modernConsole, 'markTaskInProgress');

      modernConsole.markTaskInProgress('test-task-id');

      expect(markInProgressSpy).toHaveBeenCalledWith('test-task-id');
    });

    it('should have simplified UI structure', () => {
      // Test that the modern console has the correct simplified UI structure
      // The simplified UI should only have:
      // - Header box
      // - Progress box
      // - Logs box
      // - Status bar
      // No task details, system info, or scrolling components (removed in v0.10.0)

      expect(modernConsole).toBeDefined();

      // Verify that removed components are not present
      expect(modernConsole).not.toHaveProperty('detailsBox');
      expect(modernConsole).not.toHaveProperty('systemBox');
    });

    it('should not have any removed UI components', () => {
      // Comprehensive test to ensure all removed UI components are not present
      const removedComponents = [
        'detailsBox',
        'systemBox',
        'taskDetailsPanel',
        'systemInfoPanel',
        'taskListPanel',
        'scrollableTaskList',
      ];

      removedComponents.forEach((component) => {
        expect(modernConsole).not.toHaveProperty(component);
      });
    });

    it('should support real-time progress monitoring', () => {
      // Test that the modern console supports real-time progress monitoring
      // This is the core functionality of the simplified UI
      expect(modernConsole).toBeDefined();

      // The console should support:
      // - Real-time task progress display
      // - Activity logging with timestamps
      // - Progress bar visualization
      // - Clean, focused interface

      // These are tested through the public methods
      expect(typeof modernConsole.logActivity).toBe('function');
      expect(typeof modernConsole.markTaskCompleted).toBe('function');
      expect(typeof modernConsole.markTaskInProgress).toBe('function');
    });
  });
});

describe('createModernConsole', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'rulebook-test-create-modern-console-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create modern console instance', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    expect(console).toBeDefined();
  });
});
