import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TaskManager } from '../src/core/task-manager.js';

describe('Task Blocker Chain', () => {
  let testDir: string;
  let tm: TaskManager;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-blockers-test-${Date.now()}`);
    mkdirSync(join(testDir, '.rulebook', 'tasks'), { recursive: true });
    // Create minimal .rulebook config
    writeFileSync(
      join(testDir, '.rulebook', 'rulebook.json'),
      JSON.stringify({
        version: '5.0.0',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: 'test',
        mode: 'full',
        features: {},
      })
    );
    tm = new TaskManager(testDir, '.rulebook');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return null for non-existent task metadata', async () => {
    const result = await tm.getTaskMetadata('non-existent');
    expect(result).toBeNull();
  });

  it('should read task metadata with blocks/blockedBy fields', async () => {
    // Create task directory with metadata
    const taskDir = join(testDir, '.rulebook', 'tasks', 'task-a');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'proposal.md'),
      '# Proposal\n\n## Why\nTest task\n\n## What Changes\nNothing'
    );
    writeFileSync(join(taskDir, 'tasks.md'), '- [ ] Item 1');
    writeFileSync(
      join(taskDir, '.metadata.json'),
      JSON.stringify({
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: ['task-b', 'task-c'],
        blockedBy: [],
        cascadeImpact: 2,
      })
    );

    const metadata = await tm.getTaskMetadata('task-a');
    expect(metadata).not.toBeNull();
    expect(metadata!.blocks).toEqual(['task-b', 'task-c']);
    expect(metadata!.cascadeImpact).toBe(2);
  });

  it('should read blockedBy from metadata', async () => {
    const taskDir = join(testDir, '.rulebook', 'tasks', 'task-b');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'proposal.md'),
      '# Proposal\n\n## Why\nTest\n\n## What Changes\nN/A'
    );
    writeFileSync(join(taskDir, 'tasks.md'), '- [ ] Item 1');
    writeFileSync(
      join(taskDir, '.metadata.json'),
      JSON.stringify({
        status: 'blocked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [],
        blockedBy: ['task-a'],
        cascadeImpact: 0,
      })
    );

    const metadata = await tm.getTaskMetadata('task-b');
    expect(metadata!.blockedBy).toEqual(['task-a']);
  });

  it('should return metadata without blocker fields for legacy tasks', async () => {
    const taskDir = join(testDir, '.rulebook', 'tasks', 'old-task');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'proposal.md'),
      '# Proposal\n\n## Why\nTest\n\n## What Changes\nN/A'
    );
    writeFileSync(join(taskDir, 'tasks.md'), '- [ ] Item 1');
    writeFileSync(
      join(taskDir, '.metadata.json'),
      JSON.stringify({
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const metadata = await tm.getTaskMetadata('old-task');
    expect(metadata).not.toBeNull();
    // blocks/blockedBy should be undefined (not present in legacy metadata)
    expect(metadata!.blocks).toBeUndefined();
    expect(metadata!.blockedBy).toBeUndefined();
  });

  it('should handle invalid metadata JSON gracefully', async () => {
    const taskDir = join(testDir, '.rulebook', 'tasks', 'bad-task');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, '.metadata.json'), 'not valid json{{{');

    const metadata = await tm.getTaskMetadata('bad-task');
    expect(metadata).toBeNull();
  });
});
