import chalk from 'chalk';
import inquirer from 'inquirer';
import { createLogger, initializeLogger } from './logger.js';
import { createConfigManager } from './config-manager.js';
import { createCLIBridge } from './cli-bridge.js';
import type { RulebookConfig } from '../types.js';
import { RalphParser } from '../agents/ralph-parser.js';

export interface AgentTask {
  id: string;
  title: string;
  description: string;
}

export interface AgentOptions {
  dryRun?: boolean;
  tool?: string;
  maxIterations?: number;
  watchMode?: boolean;
  onLog?: (type: 'info' | 'success' | 'warning' | 'error' | 'tool', message: string) => void;
  onTaskStatusChange?: (taskId: string, status: string) => void;
  onTasksReloaded?: (tasks: AgentTask[]) => void;
}

export class AgentManager {
  private logger: ReturnType<typeof createLogger>;
  private configManager: ReturnType<typeof createConfigManager>;
  private cliBridge!: ReturnType<typeof createCLIBridge>;
  private config: RulebookConfig;
  private isRunning = false;
  private currentTool?: string;
  private onLog?: AgentOptions['onLog'];
  private onTaskStatusChange?: AgentOptions['onTaskStatusChange'];
  private initializePromise?: Promise<void>;

  constructor(projectRoot: string) {
    this.logger = initializeLogger(projectRoot);
    this.configManager = createConfigManager(projectRoot);
    this.config = {} as RulebookConfig;
  }

  /**
   * Initialize agent manager (only once, thread-safe)
   */
  async initialize(): Promise<void> {
    if (this.initializePromise) {
      if (this.cliBridge && this.onLog) {
        this.cliBridge.setLogCallback(this.onLog);
      }
      return this.initializePromise;
    }

    this.initializePromise = (async () => {
      try {
        this.config = await this.configManager.loadConfig();
        this.cliBridge = createCLIBridge(this.logger, this.config);

        if (this.onLog) {
          this.cliBridge.setLogCallback(this.onLog);
        }

        this.logger.info('Agent Manager initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Agent Manager', { error: String(error) });
        this.initializePromise = undefined;
        throw error;
      }
    })();

    return this.initializePromise;
  }

