import chalk from 'chalk';
import { writeFile, ensureDir } from '../../utils/file-system.js';
import path from 'path';

/**
 * Build prompt for AI agent from user story context
 */
export function ralphBuildPrompt(
  task: any,
  prd: any,
  contextHistory?: string,
  plansContext?: string
): string {
  const criteria = (task.acceptanceCriteria || []).map((c: string) => `- ${c}`).join('\n');
  return [
    `You are working on project: ${prd?.project || 'unknown'}`,
    ``,
    plansContext ? `## Session Context (PLANS.md)\n${plansContext}\n` : '',
    contextHistory && contextHistory !== 'No iteration history available.'
      ? `## Iteration History\n${contextHistory}\n`
      : '',
    `## Current Task: ${task.title}`,
    `ID: ${task.id}`,
    ``,
    `## Description`,
    task.description,
    ``,
    `## Acceptance Criteria`,
    criteria,
    ``,
    task.notes ? `## Notes\n${task.notes}\n` : '',
    `## Instructions`,
    `1. Implement the changes described above`,
    `2. Ensure all acceptance criteria are met`,
    `3. Run quality checks: type-check, lint, tests`,
    `4. Fix any issues found by quality checks`,
    `5. When done, summarize what was changed`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Execute AI agent and capture output
 */
export async function ralphExecuteAgent(
  tool: 'claude' | 'amp' | 'gemini',
  prompt: string,
  cwd: string,
  spawn: typeof import('child_process').spawn
): Promise<string> {
  const toolCommands: Record<string, { cmd: string; args: string[]; stdinPrompt: boolean }> = {
    claude: {
      cmd: 'claude',
      args: ['-p', '--dangerously-skip-permissions', '--verbose'],
      stdinPrompt: true,
    },
    amp: { cmd: 'amp', args: ['-p', prompt], stdinPrompt: false },
    gemini: { cmd: 'gemini', args: ['-p', prompt], stdinPrompt: false },
  };

  const config = toolCommands[tool] || toolCommands.claude;

  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    const proc = spawn(config.cmd, config.args, {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    if (config.stdinPrompt && proc.stdin) {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code: number | null) => {
      if (code === 0 || output.length > 0) {
        resolve(output || errorOutput);
      } else {
        reject(new Error(`Agent ${tool} exited with code ${code}: ${errorOutput.slice(0, 500)}`));
      }
    });

    proc.on('error', (err: Error) => {
      reject(new Error(`Failed to start ${tool}: ${err.message}`));
    });

    setTimeout(() => {
      proc.kill('SIGTERM');
      resolve(output || 'Agent execution timed out after 10 minutes');
    }, 600000);
  });
}

/**
 * Run quality gates and return results
 */
export async function ralphRunQualityGates(
  cwd: string,
  spawn: typeof import('child_process').spawn
): Promise<{ type_check: boolean; lint: boolean; tests: boolean; coverage_met: boolean }> {
  const runGate = (cmd: string, args: string[]): Promise<boolean> => {
    return new Promise((resolve) => {
      const proc = spawn(cmd, args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.on('close', (code: number | null) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        proc.kill('SIGTERM');
        resolve(false);
      }, 120000);
    });
  };

  const { detectMonorepo } = await import('../../core/detector.js');
  const monorepo = await detectMonorepo(cwd).catch(() => ({
    detected: false,
    tool: null,
    packages: [],
  }));

  let testCmd: [string, string[]] = ['npm', ['test']];
  if (monorepo.detected) {
    if (monorepo.tool === 'turborepo') testCmd = ['turbo', ['run', 'test']];
    else if (monorepo.tool === 'nx') testCmd = ['nx', ['run-many', '--target=test']];
  }

  const [typeCheck, lint, tests] = await Promise.all([
    runGate('npm', ['run', 'type-check']),
    runGate('npm', ['run', 'lint']),
    runGate(testCmd[0], testCmd[1]),
  ]);

  return {
    type_check: typeCheck,
    lint: lint,
    tests: tests,
    coverage_met: tests,
  };
}

/**
 * Create git branch from PRD branchName
 */
export async function ralphCreateBranch(cwd: string, branchName: string): Promise<void> {
  const { readFileSync } = await import('fs');
  const { spawn } = await import('child_process');

  try {
    const gitHeadPath = path.join(cwd, '.git', 'HEAD');
    const head = readFileSync(gitHeadPath, 'utf8').trim();
    const currentBranch = head.replace('ref: refs/heads/', '');

    if (currentBranch === branchName) {
      return;
    }
  } catch {
    return;
  }

  await new Promise<void>((resolve) => {
    const proc = spawn('git', ['checkout', '-B', branchName], {
      cwd,
      shell: true,
      stdio: 'pipe',
    });
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
  });
}

/**
 * Commit changes after successful iteration
 */
export async function ralphGitCommit(
  cwd: string,
  task: any,
  iteration: number,
  spawn: typeof import('child_process').spawn
): Promise<string | undefined> {
  await new Promise<void>((resolve) => {
    const proc = spawn('git', ['add', '-A'], { cwd, shell: true, stdio: 'pipe' });
    proc.on('close', () => resolve());
    proc.on('error', () => resolve());
  });

  const hasChanges = await new Promise<boolean>((resolve) => {
    let output = '';
    const proc = spawn('git', ['diff', '--cached', '--stat'], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    proc.on('close', () => resolve(output.trim().length > 0));
    proc.on('error', () => resolve(false));
  });

  if (!hasChanges) {
    return undefined;
  }

  const commitMsg = `ralph(${task.id}): ${task.title}\n\nIteration ${iteration} - Ralph autonomous loop`;
  const commitHash = await new Promise<string | undefined>((resolve) => {
    let output = '';
    const proc = spawn('git', ['commit', '-m', commitMsg], {
      cwd,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    proc.on('close', (code: number | null) => {
      if (code === 0) {
        const hashMatch = output.match(/\[[\w/.-]+ ([a-f0-9]+)\]/);
        resolve(hashMatch ? hashMatch[1] : undefined);
      } else {
        resolve(undefined);
      }
    });
    proc.on('error', () => resolve(undefined));
  });

  return commitHash;
}

export async function ralphInitCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Initializing Ralph autonomous loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { RalphManager } = await import('../../core/ralph-manager.js');
    const { PRDGenerator } = await import('../../core/prd-generator.js');
    const { createConfigManager } = await import('../../core/config-manager.js');

    const logger = new Logger(cwd);
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    const ralphManager = new RalphManager(cwd, logger);
    const prdGenerator = new PRDGenerator(cwd, logger);

    const maxIterations = config.ralph?.maxIterations || 10;
    const tool = (config.ralph?.tool || 'claude') as 'claude' | 'amp' | 'gemini';

    await ralphManager.initialize(maxIterations, tool);

    const prd = await prdGenerator.generatePRD(path.basename(cwd));

    const prdPath = path.join(cwd, '.rulebook', 'ralph', 'prd.json');
    await writeFile(prdPath, JSON.stringify(prd, null, 2));

    spinner.succeed(`Ralph initialized: ${prd.userStories.length} user stories loaded`);
    console.log(`\n  📋 PRD: ${prdPath}`);
    console.log(`  🔄 Max iterations: ${maxIterations}`);
    console.log(`  🤖 AI Tool: ${tool}`);
    console.log(`\n  Run: ${chalk.bold('rulebook ralph run')}\n`);
  } catch (error) {
    spinner.fail('Ralph initialization failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphRunCommand(options: {
  maxIterations?: number;
  tool?: 'claude' | 'amp' | 'gemini';
  parallel?: number;
  planFirst?: boolean;
}): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Starting Ralph autonomous loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { RalphManager } = await import('../../core/ralph-manager.js');
    const { RalphParser } = await import('../../agents/ralph-parser.js');
    const { createConfigManager } = await import('../../core/config-manager.js');
    const { IterationTracker } = await import('../../core/iteration-tracker.js');
    const childProcess = await import('child_process');

    const logger = new Logger(cwd);
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    const ralphManager = new RalphManager(cwd, logger);
    const maxIterations = options.maxIterations || config.ralph?.maxIterations || 10;
    const tool = options.tool || (config.ralph?.tool as 'claude' | 'amp' | 'gemini') || 'claude';

    const parallelWorkers =
      options.parallel ??
      (config.ralph?.parallel?.enabled ? config.ralph.parallel.maxWorkers : undefined);

    const planCheckpointConfig = {
      enabled: options.planFirst ?? config.ralph?.planCheckpoint?.enabled ?? false,
      autoApproveAfterSeconds: config.ralph?.planCheckpoint?.autoApproveAfterSeconds ?? 0,
      requireApprovalForStories:
        config.ralph?.planCheckpoint?.requireApprovalForStories ?? ('all' as const),
    };

    const compressionConfig = config.ralph?.contextCompression;
    const compressionEnabled = compressionConfig?.enabled !== false;
    const compressionRecentCount = compressionConfig?.recentCount ?? 3;
    const compressionThreshold = compressionConfig?.threshold ?? 5;
    const iterationTracker = new IterationTracker(cwd, logger);
    await iterationTracker.initialize();

    await ralphManager.initialize(maxIterations, tool);

    const prd = await ralphManager.loadPRD();
    if (prd?.branchName) {
      await ralphCreateBranch(cwd, prd.branchName);
    }

    let interrupted = false;
    const handleInterrupt = async () => {
      interrupted = true;
      spinner.warn('Pausing after current iteration...');
      await ralphManager.pause();
    };
    process.on('SIGINT', handleInterrupt);

    await ralphManager.refreshTaskCount();

    if (parallelWorkers && parallelWorkers > 1) {
      spinner.text = `Ralph parallel mode (${parallelWorkers} workers)...`;
      const batches = await ralphManager.getParallelBatches(parallelWorkers);

      spinner.stop();
      console.log(
        chalk.bold.cyan(
          `\n  Parallel mode: ${batches.length} batch(es), max ${parallelWorkers} workers\n`
        )
      );

      let iterationCount = 0;
      for (const batch of batches) {
        if (interrupted) break;

        console.log(
          chalk.bold(
            `  ── Batch: ${batch.map((s: any) => s.id).join(', ')} (${batch.length} stories) ──`
          )
        );

        const batchResults = await Promise.allSettled(
          batch.map(async (task: any) => {
            iterationCount++;
            const localIteration = iterationCount;
            const startTime = Date.now();

            let contextHistory = '';
            if (compressionEnabled) {
              contextHistory = await iterationTracker.buildCompressedContext(
                compressionRecentCount,
                compressionThreshold
              );
            }

            let plansContext = '';
            try {
              const { readPlans, plansExists } = await import('../../core/plans-manager.js');
              if (plansExists(cwd)) {
                const plans = await readPlans(cwd);
                if (plans?.context && plans.context.trim()) {
                  plansContext = plans.context.trim();
                }
              }
            } catch {
              // PLANS.md injection is optional
            }

            const prompt = ralphBuildPrompt(task, prd, contextHistory, plansContext);
            let agentOutput = '';
            try {
              agentOutput = await ralphExecuteAgent(tool, prompt, cwd, childProcess.spawn);
            } catch (agentError: any) {
              agentOutput = `Error executing agent: ${agentError.message || agentError}`;
            }

            const qualityResults = await ralphRunQualityGates(cwd, childProcess.spawn);
            const executionTime = Date.now() - startTime;

            const parsed = RalphParser.parseAgentOutput(
              agentOutput,
              localIteration,
              task.id,
              task.title,
              tool
            );

            const allGatesPass =
              qualityResults.type_check &&
              qualityResults.lint &&
              qualityResults.tests &&
              qualityResults.coverage_met;

            const passCount = Object.values(qualityResults).filter(Boolean).length;
            const status: 'success' | 'partial' | 'failed' = allGatesPass
              ? 'success'
              : passCount >= 2
                ? 'partial'
                : 'failed';

            let gitCommit: string | undefined;
            if (allGatesPass) {
              gitCommit = await ralphGitCommit(cwd, task, localIteration, childProcess.spawn);
              await ralphManager.markStoryComplete(task.id);
              console.log(chalk.green(`    [parallel] Story ${task.id} completed`));
            } else {
              console.log(
                chalk.yellow(`    [parallel] Story ${task.id} not completed (quality gates failed)`)
              );
            }

            const result = {
              iteration: localIteration,
              timestamp: new Date().toISOString(),
              task_id: task.id,
              task_title: task.title,
              status,
              ai_tool: tool,
              execution_time_ms: executionTime,
              quality_checks: qualityResults,
              output_summary: parsed.output_summary || `Iteration ${localIteration}: ${task.title}`,
              git_commit: gitCommit,
              learnings: parsed.learnings,
              errors: parsed.errors,
              metadata: {
                context_loss_count: parsed.metadata.context_loss_count,
                parsed_completion: parsed.metadata.parsed_completion,
              },
            };

            await ralphManager.recordIteration(result);
            return result;
          })
        );

        for (const [i, result] of batchResults.entries()) {
          if (result.status === 'rejected') {
            const story = batch[i];
            console.log(chalk.red(`    [parallel] Story ${story.id} threw: ${result.reason}`));
          }
        }

        const currentStatus = await ralphManager.getStatus();
        if (currentStatus?.paused) break;
      }

      process.removeListener('SIGINT', handleInterrupt);
      const stats = await ralphManager.getTaskStats();
      console.log(`\n  Parallel run complete: ${stats.completed}/${stats.total} tasks completed`);
      console.log(`  Iterations: ${iterationCount}`);
      if (interrupted) {
        console.log(
          chalk.yellow(`  Paused by user. Resume: ${chalk.bold('rulebook ralph resume')}`)
        );
      }
      console.log(`\n  View history: ${chalk.bold('rulebook ralph history')}\n`);
      return;
    }

    spinner.text = 'Ralph loop running (Ctrl+C to pause)...';

    let iterationCount = 0;
    while (ralphManager.canContinue() && !interrupted) {
      iterationCount++;
      const task = await ralphManager.getNextTask();

      if (!task) {
        break;
      }

      spinner.stop();
      console.log(chalk.bold.cyan(`\n  ── Iteration ${iterationCount}: ${task.title} ──\n`));

      const startTime = Date.now();

      if (planCheckpointConfig.enabled) {
        const checkpoint = await ralphManager.runCheckpoint(task, tool, planCheckpointConfig);
        if (!checkpoint.proceed) {
          console.log(chalk.yellow(`  Plan rejected for ${task.id}. Skipping implementation.`));
          if (checkpoint.feedback) {
            console.log(chalk.gray(`  Feedback: ${checkpoint.feedback}`));
          }
          spinner.start('Preparing next iteration...');
          continue;
        }
      }

      let contextHistory = '';
      if (compressionEnabled) {
        contextHistory = await iterationTracker.buildCompressedContext(
          compressionRecentCount,
          compressionThreshold
        );
      }

      let plansContext = '';
      try {
        const { readPlans, plansExists } = await import('../../core/plans-manager.js');
        if (plansExists(cwd)) {
          const plans = await readPlans(cwd);
          if (plans?.context && plans.context.trim()) {
            plansContext = plans.context.trim();
          }
        }
      } catch {
        // PLANS.md injection is optional — skip on error
      }

      const prompt = ralphBuildPrompt(task, prd, contextHistory, plansContext);
      let agentOutput = '';
      try {
        agentOutput = await ralphExecuteAgent(tool, prompt, cwd, childProcess.spawn);
      } catch (agentError: any) {
        agentOutput = `Error executing agent: ${agentError.message || agentError}`;
        console.log(chalk.red(`  Agent error: ${agentError.message || agentError}`));
      }

      spinner.start('Running quality gates...');
      const qualityResults = await ralphRunQualityGates(cwd, childProcess.spawn);
      spinner.stop();

      const gateIcon = (pass: boolean) => (pass ? chalk.green('✓') : chalk.red('✗'));
      console.log(`  ${gateIcon(qualityResults.type_check)} type-check`);
      console.log(`  ${gateIcon(qualityResults.lint)} lint`);
      console.log(`  ${gateIcon(qualityResults.tests)} tests`);
      console.log(`  ${gateIcon(qualityResults.coverage_met)} coverage`);

      const executionTime = Date.now() - startTime;

      const parsed = RalphParser.parseAgentOutput(
        agentOutput,
        iterationCount,
        task.id,
        task.title,
        tool
      );

      const allGatesPass =
        qualityResults.type_check &&
        qualityResults.lint &&
        qualityResults.tests &&
        qualityResults.coverage_met;

      const passCount = Object.values(qualityResults).filter(Boolean).length;
      const status: 'success' | 'partial' | 'failed' = allGatesPass
        ? 'success'
        : passCount >= 2
          ? 'partial'
          : 'failed';

      let gitCommit: string | undefined;
      if (allGatesPass) {
        gitCommit = await ralphGitCommit(cwd, task, iterationCount, childProcess.spawn);
        await ralphManager.markStoryComplete(task.id);
        console.log(chalk.green(`\n  ✅ Story ${task.id} completed`));
      } else {
        console.log(chalk.yellow(`\n  ⚠ Story ${task.id} not completed (quality gates failed)`));
      }

      const result = {
        iteration: iterationCount,
        timestamp: new Date().toISOString(),
        task_id: task.id,
        task_title: task.title,
        status,
        ai_tool: tool,
        execution_time_ms: executionTime,
        quality_checks: qualityResults,
        output_summary: parsed.output_summary || `Iteration ${iterationCount}: ${task.title}`,
        git_commit: gitCommit,
        learnings: parsed.learnings,
        errors: parsed.errors,
        metadata: {
          context_loss_count: parsed.metadata.context_loss_count,
          parsed_completion: parsed.metadata.parsed_completion,
        },
      };

      await ralphManager.recordIteration(result);
      spinner.start('Preparing next iteration...');
    }

    process.removeListener('SIGINT', handleInterrupt);

    const stats = await ralphManager.getTaskStats();
    spinner.succeed(`Ralph loop complete: ${stats.completed}/${stats.total} tasks completed`);
    console.log(`\n  ✅ Iterations: ${iterationCount}`);
    console.log(`  📊 Completed: ${stats.completed}/${stats.total}`);
    if (interrupted) {
      console.log(
        chalk.yellow(`  ⏸  Paused by user. Resume: ${chalk.bold('rulebook ralph resume')}`)
      );
    }
    console.log(`\n  View history: ${chalk.bold('rulebook ralph history')}\n`);
  } catch (error) {
    spinner.fail('Ralph loop failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphStatusCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Loading Ralph status...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { RalphManager } = await import('../../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    spinner.stop();

    const { createConfigManager } = await import('../../core/config-manager.js');
    const configManager = createConfigManager(cwd);
    const cfg = await configManager.loadConfig();
    const agentsMode = cfg.agentsMode ?? 'full';

    console.log(`\n  ${chalk.bold('Ralph Loop Status')}`);
    console.log(`  Iteration:    ${status.current_iteration}/${status.max_iterations}`);
    console.log(`  Tasks:        ${status.completed_tasks}/${status.total_tasks}`);
    console.log(
      `  Status:       ${status.paused ? chalk.yellow('PAUSED') : chalk.green('RUNNING')}`
    );
    console.log(`  AI Tool:      ${status.tool}`);
    console.log(`  Started:      ${new Date(status.started_at).toLocaleString()}`);
    console.log(
      `  Agents Mode:  ${agentsMode === 'lean' ? chalk.cyan('lean') : chalk.gray('full')} (rulebook mode set lean|full)`
    );
    console.log();
  } catch (error) {
    spinner.fail('Failed to load status');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphHistoryCommand(options: { limit?: number }): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Loading iteration history...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { IterationTracker } = await import('../../core/iteration-tracker.js');

    const logger = new Logger(cwd);
    const tracker = new IterationTracker(cwd, logger);
    const limit = options.limit || 10;
    const history = await tracker.getHistory(limit);

    if (history.length === 0) {
      spinner.fail('No iteration history found');
      return;
    }

    spinner.stop();
    console.log(`\n  ${chalk.bold('Recent Iterations')} (${history.length})\n`);

    for (const iter of history) {
      const statusIcon =
        iter.status === 'success'
          ? chalk.green('✓')
          : iter.status === 'partial'
            ? chalk.yellow('◐')
            : chalk.red('✗');
      console.log(`  ${statusIcon} Iteration ${iter.iteration}: ${iter.task_title}`);
      console.log(`     Status: ${iter.status} | Duration: ${(iter.duration_ms || 0) / 1000}s`);
      console.log(
        `     Checks: type=${iter.quality_checks.type_check ? '✓' : '✗'} lint=${iter.quality_checks.lint ? '✓' : '✗'} tests=${iter.quality_checks.tests ? '✓' : '✗'}`
      );
      if (iter.git_commit) {
        console.log(`     Commit: ${iter.git_commit}`);
      }
      console.log();
    }

    const stats = await tracker.getStatistics();
    console.log(`  ${chalk.bold('Statistics')}`);
    console.log(
      `  Total: ${stats.total_iterations} | Success: ${stats.successful_iterations} | Failed: ${stats.failed_iterations}`
    );
    console.log(`  Success rate: ${(stats.success_rate * 100).toFixed(1)}%`);
    console.log(`  Avg duration: ${stats.average_duration_ms}ms\n`);
  } catch (error) {
    spinner.fail('Failed to load history');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphPauseCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Pausing Ralph loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { RalphManager } = await import('../../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    await ralphManager.pause();

    spinner.succeed('Ralph loop paused');
    console.log(`\n  Resume with: ${chalk.bold('rulebook ralph resume')}\n`);
  } catch (error) {
    spinner.fail('Failed to pause');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphResumeCommand(): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;
  const spinner = ora('Resuming Ralph loop...').start();

  try {
    const cwd = process.cwd();
    const { Logger } = await import('../../core/logger.js');
    const { RalphManager } = await import('../../core/ralph-manager.js');

    const logger = new Logger(cwd);
    const ralphManager = new RalphManager(cwd, logger);
    const status = await ralphManager.getStatus();

    if (!status) {
      spinner.fail('Ralph not initialized');
      console.log(`\n  Run: ${chalk.bold('rulebook ralph init')}\n`);
      return;
    }

    await ralphManager.resume();

    spinner.succeed('Ralph loop resumed');
    console.log(`\n  Continue loop: ${chalk.bold('rulebook ralph run')}\n`);
  } catch (error) {
    spinner.fail('Failed to resume');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function ralphImportIssuesCommand(options: {
  label?: string;
  milestone?: string;
  limit?: number;
  dryRun?: boolean;
}): Promise<void> {
  const oraModule = await import('ora');
  const ora = oraModule.default;

  try {
    const {
      checkGhCliAvailable,
      fetchGithubIssues,
      convertIssueToStory,
      mergeStoriesIntoExistingPrd,
    } = await import('../../core/github-issues-importer.js');

    const ghAvailable = await checkGhCliAvailable();
    if (!ghAvailable) {
      console.error(
        chalk.red('GitHub CLI (gh) is not installed. Install it from: https://cli.github.com')
      );
      return;
    }

    const spinner = ora('Fetching GitHub issues...').start();

    const issues = await fetchGithubIssues({
      label: options.label,
      milestone: options.milestone,
      limit: options.limit ?? 20,
    });

    if (issues.length === 0) {
      spinner.info('No open issues found matching the given filters.');
      return;
    }

    spinner.text = `Converting ${issues.length} issues to Ralph stories...`;

    const cwd = process.cwd();
    let existingPrd = null;
    try {
      const { RalphManager } = await import('../../core/ralph-manager.js');
      const { Logger } = await import('../../core/logger.js');
      const logger = new Logger(cwd);
      const manager = new RalphManager(cwd, logger);
      existingPrd = await manager.loadPRD();
    } catch {
      // PRD not initialized — will create a new one
    }

    const newStories = issues.map((issue) => convertIssueToStory(issue));

    const { prd: mergedPrd, result } = mergeStoriesIntoExistingPrd(existingPrd, newStories);

    if (options.dryRun) {
      spinner.stop();
      console.log(
        chalk.yellow(
          `Dry run — would import ${result.imported} stories, update ${result.updated}, skip ${result.skipped}`
        )
      );
      console.log('');
      for (const story of mergedPrd.userStories) {
        const marker = story.passes ? chalk.green('[PASS]') : chalk.gray('[    ]');
        console.log(`  ${marker} ${story.id}: ${story.title}`);
      }
      return;
    }

    const prdPath = path.join(cwd, '.rulebook', 'ralph', 'prd.json');
    await ensureDir(path.join(cwd, '.rulebook', 'ralph'));
    await writeFile(prdPath, JSON.stringify(mergedPrd, null, 2));

    spinner.succeed(
      `Imported ${result.imported} new stories, updated ${result.updated} existing, ${result.skipped} skipped`
    );
    console.log(`\n  PRD saved to: ${prdPath}`);
    console.log(`  Total stories: ${mergedPrd.userStories.length}\n`);
  } catch (error) {
    console.error(chalk.red(`Failed to import GitHub issues: ${String(error)}`));
    process.exit(1);
  }
}
