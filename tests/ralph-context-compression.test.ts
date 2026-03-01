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
  tmpDir = await mkdtemp(join(tmpdir(), 'ctx-compress-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function setupTracker(numIterations: number, status?: IterationResult['status']) {
  const logger = createLogger(tmpDir);
  const tracker = new IterationTracker(tmpDir, logger);
  await tracker.initialize();

  for (let i = 1; i <= numIterations; i++) {
    await tracker.recordIteration(makeResult(i, status));
  }

  return tracker;
}

describe('IterationTracker.buildCompressedContext', () => {
  it('returns "No iteration history" when no iterations recorded', async () => {
    const logger = createLogger(tmpDir);
    const tracker = new IterationTracker(tmpDir, logger);
    const ctx = await tracker.buildCompressedContext();
    expect(ctx).toContain('No iteration history');
  });

  it('returns full history below compression threshold (< 5)', async () => {
    const tracker = await setupTracker(3);
    const ctx = await tracker.buildCompressedContext(3, 5);
    // Should NOT have compression header
    expect(ctx).not.toContain('History Summary');
    // Should have iteration details
    expect(ctx).toContain('Iteration 1');
    expect(ctx).toContain('Iteration 3');
  });

  it('compresses old iterations when above threshold', async () => {
    const tracker = await setupTracker(6);
    const ctx = await tracker.buildCompressedContext(3, 5);
    // Should have summary section for old iterations
    expect(ctx).toContain('History Summary');
    // Should have recent section
    expect(ctx).toContain('Recent Iterations');
  });

  it('compressed section contains one line per old iteration', async () => {
    const tracker = await setupTracker(6);
    const ctx = await tracker.buildCompressedContext(3, 5);
    // Iterations 1-3 should be in summary (one line each)
    expect(ctx).toContain('Iter 1:');
    expect(ctx).toContain('Iter 2:');
    expect(ctx).toContain('Iter 3:');
  });

  it('recent section shows full details for last N iterations', async () => {
    const tracker = await setupTracker(6);
    const ctx = await tracker.buildCompressedContext(3, 5);
    // Iterations 4-6 should appear in recent with full details
    expect(ctx).toContain('Iteration 4');
    expect(ctx).toContain('Iteration 5');
    expect(ctx).toContain('Iteration 6');
  });

  it('includes quality gate statuses in compressed lines', async () => {
    const tracker = await setupTracker(6, 'failed');
    const ctx = await tracker.buildCompressedContext(3, 5);
    // Should show failed quality checks
    expect(ctx).toContain('✗ts');
  });

  it('includes quality gate pass indicators for successful iterations', async () => {
    const tracker = await setupTracker(6, 'success');
    const ctx = await tracker.buildCompressedContext(3, 5);
    expect(ctx).toContain('✓ts');
    expect(ctx).toContain('✓lint');
  });

  it('works with custom recentCount parameter', async () => {
    const tracker = await setupTracker(8);
    const ctx = await tracker.buildCompressedContext(2, 5);
    // Only last 2 should be in recent section — iteration 7 and 8
    expect(ctx).toContain('Iteration 7');
    expect(ctx).toContain('Iteration 8');
  });

  it('exactly at threshold triggers compression', async () => {
    const tracker = await setupTracker(5);
    const ctx = await tracker.buildCompressedContext(3, 5);
    // 5 iterations, threshold is 5: compression applies (sorted.length >= threshold)
    expect(ctx).toContain('History Summary');
  });

  it('memory adapter enriches context with relevant learnings', async () => {
    const tracker = await setupTracker(6);

    const mockAdapter = {
      searchMemory: async () => [
        { title: 'Fix lint errors', content: 'Always run lint before commit', tags: ['lint'] },
        { title: 'Test coverage tip', content: 'Mock external dependencies for coverage', tags: [] },
      ],
    };
    tracker.setMemoryAdapter(mockAdapter);

    const ctx = await tracker.buildCompressedContext(3, 5);
    expect(ctx).toContain('Relevant Past Learnings');
    expect(ctx).toContain('Fix lint errors');
    expect(ctx).toContain('Test coverage tip');
  });

  it('missing memory adapter does not break compression', async () => {
    const tracker = await setupTracker(6);
    // No adapter set — should work fine without memory enrichment
    const ctx = await tracker.buildCompressedContext(3, 5);
    expect(ctx).not.toContain('Relevant Past Learnings');
    expect(ctx).toContain('History Summary');
  });
});