  /**
   * Start autonomous agent workflow
   */
  async startAgent(options: AgentOptions = {}): Promise<void> {
    try {
      this.onLog = options.onLog;
      this.onTaskStatusChange = options.onTaskStatusChange;

      await this.initialize();

      if (!this.onLog) {
        console.log(chalk.bold.blue('\n🤖 Rulebook Autonomous Agent\n'));
      } else {
        this.onLog('info', '🤖 Rulebook Autonomous Agent');
      }

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

      if (options.watchMode) {
        this.startWatcherInBackground();
      }

      await this.runAgentWorkflow(options);
    } catch (error) {
      this.logger.error('Agent failed', { error: String(error) });
      const msg = `❌ Agent failed: ${error}`;
      if (this.onLog) {
        this.onLog('error', msg);
      } else {
        console.error(chalk.red('\n' + msg));
      }
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
      const msg = 'No CLI tools detected. Please install cursor-agent, claude-code, or gemini-cli.';
      if (this.onLog) {
        this.onLog('error', msg);
      } else {
        console.log(chalk.red(msg));
      }
      return null;
    }

    if (preferredTool && availableTools.some((tool) => tool.name === preferredTool)) {
      const msg = `Using preferred tool: ${preferredTool}`;
      if (this.onLog) {
        this.onLog('info', msg);
      } else {
        console.log(chalk.green(msg));
      }
      return preferredTool;
    }

    if (availableTools.length === 1) {
      const msg = `Using available tool: ${availableTools[0].name}`;
      if (this.onLog) {
        this.onLog('info', msg);
      } else {
        console.log(chalk.green(msg));
      }
      return availableTools[0].name;
    }

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

        const msg = `🔄 Agent workflow iteration ${iteration}/${maxIterations} (use Ralph for task-driven automation)`;
        if (this.onLog) {
          this.onLog('info', msg);
        } else {
          console.log(chalk.gray(msg));
        }

        // Continue iterating — no unconditional break
        // Loop exits naturally when: isRunning=false, maxIterations reached
      } catch (error) {
        this.logger.error(`Workflow iteration ${iteration} failed`, { error: String(error) });
        const msg = `❌ Iteration ${iteration} failed: ${error}`;
        if (this.onLog) {
          this.onLog('error', msg);
        } else {
          console.error(chalk.red('\n' + msg));
        }

        if (iteration >= maxIterations) {
          break;
        }
      }
    }

    if (iteration >= maxIterations) {
      const msg = `⚠️ Reached maximum iterations (${maxIterations})`;
      if (this.onLog) {
        this.onLog('warning', msg);
      } else {
        console.log(chalk.yellow('\n' + msg));
      }
    }
  }

  /**
   * Execute workflow for a single task
   */
  async executeTaskWorkflow(task: AgentTask, options: AgentOptions): Promise<boolean> {
    const startTime = Date.now();

    this.logger.taskStart(task.id, task.title);
    const msg = `📋 Executing task: ${task.title}`;
    if (this.onLog) {
      this.onLog('info', msg);
    } else {
      console.log(chalk.blue('\n' + msg));
    }

    try {
      if (this.onTaskStatusChange) {
        this.onTaskStatusChange(task.id, 'in-progress');
      }

      if (options.dryRun) {
        if (this.onLog) {
          this.onLog('warning', '🔍 DRY RUN MODE - No actual execution');
          this.onLog('info', `Would execute: ${task.title}`);
        } else {
          console.log(chalk.yellow('🔍 DRY RUN MODE - No actual execution'));
          console.log(chalk.gray(`Would execute: ${task.title}`));
        }
        return true;
      }

      if (this.onLog) {
        this.onLog('info', '📤 Sending task to CLI...');
      } else {
        console.log(chalk.gray('📤 Sending task to CLI...'));
      }
      const taskResponse = await this.cliBridge.sendTaskCommand(this.currentTool!, task);

      if (!taskResponse.success) {
        throw new Error(`Task command failed: ${taskResponse.error}`);
      }

      await this.runQualityChecks();

      const testSuccess = await this.runTests();
      if (!testSuccess) {
        throw new Error('Tests failed');
      }

      const coverageSuccess = await this.checkCoverage();
      if (!coverageSuccess) {
        throw new Error('Coverage below threshold');
      }

      await this.commitChanges(task);

      const duration = Date.now() - startTime;
      this.logger.taskComplete(task.id, task.title, duration);

      const successMsg = `✅ Task completed successfully in ${Math.round(duration / 1000)}s`;
      if (this.onLog) {
        this.onLog('success', successMsg);
      } else {
        console.log(chalk.green(successMsg));
      }
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.taskFailed(task.id, task.title, String(error), duration);

      const errorMsg = `❌ Task failed: ${error}`;
      if (this.onLog) {
        this.onLog('error', errorMsg);
      } else {
        console.error(chalk.red(errorMsg));
      }
      return false;
    }
  }

  private async runQualityChecks(): Promise<void> {
    const lintResponse = await this.cliBridge.sendLintCommand(this.currentTool!);
    this.logger.testExecution(
      'lint',
      lintResponse.success ? 'passed' : 'failed',
      lintResponse.duration
    );

    if (!lintResponse.success) {
      const msg = '⚠️ Lint issues found, but continuing';
      if (this.onLog) {
        this.onLog('warning', msg);
      } else {
        console.log(chalk.yellow(msg));
      }
    }

    const formatResponse = await this.cliBridge.sendFormatCommand(this.currentTool!);
    this.logger.testExecution(
      'format',
      formatResponse.success ? 'passed' : 'failed',
      formatResponse.duration
    );

    if (!formatResponse.success) {
      const msg = '⚠️ Format issues found, but continuing';
      if (this.onLog) {
        this.onLog('warning', msg);
      } else {
        console.log(chalk.yellow(msg));
      }
    }
  }

  private async runTests(): Promise<boolean> {
    const testResponse = await this.cliBridge.sendTestCommand(this.currentTool!);
    this.logger.testExecution(
      'tests',
      testResponse.success ? 'passed' : 'failed',
      testResponse.duration
    );

    return testResponse.success;
  }

  private async checkCoverage(): Promise<boolean> {
    const threshold = this.config.coverageThreshold;

    // Run tests with coverage to get real output
    const coverageResponse = await this.cliBridge.sendTestCommand(this.currentTool!);
    const output = coverageResponse.output ?? '';

    const coverage = RalphParser.parseCoveragePercentage(output);

    if (coverage === null) {
      // Coverage output not parseable — warn but don't fail the gate
      process.stderr.write('[rulebook] Coverage output could not be parsed; skipping coverage gate\n');
      return true;
    }

    this.logger.coverageCheck(coverage, threshold);
    return coverage >= threshold;
  }

  private async commitChanges(task: AgentTask): Promise<void> {
    const message = `feat: ${task.title}\n\n${task.description}`;
    const commitResponse = await this.cliBridge.sendCommitCommand(this.currentTool!, message);

    if (!commitResponse.success) {
      throw new Error(`Commit failed: ${commitResponse.error}`);
    }
  }

  private startWatcherInBackground(): void {
    this.logger.info('Watcher mode requested (placeholder)');
  }

  private async cleanup(): Promise<void> {
    this.isRunning = false;

    if (this.cliBridge) {
      await this.cliBridge.killAllProcesses();
    }

    await this.logger.close();
  }

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
