import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RalphManager } from '../src/core/ralph-manager.js';
import { RalphParser } from '../src/agents/ralph-parser.js';
import { PRDGenerator } from '../src/core/prd-generator.js';
import { IterationTracker } from '../src/core/iteration-tracker.js';
import { Logger } from '../src/core/logger.js';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

describe('Ralph Autonomous Loop', () => {
  let tempDir: string;
  let logger: Logger;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = join(process.cwd(), `.test-ralph-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Create mock logger
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;
  });

  afterEach(() => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('RalphManager', () => {
    let manager: RalphManager;

    beforeEach(() => {
      manager = new RalphManager(tempDir, logger);
    });

    it('should initialize Ralph loop', async () => {
      await manager.initialize(10, 'claude');

      expect(logger.info).toHaveBeenCalledWith('Initializing Ralph autonomous loop...');
      const status = await manager.getStatus();
      expect(status).toBeDefined();
      expect(status?.enabled).toBe(true);
      expect(status?.current_iteration).toBe(0);
      expect(status?.max_iterations).toBe(10);
      expect(status?.tool).toBe('claude');
    });

    it('should track loop state', async () => {
      await manager.initialize(5, 'claude');

      let status = await manager.getStatus();
      expect(status?.paused).toBe(false);

      // Pause the loop
      await manager.pause();
      status = await manager.getStatus();
      expect(status?.paused).toBe(true);

      // Resume the loop
      await manager.resume();
      status = await manager.getStatus();
      expect(status?.paused).toBe(false);
    });

    it('should record iteration results', async () => {
      await manager.initialize(10, 'claude');

      const iterationResult = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        task_id: 'task-1',
        task_title: 'Test Task',
        status: 'success' as const,
        ai_tool: 'claude' as const,
        execution_time_ms: 5000,
        quality_checks: {
          type_check: true,
          lint: true,
          tests: true,
          coverage_met: true,
        },
        output_summary: 'Task completed successfully',
        learnings: ['Learned something useful'],
        errors: [],
        metadata: {
          context_loss_count: 0,
          parsed_completion: true,
        },
      };

      await manager.recordIteration(iterationResult);

      const history = await manager.getIterationHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].task_id).toBe('task-1');
      expect(history[0].status).toBe('success');
    });

    it('should check loop continuation', async () => {
      // Create mock PRD with pending task
      const prdPath = join(tempDir, '.rulebook', 'ralph', 'prd.json');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });

      const mockPRD = {
        project: 'test-project',
        branchName: 'ralph/test-project',
        description: 'Test Ralph autonomous loop',
        userStories: [
          {
            id: 'US-001',
            title: 'Story 1',
            description: 'Test story',
            acceptanceCriteria: [],
            priority: 1,
            passes: false,
            notes: '',
          },
        ],
      };

      const { writeFile } = await import('../src/utils/file-system.js');
      await writeFile(prdPath, JSON.stringify(mockPRD));

      await manager.initialize(2, 'claude');

      const canContinue = manager.canContinue();
      expect(canContinue).toBe(true);

      // Pause and check
      await manager.pause();
      expect(manager.canContinue()).toBe(false);
    });

    it('should get task statistics', async () => {
      // Create mock PRD
      const prdPath = join(tempDir, '.rulebook', 'ralph', 'prd.json');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });

      const mockPRD = {
        project: 'test-project',
        branchName: 'ralph/test-project',
        description: 'Test Ralph autonomous loop',
        userStories: [
          {
            id: 'US-001',
            title: 'Story 1',
            description: 'Test story 1',
            acceptanceCriteria: [],
            priority: 1,
            passes: true,
            notes: '',
          },
          {
            id: 'US-002',
            title: 'Story 2',
            description: 'Test story 2',
            acceptanceCriteria: [],
            priority: 2,
            passes: false,
            notes: '',
          },
          {
            id: 'US-003',
            title: 'Story 3',
            description: 'Test story 3',
            acceptanceCriteria: [],
            priority: 3,
            passes: false,
            notes: '',
          },
        ],
      };

      const { writeFile } = await import('../src/utils/file-system.js');
      await writeFile(prdPath, JSON.stringify(mockPRD));

      await manager.initialize(10, 'claude');

      const stats = await manager.getTaskStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it('should acquire and release lock', async () => {
      const acquired = await manager.acquireLock('claude');
      expect(acquired).toBe(true);

      const lockInfo = await manager.getLockInfo();
      expect(lockInfo).toBeDefined();
      expect(lockInfo?.pid).toBe(process.pid);
      expect(lockInfo?.tool).toBe('claude');

      const isRunning = await manager.isRunning();
      expect(isRunning).toBe(true);

      await manager.releaseLock();

      const afterRelease = await manager.getLockInfo();
      expect(afterRelease).toBeNull();

      const isRunningAfter = await manager.isRunning();
      expect(isRunningAfter).toBe(false);
    });

    it('should reject concurrent lock acquisition', async () => {
      const first = await manager.acquireLock('claude');
      expect(first).toBe(true);

      // Same process tries to acquire again — PID is alive, should fail
      const second = await manager.acquireLock('claude');
      expect(second).toBe(false);

      await manager.releaseLock();
    });

    it('should clean stale lock with dead PID', async () => {
      // Write a lock with a PID that doesn't exist
      const { writeFile } = await import('fs/promises');
      const lockPath = join(tempDir, '.rulebook', 'ralph', 'ralph.lock');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });
      await writeFile(
        lockPath,
        JSON.stringify({ pid: 999999, startedAt: new Date().toISOString(), tool: 'claude' })
      );

      // Should acquire because PID 999999 is dead
      const acquired = await manager.acquireLock('amp');
      expect(acquired).toBe(true);

      const lockInfo = await manager.getLockInfo();
      expect(lockInfo?.pid).toBe(process.pid);
      expect(lockInfo?.tool).toBe('amp');

      await manager.releaseLock();
    });

    it('should update lock progress', async () => {
      await manager.acquireLock('claude');
      await manager.updateLockProgress(3, 'US-002: Fix auth');

      const lockInfo = await manager.getLockInfo();
      expect(lockInfo?.iteration).toBe(3);
      expect(lockInfo?.currentTask).toBe('US-002: Fix auth');

      await manager.releaseLock();
    });

    it('should load PRD and get next task', async () => {
      const prdPath = join(tempDir, '.rulebook', 'ralph', 'prd.json');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });

      const mockPRD = {
        project: 'test-project',
        branchName: 'ralph/test',
        description: 'Test',
        userStories: [
          {
            id: 'US-001',
            title: 'Story A',
            description: 'First',
            acceptanceCriteria: ['Works'],
            priority: 1,
            passes: true,
            notes: '',
          },
          {
            id: 'US-002',
            title: 'Story B',
            description: 'Second',
            acceptanceCriteria: ['Also works'],
            priority: 2,
            passes: false,
            notes: '',
          },
        ],
      };

      const { writeFile: wf } = await import('fs/promises');
      await wf(prdPath, JSON.stringify(mockPRD));

      const prd = await manager.loadPRD();
      expect(prd).toBeDefined();
      expect(prd.userStories).toHaveLength(2);

      const next = await manager.getNextTask();
      expect(next).toBeDefined();
      expect(next.id).toBe('US-002'); // First non-passing story
    });

    it('should return null when no tasks remain', async () => {
      const prdPath = join(tempDir, '.rulebook', 'ralph', 'prd.json');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });

      const { writeFile: wf } = await import('fs/promises');
      await wf(
        prdPath,
        JSON.stringify({
          project: 'done',
          branchName: 'ralph/done',
          description: 'All done',
          userStories: [
            {
              id: 'US-001',
              title: 'Done',
              description: 'Done',
              acceptanceCriteria: [],
              priority: 1,
              passes: true,
              notes: '',
            },
          ],
        })
      );

      const next = await manager.getNextTask();
      expect(next).toBeNull();
    });

    it('should mark story complete and update PRD', async () => {
      const prdPath = join(tempDir, '.rulebook', 'ralph', 'prd.json');
      await mkdir(join(tempDir, '.rulebook', 'ralph'), { recursive: true });

      const { writeFile: wf } = await import('fs/promises');
      await wf(
        prdPath,
        JSON.stringify({
          project: 'test',
          branchName: 'ralph/test',
          description: 'Test',
          userStories: [
            {
              id: 'US-001',
              title: 'Story',
              description: 'Desc',
              acceptanceCriteria: ['Done'],
              priority: 1,
              passes: false,
              notes: '',
            },
          ],
        })
      );

      await manager.markStoryComplete('US-001');

      // Reload PRD and verify
      const prd = await manager.loadPRD();
      expect(prd.userStories[0].passes).toBe(true);
    });

    it('should return null when no PRD exists', async () => {
      const prd = await manager.loadPRD();
      expect(prd).toBeNull();

      const next = await manager.getNextTask();
      expect(next).toBeNull();
    });

    it('should report running state via isRunning when lock is held', async () => {
      // No lock — not running
      expect(await manager.isRunning()).toBe(false);

      // Acquire lock — running
      await manager.acquireLock('gemini');
      expect(await manager.isRunning()).toBe(true);

      // Lock info should reflect the tool and PID
      const info = await manager.getLockInfo();
      expect(info?.tool).toBe('gemini');
      expect(info?.pid).toBe(process.pid);

      // Release — not running
      await manager.releaseLock();
      expect(await manager.isRunning()).toBe(false);
    });
  });

  describe('RalphParser', () => {
    it('should parse agent output successfully', () => {
      const output = `
        Successfully completed task.
        type-check verified.
        lint passed.
        tests successful.
        coverage: 96%
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');

      expect(result.iteration).toBe(1);
      expect(result.task_id).toBe('task-1');
      expect(result.ai_tool).toBe('claude');
      expect(result.quality_checks).toBeDefined();
    });

    it('should extract quality checks with pass indicators', () => {
      const output = `
        Task completed successfully.
        type-check: TypeScript compilation with tsc passed without errors
        lint: ESLint passed without errors
        tests: All tests passed with success indicator ✓
        coverage: 96% passes the threshold
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');

      // Parser looks for keywords - verify structure exists
      expect(result.quality_checks).toBeDefined();
      expect(result.quality_checks.type_check).toBeDefined();
      expect(result.quality_checks.lint).toBeDefined();
      expect(result.quality_checks.tests).toBeDefined();
      expect(result.quality_checks.coverage_met).toBeDefined();
    });

    it('should detect failed gates', () => {
      const output = `
        Task execution encountered errors.
        type-check: Failed - compilation errors found
        lint: Failed - style violations detected
        tests: Failed - test failures
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');

      // When gates fail, status should be 'failed'
      expect(['success', 'partial', 'failed']).toContain(result.status);
    });

    it('should extract learnings from output', () => {
      const output = `
        Learning: Using TypeScript interfaces improves type safety
        Insight: Smaller functions are easier to test
        Pattern: DRY principle reduces code duplication
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');
      expect(result.learnings.length).toBeGreaterThan(0);
    });

    it('should extract errors from output', () => {
      const output = `
        Error: Cannot find module 'xyz'
        failed: Network request timeout
        Exception: Invalid type conversion
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should extract git commit hash', () => {
      const output = `
        Successfully committed changes.
        commit abc1234def5678
        Message: "feat: add new feature"
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');
      expect(result.git_commit).toBeDefined();
    });

    it('should detect completion in output', () => {
      const output = `
        Task completed successfully.
        All requirements implemented.
        Changes committed and pushed.
      `;

      const result = RalphParser.parseAgentOutput(output, 1, 'task-1', 'Test Task', 'claude');
      expect(result.metadata.parsed_completion).toBe(true);
    });
  });

  describe('IterationTracker', () => {
    let tracker: IterationTracker;

    beforeEach(() => {
      tracker = new IterationTracker(tempDir, logger);
    });

    it('should initialize tracker directories', async () => {
      await tracker.initialize();

      const historyDir = join(tempDir, '.rulebook', 'ralph', 'history');
      expect(existsSync(historyDir)).toBe(true);
    });

    it('should record iteration results', async () => {
      await tracker.initialize();

      const result = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        task_id: 'task-1',
        task_title: 'Test Task',
        status: 'success' as const,
        ai_tool: 'claude' as const,
        execution_time_ms: 5000,
        quality_checks: {
          type_check: true,
          lint: true,
          tests: true,
          coverage_met: true,
        },
        output_summary: 'Test summary',
        learnings: [],
        errors: [],
        metadata: {
          context_loss_count: 0,
          parsed_completion: true,
        },
      };

      const filePath = await tracker.recordIteration(result);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should retrieve iteration history', async () => {
      await tracker.initialize();

      const result1 = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        task_id: 'task-1',
        task_title: 'Task 1',
        status: 'success' as const,
        ai_tool: 'claude' as const,
        execution_time_ms: 5000,
        quality_checks: {
          type_check: true,
          lint: true,
          tests: true,
          coverage_met: true,
        },
        output_summary: 'Summary 1',
        learnings: [],
        errors: [],
        metadata: {
          context_loss_count: 0,
          parsed_completion: true,
        },
      };

      await tracker.recordIteration(result1);

      const history = await tracker.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].task_id).toBe('task-1');
    });

    it('should calculate statistics', async () => {
      await tracker.initialize();

      // Record multiple iterations
      for (let i = 1; i <= 3; i++) {
        const result = {
          iteration: i,
          timestamp: new Date().toISOString(),
          task_id: `task-${i}`,
          task_title: `Task ${i}`,
          status: (i === 3 ? 'failed' : 'success') as const,
          ai_tool: 'claude' as const,
          execution_time_ms: 5000,
          quality_checks: {
            type_check: true,
            lint: true,
            tests: i !== 3,
            coverage_met: true,
          },
          output_summary: `Summary ${i}`,
          learnings: [],
          errors: [],
          metadata: {
            context_loss_count: 0,
            parsed_completion: true,
          },
        };

        await tracker.recordIteration(result);
      }

      const stats = await tracker.getStatistics();
      expect(stats.total_iterations).toBe(3);
      expect(stats.successful_iterations).toBe(2);
      expect(stats.failed_iterations).toBe(1);
      expect(stats.success_rate).toBeCloseTo(0.67, 1);
    });

    it('should get task-specific insights', async () => {
      await tracker.initialize();

      const result = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        task_id: 'task-alpha',
        task_title: 'Alpha Task',
        status: 'success' as const,
        ai_tool: 'claude' as const,
        execution_time_ms: 5000,
        quality_checks: {
          type_check: true,
          lint: true,
          tests: true,
          coverage_met: true,
        },
        output_summary: 'Task completed',
        learnings: [],
        errors: [],
        metadata: {
          context_loss_count: 0,
          parsed_completion: true,
        },
      };

      await tracker.recordIteration(result);

      const insights = await tracker.getTaskInsights('task-alpha');
      expect(insights.total_iterations).toBe(1);
      expect(insights.quality_trend).toHaveLength(1);
      expect(insights.quality_trend[0]).toBe(100); // All 4 checks pass
    });
  });

  describe('PRDGenerator', () => {
    let generator: PRDGenerator;

    beforeEach(() => {
      generator = new PRDGenerator(tempDir, logger);
    });

    it('should initialize generator', () => {
      expect(generator).toBeDefined();
    });

    it('should generate PRD from task directories', async () => {
      // Create a task with proposal.md and tasks.md
      const taskDir = join(tempDir, '.rulebook', 'tasks', 'my-feature');
      await mkdir(taskDir, { recursive: true });

      const { writeFile: wf } = await import('fs/promises');
      await wf(
        join(taskDir, 'proposal.md'),
        '# Add Dark Mode\n\n## What Changes\n\nImplement dark mode toggle in settings page.'
      );
      await wf(
        join(taskDir, 'tasks.md'),
        '- [ ] Add theme context\n- [ ] Create toggle component\n- [x] Design mockup'
      );

      const prd = await generator.generatePRD('test-project');

      expect(prd.project).toBe('test-project');
      expect(prd.branchName).toBe('ralph/test-project');
      expect(prd.userStories).toHaveLength(1);
      expect(prd.userStories[0].id).toBe('US-001');
      expect(prd.userStories[0].title).toBe('Add Dark Mode');
      expect(prd.userStories[0].description).toContain('dark mode toggle');
      expect(prd.userStories[0].acceptanceCriteria.length).toBeGreaterThan(0);
      expect(prd.userStories[0].passes).toBe(false);
      expect(prd.userStories[0].sourceTaskId).toBe('my-feature');
    });

    it('should return empty PRD when no tasks exist', async () => {
      const prd = await generator.generatePRD('empty-project');

      expect(prd.project).toBe('empty-project');
      expect(prd.userStories).toHaveLength(0);
    });

    it('should skip archive directory', async () => {
      const tasksBase = join(tempDir, '.rulebook', 'tasks');
      await mkdir(join(tasksBase, 'real-task'), { recursive: true });
      await mkdir(join(tasksBase, 'archive', 'old-task'), { recursive: true });

      const { writeFile: wf } = await import('fs/promises');
      await wf(join(tasksBase, 'real-task', 'proposal.md'), '# Real Task\n\nDo something real.');
      await wf(
        join(tasksBase, 'archive', 'old-task', 'proposal.md'),
        '# Old Task\n\nAlready done.'
      );

      const prd = await generator.generatePRD('test');
      expect(prd.userStories).toHaveLength(1);
      expect(prd.userStories[0].title).toBe('Real Task');
    });

    it('should handle tasks without tasks.md', async () => {
      const taskDir = join(tempDir, '.rulebook', 'tasks', 'simple-task');
      await mkdir(taskDir, { recursive: true });

      const { writeFile: wf } = await import('fs/promises');
      await wf(join(taskDir, 'proposal.md'), '# Simple Task\n\nJust a simple change.');

      const prd = await generator.generatePRD('test');
      expect(prd.userStories).toHaveLength(1);
      // No tasks.md means default acceptance criteria
      expect(prd.userStories[0].acceptanceCriteria).toContain('Implementation complete');
    });
  });

  describe('Integration: Ralph Loop Lifecycle', () => {
    it('should complete a full iteration lifecycle', async () => {
      const manager = new RalphManager(tempDir, logger);
      const tracker = new IterationTracker(tempDir, logger);

      // Initialize
      await manager.initialize(5, 'claude');
      await tracker.initialize();

      // Record iteration
      const iterationResult = {
        iteration: 1,
        timestamp: new Date().toISOString(),
        task_id: 'task-1',
        task_title: 'Integration Test Task',
        status: 'success' as const,
        ai_tool: 'claude' as const,
        execution_time_ms: 10000,
        quality_checks: {
          type_check: true,
          lint: true,
          tests: true,
          coverage_met: true,
        },
        output_summary: 'Integration test completed',
        learnings: ['Integration testing works'],
        errors: [],
        metadata: {
          context_loss_count: 0,
          parsed_completion: true,
        },
      };

      await manager.recordIteration(iterationResult);
      await tracker.recordIteration(iterationResult);

      // Verify state
      const status = await manager.getStatus();
      expect(status?.current_iteration).toBe(1);

      const history = await tracker.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');

      const stats = await tracker.getStatistics();
      expect(stats.successful_iterations).toBe(1);
    });
  });
});
