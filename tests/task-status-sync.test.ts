import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createAgentManager, AgentManager } from '../src/core/agent-manager.js';
import { createOpenSpecManager } from '../src/core/openspec-manager.js';
import { createCLIBridge } from '../src/core/cli-bridge.js';
import { createLogger } from '../src/core/logger.js';
import { createConfigManager } from '../src/core/config-manager.js';

// Mock dependencies
vi.mock('../src/core/logger.js');
vi.mock('../src/core/config-manager.js');
vi.mock('../src/core/openspec-manager.js');
vi.mock('../src/core/cli-bridge.js');

describe('Task Status Sync on Agent Start', () => {
  let agentManager: AgentManager;
  let mockLogger: any;
  let mockConfigManager: any;
  let mockOpenSpecManager: any;
  let mockCLIBridge: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      taskStart: vi.fn(),
      taskComplete: vi.fn(),
      taskFailed: vi.fn(),
      testExecution: vi.fn(),
      coverageCheck: vi.fn(),
      cliCommand: vi.fn(),
      cliResponse: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock config manager
    mockConfigManager = {
      loadConfig: vi.fn().mockResolvedValue({
        coverageThreshold: 95,
        timeouts: {
          cliResponse: 30000,
        },
      }),
      getConfigSummary: vi.fn().mockResolvedValue({
        version: '0.10.0',
        projectId: 'test-project',
        coverageThreshold: 95,
        cliTools: ['cursor-agent'],
        enabledFeatures: ['agent', 'openspec'],
      }),
    };

    // Mock OpenSpec manager with syncTaskStatus method
    mockOpenSpecManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      syncTaskStatus: vi.fn().mockResolvedValue(undefined),
      getNextTask: vi.fn().mockResolvedValue({
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
        priority: 'high',
        status: 'pending',
        dependencies: [],
      }),
      setCurrentTask: vi.fn().mockResolvedValue(undefined),
      updateTaskStatus: vi.fn().mockResolvedValue(undefined),
      markTaskComplete: vi.fn().mockResolvedValue(undefined),
      loadOpenSpec: vi.fn().mockResolvedValue({
        tasks: [
          { id: 'task-1', title: 'Task 1', status: 'pending' },
          { id: 'task-2', title: 'Task 2', status: 'in-progress' },
        ],
        history: [
          { id: 'task-3', title: 'Task 3', status: 'completed' },
        ],
      }),
    };

    // Mock CLI bridge
    mockCLIBridge = {
      detectCLITools: vi.fn().mockResolvedValue(['cursor-agent']),
      sendCommandToCLI: vi.fn().mockResolvedValue({
        success: true,
        output: 'Command executed',
        duration: 1000,
        exitCode: 0,
      }),
      sendTaskCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Task implemented',
        duration: 2000,
        exitCode: 0,
      }),
      sendContinueCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Continued',
        duration: 1000,
        exitCode: 0,
      }),
      sendTestCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Tests passed',
        duration: 3000,
        exitCode: 0,
      }),
      sendLintCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Lint passed',
        duration: 500,
        exitCode: 0,
      }),
      sendFormatCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Format completed',
        duration: 500,
        exitCode: 0,
      }),
    };

    // Create agent manager with mocked dependencies
    agentManager = createAgentManager('/test/project', {
      logger: mockLogger,
      configManager: mockConfigManager,
      openspecManager: mockOpenSpecManager,
      cliBridge: mockCLIBridge,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Agent Start with Task Status Sync', () => {
    it('should call syncTaskStatus when agent starts', async () => {
      // Mock the onLog callback to capture sync messages
      const onLogSpy = vi.fn();

      await agentManager.startAgent({
        tool: 'cursor-agent',
        maxIterations: 1,
        watchMode: false,
        onLog: onLogSpy,
      });

      // Verify syncTaskStatus was called
      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);
    });

    it('should log sync status messages during agent start', async () => {
      const onLogSpy = vi.fn();

      await agentManager.startAgent({
        tool: 'cursor-agent',
        maxIterations: 1,
        watchMode: false,
        onLog: onLogSpy,
      });

      // Verify sync-related log messages
      expect(onLogSpy).toHaveBeenCalledWith('info', '📋 Syncing task status...');
      expect(onLogSpy).toHaveBeenCalledWith('success', '✅ Task status synced');
    });

    it('should handle syncTaskStatus errors gracefully', async () => {
      // Mock syncTaskStatus to throw an error
      mockOpenSpecManager.syncTaskStatus.mockRejectedValueOnce(
        new Error('Sync failed')
      );

      const onLogSpy = vi.fn();

      await expect(
        agentManager.startAgent({
          tool: 'cursor-agent',
          maxIterations: 1,
          watchMode: false,
          onLog: onLogSpy,
        })
      ).rejects.toThrow('Sync failed');

      // Verify syncTaskStatus was called
      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);
    });

    it('should work without onLog callback (CLI mode)', async () => {
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await agentManager.startAgent({
        tool: 'cursor-agent',
        maxIterations: 1,
        watchMode: false,
        // No onLog callback provided
      });

      // Verify syncTaskStatus was called
      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  describe('OpenSpecManager syncTaskStatus Method', () => {
    let openspecManager: any;

    beforeEach(() => {
      // Create a real OpenSpecManager instance for testing the method directly
      openspecManager = createOpenSpecManager('/test/project', {
        logger: mockLogger,
      });

      // Mock the loadOpenSpec method
      vi.spyOn(openspecManager, 'loadOpenSpec').mockResolvedValue({
        tasks: [
          { id: 'task-1', title: 'Task 1', status: 'pending' },
          { id: 'task-2', title: 'Task 2', status: 'in-progress' },
          { id: 'task-3', title: 'Task 3', status: 'pending' },
        ],
        history: [
          { id: 'task-4', title: 'Task 4', status: 'completed' },
          { id: 'task-5', title: 'Task 5', status: 'completed' },
        ],
      });
    });

    it('should clear cached data and reload tasks', async () => {
      // Set some cached data
      openspecManager.data = { tasks: [], history: [] };

      await openspecManager.syncTaskStatus();

      // Verify data was cleared and reloaded
      expect(openspecManager.data).toBeNull();
      expect(openspecManager.loadOpenSpec).toHaveBeenCalledTimes(1);
    });

    it('should log task summary with correct counts', async () => {
      const onLogSpy = vi.fn();
      openspecManager.onLog = onLogSpy;

      await openspecManager.syncTaskStatus();

      // Verify task summary was logged
      expect(onLogSpy).toHaveBeenCalledWith(
        'info',
        '   Tasks: 5 total | 2 pending | 1 in progress | 2 completed'
      );
    });

    it('should use console.log when onLog callback is not available', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Ensure onLog is not set
      openspecManager.onLog = null;

      await openspecManager.syncTaskStatus();

      // Verify console.log was called with task summary
      expect(consoleSpy).toHaveBeenCalledWith(
        '   Tasks: 5 total | 2 pending | 1 in progress | 2 completed'
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty task lists', async () => {
      // Mock empty task lists
      vi.spyOn(openspecManager, 'loadOpenSpec').mockResolvedValue({
        tasks: [],
        history: [],
      });

      const onLogSpy = vi.fn();
      openspecManager.onLog = onLogSpy;

      await openspecManager.syncTaskStatus();

      // Verify empty task summary
      expect(onLogSpy).toHaveBeenCalledWith(
        'info',
        '   Tasks: 0 total | 0 pending | 0 in progress | 0 completed'
      );
    });

    it('should handle loadOpenSpec errors', async () => {
      // Mock loadOpenSpec to throw an error
      vi.spyOn(openspecManager, 'loadOpenSpec').mockRejectedValue(
        new Error('Failed to load tasks')
      );

      await expect(openspecManager.syncTaskStatus()).rejects.toThrow(
        'Failed to load tasks'
      );
    });
  });

  describe('Integration with Agent Workflow', () => {
    it('should sync task status before running main workflow', async () => {
      const onLogSpy = vi.fn();

      // Mock the main workflow to verify sync happens first
      const runAgentWorkflowSpy = vi.spyOn(agentManager as any, 'runAgentWorkflow')
        .mockResolvedValue(undefined);

      await agentManager.startAgent({
        tool: 'cursor-agent',
        maxIterations: 1,
        watchMode: false,
        onLog: onLogSpy,
      });

      // Verify syncTaskStatus was called
      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);

      // Verify the sequence: sync happens before main workflow
      const syncCallOrder = mockOpenSpecManager.syncTaskStatus.mock.invocationCallOrder[0];
      const workflowCallOrder = runAgentWorkflowSpy.mock.invocationCallOrder[0];
      
      expect(syncCallOrder).toBeLessThan(workflowCallOrder);
    });

    it('should continue with workflow even if sync succeeds', async () => {
      const onLogSpy = vi.fn();

      // Mock successful sync
      mockOpenSpecManager.syncTaskStatus.mockResolvedValue(undefined);

      // Mock the main workflow
      const runAgentWorkflowSpy = vi.spyOn(agentManager as any, 'runAgentWorkflow')
        .mockResolvedValue(undefined);

      await agentManager.startAgent({
        tool: 'cursor-agent',
        maxIterations: 1,
        watchMode: false,
        onLog: onLogSpy,
      });

      // Verify both sync and workflow were called
      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);
      expect(runAgentWorkflowSpy).toHaveBeenCalledTimes(1);
    });
  });
});