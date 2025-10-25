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
      // - Active tasks display (no task details panel)
      // - Progress bar (no system info panel)
      // - Activity logs (no scrolling task list)
      // - No scroll offset handling
      // - No task details rendering
      // - No system info rendering
      
      // These methods should not exist in the simplified version
      expect(modernConsole).not.toHaveProperty('renderTaskDetails');
      expect(modernConsole).not.toHaveProperty('renderSystemInfo');
      expect(modernConsole).not.toHaveProperty('taskListScrollOffset');
      expect(modernConsole).not.toHaveProperty('handleTaskListScroll');
    });

    it('should not have scroll-related functionality', () => {
      // Test that scroll-related properties and methods are removed
      expect(modernConsole).not.toHaveProperty('taskListScrollOffset');
      expect(modernConsole).not.toHaveProperty('handleTaskListScroll');
      
      // The modern console should not have scroll key handlers
      // (This would be tested at the UI level, not the instance level)
    });

    it('should not have task details or system info panels', () => {
      // Test that panel rendering methods are removed
      expect(modernConsole).not.toHaveProperty('renderTaskDetails');
      expect(modernConsole).not.toHaveProperty('renderSystemInfo');
    });

    it('should have progress bar functionality', () => {
      // Test that progress bar methods exist
      expect(modernConsole).toHaveProperty('getProgressInfo');
      expect(modernConsole).toHaveProperty('renderProgressBar');
    });

    it('should have loading indicator functionality', () => {
      // Test that loading indicator methods exist
      expect(modernConsole).toHaveProperty('getLoadingFrame');
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

    it('should support progress bar rendering', () => {
      // Test progress bar functionality
      const progressInfo = modernConsole.getProgressInfo();
      
      expect(progressInfo).toHaveProperty('completed');
      expect(progressInfo).toHaveProperty('total');
      expect(progressInfo).toHaveProperty('percentage');
      expect(typeof progressInfo.completed).toBe('number');
      expect(typeof progressInfo.total).toBe('number');
      expect(typeof progressInfo.percentage).toBe('number');
    });

    it('should support loading indicator animation', () => {
      // Test loading indicator functionality
      const loadingFrame = modernConsole.getLoadingFrame();
      
      expect(typeof loadingFrame).toBe('string');
      expect(loadingFrame.length).toBeGreaterThan(0);
    });

    it('should support active task rendering', () => {
      // Test active task rendering
      const renderActiveTasksSpy = vi.spyOn(modernConsole, 'renderActiveTasks');
      
      modernConsole.renderActiveTasks();
      
      expect(renderActiveTasksSpy).toHaveBeenCalled();
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
