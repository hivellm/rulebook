import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCLIBridge } from '../src/core/cli-bridge.js';
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
        smartContinue: false
      },
      coverageThreshold: 95,
      language: 'en',
      outputLanguage: 'en',
      cliTools: [],
      maxParallelTasks: 1,
      timeouts: {
        taskExecution: 300000,
        cliResponse: 60000,
        testRun: 120000
      }
    };
    
    cliBridge = createCLIBridge(logger, config);
  });

  describe('detectCLITools', () => {
    it('should detect available CLI tools', async () => {
      const tools = await cliBridge.detectCLITools();
      
      expect(Array.isArray(tools)).toBe(true);
      // In test environment, no CLI tools should be available
      expect(tools.length).toBe(0);
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
        exitCode: expect.any(Number)
      });
    });
  });

  describe('waitForCompletion', () => {
    it('should handle timeout scenarios', async () => {
      const response = await cliBridge.waitForCompletion('nonexistent-tool', 'test command', 1000);
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('handleTimeout', () => {
    it('should handle timeout gracefully', async () => {
      const response = await cliBridge.handleTimeout('nonexistent-tool', 'original command');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendTaskCommand', () => {
    it('should send task command', async () => {
      const task = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description'
      };
      
      const response = await cliBridge.sendTaskCommand('nonexistent-tool', task);
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendContinueCommand', () => {
    it('should send continue command', async () => {
      const response = await cliBridge.sendContinueCommand('nonexistent-tool', 5);
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendTestCommand', () => {
    it('should send test command', async () => {
      const response = await cliBridge.sendTestCommand('nonexistent-tool');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendLintCommand', () => {
    it('should send lint command', async () => {
      const response = await cliBridge.sendLintCommand('nonexistent-tool');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendFormatCommand', () => {
    it('should send format command', async () => {
      const response = await cliBridge.sendFormatCommand('nonexistent-tool');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });
  });

  describe('sendCommitCommand', () => {
    it('should send commit command', async () => {
      const response = await cliBridge.sendCommitCommand('nonexistent-tool', 'Test commit');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
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
    it('should execute implement step', async () => {
      const response = await cliBridge.executeWorkflowStep('nonexistent-tool', 'implement', {
        task: { id: 'task-123', title: 'Test', description: 'Test' }
      });
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });

    it('should execute test step', async () => {
      const response = await cliBridge.executeWorkflowStep('nonexistent-tool', 'test');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });

    it('should execute lint step', async () => {
      const response = await cliBridge.executeWorkflowStep('nonexistent-tool', 'lint');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });

    it('should execute format step', async () => {
      const response = await cliBridge.executeWorkflowStep('nonexistent-tool', 'format');
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });

    it('should execute commit step', async () => {
      const response = await cliBridge.executeWorkflowStep('nonexistent-tool', 'commit', {
        message: 'Test commit'
      });
      
      expect(response).toMatchObject({
        success: false,
        duration: expect.any(Number)
      });
    });

    it('should throw error for unknown step', async () => {
      await expect(
        cliBridge.executeWorkflowStep('nonexistent-tool', 'unknown' as any)
      ).rejects.toThrow('Unknown workflow step');
    });
  });

  describe('smartContinueDetection', () => {
    it('should detect processing patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection('test-tool', 'I am thinking about this...');
      
      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(false); // Should not continue if processing
    });

    it('should detect stopped patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection('test-tool', 'Ready for next command');
      
      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(true); // Should continue if stopped
    });

    it('should default to continue for unclear patterns', async () => {
      const shouldContinue = await cliBridge.smartContinueDetection('test-tool', 'Some random output');
      
      expect(typeof shouldContinue).toBe('boolean');
      expect(shouldContinue).toBe(true); // Should default to continue
    });
  });
});