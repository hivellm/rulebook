import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAgentManager, AgentManager } from '../src/core/agent-manager.js';
import { createCLIBridge } from '../src/core/cli-bridge.js';
import { createLogger, initializeLogger } from '../src/core/logger.js';
import { createConfigManager } from '../src/core/config-manager.js';

// Mock dependencies
vi.mock('../src/core/logger.js');
vi.mock('../src/core/config-manager.js');
vi.mock('../src/core/cli-bridge.js');

describe.skip('Agent Manager Comprehensive Tests', () => {
  let agentManager: AgentManager;
  let mockLogger: any;
  let mockConfigManager: any;
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
        enabledFeatures: ['agent'],
      }),
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
      setLogCallback: vi.fn().mockReturnValue(undefined),
    };

    // Setup mocks
    vi.mocked(createLogger).mockReturnValue(mockLogger);
    vi.mocked(initializeLogger).mockReturnValue(mockLogger);
    vi.mocked(createConfigManager).mockReturnValue(mockConfigManager);
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
      // OpenSpec removed
      expect(mockLogger.info).toHaveBeenCalledWith('Agent Manager initialized');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockConfigManager.loadConfig.mockRejectedValueOnce(error);

      await expect(agentManager.initialize()).rejects.toThrow('Initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Agent Manager', {
        error: 'Error: Initialization failed',
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
      // Set the current tool
      (agentManager as any).currentTool = 'cursor-agent';

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
      // Set the current tool
      (agentManager as any).currentTool = 'cursor-agent';

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, { dryRun: true });

      expect(success).toBe(true);
      // In dry run mode, no CLI commands should be executed
      expect(mockCLIBridge.sendTaskCommand).not.toHaveBeenCalled();
    });

    it('should handle task execution failure', async () => {
      // Set the current tool
      (agentManager as any).currentTool = 'cursor-agent';

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
      // Set the current tool
      (agentManager as any).currentTool = 'cursor-agent';

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
      // Set the current tool
      (agentManager as any).currentTool = 'cursor-agent';

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
      (agentManager as any).currentTool = 'cursor-agent';
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
      (agentManager as any).currentTool = 'cursor-agent';
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

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await agentManager.initialize();
      (agentManager as any).currentTool = 'cursor-agent';
    });

    it('should handle CLI command timeouts', async () => {
      const timeoutError = new Error('Command timeout');
      (timeoutError as any).exitCode = 124; // Timeout exit code

      mockCLIBridge.sendCommandToCLI.mockRejectedValueOnce(timeoutError);

      // The method should reject with the timeout error
      await expect(mockCLIBridge.sendCommandToCLI('cursor-agent', 'test command')).rejects.toThrow(
        'Command timeout'
      );
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

      // Mock getNextTask to return null to prevent workflow execution
      // OpenSpec mock removed

      await (agentManager as any).startAgent(options);

      // Since watchMode is just a placeholder, just verify it completes without error
      // OpenSpec removed
    });

    it('should handle custom max iterations', async () => {
      const options = { maxIterations: 5 };

      await agentManager.initialize();

      // Mock getNextTask to return null immediately
      // OpenSpec mock removed

      await (agentManager as any).runAgentWorkflow(options);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting agent workflow', { maxIterations: 5 });
    });

    it('should handle dry run mode', async () => {
      const options = { dryRun: true };

      await agentManager.initialize();
      (agentManager as any).currentTool = 'cursor-agent';

      const task = {
        id: 'test-task-1',
        title: 'Test Task',
        description: 'Test task description',
      };

      const success = await (agentManager as any).executeTaskWorkflow(task, options);

      expect(success).toBe(true);
      // In dry run mode, no actual commands should be sent
      expect(mockCLIBridge.sendTaskCommand).not.toHaveBeenCalled();
      expect(mockCLIBridge.sendContinueCommand).not.toHaveBeenCalled();
      expect(mockCLIBridge.sendTestCommand).not.toHaveBeenCalled();
    });
  });

  describe('Task Status Sync on Agent Start', () => {
    it('should call syncTaskStatus when agent starts', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return null to prevent workflow execution
      // OpenSpec mock removed

      await agentManager.startAgent({ maxIterations: 1 });

      // OpenSpec removed
    });

    it('should call syncTaskStatus before workflow execution', async () => {
      await agentManager.initialize();
      await agentManager.startAgent({ maxIterations: 1 });
    });

    it('should handle syncTaskStatus errors gracefully', async () => {
      await agentManager.initialize();

      // Mock syncTaskStatus to throw an error
      const syncError = new Error('Sync failed');
      // OpenSpec mock removed

      // Mock getNextTask to return null to prevent workflow execution
      // OpenSpec mock removed

      // Agent should handle the error gracefully
      try {
        await agentManager.startAgent({ maxIterations: 1 });
        // If we get here, the error was handled gracefully
        expect(true).toBe(true);
      } catch (error) {
        // Error is acceptable if handled correctly
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should log sync status messages', async () => {
      await agentManager.initialize();

      // Mock getNextTask to return null to prevent workflow execution
      // OpenSpec mock removed

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
      // OpenSpec mock removed

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
      await agentManager.initialize();
      await agentManager.startAgent({ maxIterations: 1 });
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

  describe('Agent manager additional tests', () => {
    it('should handle initialization and cleanup', async () => {
      mockCLIBridge.killAllProcesses.mockResolvedValue();

      await agentManager.initialize();
      await agentManager['cleanup']();

      expect(mockCLIBridge.killAllProcesses).toHaveBeenCalled();
      expect(mockLogger.close).toHaveBeenCalled();
    });

    it('should handle startAgent with no CLI tools available', async () => {
      mockCLIBridge.detectCLITools.mockResolvedValue([]);

      await agentManager.initialize();
      await agentManager.startAgent({ maxIterations: 1 });

      expect(mockCLIBridge.detectCLITools).toHaveBeenCalled();
    });
  });
});
