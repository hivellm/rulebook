import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { IterationTracker } from '../src/core/iteration-tracker.js';
import type { IterationResult } from '../src/types.js';
import { createLogger } from '../src/core/logger.js';

let tmpDir: string;

function makeResult(n: number, status: IterationResult['status'] = 'success'): IterationResult {
  return {
    iteration: n,
    timestamp: new Date().toISOString(),
    task_id: `US-00${n}`,
    task_title: `Story ${n}`,
    status,
    ai_tool: 'claude',
    execution_time_ms: 1000,
    quality_checks: {
      type_check: status === 'success',
      lint: status === 'success',
      tests: status === 'success',
      coverage_met: status === 'success',
    },
    output_summary: `Summary for iteration ${n}`,
    metadata: { context_loss_count: 0 },
  };
}

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'iter-insights-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function setupTracker(results: IterationResult[]): Promise<IterationTracker> {
  const logger = createLogger(tmpDir);
  const tracker = new IterationTracker(tmpDir, logger);
  await tracker.initialize();

  for (const result of results) {
    await tracker.recordIteration(result);
  }

  return tracker;
}

describe('IterationTracker.getLearnings', () => {
  it('should return empty array when no iterations exist', async () => {
    const logger = createLogger(tmpDir);
    const tracker = new IterationTracker(tmpDir, logger);
    const learnings = await tracker.getLearnings();
    expect(learnings).toEqual([]);
  });

  it('should return success learnings for passing iterations', async () => {
    const tracker = await setupTracker([makeResult(1, 'success'), makeResult(2, 'success')]);

    const learnings = await tracker.getLearnings();

    const successLearnings = learnings.filter((l) => l.startsWith('✅'));
    expect(successLearnings).toHaveLength(2);
    expect(successLearnings[0]).toContain('Full quality gate pass');
    expect(successLearnings[0]).toContain('Story');
  });

  it('should return failure learnings with specific failed checks', async () => {
    const partialResult: IterationResult = {
      iteration: 1,
      timestamp: new Date().toISOString(),
      task_id: 'US-001',
      task_title: 'Broken Story',
      status: 'failed',
      ai_tool: 'claude',
      execution_time_ms: 2000,
      quality_checks: {
        type_check: true,
        lint: false,
        tests: false,
        coverage_met: true,
      },
      output_summary: 'Some failures occurred',
      metadata: { context_loss_count: 0 },
    };

    const tracker = await setupTracker([partialResult]);

    const learnings = await tracker.getLearnings();

    const failureLearnings = learnings.filter((l) => l.startsWith('❌'));
    expect(failureLearnings).toHaveLength(1);
    expect(failureLearnings[0]).toContain('lint');
    expect(failureLearnings[0]).toContain('tests');
    expect(failureLearnings[0]).not.toContain('type-check');
    expect(failureLearnings[0]).not.toContain('coverage');
  });

  it('should return statistics insights when iterations exist', async () => {
    const tracker = await setupTracker([makeResult(1, 'success'), makeResult(2, 'failed')]);

    const learnings = await tracker.getLearnings();

    const statsLearning = learnings.find((l) => l.includes('Success rate'));
    expect(statsLearning).toBeDefined();
    expect(statsLearning).toContain('50.0%');
    expect(statsLearning).toContain('1/2');

    const timeLearning = learnings.find((l) => l.includes('Average iteration time'));
    expect(timeLearning).toBeDefined();
    expect(timeLearning).toContain('1000ms');
  });

  it('should not produce failure learning for failed iteration with all quality checks passing', async () => {
    // Edge case: status is 'failed' but all quality checks pass
    const oddResult: IterationResult = {
      iteration: 1,
      timestamp: new Date().toISOString(),
      task_id: 'US-001',
      task_title: 'Odd Story',
      status: 'failed',
      ai_tool: 'claude',
      execution_time_ms: 1000,
      quality_checks: {
        type_check: true,
        lint: true,
        tests: true,
        coverage_met: true,
      },
      output_summary: 'Failed for other reason',
      metadata: { context_loss_count: 0 },
    };

    const tracker = await setupTracker([oddResult]);
    const learnings = await tracker.getLearnings();

    // No success line because allPass is true but status is failed
    // No failure line because failures array is empty
    const successLearnings = learnings.filter((l) => l.startsWith('✅'));
    const failureLearnings = learnings.filter((l) => l.startsWith('❌'));
    expect(successLearnings).toHaveLength(0);
    expect(failureLearnings).toHaveLength(0);
  });

  it('should not generate success learning for partial status', async () => {
    const partialResult: IterationResult = {
      iteration: 1,
      timestamp: new Date().toISOString(),
      task_id: 'US-001',
      task_title: 'Partial Story',
      status: 'partial',
      ai_tool: 'claude',
      execution_time_ms: 1000,
      quality_checks: {
        type_check: true,
        lint: true,
        tests: true,
        coverage_met: true,
      },
      output_summary: 'Partial completion',
      metadata: { context_loss_count: 0 },
    };

    const tracker = await setupTracker([partialResult]);
    const learnings = await tracker.getLearnings();

    // partial status with all checks passing should NOT produce success learning
    const successLearnings = learnings.filter((l) => l.startsWith('✅'));
    expect(successLearnings).toHaveLength(0);
  });
});

