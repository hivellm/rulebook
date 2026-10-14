import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    TaskManager,
    createTaskManager,
    checkMandatoryTail as checkMandatoryTailHelper,
    renderMandatoryTail,
    MANDATORY_TAIL_ITEMS,
} from '../src/core/tasks/task-manager.js';
import { promises as fs, existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/** v7.5: tasks are created with their content. */
const TASK_CONTENT = {
    why: 'Test task created with its content in one call',
    what: 'Exercise the task store',
    items: ['First step'],
};

describe('TaskManager', () => {
    let testDir: string;
    let taskManager: TaskManager;

    beforeEach(async () => {
        testDir = join(tmpdir(), `rulebook-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        taskManager = createTaskManager(testDir);
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    /**
     * Test helper: marks the v5.3.0 mandatory task tail items as checked
     * so that validation passes when the test is exercising archive behavior
     * (not tail enforcement). Tests that specifically verify tail enforcement
     * should NOT call this helper.
     */
    async function checkMandatoryTail(taskId: string): Promise<void> {
        const tasksPath = join(testDir, '.rulebook', 'tasks', taskId, 'tasks.md');
        const content = await fs.readFile(tasksPath, 'utf-8');
        const fixed = content
            .replace(/- \[ \] (\d+\.\d+ Update or create documentation)/, '- [x] $1')
            .replace(/- \[ \] (\d+\.\d+ Write tests)/, '- [x] $1')
            .replace(/- \[ \] (\d+\.\d+ Run tests)/, '- [x] $1');
        await fs.writeFile(tasksPath, fixed);
    }

    describe('initialize', () => {
        it('should create rulebook/tasks directory structure', async () => {
            await taskManager.initialize();

            const rulebookPath = join(testDir, '.rulebook');
            const tasksPath = join(rulebookPath, 'tasks');
            const archivePath = join(rulebookPath, 'archive');

            expect(
                await fs
                    .access(rulebookPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
            expect(
                await fs
                    .access(tasksPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
            expect(
                await fs
                    .access(archivePath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
        });
    });

    describe('createTask', () => {
        it('should create a new task with proper structure', async () => {
            const taskId = 'phase1_test-task-1';
            await taskManager.createTask(taskId, TASK_CONTENT);

            const taskPath = join(testDir, '.rulebook', 'tasks', taskId);
            const proposalPath = join(taskPath, 'proposal.md');
            const tasksPath = join(taskPath, 'tasks.md');
            const specsPath = join(taskPath, 'specs');

            expect(
                await fs
                    .access(taskPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
            expect(
                await fs
                    .access(proposalPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
            expect(
                await fs
                    .access(tasksPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);
            expect(
                await fs
                    .access(specsPath)
                    .then(() => true)
                    .catch(() => false)
            ).toBe(true);

            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            expect(proposalContent).toContain(`# Proposal: ${taskId}`);
            expect(proposalContent).toContain('## Why');
            expect(proposalContent).toContain('## What Changes');
        });

        it('should throw error if task already exists', async () => {
            const taskId = 'phase1_test-task-2';
            await taskManager.createTask(taskId, TASK_CONTENT);

            await expect(taskManager.createTask(taskId, TASK_CONTENT)).rejects.toThrow(
                `Task ${taskId} already exists`
            );
        });

        it('v7.5: renders proposal.md and tasks.md in the exact standard format', async () => {
            const taskId = 'phase1_full-content';
            await taskManager.createTask(taskId, {
                why: 'Tasks were left half-filled after create',
                what: 'Create takes the content',
                items: ['Add the type', '1.7 Already numbered', '- [ ] Checkbox prefix'],
                impact: {
                    specs: 'rulebook.md',
                    code: 'task-manager.ts',
                    breaking: true,
                    benefit: 'One call',
                },
            });
            const taskPath = join(testDir, '.rulebook', 'tasks', taskId);

            expect(readFileSync(join(taskPath, 'proposal.md'), 'utf-8')).toBe(
                [
                    `# Proposal: ${taskId}`,
                    '',
                    '## Why',
                    'Tasks were left half-filled after create',
                    '',
                    '## What Changes',
                    'Create takes the content',
                    '',
                    '## Impact',
                    '- Affected specs: rulebook.md',
                    '- Affected code: task-manager.ts',
                    '- Breaking change: YES',
                    '- User benefit: One call',
                    '',
                ].join('\n')
            );
            expect(readFileSync(join(taskPath, 'tasks.md'), 'utf-8')).toBe(
                [
                    '## 1. Implementation',
                    '- [ ] 1.1 Add the type',
                    '- [ ] 1.2 Already numbered',
                    '- [ ] 1.3 Checkbox prefix',
                    '',
                    renderMandatoryTail(2),
                ].join('\n')
            );
            const metadata = JSON.parse(readFileSync(join(taskPath, '.metadata.json'), 'utf-8'));
            expect(metadata.status).toBe('pending');
        });

        it('v7.5: absent impact fields get defaults, never bracket placeholders', async () => {
            await taskManager.createTask('phase1_no-impact', TASK_CONTENT);
            const proposal = readFileSync(
                join(testDir, '.rulebook', 'tasks', 'phase1_no-impact', 'proposal.md'),
                'utf-8'
            );
            expect(proposal).toContain('- Affected specs: none');
            expect(proposal).toContain('- Affected code: none');
            expect(proposal).toContain('- Breaking change: NO');
            expect(proposal).toContain('- User benefit: none');
            expect(proposal).not.toMatch(/\[[^\]]*\]/);
        });

        it('v7.5: a freshly created task passes validateTask unedited', async () => {
            await taskManager.createTask('phase1_fresh-valid', TASK_CONTENT);
            const result = await taskManager.validateTask('phase1_fresh-valid');
            expect(result.errors).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('v7.5: missing why/what/items fails listing every field and leaves no dir', async () => {
            const bad = { why: '', what: '  ', items: [] };
            await expect(taskManager.createTask('phase1_no-content', bad)).rejects.toThrow(
                /why is required; what is required; items needs at least one checklist item/
            );
            expect(existsSync(join(testDir, '.rulebook', 'tasks', 'phase1_no-content'))).toBe(
                false
            );
            // No temp dir left beside tasks/ either.
            const leftovers = readdirSync(join(testDir, '.rulebook')).filter((n) =>
                n.startsWith('.creating-')
            );
            expect(leftovers).toEqual([]);
        });

        it('v7.5: rejects a why shorter than 20 characters', async () => {
            await expect(
                taskManager.createTask('phase1_short-why', { ...TASK_CONTENT, why: 'too short' })
            ).rejects.toThrow(/why must have at least 20 characters/);
            expect(existsSync(join(testDir, '.rulebook', 'tasks', 'phase1_short-why'))).toBe(false);
        });
    });

    describe('listTasks', () => {
        it('returns [] without creating tasks/ or archive/', async () => {
            expect(await taskManager.listTasks(true)).toEqual([]);
            await expect(fs.access(join(testDir, '.rulebook'))).rejects.toThrow();
        });

        it('should return empty array when no tasks exist', async () => {
            await taskManager.initialize();
            const tasks = await taskManager.listTasks();
            expect(tasks).toEqual([]);
        });

        it('should list active tasks', async () => {
            await taskManager.createTask('phase1_task-1', TASK_CONTENT);
            await taskManager.createTask('phase1_task-2', TASK_CONTENT);

            const tasks = await taskManager.listTasks();
            expect(tasks.length).toBe(2);
            expect(tasks.map((t) => t.id)).toContain('phase1_task-1');
            expect(tasks.map((t) => t.id)).toContain('phase1_task-2');
        });

        it('should include archived tasks when requested', async () => {
            await taskManager.createTask('phase1_task-1', TASK_CONTENT);
            await taskManager.createTask('phase1_task-2', TASK_CONTENT);

            // Archive one task
            const validation = await taskManager.validateTask('phase1_task-1');
            if (!validation.valid) {
                // Fix validation issues
                const taskPath = join(
                    testDir,
                    '.rulebook',
                    'tasks',
                    'phase1_task-1',
                    'proposal.md'
                );
                const content = await fs.readFile(taskPath, 'utf-8');
                const updated = content.replace(
                    TASK_CONTENT.why,
                    'This is a test task that needs at least 20 characters to pass validation'
                );
                await fs.writeFile(taskPath, updated);
            }

            await taskManager.archiveTask('phase1_task-1', true); // Skip validation for test

            const tasks = await taskManager.listTasks(true);
            expect(tasks.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('loadTask', () => {
        it('should load task with all files', async () => {
            await taskManager.createTask('phase1_task-1', TASK_CONTENT);
            const task = await taskManager.loadTask('phase1_task-1');

            expect(task).not.toBeNull();
            expect(task?.id).toBe('phase1_task-1');
            expect(task?.proposal).toBeDefined();
            expect(task?.tasks).toBeDefined();
            expect(task?.status).toBe('pending');
        });

        it('should return null for non-existent task', async () => {
            const task = await taskManager.loadTask('non-existent');
            expect(task).toBeNull();
        });
    });

    describe('validateTask', () => {
        it('should validate task with correct format', async () => {
            await taskManager.createTask('phase1_valid-task', TASK_CONTENT);

            // Fix proposal to have valid purpose
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_valid-task',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            const updated = content.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updated);
            // v5.3.0 F-NEW-3: tail must be checked for validation to pass
            await checkMandatoryTail('phase1_valid-task');

            const validation = await taskManager.validateTask('phase1_valid-task');
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
        });

        it('should fail validation for short purpose', async () => {
            await taskManager.createTask('phase1_invalid-task', TASK_CONTENT);
            // Write a genuinely short purpose over the created one.
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_invalid-task',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            await fs.writeFile(proposalPath, content.replace(TASK_CONTENT.why, 'too short'));

            const validation = await taskManager.validateTask('phase1_invalid-task');
            expect(validation.errors.some((e) => e.includes('Purpose section'))).toBe(true);
            // v7 (#19): the unchecked tail is a WARNING, not an error.
            expect(validation.warnings.some((w) => w.includes('tail items unchecked'))).toBe(true);
        });

        it('should fail validation for non-existent task', async () => {
            const validation = await taskManager.validateTask('non-existent');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('not found'))).toBe(true);
        });

        it('should detect scenarios with 3 hashtags instead of 4', async () => {
            await taskManager.createTask('phase1_task-with-3-hash', TASK_CONTENT);

            // Fix proposal
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-with-3-hash',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            // Create spec with invalid scenario (3 hashtags)
            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-with-3-hash',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.

### Scenario: Invalid scenario
Given something
When something happens
Then something occurs
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-with-3-hash');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('4 hashtags'))).toBe(true);
        });
    });

    describe('archiveTask', () => {
        it('should archive a valid task', async () => {
            await taskManager.createTask('phase1_task-to-archive', TASK_CONTENT);

            // Fix proposal
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-to-archive',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            const updated = content.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updated);
            await checkMandatoryTail('phase1_task-to-archive');

            await taskManager.archiveTask('phase1_task-to-archive');

            // Archived tasks have date prefix (YYYY-MM-DD-task-id)
            const today = new Date().toISOString().split('T')[0];
            const archivedTaskId = `${today}-phase1_task-to-archive`;
            const task = await taskManager.loadTask(archivedTaskId, true);
            expect(task).not.toBeNull();
        });

        it('should throw error for non-existent task', async () => {
            await expect(taskManager.archiveTask('non-existent')).rejects.toThrow('not found');
        });

        it('should skip validation when flag is set', async () => {
            await taskManager.createTask('phase1_task-skip-validation', TASK_CONTENT);
            await taskManager.archiveTask('phase1_task-skip-validation', true);

            // Archived tasks have date prefix (YYYY-MM-DD-task-id)
            const today = new Date().toISOString().split('T')[0];
            const archivedTaskId = `${today}-phase1_task-skip-validation`;
            const task = await taskManager.loadTask(archivedTaskId, true);
            expect(task).not.toBeNull();
        });
    });

    describe('showTask', () => {
        it('should show active task', async () => {
            await taskManager.createTask('phase1_task-to-show', TASK_CONTENT);
            const task = await taskManager.showTask('phase1_task-to-show');
            expect(task).not.toBeNull();
            expect(task?.id).toBe('phase1_task-to-show');
        });

        it('should return null for non-existent task', async () => {
            const task = await taskManager.showTask('non-existent');
            expect(task).toBeNull();
        });

        it('should show archived task', async () => {
            await taskManager.createTask('phase1_task-archived-show', TASK_CONTENT);

            // Fix proposal
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-archived-show',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            const updated = content.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updated);
            await checkMandatoryTail('phase1_task-archived-show');

            await taskManager.archiveTask('phase1_task-archived-show');

            // showTask should find archived task
            const today = new Date().toISOString().split('T')[0];
            const archivedTaskId = `${today}-phase1_task-archived-show`;
            const task = await taskManager.showTask(archivedTaskId);
            expect(task).not.toBeNull();
            expect(task?.archivedAt).toBeDefined();
        });
    });

    describe('updateTaskStatus', () => {
        it('should update task status (method executes without error)', async () => {
            await taskManager.createTask('phase1_task-status', TASK_CONTENT);
            // updateTaskStatus updates metadata in memory but doesn't persist to file
            // This test verifies the method executes without error
            await expect(
                taskManager.updateTaskStatus('phase1_task-status', 'in-progress')
            ).resolves.not.toThrow();
        });

        it('should update task status to completed (method executes)', async () => {
            await taskManager.createTask('phase1_task-complete', TASK_CONTENT);
            // Method executes successfully
            await expect(
                taskManager.updateTaskStatus('phase1_task-complete', 'completed')
            ).resolves.not.toThrow();
        });

        it('should refuse blocked without an open question or a blockedBy dependency', async () => {
            await taskManager.createTask('phase1_task-blocked', TASK_CONTENT);
            // v7.2: "blocked" must carry a reason the operator can act on.
            await expect(
                taskManager.updateTaskStatus('phase1_task-blocked', 'blocked')
            ).rejects.toThrow(/action:"ask"/);
        });

        it('should allow blocked when the task has a blockedBy dependency', async () => {
            await taskManager.createTask('phase1_task-dep-blocked', TASK_CONTENT);
            const metaPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-dep-blocked',
                '.metadata.json'
            );
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
            writeFileSync(metaPath, JSON.stringify({ ...meta, blockedBy: ['phase0_dep'] }));
            await taskManager.updateTaskStatus('phase1_task-dep-blocked', 'blocked');
            const after = JSON.parse(readFileSync(metaPath, 'utf-8'));
            expect(after.status).toBe('blocked');
            expect(after.blockedBy).toEqual(['phase0_dep']);
        });

        it('should update updatedAt timestamp (method executes)', async () => {
            await taskManager.createTask('phase1_task-timestamp', TASK_CONTENT);
            // Method executes successfully
            await expect(
                taskManager.updateTaskStatus('phase1_task-timestamp', 'in-progress')
            ).resolves.not.toThrow();
        });

        it('should throw error for non-existent task', async () => {
            await expect(taskManager.updateTaskStatus('non-existent', 'completed')).rejects.toThrow(
                'not found'
            );
        });
    });

    describe('loadTask edge cases', () => {
        it('should load task without proposal.md', async () => {
            await taskManager.createTask('phase1_task-no-proposal', TASK_CONTENT);
            const taskPath = join(testDir, '.rulebook', 'tasks', 'phase1_task-no-proposal');
            await fs.unlink(join(taskPath, 'proposal.md'));

            const task = await taskManager.loadTask('phase1_task-no-proposal');
            expect(task).not.toBeNull();
            expect(task?.proposal).toBeUndefined();
        });

        it('should load task without tasks.md', async () => {
            await taskManager.createTask('phase1_task-no-tasks', TASK_CONTENT);
            const taskPath = join(testDir, '.rulebook', 'tasks', 'phase1_task-no-tasks');
            await fs.unlink(join(taskPath, 'tasks.md'));

            const task = await taskManager.loadTask('phase1_task-no-tasks');
            expect(task).not.toBeNull();
            expect(task?.tasks).toBeUndefined();
        });

        it('should load task without design.md', async () => {
            await taskManager.createTask('phase1_task-no-design', TASK_CONTENT);
            const task = await taskManager.loadTask('phase1_task-no-design');
            expect(task).not.toBeNull();
            expect(task?.design).toBeUndefined();
        });

        it('should load task with specs', async () => {
            await taskManager.createTask('phase1_task-with-specs', TASK_CONTENT);
            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-with-specs',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            await fs.writeFile(join(specPath, 'spec.md'), '# Spec content');

            const task = await taskManager.loadTask('phase1_task-with-specs');
            expect(task).not.toBeNull();
            expect(task?.specs).toBeDefined();
            expect(task?.specs?.['core']).toBe('# Spec content');
        });

        it('should load task without specs directory', async () => {
            await taskManager.createTask('phase1_task-no-specs', TASK_CONTENT);
            const specPath = join(testDir, '.rulebook', 'tasks', 'phase1_task-no-specs', 'specs');
            await fs.rm(specPath, { recursive: true, force: true });

            const task = await taskManager.loadTask('phase1_task-no-specs');
            expect(task).not.toBeNull();
            expect(task?.specs).toEqual({});
        });

        it('should handle stats error gracefully', async () => {
            await taskManager.createTask('phase1_task-stats-error', TASK_CONTENT);
            // Task should still load even if stats fail
            const task = await taskManager.loadTask('phase1_task-stats-error');
            expect(task).not.toBeNull();
        });
    });

    describe('listTasks edge cases', () => {
        it('should handle non-existent tasks directory', async () => {
            await taskManager.initialize();
            const tasksPath = join(testDir, '.rulebook', 'tasks');
            await fs.rm(tasksPath, { recursive: true, force: true });

            const tasks = await taskManager.listTasks();
            expect(tasks).toEqual([]);
        });

        it('should skip archive directory when listing', async () => {
            await taskManager.createTask('phase1_task-1', TASK_CONTENT);
            const tasksPath = join(testDir, '.rulebook', 'tasks');
            // Archive directory should be skipped
            const tasks = await taskManager.listTasks();
            expect(tasks.length).toBeGreaterThanOrEqual(1);
            expect(tasks.every((t) => t.id !== 'archive')).toBe(true);
        });

        it('should handle archived task without date prefix', async () => {
            // Create task first, then manually move to archive to simulate no date prefix
            await taskManager.createTask('phase1_task-archive-no-date', TASK_CONTENT);
            const archivePath = join(testDir, '.rulebook', 'archive');
            const taskPath = join(testDir, '.rulebook', 'tasks', 'phase1_task-archive-no-date');

            // Move task to archive manually (simulating archive without date prefix)
            await fs.rename(taskPath, join(archivePath, 'phase1_task-archive-no-date'));

            const tasks = await taskManager.listTasks(true);
            const archivedTask = tasks.find((t) => t.id === 'phase1_task-archive-no-date');
            // Task should be found and have archivedAt set (even if no date prefix)
            expect(archivedTask).toBeDefined();
            if (archivedTask) {
                // archivedAt is set to current date if no date prefix found
                expect(archivedTask.archivedAt).toBeDefined();
            }
        });

        it('should not include archived tasks when includeArchived is false', async () => {
            await taskManager.createTask('phase1_task-active', TASK_CONTENT);
            const tasks = await taskManager.listTasks(false);
            expect(tasks.every((t) => !t.archivedAt)).toBe(true);
        });
    });

    describe('validateTask edge cases', () => {
        it('should validate task without proposal', async () => {
            await taskManager.createTask('phase1_task-no-proposal-validate', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-proposal-validate',
                'proposal.md'
            );
            await fs.unlink(proposalPath);

            const validation = await taskManager.validateTask('phase1_task-no-proposal-validate');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('Missing proposal.md'))).toBe(true);
        });

        it('should validate task with purpose match but short content', async () => {
            await taskManager.createTask('phase1_task-short-purpose', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-short-purpose',
                'proposal.md'
            );
            await fs.writeFile(
                proposalPath,
                `# Proposal: task-short-purpose

## Why
Short

## What Changes
Test
`
            );

            const validation = await taskManager.validateTask('phase1_task-short-purpose');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('Purpose section'))).toBe(true);
        });

        it('should validate task with no purpose match', async () => {
            await taskManager.createTask('phase1_task-no-purpose-match', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-purpose-match',
                'proposal.md'
            );
            await fs.writeFile(
                proposalPath,
                `# Proposal: task-no-purpose-match

## What Changes
Test
`
            );

            const validation = await taskManager.validateTask('phase1_task-no-purpose-match');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('Purpose section'))).toBe(true);
        });

        it('should validate task with requirement missing SHALL/MUST', async () => {
            await taskManager.createTask('phase1_task-no-shall', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-shall',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-shall',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system should do something.
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-no-shall');
            expect(validation.valid).toBe(false);
            expect(validation.errors.some((e) => e.includes('SHALL or MUST'))).toBe(true);
        });

        it('should validate task with requirement having SHALL', async () => {
            await taskManager.createTask('phase1_task-with-shall', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-with-shall',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-with-shall',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-with-shall');
            // Should not have error about SHALL/MUST
            expect(validation.errors.some((e) => e.includes('SHALL or MUST'))).toBe(false);
        });

        it('should validate task with scenario missing Given', async () => {
            await taskManager.createTask('phase1_task-no-given', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-given',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-given',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.

#### Scenario: Test scenario
When something happens
Then something occurs
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-no-given');
            expect(validation.warnings.some((w) => w.includes('Given/When/Then'))).toBe(true);
        });

        it('should validate task with scenario missing When', async () => {
            await taskManager.createTask('phase1_task-no-when', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-when',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-when',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.

#### Scenario: Test scenario
Given something
Then something occurs
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-no-when');
            expect(validation.warnings.some((w) => w.includes('Given/When/Then'))).toBe(true);
        });

        it('should validate task with scenario missing Then', async () => {
            await taskManager.createTask('phase1_task-no-then', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-then',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-no-then',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.

#### Scenario: Test scenario
Given something
When something happens
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-no-then');
            expect(validation.warnings.some((w) => w.includes('Given/When/Then'))).toBe(true);
        });

        it('should validate task with valid scenario', async () => {
            await taskManager.createTask('phase1_task-valid-scenario', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-valid-scenario',
                'proposal.md'
            );
            const proposalContent = await fs.readFile(proposalPath, 'utf-8');
            const updatedProposal = proposalContent.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updatedProposal);

            const specPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-valid-scenario',
                'specs',
                'core'
            );
            await fs.mkdir(specPath, { recursive: true });
            const specContent = `# Spec

### Requirement: Test
The system SHALL do something.

#### Scenario: Test scenario
Given something
When something happens
Then something occurs
`;
            await fs.writeFile(join(specPath, 'spec.md'), specContent);

            const validation = await taskManager.validateTask('phase1_task-valid-scenario');
            expect(validation.warnings.some((w) => w.includes('Given/When/Then'))).toBe(false);
        });
    });

    describe('archiveTask edge cases', () => {
        it('should throw error if archive already exists', async () => {
            await taskManager.createTask('phase1_task-duplicate-archive', TASK_CONTENT);

            // Fix proposal
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-duplicate-archive',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            const updated = content.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath, updated);
            await checkMandatoryTail('phase1_task-duplicate-archive');

            // Archive once
            await taskManager.archiveTask('phase1_task-duplicate-archive');

            // Create a new task with same ID (should not happen in practice, but test the branch)
            await taskManager.createTask('phase1_task-duplicate-archive', TASK_CONTENT);
            const proposalPath2 = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_task-duplicate-archive',
                'proposal.md'
            );
            const content2 = await fs.readFile(proposalPath2, 'utf-8');
            const updated2 = content2.replace(
                TASK_CONTENT.why,
                'This is a valid purpose with more than 20 characters to pass validation'
            );
            await fs.writeFile(proposalPath2, updated2);
            await checkMandatoryTail('phase1_task-duplicate-archive');

            // This should fail because archive with same date prefix already exists
            await expect(taskManager.archiveTask('phase1_task-duplicate-archive')).rejects.toThrow(
                'already exists'
            );
        });
    });

    describe('v5.3.0 F-NEW-3 mandatory task tail', () => {
        it('createTask() appends the three tail items to tasks.md', async () => {
            await taskManager.createTask('phase1_tail-autoappend', TASK_CONTENT);
            const tasksPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_tail-autoappend',
                'tasks.md'
            );
            const content = await fs.readFile(tasksPath, 'utf-8');
            expect(content).toContain('Update or create documentation');
            expect(content).toContain('Write tests covering');
            expect(content).toContain('Run tests and confirm');
        });

        it('checkMandatoryTail reports unchecked items on a freshly created task', async () => {
            await taskManager.createTask('phase1_tail-unchecked', TASK_CONTENT);
            const tasksPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_tail-unchecked',
                'tasks.md'
            );
            const content = await fs.readFile(tasksPath, 'utf-8');
            const result = checkMandatoryTailHelper(content);
            expect(result.present).toBe(true);
            expect(result.unchecked).toHaveLength(3);
            expect(result.missing).toHaveLength(0);
        });

        it('archiveTask refuses to archive when any tail item is unchecked', async () => {
            await taskManager.createTask('phase1_tail-blocks-archive', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_tail-blocks-archive',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            await fs.writeFile(
                proposalPath,
                content.replace(TASK_CONTENT.why, 'A valid purpose long enough to pass validation')
            );

            // v7 (#19): without a waiver the archive still refuses…
            await expect(taskManager.archiveTask('phase1_tail-blocks-archive')).rejects.toThrow(
                /tail items unchecked[\s\S]*tailWaiver/
            );

            // …but a one-line rationale archives and records the waiver.
            await taskManager.archiveTask(
                'phase1_tail-blocks-archive',
                false,
                'doc-only change, no runtime behavior'
            );
            const archives = await fs.readdir(join(testDir, '.rulebook', 'archive'));
            const archived = archives.find((a) => a.endsWith('phase1_tail-blocks-archive'));
            expect(archived).toBeDefined();
            const archivedTasks = await fs.readFile(
                join(testDir, '.rulebook', 'archive', archived!, 'tasks.md'),
                'utf-8'
            );
            expect(archivedTasks).toContain('tail-waiver: doc-only change');
        });

        it('archiveTask succeeds after the tail is checked', async () => {
            await taskManager.createTask('phase1_tail-allowed', TASK_CONTENT);
            const proposalPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_tail-allowed',
                'proposal.md'
            );
            const content = await fs.readFile(proposalPath, 'utf-8');
            await fs.writeFile(
                proposalPath,
                content.replace(TASK_CONTENT.why, 'A valid purpose long enough to pass validation')
            );

            // Check the mandatory tail
            const tasksPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_tail-allowed',
                'tasks.md'
            );
            const tasksContent = await fs.readFile(tasksPath, 'utf-8');
            await fs.writeFile(
                tasksPath,
                tasksContent
                    .replace(/- \[ \] 2\.1 Update/, '- [x] 2.1 Update')
                    .replace(/- \[ \] 2\.2 Write/, '- [x] 2.2 Write')
                    .replace(/- \[ \] 2\.3 Run/, '- [x] 2.3 Run')
            );

            await expect(taskManager.archiveTask('phase1_tail-allowed')).resolves.toBeUndefined();
        });

        it('renderMandatoryTail produces a section with three unchecked items', () => {
            const rendered = renderMandatoryTail(5);
            expect(rendered).toContain('## 5. Tail');
            expect(rendered).toContain('- [ ] 5.1');
            expect(rendered).toContain('- [ ] 5.2');
            expect(rendered).toContain('- [ ] 5.3');
        });

        it('MANDATORY_TAIL_ITEMS is exactly three entries', () => {
            expect(MANDATORY_TAIL_ITEMS).toHaveLength(3);
        });

        it('checkMandatoryTail reports missing items when the section is absent', () => {
            const content = '## 1. Implementation\n- [ ] 1.1 Do the thing\n';
            const result = checkMandatoryTailHelper(content);
            expect(result.present).toBe(false);
            expect(result.missing).toHaveLength(3);
        });
    });

    describe('phase naming convention', () => {
        it('should reject task IDs without phase prefix', async () => {
            await expect(taskManager.createTask('my-task', TASK_CONTENT)).rejects.toThrow(
                'must start with a phase prefix'
            );
        });

        it('should reject task IDs with invalid prefix format', async () => {
            await expect(taskManager.createTask('phaseX_my-task', TASK_CONTENT)).rejects.toThrow(
                'must start with a phase prefix'
            );
        });

        it('should accept task IDs with valid phase prefix', async () => {
            await taskManager.createTask('phase0_my-task', TASK_CONTENT);
            const task = await taskManager.loadTask('phase0_my-task');
            expect(task).not.toBeNull();
        });

        it('should accept task IDs with subletter phase prefix', async () => {
            await taskManager.createTask('phase3a_my-task', TASK_CONTENT);
            const task = await taskManager.loadTask('phase3a_my-task');
            expect(task).not.toBeNull();
        });

        it('should accept task IDs with multi-digit phase', async () => {
            await taskManager.createTask('phase12_my-task', TASK_CONTENT);
            const task = await taskManager.loadTask('phase12_my-task');
            expect(task).not.toBeNull();
        });

        it('should validate task ID via validateTaskId method', () => {
            expect(taskManager.validateTaskId('phase1_valid').valid).toBe(true);
            expect(taskManager.validateTaskId('phase2a_valid').valid).toBe(true);
            expect(taskManager.validateTaskId('no-prefix').valid).toBe(false);
            expect(taskManager.validateTaskId('PHASE1_upper').valid).toBe(false);
        });
    });

    describe('extractPhase', () => {
        it('should extract phase number and subletter', () => {
            expect(taskManager.extractPhase('phase0_task')).toEqual({ phase: 0, subletter: '' });
            expect(taskManager.extractPhase('phase3a_task')).toEqual({ phase: 3, subletter: 'a' });
            expect(taskManager.extractPhase('phase12_task')).toEqual({ phase: 12, subletter: '' });
            expect(taskManager.extractPhase('no-phase')).toEqual({
                phase: Infinity,
                subletter: '',
            });
        });
    });

    describe('updateReadme', () => {
        it('should generate README.md in tasks directory', async () => {
            await taskManager.createTask('phase1_feature-a', TASK_CONTENT);
            await taskManager.createTask('phase2_feature-b', TASK_CONTENT);

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const exists = await fs
                .access(readmePath)
                .then(() => true)
                .catch(() => false);
            expect(exists).toBe(true);

            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).toContain('# Tasks Index');
            expect(content).toContain('phase1');
            expect(content).toContain('phase2');
            expect(content).toContain('phase1_feature-a');
            expect(content).toContain('phase2_feature-b');
        });

        it('should group tasks by phase', async () => {
            await taskManager.createTask('phase1_task-a', TASK_CONTENT);
            await taskManager.createTask('phase1_task-b', TASK_CONTENT);
            await taskManager.createTask('phase2_task-c', TASK_CONTENT);

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).toContain('## phase1');
            expect(content).toContain('## phase2');
        });

        it('should show progress from tasks.md checklist', async () => {
            await taskManager.createTask('phase1_progress-test', TASK_CONTENT);
            const tasksPath = join(
                testDir,
                '.rulebook',
                'tasks',
                'phase1_progress-test',
                'tasks.md'
            );
            await fs.writeFile(tasksPath, '- [x] Done\n- [x] Also done\n- [ ] Not done\n');

            await taskManager.updateReadme();

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).toContain('2/3');
        });

        it('should show task status icons', async () => {
            await taskManager.createTask('phase1_status-icons', TASK_CONTENT);
            await taskManager.updateTaskStatus('phase1_status-icons', 'in-progress');

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).toContain('🔄');
        });

        it('should update README when task is archived', async () => {
            await taskManager.createTask('phase1_will-archive', TASK_CONTENT);
            await taskManager.createTask('phase1_will-stay', TASK_CONTENT);
            await taskManager.archiveTask('phase1_will-archive', true);

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).not.toContain('phase1_will-archive');
            expect(content).toContain('phase1_will-stay');
        });

        it('should update README when task is deleted', async () => {
            await taskManager.createTask('phase1_will-delete', TASK_CONTENT);
            await taskManager.createTask('phase1_will-remain', TASK_CONTENT);
            await taskManager.deleteTask('phase1_will-delete');

            const readmePath = join(testDir, '.rulebook', 'tasks', 'README.md');
            const content = await fs.readFile(readmePath, 'utf-8');
            expect(content).not.toContain('phase1_will-delete');
            expect(content).toContain('phase1_will-remain');
        });
    });

    describe('migrateArchive', () => {
        it('should migrate archive from tasks/archive to .rulebook/archive', async () => {
            await taskManager.initialize();

            // Create legacy archive structure manually
            const legacyArchivePath = join(testDir, '.rulebook', 'tasks', 'archive');
            await fs.mkdir(legacyArchivePath, { recursive: true });
            const archivedTaskPath = join(legacyArchivePath, '2026-01-01-phase1_old-task');
            await fs.mkdir(archivedTaskPath, { recursive: true });
            await fs.writeFile(join(archivedTaskPath, 'proposal.md'), '# Old task');

            const migrated = await taskManager.migrateArchive();
            expect(migrated).toBe(true);

            // Check new location exists
            const newArchivePath = join(
                testDir,
                '.rulebook',
                'archive',
                '2026-01-01-phase1_old-task'
            );
            const exists = await fs
                .access(newArchivePath)
                .then(() => true)
                .catch(() => false);
            expect(exists).toBe(true);

            // Check legacy was cleaned up
            const legacyExists = await fs
                .access(legacyArchivePath)
                .then(() => true)
                .catch(() => false);
            expect(legacyExists).toBe(false);
        });

        it('should return false when no legacy archive exists', async () => {
            await taskManager.initialize();
            const migrated = await taskManager.migrateArchive();
            expect(migrated).toBe(false);
        });

        it('should not overwrite existing archives in new location', async () => {
            await taskManager.initialize();

            // Create same archive in both locations
            const legacyArchivePath = join(testDir, '.rulebook', 'tasks', 'archive');
            await fs.mkdir(legacyArchivePath, { recursive: true });
            const legacyTask = join(legacyArchivePath, '2026-01-01-phase1_task');
            await fs.mkdir(legacyTask, { recursive: true });
            await fs.writeFile(join(legacyTask, 'proposal.md'), '# Legacy');

            const newArchivePath = join(testDir, '.rulebook', 'archive');
            await fs.mkdir(newArchivePath, { recursive: true });
            const newTask = join(newArchivePath, '2026-01-01-phase1_task');
            await fs.mkdir(newTask, { recursive: true });
            await fs.writeFile(join(newTask, 'proposal.md'), '# New (should not be overwritten)');

            await taskManager.migrateArchive();

            // New location should keep its content
            const content = await fs.readFile(join(newTask, 'proposal.md'), 'utf-8');
            expect(content).toContain('New (should not be overwritten)');
        });
    });

    describe('deleteTask', () => {
        it('should delete an existing task', async () => {
            await taskManager.createTask('phase1_task-to-delete', TASK_CONTENT);
            await taskManager.deleteTask('phase1_task-to-delete');

            const task = await taskManager.loadTask('phase1_task-to-delete');
            expect(task).toBeNull();
        });

        it('should throw error for non-existent task', async () => {
            await expect(taskManager.deleteTask('phase1_non-existent')).rejects.toThrow(
                'not found'
            );
        });
    });
});
