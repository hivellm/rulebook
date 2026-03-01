import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RalphManager, RalphMemoryAdapter } from '../src/core/ralph-manager.js';
import { Logger } from '../src/core/logger.js';
import { existsSync, rmSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import type { IterationResult } from '../src/types.js';

describe('Ralph Memory Auto-Integration', () => {
  let tempDir: string;
  let logger: Logger;
  let manager: RalphManager;

  const makeResult = (overrides: Partial<IterationResult> = {}): IterationResult => ({
    iteration: 1,
    timestamp: new Date().toISOString(),
    task_id: 'US-001',
    task_title: 'Test Story',
    status: 'success',
    ai_tool: 'claude',
    execution_time_ms: 1000,
    quality_checks: { type_check: true, lint: true, tests: true, coverage_met: true },
    output_summary: 'All done',
    learnings: ['Always validate before saving'],
    errors: [],
    metadata: { context_loss_count: 0, parsed_completion: true },
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = join(process.cwd(), `.test-ralph-mem-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    manager = new RalphManager(tempDir, logger);
    await manager.initialize(5, 'claude');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('saves learnings to memory after successful iteration', async () => {
    const saveMemory = vi.fn().mockResolvedValue({});
    const adapter: RalphMemoryAdapter = { saveMemory };

    manager.setMemoryAdapter(adapter);

    const result = makeResult({ learnings: ['Use async/await', 'Test edge cases'] });
    await manager.recordIteration(result);

    // Give fire-and-forget a tick to run
    await new Promise((r) => setTimeout(r, 50));

    const learningCall = saveMemory.mock.calls.find(
      ([input]) => input.type === 'learning'
    );
    expect(learningCall).toBeDefined();
    expect(learningCall![0].content).toContain('Use async/await');
    expect(learningCall![0].tags).toContain('ralph');
    expect(learningCall![0].tags).toContain('US-001');
  });

  it('saves gate failures as bug memories', async () => {
    const saveMemory = vi.fn().mockResolvedValue({});
    manager.setMemoryAdapter({ saveMemory });

    const result = makeResult({
      status: 'failed',
      quality_checks: { type_check: false, lint: false, tests: true, coverage_met: true },
      errors: ['error TS2345: type mismatch'],
      learnings: [],
    });
    await manager.recordIteration(result);
    await new Promise((r) => setTimeout(r, 50));

    const bugCall = saveMemory.mock.calls.find(([input]) => input.type === 'bug');
    expect(bugCall).toBeDefined();
    expect(bugCall![0].content).toContain('type_check');
    expect(bugCall![0].content).toContain('lint');
    expect(bugCall![0].tags).toContain('quality-gate-failure');
  });

  it('saves story completion observation on success', async () => {
    const saveMemory = vi.fn().mockResolvedValue({});
    manager.setMemoryAdapter({ saveMemory });

    await manager.recordIteration(makeResult({ status: 'success' }));
    await new Promise((r) => setTimeout(r, 50));

    const obsCall = saveMemory.mock.calls.find(([input]) => input.type === 'observation');
    expect(obsCall).toBeDefined();
    expect(obsCall![0].tags).toContain('story-complete');
  });

  it('works without memory adapter (no error thrown)', async () => {
    // No adapter attached — should not throw
    await expect(manager.recordIteration(makeResult())).resolves.not.toThrow();
  });

  it('does not fail iteration if memory save throws', async () => {
    const saveMemory = vi.fn().mockRejectedValue(new Error('DB error'));
    manager.setMemoryAdapter({ saveMemory });

    // recordIteration should resolve normally even if memory save throws
    await expect(manager.recordIteration(makeResult())).resolves.not.toThrow();
  });
});