describe('IterationTracker.getTaskInsights', () => {
  it('should return empty result for unknown task ID', async () => {
    const tracker = await setupTracker([makeResult(1, 'success')]);

    const insights = await tracker.getTaskInsights('UNKNOWN-999');

    expect(insights.total_iterations).toBe(0);
    expect(insights.status_distribution).toEqual({});
    expect(insights.average_duration_ms).toBe(0);
    expect(insights.quality_trend).toEqual([]);
  });

  it('should return correct status_distribution for mixed success and failed', async () => {
    const results: IterationResult[] = [
      { ...makeResult(1, 'success'), task_id: 'US-001' },
      { ...makeResult(2, 'failed'), task_id: 'US-001' },
      { ...makeResult(3, 'success'), task_id: 'US-001' },
      { ...makeResult(4, 'failed'), task_id: 'US-001' },
      { ...makeResult(5, 'failed'), task_id: 'US-001' },
    ];

    const tracker = await setupTracker(results);
    const insights = await tracker.getTaskInsights('US-001');

    expect(insights.total_iterations).toBe(5);
    expect(insights.status_distribution).toEqual({
      success: 2,
      failed: 3,
    });
  });

  it('should return correct average_duration_ms', async () => {
    const results: IterationResult[] = [
      { ...makeResult(1, 'success'), task_id: 'US-010', execution_time_ms: 2000 },
      { ...makeResult(2, 'success'), task_id: 'US-010', execution_time_ms: 4000 },
    ];

    const tracker = await setupTracker(results);
    const insights = await tracker.getTaskInsights('US-010');

    // average_duration_ms comes from the recorded metadata, which uses execution_time_ms
    // recordIteration sets duration_ms = execution_time_ms in the metadata
    expect(insights.average_duration_ms).toBe(3000);
  });

  it('should return correct quality_trend percentages', async () => {
    // Build iterations with varying quality check counts:
    // 0/4 passed = 0%, 1/4 = 25%, 2/4 = 50%, 3/4 = 75%, 4/4 = 100%
    const makeCustomQuality = (
      n: number,
      qc: IterationResult['quality_checks']
    ): IterationResult => ({
      iteration: n,
      timestamp: new Date().toISOString(),
      task_id: 'US-020',
      task_title: `Story ${n}`,
      status: 'failed',
      ai_tool: 'claude',
      execution_time_ms: 1000,
      quality_checks: qc,
      output_summary: `Summary ${n}`,
      metadata: { context_loss_count: 0 },
    });

    const results: IterationResult[] = [
      makeCustomQuality(1, {
        type_check: false,
        lint: false,
        tests: false,
        coverage_met: false,
      }), // 0%
      makeCustomQuality(2, {
        type_check: true,
        lint: false,
        tests: false,
        coverage_met: false,
      }), // 25%
      makeCustomQuality(3, {
        type_check: true,
        lint: true,
        tests: false,
        coverage_met: false,
      }), // 50%
      makeCustomQuality(4, {
        type_check: true,
        lint: true,
        tests: true,
        coverage_met: false,
      }), // 75%
      makeCustomQuality(5, {
        type_check: true,
        lint: true,
        tests: true,
        coverage_met: true,
      }), // 100%
    ];

    const tracker = await setupTracker(results);
    const insights = await tracker.getTaskInsights('US-020');

    expect(insights.quality_trend).toEqual([0, 25, 50, 75, 100]);
  });

  it('should only include iterations for the requested task ID', async () => {
    const results: IterationResult[] = [
      { ...makeResult(1, 'success'), task_id: 'US-001' },
      { ...makeResult(2, 'success'), task_id: 'US-002' },
      { ...makeResult(3, 'failed'), task_id: 'US-001' },
    ];

    const tracker = await setupTracker(results);

    const insights1 = await tracker.getTaskInsights('US-001');
    expect(insights1.total_iterations).toBe(2);

    const insights2 = await tracker.getTaskInsights('US-002');
    expect(insights2.total_iterations).toBe(1);
  });
});
