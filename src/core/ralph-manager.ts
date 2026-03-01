import { mkdir, readdir, writeFile, appendFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import {
  RalphLoopState,
  RalphIterationMetadata,
  IterationResult,
  PRDUserStory,
  PlanCheckpointConfig,
} from '../types.js';

/** Minimal interface for memory integration — avoids hard dependency on MemoryManager */
export interface RalphMemoryAdapter {
  saveMemory(input: {
    type: string;
    title: string;
    content: string;
    tags: string[];
  }): Promise<unknown>;
}

export interface RalphLockInfo {
  pid: number;
  startedAt: string;
  tool: string;
  currentTask?: string;
  iteration?: number;
}

export class RalphManager {
  private projectRoot: string;
  private ralphDir: string;
  private historyDir: string;
  private lockPath: string;
  private loopState: RalphLoopState | null = null;
  private logger: Logger;
  private memoryAdapter: RalphMemoryAdapter | null = null;

  constructor(projectRoot: string, logger: Logger) {
    this.logger = logger;
    this.projectRoot = projectRoot;
    this.ralphDir = path.join(projectRoot, '.rulebook', 'ralph');
    this.historyDir = path.join(this.ralphDir, 'history');
    this.lockPath = path.join(this.ralphDir, 'ralph.lock');
  }

  /**
   * Attach a memory adapter for auto-saving iteration learnings.
   * Call before running the loop. Safe to skip — all memory ops are fire-and-forget.
   */
  setMemoryAdapter(adapter: RalphMemoryAdapter): void {
    this.memoryAdapter = adapter;
  }

  // ─── Lock Management ───

  /**
   * Acquire an exclusive lock for Ralph execution.
   * Returns true if lock was acquired, false if another process holds it.
   */
  async acquireLock(tool: string): Promise<boolean> {
    await mkdir(this.ralphDir, { recursive: true });

    // Check if lock already exists
    const existing = await this.getLockInfo();
    if (existing) {
      // Check if the PID is still alive
      if (this.isPidAlive(existing.pid)) {
        this.logger.warn(`Ralph lock held by PID ${existing.pid} (started ${existing.startedAt})`);
        return false;
      }
      // Stale lock — PID is dead, clean it up
      this.logger.info(`Cleaning stale Ralph lock (PID ${existing.pid} is dead)`);
      await this.releaseLock();
    }

    const lockInfo: RalphLockInfo = {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      tool,
    };

    await writeFile(this.lockPath, JSON.stringify(lockInfo, null, 2));
    this.logger.info(`Ralph lock acquired (PID ${process.pid})`);
    return true;
  }

  /**
   * Release the Ralph execution lock.
   */
  async releaseLock(): Promise<void> {
    try {
      if (existsSync(this.lockPath)) {
        await unlink(this.lockPath);
        this.logger.info('Ralph lock released');
      }
    } catch (err) {
      this.logger.warn(`Failed to release Ralph lock: ${err}`);
    }
  }

  /**
   * Update lock with current progress info.
   */
  async updateLockProgress(iteration: number, currentTask?: string): Promise<void> {
    const existing = await this.getLockInfo();
    if (!existing) return;

    existing.iteration = iteration;
    existing.currentTask = currentTask;

    try {
      await writeFile(this.lockPath, JSON.stringify(existing, null, 2));
    } catch {
      // Non-critical — best effort
    }
  }

  /**
   * Read current lock info. Returns null if no lock exists.
   */
  async getLockInfo(): Promise<RalphLockInfo | null> {
    if (!existsSync(this.lockPath)) {
      return null;
    }
    try {
      const content = await this.readFileAsync(this.lockPath);
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Check if a Ralph loop is currently running (lock held by alive process).
   */
  async isRunning(): Promise<boolean> {
    const lock = await this.getLockInfo();
    if (!lock) return false;
    return this.isPidAlive(lock.pid);
  }

  /**
   * Check if a PID is alive.
   */
  private isPidAlive(pid: number): boolean {
    try {
      process.kill(pid, 0); // Signal 0 = check existence only
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize Ralph loop state and directory structure
   */
  async initialize(maxIterations: number, tool: 'claude' | 'amp' | 'gemini'): Promise<void> {
    this.logger.info('Initializing Ralph autonomous loop...');

    // Create .rulebook/ralph directory structure
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
    if (prd && prd.userStories) {
      this.loopState.total_tasks = prd.userStories.length;
    }

    // Save initial state
    await this.saveLoopState();
    this.logger.info(`Ralph initialized: max iterations=${maxIterations}, tool=${tool}`);
  }

  /**
   * Load PRD from .rulebook/ralph/prd.json
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
  async getNextTask(): Promise<any | null> {
    const prd = await this.loadPRD();
    if (!prd || !prd.userStories) {
      return null;
    }

    // Find first unfinished story (passes: false)
    const nextTask = prd.userStories.find((story: any) => !story.passes);
    return nextTask || null;
  }

  /**
   * Mark a user story as complete and sync tasks.md checkboxes
   */
  async markStoryComplete(storyId: string): Promise<void> {
    const prd = await this.loadPRD();
    if (!prd || !prd.userStories) {
      return;
    }

    const story = prd.userStories.find((s: any) => s.id === storyId);
    if (story) {
      story.passes = true;
      await writeFile(path.join(this.ralphDir, 'prd.json'), JSON.stringify(prd, null, 2));

      // Sync tasks.md checkboxes for acceptance criteria
      if (story.sourceTaskId) {
        await this.syncTasksCheckboxes(story.sourceTaskId, story.acceptanceCriteria);
      }
    }
  }

  /**
   * Mark matching checkboxes in tasks.md as completed
   */
  private async syncTasksCheckboxes(
    sourceTaskId: string,
    acceptanceCriteria: string[]
  ): Promise<void> {
    // Look in .rulebook/tasks/<sourceTaskId>/tasks.md
    const tasksPath = path.join(this.projectRoot, '.rulebook', 'tasks', sourceTaskId, 'tasks.md');

    if (!existsSync(tasksPath)) {
      return;
    }

    try {
      let content = await readFile(tasksPath, 'utf-8');

      // For each acceptance criterion, find matching checkbox and mark it
      for (const criterion of acceptanceCriteria) {
        // Extract the task number prefix (e.g., "1.1", "2.3") from criterion
        const numMatch = criterion.match(/^(\d+\.\d+)\s/);
        if (numMatch) {
          // Match checkbox line containing the same number prefix
          const escapedNum = numMatch[1].replace('.', '\\.');
          const regex = new RegExp(`^(- \\[) (\\] ${escapedNum}\\s)`, 'm');
          content = content.replace(regex, '$1x$2');
        } else {
          // Fuzzy match: find checkbox whose text starts similarly (first 40 chars)
          const needle = criterion.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`^(- \\[) (\\] .*${needle})`, 'm');
          content = content.replace(regex, '$1x$2');
        }
      }

      await writeFile(tasksPath, content);
      this.logger.info(`Synced tasks.md checkboxes for ${sourceTaskId}`);
    } catch (err) {
      this.logger.warn(`Failed to sync tasks.md for ${sourceTaskId}: ${err}`);
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

    // Sync completed_tasks from PRD truth (not just increment) for consistency
    const prd = await this.loadPRD();
    if (prd && prd.userStories) {
      this.loopState.completed_tasks = prd.userStories.filter((s: any) => s.passes).length;
      this.loopState.total_tasks = prd.userStories.length;
    } else if (result.status === 'success') {
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

    const iterationFile = path.join(this.historyDir, `iteration-${result.iteration}.json`);
    await writeFile(iterationFile, JSON.stringify(metadata, null, 2));

    // Append to progress.txt
    await this.appendProgress(result);

    // Save updated loop state
    await this.saveLoopState();

    // Auto-save to memory system (fire-and-forget — never blocks or fails the iteration)
    this.saveIterationToMemory(result).catch(() => {
      // Memory failures are non-blocking
    });

    this.logger.info(
      `Recorded iteration ${result.iteration}: ${result.task_id} - ${result.status}`
    );
  }

  /**
   * Save iteration data to the memory system for cross-session learning.
   * Runs fire-and-forget — failures are silently ignored.
   */
  private async saveIterationToMemory(result: IterationResult): Promise<void> {
    if (!this.memoryAdapter) return;

    const tags = ['ralph', 'autonomous-loop', result.task_id, result.ai_tool];

    // Save learnings
    if (result.learnings && result.learnings.length > 0) {
      await this.memoryAdapter.saveMemory({
        type: 'learning',
        title: `Ralph: ${result.task_id} iteration ${result.iteration}`,
        content: result.learnings.join('\n'),
        tags,
      });
    }

    // Save quality gate failures as bugs
    const failedGates = Object.entries(result.quality_checks)
      .filter(([, passed]) => !passed)
      .map(([gate]) => gate);

    if (failedGates.length > 0) {
      const errorContent = [
        `Failed gates: ${failedGates.join(', ')}`,
        ...(result.errors ?? []),
      ].join('\n');

      await this.memoryAdapter.saveMemory({
        type: 'bug',
        title: `Ralph: ${result.task_id} gate failures (iteration ${result.iteration})`,
        content: errorContent,
        tags: [...tags, 'quality-gate-failure'],
      });
    }

    // Save story completion summary
    if (result.status === 'success') {
      await this.memoryAdapter.saveMemory({
        type: 'observation',
        title: `Ralph: ${result.task_title} completed`,
        content: result.output_summary || `Story ${result.task_id} passed all quality gates.`,
        tags: [...tags, 'story-complete'],
      });
    }
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
      result.errors && result.errors.length > 0 ? `Errors: ${result.errors.join('; ')}` : '',
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    await appendFile(progressPath, line + '\n\n');
  }

  /**
   * Refresh total_tasks from PRD (call after PRD is saved)
   */
  async refreshTaskCount(): Promise<void> {
    if (!this.loopState) {
      return;
    }
    const prd = await this.loadPRD();
    if (prd && prd.userStories) {
      this.loopState.total_tasks = prd.userStories.length;
      this.loopState.completed_tasks = prd.userStories.filter((s: any) => s.passes).length;
      await this.saveLoopState();
    }
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
   * Save loop state to .rulebook/ralph/state.json
   */
  private async saveLoopState(): Promise<void> {
    if (!this.loopState) {
      return;
    }
    const statePath = path.join(this.ralphDir, 'state.json');
    await writeFile(statePath, JSON.stringify(this.loopState, null, 2));
  }

  /**
   * Load loop state from .rulebook/ralph/state.json
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
    if (!prd || !prd.userStories) {
      return { completed: 0, pending: 0, total: 0 };
    }

    const completed = prd.userStories.filter((story: any) => story.passes).length;
    const pending = prd.userStories.filter((story: any) => !story.passes).length;

    return {
      completed,
      pending,
      total: prd.userStories.length,
    };
  }

  /**
   * Build parallel execution batches for pending stories.
   *
   * Uses dependency analysis and file-conflict detection to produce
   * batches where each batch can be executed concurrently.
   *
   * @param maxWorkers - Maximum number of concurrent stories per batch
   * @returns Array of batches (each batch is an array of stories)
   */
  async getParallelBatches(maxWorkers: number): Promise<PRDUserStory[][]> {
    const prd = await this.loadPRD();
    if (!prd || !prd.userStories) {
      return [];
    }

    const pendingStories: PRDUserStory[] = prd.userStories.filter((s: PRDUserStory) => !s.passes);

    if (pendingStories.length === 0) {
      return [];
    }

    const { buildParallelBatches } = await import('./ralph-parallel.js');
    return buildParallelBatches(pendingStories, maxWorkers);
  }

  /**
   * Run a plan checkpoint for the given story.
   *
   * Generates an implementation plan via the AI CLI tool and requests
   * interactive approval from the user. Returns whether to proceed with
   * implementation and any feedback from the reviewer.
   *
   * @param story - The user story to plan for
   * @param tool - AI CLI tool to use for plan generation
   * @param checkpointConfig - Plan checkpoint configuration
   * @returns Object with `proceed` (boolean) and optional `feedback` string
   */
  async runCheckpoint(
    story: PRDUserStory,
    tool: 'claude' | 'amp' | 'gemini',
    checkpointConfig: PlanCheckpointConfig
  ): Promise<{ proceed: boolean; feedback?: string }> {
    const { shouldRunCheckpoint, generateIterationPlan, requestPlanApproval } = await import(
      './ralph-plan-checkpoint.js'
    );

    if (!shouldRunCheckpoint(checkpointConfig, story, false)) {
      return { proceed: true };
    }

    this.logger.info(`Running plan checkpoint for story ${story.id}: ${story.title}`);

    const plan = await generateIterationPlan(story, tool, this.projectRoot);

    if (!plan) {
      this.logger.warn('Plan generation returned empty output — skipping checkpoint');
      return { proceed: true };
    }

    const approval = await requestPlanApproval(
      plan,
      story,
      checkpointConfig.autoApproveAfterSeconds
    );

    if (approval.approved) {
      this.logger.info(`Plan approved for story ${story.id}`);
      return { proceed: true };
    }

    this.logger.info(`Plan rejected for story ${story.id}: ${approval.feedback ?? '(no reason)'}`);
    return { proceed: false, feedback: approval.feedback };
  }

  /**
   * Helper to read file
   */
  private async readFileAsync(filepath: string): Promise<string> {
    const fs_module = await import('fs/promises');
    return fs_module.readFile(filepath, 'utf-8');
  }
}
