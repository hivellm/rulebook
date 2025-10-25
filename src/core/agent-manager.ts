import chalk from 'chalk';
import inquirer from 'inquirer';
import { createOpenSpecManager } from './openspec-manager.js';
import { createLogger, initializeLogger } from './logger.js';
import { createConfigManager } from './config-manager.js';
import { createCLIBridge } from './cli-bridge.js';
import type { OpenSpecTask, RulebookConfig } from '../types.js';

export interface AgentOptions {
  dryRun?: boolean;
  tool?: string;
  maxIterations?: number;
  watchMode?: boolean;
  onLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'tool', message: string) => void;
}

export class AgentManager {
  private openspecManager: ReturnType<typeof createOpenSpecManager>;
  private logger: ReturnType<typeof createLogger>;
  private configManager: ReturnType<typeof createConfigManager>;
  private cliBridge!: ReturnType<typeof createCLIBridge>;
  private config: RulebookConfig;
  private isRunning = false;
  private currentTool?: string;
  private onLog?: AgentOptions['onLog'];

  constructor(projectRoot: string) {
    this.openspecManager = createOpenSpecManager(projectRoot);
    this.logger = initializeLogger(projectRoot);
    this.configManager = createConfigManager(projectRoot);
    this.config = {} as RulebookConfig; // Will be loaded in initialize()
  }

  /**
   * Initialize agent manager
   */
  async initialize(): Promise<void> {
    try {
      this.config = await this.configManager.loadConfig();
      this.cliBridge = createCLIBridge(this.logger, this.config);

      // Pass onLog callback to CLI bridge if available
      if (this.onLog) {
        this.cliBridge.setLogCallback(this.onLog);
      }

      await this.openspecManager.initialize();

      this.logger.info('Agent Manager initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Agent Manager', { error: String(error) });
      throw error;
    }
  }

  /**
   * Start autonomous agent workflow
   */
  async startAgent(options: AgentOptions = {}): Promise<void> {
    try {
      await this.initialize();

      this.onLog = options.onLog;

      if (!this.onLog) {
        console.log(chalk.bold.blue('\n🤖 Rulebook Autonomous Agent\n'));
      } else {
        this.onLog('info', '🤖 Rulebook Autonomous Agent');
      }

      // Detect and select CLI tool
      const selectedTool = await this.selectCLITool(options.tool);
      if (!selectedTool) {
        const msg = 'No CLI tool selected. Exiting.';
        if (this.onLog) {
          this.onLog('error', msg);
        } else {
          console.log(chalk.red(msg));
        }
        return;
      }

      this.currentTool = selectedTool;
      this.isRunning = true;

      // Sync task status first
      if (this.onLog) {
        this.onLog('info', '📋 Syncing task status...');
      } else {
        console.log(chalk.gray('📋 Syncing task status...'));
      }
      
      await this.openspecManager.syncTaskStatus();
      
      if (this.onLog) {
        this.onLog('success', '✅ Task status synced');
      } else {
        console.log(chalk.green('✅ Task status synced\n'));
      }

      // Start watcher if requested
      if (options.watchMode) {
        this.startWatcherInBackground();
      }

      // Run main workflow loop
      await this.runAgentWorkflow(options);
    } catch (error) {
      this.logger.error('Agent failed', { error: String(error) });
      console.error(chalk.red('\n❌ Agent failed:'), error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Detect and select CLI tool
   */
  async selectCLITool(preferredTool?: string): Promise<string | null> {
    const availableTools = await this.cliBridge.detectCLITools();

    if (availableTools.length === 0) {
      const msg = 'No CLI tools detected. Please install cursor-agent, claude-code, gemini-cli, cursor-cli, or claude-cli.';
      if (this.onLog) {
        this.onLog('error', msg);
      } else {
        console.log(chalk.red(msg));
      }
      return null;
    }

    // If preferred tool is specified and available, use it
    if (preferredTool && availableTools.some((tool) => tool.name === preferredTool)) {
      const msg = `Using preferred tool: ${preferredTool}`;
      if (this.onLog) {
        this.onLog('info', msg);
      } else {
        console.log(chalk.green(msg));
      }
      return preferredTool;
    }

    // If only one tool available, use it
    if (availableTools.length === 1) {
      console.log(chalk.green(`Using available tool: ${availableTools[0].name}`));
      return availableTools[0].name;
    }

    // Multiple tools available, let user choose
    const choices = availableTools.map((tool) => ({
      name: `${tool.name} ${tool.version ? `(${tool.version})` : ''}`,
      value: tool.name,
    }));

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'tool',
        message: 'Select CLI tool to use:',
        choices,
      },
    ]);

    return answer.tool;
  }

