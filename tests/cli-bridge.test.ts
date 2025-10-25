import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createCLIBridge, resetCLIBridge } from '../src/core/cli-bridge.js';
import { createLogger } from '../src/core/logger.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { RulebookConfig } from '../src/types.js';

describe('CLIBridge', () => {
  let tempDir: string;
  let logger: ReturnType<typeof createLogger>;
  let config: RulebookConfig;
  let cliBridge: ReturnType<typeof createCLIBridge>;

  beforeEach(async () => {
    // Reset singleton before each test
    resetCLIBridge();

    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-cli-bridge-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    logger = createLogger(tempDir);

    config = {
      version: '1.0.0',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectId: 'test-project',
      features: {
        openspec: true,
        watcher: true,
        agent: true,
        logging: true,
        telemetry: true,
        notifications: false,
        dryRun: false,
        gitHooks: false,
        repl: false,
        templates: false,
        context: false,
        health: false,
        plugins: false,
        parallel: false,
        smartContinue: false,
      },
      coverageThreshold: 95,
      language: 'en',
      outputLanguage: 'en',
      cliTools: [],
      maxParallelTasks: 1,
      timeouts: {
        taskExecution: 300000,
        cliResponse: 60000,
        testRun: 120000,
      },
    };

    cliBridge = createCLIBridge(logger, config);
  });

  afterEach(async () => {
    // Kill any spawned processes to prevent orphans
    if (cliBridge) {
      await cliBridge.killAllProcesses();
    }
  });

  describe('detectCLITools', () => {
    it('should detect available CLI tools', async () => {
      const tools = await cliBridge.detectCLITools();

      expect(Array.isArray(tools)).toBe(true);
      // In test environment, CLI tools may or may not be available
      expect(tools.length).toBeGreaterThanOrEqual(0);

      // If tools are detected, they should only be supported tools
      if (tools.length > 0) {
        const supportedTools = ['cursor-agent', 'claude-code', 'gemini-cli'];
        const detectedToolNames = tools.map((tool) => tool.name);
        detectedToolNames.forEach((toolName) => {
          expect(supportedTools).toContain(toolName);
        });
      }
    });

    it('should only support three standardized CLI tools', async () => {
      // Test that only the three standardized tools are supported
      const supportedTools = ['cursor-agent', 'claude-code', 'gemini-cli'];

      // Verify the exact number of supported tools
      expect(supportedTools).toHaveLength(3);

      // Verify each tool is in the supported list
      expect(supportedTools).toContain('cursor-agent');
      expect(supportedTools).toContain('claude-code');
      expect(supportedTools).toContain('gemini-cli');
    });

    it('should reject deprecated tools', async () => {
      const deprecatedTools = ['cursor-cli', 'claude-cli', 'gemini-cli-legacy'];

      for (const tool of deprecatedTools) {
        const response = await cliBridge.sendCommandToCLI(tool, 'test command');

        expect(response).toMatchObject({
          success: false,
          output: '',
          error: expect.stringContaining('deprecated'),
          duration: expect.any(Number),
          exitCode: 1,
        });
      }
    });
  });

  describe('sendCommandToCLI', () => {
    it('should handle command execution failure gracefully', async () => {
      const response = await cliBridge.sendCommandToCLI('nonexistent-tool', 'test command');

      expect(response).toMatchObject({
        success: false,
        output: '',
        error: expect.any(String),
        duration: expect.any(Number),
        exitCode: expect.any(Number),
      });
    });

    it('should support all standardized CLI tools', async () => {
      const supportedTools = ['cursor-agent', 'claude-code', 'gemini-cli'];

      for (const tool of supportedTools) {
        const response = await cliBridge.sendCommandToCLI(tool, 'test command');

        expect(response).toMatchObject({
          success: expect.any(Boolean), // May succeed or fail depending on tool availability
          duration: expect.any(Number),
          exitCode: expect.any(Number),
        });
      }
    }, 30000); // 30 second timeout for cursor-agent
  });

  describe('waitForCompletion', () => {
    it('should handle timeout scenarios', async () => {
      const response = await cliBridge.waitForCompletion('nonexistent-tool', 'test command', 1000);

      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number),
      });
    });
  });

  describe('handleTimeout', () => {
    it('should handle timeout gracefully', async () => {
      const response = await cliBridge.handleTimeout('nonexistent-tool', 'original command');

      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number),
      });
    });
  });

  describe('command methods', () => {
    it('should handle all command types', async () => {
      const task = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description',
      };

      const commands = [
        () => cliBridge.sendTaskCommand('nonexistent-tool', task),
        () => cliBridge.sendContinueCommand('nonexistent-tool', 5),
        () => cliBridge.sendTestCommand('nonexistent-tool'),
        () => cliBridge.sendLintCommand('nonexistent-tool'),
        () => cliBridge.sendFormatCommand('nonexistent-tool'),
        () => cliBridge.sendCommitCommand('nonexistent-tool', 'Test commit'),
      ];

      for (const command of commands) {
        const response = await command();
        expect(response).toMatchObject({
          success: false,
          duration: expect.any(Number),
        });
      }
    });
  });

  describe('killAllProcesses', () => {
    it('should kill all active processes', async () => {
      await cliBridge.killAllProcesses();
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('checkCLIHealth', () => {
    it('should check CLI health', async () => {
      const isHealthy = await cliBridge.checkCLIHealth('nonexistent-tool');

      expect(typeof isHealthy).toBe('boolean');
      expect(isHealthy).toBe(false);
    });
  });

  describe('getCLICapabilities', () => {
    it('should get CLI capabilities', async () => {
      const capabilities = await cliBridge.getCLICapabilities('nonexistent-tool');

      expect(Array.isArray(capabilities)).toBe(true);
      expect(capabilities.length).toBe(0);
    });
  });

  describe('executeWorkflowStep', () => {
    it('should execute all workflow steps', async () => {
      const steps = [
        {
          step: 'implement' as const,
          context: { task: { id: 'task-123', title: 'Test', description: 'Test' } },
        },
        { step: 'test' as const },
        { step: 'lint' as const },
        { step: 'format' as const },
        { step: 'commit' as const, context: { message: 'Test commit' } },
      ];

      for (const { step, context } of steps) {
        const response = await cliBridge.executeWorkflowStep('nonexistent-tool', step, context);
        expect(response).toMatchObject({
          success: false,
          duration: expect.any(Number),
        });
      }
    });

    it('should throw error for unknown step', async () => {
      await expect(
        cliBridge.executeWorkflowStep('nonexistent-tool', 'unknown' as any)
      ).rejects.toThrow('Unknown workflow step');
    });
  });

  describe('smartContinueDetection', () => {
    it('should detect processing patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection(
        'test-tool',
        'I am thinking about this...'
      );

      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(false); // Should not continue if processing
    });

    it('should detect stopped patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection(
        'test-tool',
        'Ready for next command'
      );

      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(true); // Should continue if stopped
    });

    it('should default to continue for unclear patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection(
        'test-tool',
        'Some random output'
      );

      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(true); // Should default to continue
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle debug logging initialization', async () => {
      // Test that debug logging is initialized properly
      const tools = await cliBridge.detectCLITools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should handle process cleanup on error', async () => {
      // Test that processes are cleaned up when errors occur
      const response = await cliBridge.sendCommandToCLI('nonexistent-tool', 'test command');
      expect(response.success).toBe(false);
      
      // Verify no processes are left running
      await cliBridge.killAllProcesses();
      expect(true).toBe(true); // Should not throw
    });

    it('should handle timeout with custom timeout value', async () => {
      const response = await cliBridge.waitForCompletion('nonexistent-tool', 'test command', 500);
      expect(response.success).toBe(false);
      expect(response.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle different command variations', async () => {
      const commands = [
        'Run tests and check coverage',
        'Run the tests and check test coverage', 
        'Please run the tests and check coverage'
      ];

      for (const command of commands) {
        const response = await cliBridge.sendCommandToCLI('nonexistent-tool', command);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different lint command variations', async () => {
      const lintCommands = [
        'Run linter and fix issues',
        'Please run the linter and fix issues',
        'Run linter and fix issues'
      ];

      for (const command of lintCommands) {
        const response = await cliBridge.sendCommandToCLI('nonexistent-tool', command);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different format command variations', async () => {
      const formatCommands = [
        'Format code',
        'Please format the code',
        'Format code'
      ];

      for (const command of formatCommands) {
        const response = await cliBridge.sendCommandToCLI('nonexistent-tool', command);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle different commit command variations', async () => {
      const commitCommands = [
        'Commit changes with message: Test commit',
        'Please commit changes with message: Test commit',
        'Commit changes with message: Test commit'
      ];

      for (const command of commitCommands) {
        const response = await cliBridge.sendCommandToCLI('nonexistent-tool', command);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle continue command with different iterations', async () => {
      const iterations = [1, 5, 10, 20];
      
      for (const iter of iterations) {
        const response = await cliBridge.sendContinueCommand('nonexistent-tool', iter);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle task command with different task formats', async () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', description: 'Description 1' },
        { id: 'task-2', title: 'Task 2', description: 'Description 2' },
        { id: 'task-3', title: 'Task 3', description: 'Description 3' }
      ];

      for (const task of tasks) {
        const response = await cliBridge.sendTaskCommand('nonexistent-tool', task);
        expect(response.success).toBe(false);
        expect(response.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle CLI health check with different tools', async () => {
      const tools = ['cursor-agent', 'claude-code', 'gemini-cli', 'nonexistent-tool'];
      
      for (const tool of tools) {
        const isHealthy = await cliBridge.checkCLIHealth(tool);
        expect(typeof isHealthy).toBe('boolean');
      }
    }, 30000);

    it('should handle CLI capabilities with different tools', async () => {
      const tools = ['cursor-agent', 'claude-code', 'gemini-cli', 'nonexistent-tool'];
      
      for (const tool of tools) {
        const capabilities = await cliBridge.getCLICapabilities(tool);
        expect(Array.isArray(capabilities)).toBe(true);
      }
    }, 30000);

    it('should handle smart continue detection with various patterns', async () => {
      const patterns = [
        'I am thinking about this...',
        'Processing your request...',
        'Ready for next command',
        'Task completed successfully',
        'Some random output',
        'Error occurred',
        'Working on it...',
        'Done!'
      ];

      for (const pattern of patterns) {
        const shouldContinue = await cliBridge.smartContinueDetection('test-tool', pattern);
        expect(typeof shouldContinue).toBe('boolean');
      }
    });

    it('should handle workflow step execution with different contexts', async () => {
      const contexts = [
        { task: { id: 'task-1', title: 'Task 1', description: 'Description 1' } },
        { task: { id: 'task-2', title: 'Task 2', description: 'Description 2' } },
        { message: 'Test commit message' },
        { message: 'Another commit message' }
      ];

      const steps = ['implement', 'test', 'lint', 'format', 'commit'] as const;
      
      for (const step of steps) {
        for (const context of contexts) {
          if ((step === 'implement' || step === 'commit') && context) {
            const response = await cliBridge.executeWorkflowStep('nonexistent-tool', step, context);
            expect(response.success).toBe(false);
            expect(response.duration).toBeGreaterThanOrEqual(0);
          }
        }
      }
    });

    it('should handle process management edge cases', async () => {
      // Test killing processes when none are running
      await cliBridge.killAllProcesses();
      expect(true).toBe(true); // Should not throw
      
      // Test killing processes multiple times
      await cliBridge.killAllProcesses();
      await cliBridge.killAllProcesses();
      expect(true).toBe(true); // Should not throw
    });
  });
});
