import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  shouldRunCheckpoint,
  displayPlan,
  buildPlanPrompt,
  generateIterationPlan,
} from '../src/core/ralph-plan-checkpoint.js';
import type { ExecAsyncFn } from '../src/core/ralph-plan-checkpoint.js';
import type { PRDUserStory, PlanCheckpointConfig } from '../src/types.js';

/**
 * Factory helper -- creates a PRDUserStory with sensible defaults.
 */
function makeStory(overrides: Partial<PRDUserStory> & { id: string }): PRDUserStory {
  return {
    title: `Story ${overrides.id}`,
    description: 'Implement feature X',
    acceptanceCriteria: ['Must compile', 'Tests pass'],
    priority: 1,
    passes: false,
    notes: '',
    ...overrides,
  };
}

/**
 * Factory helper -- creates a PlanCheckpointConfig with sensible defaults.
 */
function makeConfig(overrides?: Partial<PlanCheckpointConfig>): PlanCheckpointConfig {
  return {
    enabled: true,
    autoApproveAfterSeconds: 0,
    requireApprovalForStories: 'all',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// shouldRunCheckpoint
// ─────────────────────────────────────────────────────────
describe('shouldRunCheckpoint', () => {
  const story = makeStory({ id: 'US-001' });
  const passingStory = makeStory({ id: 'US-002', passes: true });

  it('should return false when config.enabled is false', () => {
    const config = makeConfig({ enabled: false });
    expect(shouldRunCheckpoint(config, story, false)).toBe(false);
  });

  it('should return false when isNonInteractive is true', () => {
    const config = makeConfig({ enabled: true });
    expect(shouldRunCheckpoint(config, story, true)).toBe(false);
  });

  it('should return false when requireApprovalForStories is none', () => {
    const config = makeConfig({ requireApprovalForStories: 'none' });
    expect(shouldRunCheckpoint(config, story, false)).toBe(false);
  });

  it('should return true when requireApprovalForStories is all and enabled', () => {
    const config = makeConfig({ requireApprovalForStories: 'all' });
    expect(shouldRunCheckpoint(config, story, false)).toBe(true);
  });

  it('should return true when requireApprovalForStories is failed and story.passes is false', () => {
    const config = makeConfig({ requireApprovalForStories: 'failed' });
    expect(shouldRunCheckpoint(config, story, false)).toBe(true);
  });

  it('should return false when requireApprovalForStories is failed and story.passes is true', () => {
    const config = makeConfig({ requireApprovalForStories: 'failed' });
    expect(shouldRunCheckpoint(config, passingStory, false)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// displayPlan
// ─────────────────────────────────────────────────────────
describe('displayPlan', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should not throw when called with a plan string', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => displayPlan('Some plan content', 'Test Story')).not.toThrow();
    spy.mockRestore();
  });

  it('should output the story title', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    displayPlan('Plan details here', 'My Important Story');

    const allOutput = spy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(allOutput).toContain('My Important Story');
    spy.mockRestore();
  });

  it('should output the plan content', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    displayPlan('Step 1: create file\nStep 2: write tests', 'Story Title');

    const allOutput = spy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(allOutput).toContain('Step 1: create file');
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// buildPlanPrompt
// ─────────────────────────────────────────────────────────
describe('buildPlanPrompt', () => {
  it('should include the story title in the prompt', () => {
    const story = makeStory({ id: 'US-010', title: 'Add auth module' });
    const prompt = buildPlanPrompt(story);
    expect(prompt).toContain('Add auth module');
  });

  it('should include acceptance criteria in the prompt', () => {
    const story = makeStory({
      id: 'US-011',
      acceptanceCriteria: ['Must handle OAuth', 'Token refresh works'],
    });
    const prompt = buildPlanPrompt(story);
    expect(prompt).toContain('Must handle OAuth');
    expect(prompt).toContain('Token refresh works');
  });

  it('should include the planning-only instruction', () => {
    const story = makeStory({ id: 'US-012' });
    const prompt = buildPlanPrompt(story);
    expect(prompt).toContain('Output ONLY the plan');
    expect(prompt).toContain('Do NOT implement or generate code');
  });
});

// ─────────────────────────────────────────────────────────
// generateIterationPlan (injected execFn)
// ─────────────────────────────────────────────────────────
describe('generateIterationPlan', () => {
  it('should return non-empty string when the AI tool succeeds', async () => {
    const mockExec: ExecAsyncFn = vi.fn().mockResolvedValue({
      stdout: '1. Create file\n2. Write tests',
    });

    const story = makeStory({ id: 'US-020', title: 'Test Story' });
    const plan = await generateIterationPlan(story, 'claude', '/tmp/test', mockExec);

    expect(plan).toBe('1. Create file\n2. Write tests');
    expect(mockExec).toHaveBeenCalledOnce();
  });

  it('should return empty string when the AI tool fails', async () => {
    const mockExec: ExecAsyncFn = vi.fn().mockRejectedValue(
      new Error('command not found: claude'),
    );

    const story = makeStory({ id: 'US-021', title: 'Failing Story' });
    const plan = await generateIterationPlan(story, 'claude', '/tmp/nonexistent', mockExec);

    expect(plan).toBe('');
    expect(mockExec).toHaveBeenCalledOnce();
  });

  it('should trim whitespace from the AI tool output', async () => {
    const mockExec: ExecAsyncFn = vi.fn().mockResolvedValue({
      stdout: '  Plan with whitespace  \n\n',
    });

    const story = makeStory({ id: 'US-022', title: 'Whitespace Story' });
    const plan = await generateIterationPlan(story, 'claude', '/tmp/test', mockExec);

    expect(plan).toBe('Plan with whitespace');
  });
});
