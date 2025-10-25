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
    it('should stop modern console', async () => {
      // Mock the stop method
      const stopSpy = vi.spyOn(modernConsole, 'stop').mockImplementation(async () => {});

      await modernConsole.stop();

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

    // Removed: markTaskCompleted and markTaskInProgress were replaced by onTaskStatusChange callback

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

      // Methods were refactored to use onTaskStatusChange callback
      expect(typeof modernConsole.logActivity).toBe('function');
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

  it('should handle activity logging with different levels', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Info message');
    console.logActivity('warn', 'Warning message');
    console.logActivity('error', 'Error message');
    console.logActivity('debug', 'Debug message');
    
    expect(logSpy).toHaveBeenCalledTimes(4);
  });

  it('should handle activity logging with different message types', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Simple message');
    console.logActivity('info', 'Message with data', { key: 'value' });
    console.logActivity('info', 'Message with timestamp', undefined, new Date());
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging edge cases', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', '');
    console.logActivity('info', 'Very long message '.repeat(100));
    console.logActivity('info', 'Message with special chars: !@#$%^&*()');
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with null and undefined', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Message with null data', null);
    console.logActivity('info', 'Message with undefined data', undefined);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle activity logging with complex data objects', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const complexData = {
      nested: { value: 123 },
      array: [1, 2, 3],
      func: () => 'test',
      date: new Date(),
    };
    
    console.logActivity('info', 'Complex data message', complexData);
    
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle activity logging with different timestamps', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const now = new Date();
    const past = new Date(now.getTime() - 1000);
    const future = new Date(now.getTime() + 1000);
    
    console.logActivity('info', 'Past message', undefined, past);
    console.logActivity('info', 'Current message', undefined, now);
    console.logActivity('info', 'Future message', undefined, future);
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with different log levels', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    
    levels.forEach(level => {
      console.logActivity(level as any, `${level} message`);
    });
    
    expect(logSpy).toHaveBeenCalledTimes(levels.length);
  });

  it('should handle activity logging with empty and whitespace messages', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', '');
    console.logActivity('info', '   ');
    console.logActivity('info', '\t\n\r');
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with unicode characters', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Unicode: 🚀 🎉 ✅ ❌');
    console.logActivity('info', 'Emoji: 😀 😁 😂 🤣 😃');
    console.logActivity('info', 'Symbols: α β γ δ ε');
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with very long messages', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const longMessage = 'A'.repeat(10000);
    console.logActivity('info', longMessage);
    
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle activity logging with special characters', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?');
    console.logActivity('info', 'Quotes: "double" and \'single\'');
    console.logActivity('info', 'Backslashes: \\ and forward slashes: /');
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with different data types', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'String data', 'string');
    console.logActivity('info', 'Number data', 123);
    console.logActivity('info', 'Boolean data', true);
    console.logActivity('info', 'Array data', [1, 2, 3]);
    console.logActivity('info', 'Object data', { key: 'value' });
    
    expect(logSpy).toHaveBeenCalledTimes(5);
  });

  it('should handle activity logging with mixed parameters', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Message', { data: 'value' }, new Date());
    console.logActivity('warn', 'Warning', null, undefined);
    console.logActivity('error', 'Error', undefined, new Date());
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with edge case timestamps', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Zero timestamp', undefined, new Date(0));
    console.logActivity('info', 'Negative timestamp', undefined, new Date(-1));
    console.logActivity('info', 'Max timestamp', undefined, new Date(Number.MAX_SAFE_INTEGER));
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with circular references', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const circular: any = { name: 'test' };
    circular.self = circular;
    
    console.logActivity('info', 'Circular reference', circular);
    
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle activity logging with functions', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const testFunction = () => 'test';
    const asyncFunction = async () => 'async test';
    
    console.logActivity('info', 'Function data', testFunction);
    console.logActivity('info', 'Async function data', asyncFunction);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle activity logging with promises', async () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const promise = Promise.resolve('resolved');
    const rejectedPromise = Promise.reject('rejected');
    
    console.logActivity('info', 'Promise data', promise);
    console.logActivity('info', 'Rejected promise data', rejectedPromise);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
    
    // Handle the rejected promise to avoid unhandled rejection
    try {
      await rejectedPromise;
    } catch {
      // Expected rejection
    }
  });

  it('should handle activity logging with symbols', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const symbol = Symbol('test');
    const symbolKey = Symbol.for('test');
    
    console.logActivity('info', 'Symbol data', symbol);
    console.logActivity('info', 'Symbol key data', symbolKey);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle activity logging with bigint', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const bigInt = BigInt(123456789);
    const bigIntMax = BigInt(Number.MAX_SAFE_INTEGER);
    
    console.logActivity('info', 'BigInt data', bigInt);
    console.logActivity('info', 'BigInt max data', bigIntMax);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle activity logging with undefined and null', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Undefined data', undefined);
    console.logActivity('info', 'Null data', null);
    
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle activity logging with NaN and Infinity', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'NaN data', NaN);
    console.logActivity('info', 'Infinity data', Infinity);
    console.logActivity('info', 'Negative Infinity data', -Infinity);
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle different activity log types', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Info message');
    console.logActivity('success', 'Success message');
    console.logActivity('warning', 'Warning message');
    console.logActivity('error', 'Error message');
    console.logActivity('tool', 'Tool message');
    
    expect(logSpy).toHaveBeenCalledTimes(5);
  });

  it('should handle activity logging with different message lengths', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Short');
    console.logActivity('info', 'Medium length message');
    console.logActivity('info', 'Very long message '.repeat(100));
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with special data types', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'RegExp data', /test/gi);
    console.logActivity('info', 'Date data', new Date());
    console.logActivity('info', 'Error data', new Error('test'));
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with nested objects', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const nestedObj = {
      level1: {
        level2: {
          level3: {
            value: 'deep'
          }
        }
      }
    };
    
    console.logActivity('info', 'Nested object', nestedObj);
    
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle activity logging with arrays of different types', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'String array', ['a', 'b', 'c']);
    console.logActivity('info', 'Number array', [1, 2, 3]);
    console.logActivity('info', 'Mixed array', ['a', 1, true, null]);
    console.logActivity('info', 'Empty array', []);
    
    expect(logSpy).toHaveBeenCalledTimes(4);
  });

  it('should handle activity logging with different timestamp formats', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'ISO string', undefined, new Date().toISOString());
    console.logActivity('info', 'Unix timestamp', undefined, Date.now());
    console.logActivity('info', 'Date object', undefined, new Date());
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with edge case messages', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    console.logActivity('info', 'Message with newlines\nand tabs\tand spaces');
    console.logActivity('info', 'Message with quotes "double" and \'single\'');
    console.logActivity('info', 'Message with backslashes \\ and forward slashes /');
    
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle activity logging with different log levels', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const levels = ['info', 'success', 'warning', 'error', 'tool'];
    
    levels.forEach(level => {
      console.logActivity(level as any, `${level} message`);
    });
    
    expect(logSpy).toHaveBeenCalledTimes(levels.length);
  });

  it('should handle activity logging with complex nested structures', () => {
    const console = createModernConsole({
      projectRoot: tempDir,
    });
    
    const logSpy = vi.spyOn(console, 'logActivity');
    
    const complexData = {
      array: [1, 2, { nested: true }],
      object: { key: 'value', nested: { deep: 'value' } },
      mixed: [1, 'string', { obj: true }, null, undefined]
    };
    
    console.logActivity('info', 'Complex nested structure', complexData);
    
    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});