import { mkdir, readdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import { RalphIterationMetadata, IterationResult } from '../types.js';

/**
 * Tracks iteration history, metrics, and learnings across autonomous runs
 */
export class IterationTracker {
  private ralphDir: string;
  private historyDir: string;
  private logger: Logger;

  constructor(projectRoot: string, logger: Logger) {
    this.logger = logger;
    this.ralphDir = path.join(projectRoot, '.rulebook', 'ralph');
    this.historyDir = path.join(this.ralphDir, 'history');
  }

  /**
   * Initialize tracker directories
   */
  async initialize(): Promise<void> {
    await mkdir(this.ralphDir, { recursive: true });
    await mkdir(this.historyDir, { recursive: true });
  }

  /**
   * Record a single iteration result
   */
  async recordIteration(result: IterationResult): Promise<string> {
    await this.initialize();

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

    const filename = `iteration-${result.iteration}.json`;
    const filepath = path.join(this.historyDir, filename);

    await writeFile(filepath, JSON.stringify(metadata, null, 2));
    this.logger.info(`Recorded iteration #${result.iteration}`);

    return filepath;
  }

  /**
   * Get iteration history with optional filtering
   */
  async getHistory(
    limit?: number,
    taskId?: string
  ): Promise<RalphIterationMetadata[]> {
    if (!existsSync(this.historyDir)) {
      return [];
    }

    const files = await readdir(this.historyDir);
    const iterations: RalphIterationMetadata[] = [];

    // Sort by iteration number descending
    const sorted = files
      .filter((f) => f.startsWith('iteration-') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numB - numA;
      });

    for (const file of sorted) {
      try {
        const content = await readFile(path.join(this.historyDir, file), 'utf-8');
        const metadata: RalphIterationMetadata = JSON.parse(content);

        if (taskId && metadata.task_id !== taskId) {
          continue;
        }

        iterations.push(metadata);

        if (limit && iterations.length >= limit) {
          break;
        }
      } catch (err) {
        this.logger.warn(`Failed to read ${file}: ${err}`);
      }
    }

    return iterations;
  }

  /**
   * Get single iteration details
   */
  async getIteration(iterationNum: number): Promise<RalphIterationMetadata | null> {
    const filepath = path.join(this.historyDir, `iteration-${iterationNum}.json`);

    if (!existsSync(filepath)) {
      return null;
    }

    try {
      const content = await readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      this.logger.error(`Failed to read iteration ${iterationNum}: ${err}`);
      return null;
    }
  }

  /**
   * Calculate statistics from iteration history
   */
  async getStatistics(): Promise<{
    total_iterations: number;
    successful_iterations: number;
    failed_iterations: number;
    average_duration_ms: number;
    success_rate: number;
    quality_breakdown: {
      type_check: number;
      lint: number;
      tests: number;
      coverage: number;
    };
  }> {
    const iterations = await this.getHistory();

    if (iterations.length === 0) {
      return {
        total_iterations: 0,
        successful_iterations: 0,
        failed_iterations: 0,
        average_duration_ms: 0,
        success_rate: 0,
        quality_breakdown: { type_check: 0, lint: 0, tests: 0, coverage: 0 },
      };
    }

    const successful = iterations.filter((i) => i.status === 'success').length;
    const failed = iterations.filter((i) => i.status === 'failed').length;
    const totalDuration = iterations.reduce((sum, i) => sum + (i.duration_ms || 0), 0);
    const avgDuration = Math.round(totalDuration / iterations.length);

    const qualityBreakdown = {
      type_check: iterations.filter((i) => i.quality_checks.type_check).length,
      lint: iterations.filter((i) => i.quality_checks.lint).length,
      tests: iterations.filter((i) => i.quality_checks.tests).length,
      coverage: iterations.filter((i) => i.quality_checks.coverage_met).length,
    };

    return {
      total_iterations: iterations.length,
      successful_iterations: successful,
      failed_iterations: failed,
      average_duration_ms: avgDuration,
      success_rate: successful / iterations.length,
      quality_breakdown: qualityBreakdown,
    };
  }

  /**
   * Get learnings and insights from history
   */
  async getLearnings(): Promise<string[]> {
    const iterations = await this.getHistory();
    const learnings: string[] = [];

    for (const iter of iterations) {
      // Analyze quality trends
      const allPass =
        iter.quality_checks.type_check &&
        iter.quality_checks.lint &&
        iter.quality_checks.tests &&
        iter.quality_checks.coverage_met;

      if (allPass && iter.status === 'success') {
        learnings.push(
          `✅ Iteration ${iter.iteration}: Full quality gate pass for "${iter.task_title}"`
        );
      } else if (iter.status === 'failed') {
        const failures = [];
        if (!iter.quality_checks.type_check) failures.push('type-check');
        if (!iter.quality_checks.lint) failures.push('lint');
        if (!iter.quality_checks.tests) failures.push('tests');
        if (!iter.quality_checks.coverage_met) failures.push('coverage');

        if (failures.length > 0) {
          learnings.push(
            `❌ Iteration ${iter.iteration}: Failed quality checks: ${failures.join(', ')}`
          );
        }
      }
    }

    // Add statistical insights
    const stats = await this.getStatistics();
    if (stats.total_iterations > 0) {
      learnings.push(
        `📊 Success rate: ${(stats.success_rate * 100).toFixed(1)}% (${stats.successful_iterations}/${stats.total_iterations})`
      );
      learnings.push(
        `⏱️ Average iteration time: ${stats.average_duration_ms}ms`
      );
    }

    return learnings;
  }

  /**
   * Get insights about task-specific patterns
   */
  async getTaskInsights(taskId: string): Promise<{
    total_iterations: number;
    status_distribution: Record<string, number>;
    average_duration_ms: number;
    quality_trend: number[]; // percentage of quality checks passed per iteration
  }> {
    const iterations = await this.getHistory(undefined, taskId);

    if (iterations.length === 0) {
      return {
        total_iterations: 0,
        status_distribution: {},
        average_duration_ms: 0,
        quality_trend: [],
      };
    }

    // Status distribution
    const statusDist: Record<string, number> = {};
    for (const iter of iterations) {
      statusDist[iter.status] = (statusDist[iter.status] || 0) + 1;
    }

    // Average duration
    const avgDuration = Math.round(
      iterations.reduce((sum, i) => sum + (i.duration_ms || 0), 0) / iterations.length
    );

    // Quality trend
    const qualityTrend = iterations
      .sort((a, b) => a.iteration - b.iteration)
      .map((i) => {
        const checks = [
          i.quality_checks.type_check ? 1 : 0,
          i.quality_checks.lint ? 1 : 0,
          i.quality_checks.tests ? 1 : 0,
          i.quality_checks.coverage_met ? 1 : 0,
        ];
        return (checks.reduce((a, b) => a + b, 0) / 4) * 100;
      });

    return {
      total_iterations: iterations.length,
      status_distribution: statusDist,
      average_duration_ms: avgDuration,
      quality_trend: qualityTrend,
    };
  }
}
