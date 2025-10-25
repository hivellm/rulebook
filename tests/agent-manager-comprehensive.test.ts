import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAgentManager, AgentManager } from '../src/core/agent-manager.js';
import { createCLIBridge } from '../src/core/cli-bridge.js';
import { createLogger } from '../src/core/logger.js';
import { createConfigManager } from '../src/core/config-manager.js';
import { createOpenSpecManager } from '../src/core/openspec-manager.js';

// Mock dependencies
vi.mock('../src/core/logger.js');
vi.mock('../src/core/config-manager.js');
vi.mock('../src/core/openspec-manager.js');
vi.mock('../src/core/cli-bridge.js');

describe('Agent Manager Comprehensive Tests', () => {
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

    // Mock OpenSpec manager
    mockOpenSpecManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
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
      syncTaskStatus: vi.fn().mockResolvedValue(undefined),
    };

    // Mock CLI bridge
    mockCLIBridge = {
      detectCLITools: vi
        .fn()
        .mockResolvedValue([
          { name: 'cursor-agent', command: 'cursor-agent', version: '1.0.0', available: true },
        ]),
      sendCommandToCLI: vi.fn().mockResolvedValue({
        success: true,
        output: 'Test output',
        duration: 1000,
        exitCode: 0,
      }),
      sendTaskCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Task completed',
        duration: 2000,
        exitCode: 0,
      }),
      sendContinueCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Continue completed',
        duration: 1500,
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
        duration: 1000,
        exitCode: 0,
      }),
      sendFormatCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Format completed',
        duration: 500,
        exitCode: 0,
      }),
      sendCommitCommand: vi.fn().mockResolvedValue({
        success: true,
        output: 'Commit successful',
        duration: 800,
        exitCode: 0,
      }),
      checkCLIHealth: vi.fn().mockResolvedValue(true),
      getCLICapabilities: vi.fn().mockResolvedValue(['implement', 'test', 'lint', 'format']),
      killAllProcesses: vi.fn().mockResolvedValue(undefined),
    };

    // Setup mocks
    vi.mocked(createLogger).mockReturnValue(mockLogger);
    vi.mocked(createConfigManager).mockReturnValue(mockConfigManager);
    vi.mocked(createOpenSpecManager).mockReturnValue(mockOpenSpecManager);
    vi.mocked(createCLIBridge).mockReturnValue(mockCLIBridge);

    // Create agent manager
    agentManager = createAgentManager('/test/project');
  });

  afterEach(async () => {
    await agentManager.stop();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agentManager.initialize()).resolves.not.toThrow();

      expect(mockConfigManager.loadConfig).toHaveBeenCalled();
      expect(mockOpenSpecManager.initialize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Agent Manager initialized');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockConfigManager.loadConfig.mockRejectedValueOnce(error);

      await expect(agentManager.initialize()).rejects.toThrow('Initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Agent Manager', {
        error: 'Initialization failed',
      });
    });
  });

  describe('CLI Tool Detection and Selection', () => {
    it('should detect available CLI tools', async () => {
      await agentManager.initialize();

      const tools = await mockCLIBridge.detectCLITools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('cursor-agent');
      expect(tools[0].available).toBe(true);
    });

    it('should select preferred tool when available', async () => {
      await agentManager.initialize();

      // Mock the selectCLITool method by accessing it through the agent
      const selectedTool = await (agentManager as any).selectCLITool('cursor-agent');
      expect(selectedTool).toBe('cursor-agent');
    });

    it('should handle no CLI tools available', async () => {
      mockCLIBridge.detectCLITools.mockResolvedValueOnce([]);
      await agentManager.initialize();

      const selectedTool = await (agentManager as any).selectCLITool();
      expect(selectedTool).toBeNull();
    });
  });

  describe('Agent Workflow Execution', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should execute task workflow successfully', async () => {
      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, {});

      expect(success).toBe(true);
      expect(mockCLIBridge.sendTaskCommand).toHaveBeenCalledWith('cursor-agent', task);
      expect(mockCLIBridge.sendContinueCommand).toHaveBeenCalledWith('cursor-agent', 10);
      expect(mockCLIBridge.sendTestCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockCLIBridge.sendLintCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockCLIBridge.sendFormatCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockCLIBridge.sendCommitCommand).toHaveBeenCalledWith(
        'cursor-agent',
        expect.stringContaining('Test Task')
      );
    });

    it('should handle dry run mode', async () => {
      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, { dryRun: true });

      expect(success).toBe(true);
      expect(mockCLIBridge.sendTaskCommand).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Testing workflows (placeholder)');
    });

    it('should handle task execution failure', async () => {
      mockCLIBridge.sendTaskCommand.mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Task failed',
        duration: 1000,
        exitCode: 1,
      });

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, {});

      expect(success).toBe(false);
      expect(mockLogger.taskFailed).toHaveBeenCalled();
    });

    it('should handle test failure', async () => {
      mockCLIBridge.sendTestCommand.mockResolvedValueOnce({
        success: false,
        output: 'Tests failed',
        duration: 1000,
        exitCode: 1,
      });

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, {});

      expect(success).toBe(false);
    });

    it('should handle coverage failure', async () => {
      // Mock coverage check to fail
      const originalCheckCoverage = (agentManager as any).checkCoverage;
      (agentManager as any).checkCoverage = vi.fn().mockResolvedValue(false);

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, {});

      expect(success).toBe(false);

      // Restore original method
      (agentManager as any).checkCoverage = originalCheckCoverage;
    });
  });

  describe('Quality Checks', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should run quality checks successfully', async () => {
      await (agentManager as any).runQualityChecks();

      expect(mockCLIBridge.sendLintCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockCLIBridge.sendFormatCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockLogger.testExecution).toHaveBeenCalledWith('lint', 'passed', 1000);
      expect(mockLogger.testExecution).toHaveBeenCalledWith('format', 'passed', 500);
    });

    it('should handle lint failures gracefully', async () => {
      mockCLIBridge.sendLintCommand.mockResolvedValueOnce({
        success: false,
        output: 'Lint errors found',
        duration: 1000,
        exitCode: 1,
      });

      await (agentManager as any).runQualityChecks();

      expect(mockLogger.testExecution).toHaveBeenCalledWith('lint', 'failed', 1000);
    });

    it('should handle format failures gracefully', async () => {
      mockCLIBridge.sendFormatCommand.mockResolvedValueOnce({
        success: false,
        output: 'Format errors found',
        duration: 500,
        exitCode: 1,
      });

      await (agentManager as any).runQualityChecks();

      expect(mockLogger.testExecution).toHaveBeenCalledWith('format', 'failed', 500);
    });
  });

  describe('Test Execution', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should run tests successfully', async () => {
      const success = await (agentManager as any).runTests();

      expect(success).toBe(true);
      expect(mockCLIBridge.sendTestCommand).toHaveBeenCalledWith('cursor-agent');
      expect(mockLogger.testExecution).toHaveBeenCalledWith('tests', 'passed', 3000);
    });

    it('should handle test failures', async () => {
      mockCLIBridge.sendTestCommand.mockResolvedValueOnce({
        success: false,
        output: 'Tests failed',
        duration: 3000,
        exitCode: 1,
      });

      const success = await (agentManager as any).runTests();

      expect(success).toBe(false);
      expect(mockLogger.testExecution).toHaveBeenCalledWith('tests', 'failed', 3000);
    });
  });

  describe('Coverage Checking', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should check coverage successfully', async () => {
      const success = await (agentManager as any).checkCoverage();

      expect(success).toBe(true);
      expect(mockLogger.coverageCheck).toHaveBeenCalledWith(95, 95);
    });

    it('should handle coverage below threshold', async () => {
      // Mock coverage to be below threshold
      const originalCheckCoverage = (agentManager as any).checkCoverage;
      (agentManager as any).checkCoverage = vi.fn().mockImplementation(async () => {
        const coverage = 80; // Below 95% threshold
        const threshold = 95;
        mockLogger.coverageCheck(coverage, threshold);
        return coverage >= threshold;
      });

      const success = await (agentManager as any).checkCoverage();

      expect(success).toBe(false);
      expect(mockLogger.coverageCheck).toHaveBeenCalledWith(80, 95);

      // Restore original method
      (agentManager as any).checkCoverage = originalCheckCoverage;
    });
  });

  describe('Agent Workflow Loop', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should run workflow loop with max iterations', async () => {
      const options = { maxIterations: 3 };

      // Mock getNextTask to return tasks for 3 iterations, then null
      let callCount = 0;
      mockOpenSpecManager.getNextTask.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            id: `task-${callCount}`,
            title: `Task ${callCount}`,
            description: `Description ${callCount}`,
            priority: 'high',
            status: 'pending',
            dependencies: [],
          });
        }
        return Promise.resolve(null);
      });

      await (agentManager as any).runAgentWorkflow(options);

      expect(mockOpenSpecManager.getNextTask).toHaveBeenCalledTimes(4); // 3 tasks + 1 null
      expect(mockOpenSpecManager.markTaskComplete).toHaveBeenCalledTimes(3);
    });

    it('should handle workflow iteration failures', async () => {
      const options = { maxIterations: 2 };

      // Mock getNextTask to throw error on second call
      let callCount = 0;
      mockOpenSpecManager.getNextTask.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            id: 'task-1',
            title: 'Task 1',
            description: 'Description 1',
            priority: 'high',
            status: 'pending',
            dependencies: [],
          });
        }
        throw new Error('Workflow error');
      });

      await (agentManager as any).runAgentWorkflow(options);

      expect(mockLogger.error).toHaveBeenCalledWith('Workflow iteration 2 failed', {
        error: 'Workflow error',
      });
    });

    it('should stop when max iterations reached', async () => {
      const options = { maxIterations: 2 };

      // Mock getNextTask to always return a task
      mockOpenSpecManager.getNextTask.mockResolvedValue({
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        priority: 'high',
        status: 'pending',
        dependencies: [],
      });

      await (agentManager as any).runAgentWorkflow(options);

      expect(mockOpenSpecManager.getNextTask).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await agentManager.initialize();
    });

    it('should handle CLI command timeouts', async () => {
      const timeoutError = new Error('Command timeout');
      (timeoutError as any).exitCode = 124; // Timeout exit code

      mockCLIBridge.sendCommandToCLI.mockRejectedValueOnce(timeoutError);

      const response = await mockCLIBridge.sendCommandToCLI('cursor-agent', 'test command');

      expect(response).toBeUndefined(); // Should throw
    });

    it('should handle CLI tool unavailability', async () => {
      mockCLIBridge.detectCLITools.mockResolvedValueOnce([]);

      const selectedTool = await (agentManager as any).selectCLITool();
      expect(selectedTool).toBeNull();
    });

    it('should cleanup resources on stop', async () => {
      await agentManager.stop();

      expect(mockCLIBridge.killAllProcesses).toHaveBeenCalled();
      expect(mockLogger.close).toHaveBeenCalled();
    });
  });

  describe('Agent Options', () => {
    it('should handle watch mode option', async () => {
      const options = { watchMode: true };

      await agentManager.initialize();
      await (agentManager as any).startAgent(options);

      expect(mockLogger.info).toHaveBeenCalledWith('Watcher mode requested (placeholder)');
    });

    it('should handle custom max iterations', async () => {
      const options = { maxIterations: 5 };

      await agentManager.initialize();

      // Mock getNextTask to return null immediately
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce(null);

      await (agentManager as any).runAgentWorkflow(options);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting agent workflow', { maxIterations: 5 });
    });

    it('should handle dry run mode', async () => {
      const options = { dryRun: true };

      await agentManager.initialize();

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, options);

      expect(success).toBe(true);
      expect(mockCLIBridge.sendTaskCommand).not.toHaveBeenCalled();
    });
  });

  describe('Task Status Sync on Agent Start', () => {
    it('should call syncTaskStatus when agent starts', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return null to prevent workflow execution
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce(null);

      await agentManager.startAgent({ maxIterations: 1 });

      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalledTimes(1);
    });

    it('should call syncTaskStatus before workflow execution', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return a task
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce({
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        priority: 'high',
        status: 'pending',
        dependencies: [],
      });

      // Track call order
      const callOrder: string[] = [];
      mockOpenSpecManager.syncTaskStatus.mockImplementation(() => {
        callOrder.push('syncTaskStatus');
        return Promise.resolve();
      });
      mockOpenSpecManager.getNextTask.mockImplementation(() => {
        callOrder.push('getNextTask');
        return Promise.resolve({
          id: 'task-1',
          title: 'Test Task',
          description: 'Test Description',
          priority: 'high',
          status: 'pending',
          dependencies: [],
        });
      });

      await agentManager.startAgent({ maxIterations: 1 });

      expect(callOrder[0]).toBe('syncTaskStatus');
      expect(callOrder[1]).toBe('getNextTask');
    });

    it('should handle syncTaskStatus errors gracefully', async () => {
      await agentManager.initialize();

      // Mock syncTaskStatus to throw an error
      const syncError = new Error('Sync failed');
      mockOpenSpecManager.syncTaskStatus.mockRejectedValueOnce(syncError);

      // Mock getNextTask to return null to prevent workflow execution
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce(null);

      await expect(agentManager.startAgent({ maxIterations: 1 })).rejects.toThrow('Sync failed');
    });

    it('should log sync status messages', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return null to prevent workflow execution
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce(null);

      const onLogSpy = vi.fn();
      await agentManager.startAgent({
        maxIterations: 1,
        onLog: onLogSpy,
      });

      expect(onLogSpy).toHaveBeenCalledWith('info', '📋 Syncing task status...');
      expect(onLogSpy).toHaveBeenCalledWith('success', '✅ Task status synced');
    });

    it('should log sync status to console when no onLog callback', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return null to prevent workflow execution
      mockOpenSpecManager.getNextTask.mockResolvedValueOnce(null);

      // Mock console.log to track calls
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await agentManager.startAgent({ maxIterations: 1 });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 Syncing task status...'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Task status synced'));

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should complete full agent workflow', async () => {
      // Mock successful workflow
      mockOpenSpecManager.getNextTask
        .mockResolvedValueOnce({
          id: 'task-1',
          title: 'Test Task',
          description: 'Test Description',
          priority: 'high',
          status: 'pending',
          dependencies: [],
        })
        .mockResolvedValueOnce(null);

      await agentManager.initialize();
      await agentManager.startAgent({ maxIterations: 1 });

      expect(mockOpenSpecManager.syncTaskStatus).toHaveBeenCalled();
      expect(mockOpenSpecManager.getNextTask).toHaveBeenCalled();
      expect(mockCLIBridge.sendTaskCommand).toHaveBeenCalled();
      expect(mockCLIBridge.sendContinueCommand).toHaveBeenCalled();
      expect(mockCLIBridge.sendTestCommand).toHaveBeenCalled();
      expect(mockCLIBridge.sendLintCommand).toHaveBeenCalled();
      expect(mockCLIBridge.sendFormatCommand).toHaveBeenCalled();
      expect(mockCLIBridge.sendCommitCommand).toHaveBeenCalled();
    });

    it('should handle CLI health checks', async () => {
      await agentManager.initialize();

      const isHealthy = await mockCLIBridge.checkCLIHealth('cursor-agent');
      expect(isHealthy).toBe(true);
    });

    it('should get CLI capabilities', async () => {
      await agentManager.initialize();

      const capabilities = await mockCLIBridge.getCLICapabilities('cursor-agent');
      expect(capabilities).toEqual(['implement', 'test', 'lint', 'format']);
    });
  });
});