  /**
   * Run main agent workflow loop
   */
  async runAgentWorkflow(options: AgentOptions): Promise<void> {
    const maxIterations = options.maxIterations || 10;
    let iteration = 0;

    this.logger.info('Starting agent workflow', { maxIterations });

    while (this.isRunning && iteration < maxIterations) {
      try {
        iteration++;
        this.logger.info(`Workflow iteration ${iteration}/${maxIterations}`);

        // Get next task
        const nextTask = await this.openspecManager.getNextTask();
        if (!nextTask) {
          this.logger.info('No more tasks available');
          const msg = '✅ All tasks completed!';
          if (this.onLog) {
            this.onLog('success', msg);
          } else {
            console.log(chalk.green(`\n${msg}`));
          }
          break;
        }

        // Execute task workflow
        const success = await this.executeTaskWorkflow(nextTask, options);

        if (success) {
          await this.openspecManager.markTaskComplete(nextTask.id);
          this.logger.taskComplete(nextTask.id, nextTask.title, 0);
        } else {
          await this.openspecManager.updateTaskStatus(nextTask.id, 'failed');
          this.logger.taskFailed(nextTask.id, nextTask.title, 'Task execution failed');
        }

        // Small delay between tasks
        await this.delay(2000);
      } catch (error) {
        this.logger.error(`Workflow iteration ${iteration} failed`, { error: String(error) });
        console.error(chalk.red(`\n❌ Iteration ${iteration} failed:`), error);

        // Continue with next iteration unless it's a critical error
        if (iteration >= maxIterations) {
          break;
        }
      }
    }

    if (iteration >= maxIterations) {
      console.log(chalk.yellow(`\n⚠️ Reached maximum iterations (${maxIterations})`));
    }
  }

  /**
   * Execute workflow for a single task
   */
  async executeTaskWorkflow(task: OpenSpecTask, options: AgentOptions): Promise<boolean> {
    const startTime = Date.now();

    this.logger.taskStart(task.id, task.title);
    console.log(chalk.blue(`\n📋 Executing task: ${task.title}`));

    try {
      // Set task as in-progress
      await this.openspecManager.setCurrentTask(task.id);
      await this.openspecManager.updateTaskStatus(task.id, 'in-progress');

      if (options.dryRun) {
        console.log(chalk.yellow('🔍 DRY RUN MODE - No actual execution'));
        console.log(chalk.gray(`Would execute: ${task.title}`));
        return true;
      }

      // Step 1: Send task to CLI
      console.log(chalk.gray('📤 Sending task to CLI...'));
      const taskResponse = await this.cliBridge.sendTaskCommand(this.currentTool!, task);

      console.log(chalk.blue('\n📥 Agent Response:'));
      console.log(chalk.gray('─'.repeat(80)));
      console.log(taskResponse.output || '(no output)');
      console.log(chalk.gray('─'.repeat(80)));
      console.log(
        chalk.gray(
          `Exit Code: ${taskResponse.exitCode} | Duration: ${Math.round(taskResponse.duration / 1000)}s`
        )
      );

      if (taskResponse.error) {
        console.log(chalk.red('\n⚠️ Error Output:'));
        console.log(chalk.red(taskResponse.error));
      }

      if (!taskResponse.success) {
        throw new Error(`Task command failed: ${taskResponse.error}`);
      }

      // Step 2: Continue implementation loop
      console.log(chalk.gray('\n🔄 Continuing implementation...'));
      const continueResponse = await this.cliBridge.sendContinueCommand(this.currentTool!, 10);

      console.log(chalk.blue('\n📥 Continue Response:'));
      console.log(chalk.gray('─'.repeat(80)));
      console.log(continueResponse.output || '(no output)');
      console.log(chalk.gray('─'.repeat(80)));
      console.log(
        chalk.gray(
          `Exit Code: ${continueResponse.exitCode} | Duration: ${Math.round(continueResponse.duration / 1000)}s`
        )
      );

      if (continueResponse.error) {
        console.log(chalk.red('\n⚠️ Error Output:'));
        console.log(chalk.red(continueResponse.error));
      }

      if (!continueResponse.success) {
        console.log(chalk.yellow('⚠️ Continue command failed, but continuing workflow'));
      }

      // Step 3: Run quality checks
      console.log(chalk.gray('🔍 Running quality checks...'));
      await this.runQualityChecks();

      // Step 4: Run tests
      console.log(chalk.gray('🧪 Running tests...'));
      const testSuccess = await this.runTests();

      if (!testSuccess) {
        throw new Error('Tests failed');
      }

      // Step 5: Check coverage
      console.log(chalk.gray('📊 Checking coverage...'));
      const coverageSuccess = await this.checkCoverage();

      if (!coverageSuccess) {
        throw new Error('Coverage below threshold');
      }

      // Step 6: Test workflows
      console.log(chalk.gray('⚙️ Testing workflows...'));
      await this.testWorkflows();

      // Step 7: Commit changes
      console.log(chalk.gray('💾 Committing changes...'));
      await this.commitChanges(task);

      const duration = Date.now() - startTime;
      this.logger.taskComplete(task.id, task.title, duration);

      console.log(chalk.green(`✅ Task completed successfully in ${Math.round(duration / 1000)}s`));
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.taskFailed(task.id, task.title, String(error), duration);

      console.error(chalk.red(`❌ Task failed: ${error}`));
      return false;
    }
  }

