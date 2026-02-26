import { mkdir, readdir, writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import {
  RalphLoopState,
  RalphIterationMetadata,
  IterationResult,
  PRDTask,
} from '../types.js';

export class RalphManager {
  private ralphDir: string;
  private historyDir: string;
  private loopState: RalphLoopState | null = null;
  private logger: Logger;

  constructor(projectRoot: string, logger: Logger) {
    this.logger = logger;
    this.ralphDir = path.join(projectRoot, '.rulebook-ralph');
    this.historyDir = path.join(this.ralphDir, 'history');
  }

  /**
   * Initialize Ralph loop state and directory structure
   */
  async initialize(maxIterations: number, tool: 'claude' | 'amp' | 'gemini'): Promise<void> {
    this.logger.info('Initializing Ralph autonomous loop...');

    // Create .rulebook-ralph directory structure
    await mkdir(this.ralphDir, { recursive: true });
    await mkdir(this.historyDir, { recursive: true });

    // Initialize loop state
    this.loopState = {
      enabled: true,
      current_iteration: 0,
      max_iterations: maxIterations,
      total_iterations: 0,
      completed_tasks: 0,
      total_tasks: 0,
      paused: false,
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      tool,
    };

    // Load PRD and update task count
    const prd = await this.loadPRD();
    if (prd) {
      this.loopState.total_tasks = prd.total_tasks;
    }

    // Save initial state
    await this.saveLoopState();
    this.logger.info(`Ralph initialized: max iterations=${maxIterations}, tool=${tool}`);
  }

  /**
   * Load PRD from .rulebook-ralph/prd.json
   */
  async loadPRD(): Promise<any | null> {
    const prdPath = path.join(this.ralphDir, 'prd.json');
    if (!existsSync(prdPath)) {
      return null;
    }
    try {
      const content = await this.readFileAsync(prdPath);
      return JSON.parse(content);
    } catch (err) {
      this.logger.error(`Failed to load PRD: ${err}`);
      return null;
    }
  }

  /**
   * Get the next task to execute
   * Returns a pending task or null if all tasks are completed
   */
  async getNextTask(): Promise<PRDTask | null> {
    const prd = await this.loadPRD();
    if (!prd || !prd.tasks) {
      return null;
    }

    // Find first pending task
    const nextTask = prd.tasks.find((t: PRDTask) => t.status === 'pending');
    return nextTask || null;
  }

  /**
   * Update task status in PRD
   */
  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_iteration' | 'completed' | 'blocked'
  ): Promise<void> {
    const prd = await this.loadPRD();
    if (!prd || !prd.tasks) {
      return;
    }

    const task = prd.tasks.find((t: PRDTask) => t.id === taskId);
    if (task) {
      task.status = status;
      task.updated_at = new Date().toISOString();
      if (status === 'completed') {
        task.completed_at = new Date().toISOString();
      }
      await writeFile(path.join(this.ralphDir, 'prd.json'), JSON.stringify(prd, null, 2));
    }
  }

  /**
   * Record iteration result to history
   */
  async recordIteration(result: IterationResult): Promise<void> {
    if (!this.loopState) {
      return;
    }

    this.loopState.current_iteration = result.iteration;
    this.loopState.last_updated = new Date().toISOString();

    if (result.status === 'success') {
      this.loopState.completed_tasks++;
    }

    // Create iteration metadata file
    const metadata: RalphIterationMetadata = {
      iteration: result.iteration,
      started_at: result.timestamp,
      completed_at: new Date().toISOString(),
      task_id: result.task_id,
      task_title: result.task_title,
      duration_ms: result.execution_time_ms,
      status: result.status,
      git_commit: result.git_commit,
      quality_checks: result.quality_checks,
    };

    const iterationFile = path.join(
      this.historyDir,
      `iteration-${result.iteration}.json`
    );
    await writeFile(iterationFile, JSON.stringify(metadata, null, 2));

    // Append to progress.txt
    await this.appendProgress(result);

    // Save updated loop state
    await this.saveLoopState();

    this.logger.info(
      `Recorded iteration ${result.iteration}: ${result.task_id} - ${result.status}`
    );
  }

  /**
   * Append iteration result to progress.txt log
   */
  private async appendProgress(result: IterationResult): Promise<void> {
    const progressPath = path.join(this.ralphDir, 'progress.txt');

    const line = [
      `[Iteration ${result.iteration}] ${new Date(result.timestamp).toISOString()}`,
      `Task: ${result.task_id} (${result.task_title})`,
      `Status: ${result.status}`,
      `Tool: ${result.ai_tool}`,
      `Duration: ${result.execution_time_ms}ms`,
      `Quality: type=${result.quality_checks.type_check ? 'pass' : 'fail'}, ` +
        `lint=${result.quality_checks.lint ? 'pass' : 'fail'}, ` +
        `tests=${result.quality_checks.tests ? 'pass' : 'fail'}, ` +
        `coverage=${result.quality_checks.coverage_met ? 'pass' : 'fail'}`,
      result.git_commit ? `Commit: ${result.git_commit}` : '',
      result.output_summary ? `Summary: ${result.output_summary}` : '',
      result.learnings && result.learnings.length > 0
        ? `Learnings: ${result.learnings.join('; ')}`
        : '',
      result.errors && result.errors.length > 0
        ? `Errors: ${result.errors.join('; ')}`
        : '',
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    await appendFile(progressPath, line + '\n\n');
  }

  /**
   * Check if loop should continue
   */
  canContinue(): boolean {
    if (!this.loopState) {
      return false;
    }

    if (this.loopState.paused) {
      return false;
    }

    if (this.loopState.current_iteration >= this.loopState.max_iterations) {
      return false;
    }

    return this.loopState.completed_tasks < this.loopState.total_tasks;
  }

  /**
   * Pause the loop
   */
  async pause(): Promise<void> {
    if (!this.loopState) {
      return;
    }
    this.loopState.paused = true;
    this.loopState.paused_at = new Date().toISOString();
    this.loopState.last_updated = new Date().toISOString();
    await this.saveLoopState();
    this.logger.info('Ralph loop paused');
  }

  /**
   * Resume the loop
   */
  async resume(): Promise<void> {
    if (!this.loopState) {
      return;
    }
    this.loopState.paused = false;
    this.loopState.paused_at = undefined;
    this.loopState.last_updated = new Date().toISOString();
    await this.saveLoopState();
    this.logger.info('Ralph loop resumed');
  }

  /**
   * Get current loop status
   */
  async getStatus(): Promise<RalphLoopState | null> {
    if (!this.loopState) {
      this.loopState = await this.loadLoopState();
    }
    return this.loopState;
  }

  /**
   * Get iteration history
   */
  async getIterationHistory(limit?: number): Promise<RalphIterationMetadata[]> {
    if (!existsSync(this.historyDir)) {
      return [];
    }

    const files = await readdir(this.historyDir);
    const iterations: RalphIterationMetadata[] = [];

    for (const file of files.sort().reverse()) {
      if (!file.startsWith('iteration-') || !file.endsWith('.json')) {
        continue;
      }
      try {
        const content = await this.readFileAsync(path.join(this.historyDir, file));
        iterations.push(JSON.parse(content));
        if (limit && iterations.length >= limit) {
          break;
        }
      } catch (err) {
        this.logger.warn(`Failed to read iteration file ${file}: ${err}`);
      }
    }

    return iterations;
  }

  /**
   * Save loop state to .rulebook-ralph/state.json
   */
  private async saveLoopState(): Promise<void> {
    if (!this.loopState) {
      return;
    }
    const statePath = path.join(this.ralphDir, 'state.json');
    await writeFile(statePath, JSON.stringify(this.loopState, null, 2));
  }

  /**
   * Load loop state from .rulebook-ralph/state.json
   */
  private async loadLoopState(): Promise<RalphLoopState | null> {
    const statePath = path.join(this.ralphDir, 'state.json');
    if (!existsSync(statePath)) {
      return null;
    }
    try {
      const content = await this.readFileAsync(statePath);
      return JSON.parse(content);
    } catch (err) {
      this.logger.error(`Failed to load loop state: ${err}`);
      return null;
    }
  }

  /**
   * Get total completed and pending tasks
   */
  async getTaskStats(): Promise<{ completed: number; pending: number; total: number }> {
    const prd = await this.loadPRD();
    if (!prd || !prd.tasks) {
      return { completed: 0, pending: 0, total: 0 };
    }

    const completed = prd.tasks.filter((t: PRDTask) => t.status === 'completed').length;
    const pending = prd.tasks.filter((t: PRDTask) => t.status === 'pending').length;

    return {
      completed,
      pending,
      total: prd.tasks.length,
    };
  }

  /**
   * Helper to read file
   */
  private async readFileAsync(filepath: string): Promise<string> {
    const fs_module = await import('fs/promises');
    return fs_module.readFile(filepath, 'utf-8');
  }
}