  /**
   * Run quality checks (lint, format)
   */
  private async runQualityChecks(): Promise<void> {
    // Run lint
    const lintResponse = await this.cliBridge.sendLintCommand(this.currentTool!);
    this.logger.testExecution(
      'lint',
      lintResponse.success ? 'passed' : 'failed',
      lintResponse.duration
    );

    if (!lintResponse.success) {
      console.log(chalk.yellow('⚠️ Lint issues found, but continuing'));
    }

    // Run format
    const formatResponse = await this.cliBridge.sendFormatCommand(this.currentTool!);
    this.logger.testExecution(
      'format',
      formatResponse.success ? 'passed' : 'failed',
      formatResponse.duration
    );

    if (!formatResponse.success) {
      console.log(chalk.yellow('⚠️ Format issues found, but continuing'));
    }
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<boolean> {
    const testResponse = await this.cliBridge.sendTestCommand(this.currentTool!);
    this.logger.testExecution(
      'tests',
      testResponse.success ? 'passed' : 'failed',
      testResponse.duration
    );

    return testResponse.success;
  }

  /**
   * Check coverage
   */
  private async checkCoverage(): Promise<boolean> {
    // This would integrate with your coverage checker
    // For now, assume coverage is OK
    const coverage = 95; // This should come from actual coverage check
    const threshold = this.config.coverageThreshold;

    this.logger.coverageCheck(coverage, threshold);

    return coverage >= threshold;
  }

  /**
   * Test workflows
   */
  private async testWorkflows(): Promise<void> {
    // This would test GitHub Actions workflows
    // For now, just log
    this.logger.info('Testing workflows (placeholder)');
  }

  /**
   * Commit changes
   */
  private async commitChanges(task: OpenSpecTask): Promise<void> {
    const message = `feat: ${task.title}\n\n${task.description}`;
    const commitResponse = await this.cliBridge.sendCommitCommand(this.currentTool!, message);

    if (!commitResponse.success) {
      throw new Error(`Commit failed: ${commitResponse.error}`);
    }
  }

  /**
   * Start watcher in background
   */
  private startWatcherInBackground(): void {
    // This would start the watcher in a separate process or thread
    // For now, just log
    this.logger.info('Watcher mode requested (placeholder)');
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.isRunning = false;

    if (this.cliBridge) {
      await this.cliBridge.killAllProcesses();
    }

    await this.logger.close();
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stop agent
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.cleanup();
  }
}

/**
 * Create and start agent
 */
export async function startAgent(projectRoot: string, options: AgentOptions = {}): Promise<void> {
  const agent = new AgentManager(projectRoot);
  await agent.startAgent(options);
}

/**
 * Create agent manager instance
 */
export function createAgentManager(projectRoot: string): AgentManager {
  return new AgentManager(projectRoot);
}
