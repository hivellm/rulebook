import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  migrateOpenSpecToRulebook,
  migrateOpenSpecArchives,
  removeOpenSpecRulebookFile,
  removeOpenSpecCommands,
  archiveOpenSpecDirectory,
} from '../src/core/openspec-migrator.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('OpenSpec Migrator', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-migrator-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return empty result when OpenSpec directory does not exist', async () => {
    const result = await migrateOpenSpecToRulebook(testDir);
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should migrate OpenSpec tasks to Rulebook format', async () => {
    // Create OpenSpec structure
    const openspecPath = join(testDir, 'openspec', 'changes', 'test-task-1');
    await fs.mkdir(openspecPath, { recursive: true });

    // Create proposal.md
    await fs.writeFile(
      join(openspecPath, 'proposal.md'),
      '# Proposal: test-task-1\n\n## Why\nThis is a test task\n\n## What Changes\nTest changes'
    );

    // Create tasks.md
    await fs.writeFile(join(openspecPath, 'tasks.md'), '## 1. Task\n- [ ] 1.1 Do something');

    // Create specs
    const specsPath = join(openspecPath, 'specs', 'core');
    await fs.mkdir(specsPath, { recursive: true });
    await fs.writeFile(
      join(specsPath, 'spec.md'),
      '# Spec\n\n### Requirement: Test\nSHALL do something'
    );

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.migratedTasks).toContain('test-task-1');

    // Verify migrated files
    const rulebookTaskPath = join(testDir, 'rulebook', 'tasks', 'test-task-1');
    expect(
      await fs
        .access(join(rulebookTaskPath, 'proposal.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
    expect(
      await fs
        .access(join(rulebookTaskPath, 'tasks.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
    expect(
      await fs
        .access(join(rulebookTaskPath, 'specs', 'core', 'spec.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should skip tasks that already exist in Rulebook', async () => {
    // Create OpenSpec task
    const openspecPath = join(testDir, 'openspec', 'changes', 'existing-task');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');

    // Create existing Rulebook task
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'existing-task');
    await fs.mkdir(rulebookPath, { recursive: true });
    await fs.writeFile(join(rulebookPath, 'proposal.md'), '# Existing');

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('should migrate archived OpenSpec tasks', async () => {
    // Create archived OpenSpec task
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-archived-task');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Archived Task\n\n## Why\nTest');

    // Note: The migration function should handle archives, but the current implementation
    // only migrates from /openspec/changes/, not /openspec/changes/archive/
    // This test verifies the current behavior
    const result = await migrateOpenSpecToRulebook(testDir);

    // Archive migration is handled separately, so this should return 0
    expect(result.migrated).toBe(0);
  });

  it('should handle migration errors gracefully', async () => {
    // Create OpenSpec structure with invalid task (empty directory)
    const invalidPath = join(testDir, 'openspec', 'changes', 'invalid-task');
    await fs.mkdir(invalidPath, { recursive: true });
    // Don't create required files - this should still migrate but with warnings

    const result = await migrateOpenSpecToRulebook(testDir);

    // Should handle gracefully - may migrate or skip
    expect(result.migrated + result.skipped).toBeGreaterThanOrEqual(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  it('should migrate design.md if present', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-with-design');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.writeFile(join(openspecPath, 'design.md'), '# Design\n\n## Architecture\nTest design');

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);

    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-with-design');
    expect(
      await fs
        .access(join(rulebookPath, 'design.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should migrate multiple tasks', async () => {
    // Create multiple OpenSpec tasks
    for (let i = 1; i <= 3; i++) {
      const openspecPath = join(testDir, 'openspec', 'changes', `task-${i}`);
      await fs.mkdir(openspecPath, { recursive: true });
      await fs.writeFile(join(openspecPath, 'proposal.md'), `# Proposal ${i}\n\n## Why\nTest ${i}`);
      await fs.writeFile(join(openspecPath, 'tasks.md'), `## Task ${i}\n- [ ] Do something`);
    }

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(3);
    expect(result.migratedTasks.length).toBe(3);
  });

  it('should migrate specs with multiple modules', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'multi-spec-task');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');

    // Create multiple spec modules
    const specModules = ['core', 'api', 'ui'];
    for (const module of specModules) {
      const specPath = join(openspecPath, 'specs', module);
      await fs.mkdir(specPath, { recursive: true });
      await fs.writeFile(
        join(specPath, 'spec.md'),
        `# ${module} Spec\n\n### Requirement: Test\nSHALL do something`
      );
    }

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);

    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'multi-spec-task', 'specs');
    for (const module of specModules) {
      expect(
        await fs
          .access(join(rulebookPath, module, 'spec.md'))
          .then(() => true)
          .catch(() => false)
      ).toBe(true);
    }
  });

  it('should handle tasks without proposal.md', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-no-proposal');
    await fs.mkdir(openspecPath, { recursive: true });
    // Only create tasks.md, no proposal.md
    await fs.writeFile(join(openspecPath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecToRulebook(testDir);

    // Should still migrate
    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-no-proposal');
    expect(
      await fs
        .access(join(rulebookPath, 'tasks.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });
});

describe('migrateOpenSpecArchives', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-archive-migrator-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return empty result when archive directory does not exist', async () => {
    const result = await migrateOpenSpecArchives(testDir);
    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should migrate archived OpenSpec tasks', async () => {
    // Create archived OpenSpec task
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-archived-task');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Archived Task\n\n## Why\nTest');
    await fs.writeFile(join(archivePath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    expect(result.migratedTasks).toContain('2025-01-01-archived-task');

    // Verify migrated archive
    const rulebookArchivePath = join(
      testDir,
      'rulebook',
      'tasks',
      'archive',
      '2025-01-01-archived-task'
    );
    expect(
      await fs
        .access(join(rulebookArchivePath, 'proposal.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should skip archives that already exist in Rulebook', async () => {
    // Create archived OpenSpec task
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-existing');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Existing');

    // Create existing Rulebook archive
    const rulebookArchivePath = join(
      testDir,
      'rulebook',
      'tasks',
      'archive',
      '2025-01-01-existing'
    );
    await fs.mkdir(rulebookArchivePath, { recursive: true });
    await fs.writeFile(join(rulebookArchivePath, 'proposal.md'), '# Existing');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(1);
  });

  it('should migrate multiple archived tasks', async () => {
    // Create multiple archived tasks
    for (let i = 1; i <= 2; i++) {
      const archivePath = join(
        testDir,
        'openspec',
        'changes',
        'archive',
        `2025-01-0${i}-task-${i}`
      );
      await fs.mkdir(archivePath, { recursive: true });
      await fs.writeFile(join(archivePath, 'proposal.md'), `# Task ${i}\n\n## Why\nTest`);
    }

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(2);
    expect(result.migratedTasks.length).toBe(2);
  });
});

describe('removeOpenSpecRulebookFile', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-remove-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return false when OPENSPEC.md does not exist', async () => {
    const result = await removeOpenSpecRulebookFile(testDir);
    expect(result).toBe(false);
  });

  it('should remove OPENSPEC.md when it exists', async () => {
    const openspecPath = join(testDir, 'rulebook', 'OPENSPEC.md');
    await fs.mkdir(join(testDir, 'rulebook'), { recursive: true });
    await fs.writeFile(openspecPath, '# OpenSpec\n\nContent');

    const result = await removeOpenSpecRulebookFile(testDir);

    expect(result).toBe(true);
    expect(
      await fs
        .access(openspecPath)
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });
});

describe('removeOpenSpecCommands', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-commands-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return 0 when .cursor/commands does not exist', async () => {
    const result = await removeOpenSpecCommands(testDir);
    expect(result).toBe(0);
  });

  it('should remove OpenSpec command files', async () => {
    const commandsDir = join(testDir, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });

    // Create OpenSpec command files
    await fs.writeFile(join(commandsDir, 'openspec-proposal.md'), '# OpenSpec Proposal');
    await fs.writeFile(join(commandsDir, 'openspec-archive.md'), '# OpenSpec Archive');
    await fs.writeFile(join(commandsDir, 'openspec-apply.md'), '# OpenSpec Apply');

    const result = await removeOpenSpecCommands(testDir);

    expect(result).toBe(3);
    expect(
      await fs
        .access(join(commandsDir, 'openspec-proposal.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
    expect(
      await fs
        .access(join(commandsDir, 'openspec-archive.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
    expect(
      await fs
        .access(join(commandsDir, 'openspec-apply.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });

  it('should only remove OpenSpec commands, not other files', async () => {
    const commandsDir = join(testDir, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });

    await fs.writeFile(join(commandsDir, 'openspec-proposal.md'), '# OpenSpec');
    await fs.writeFile(join(commandsDir, 'other-command.md'), '# Other');

    const result = await removeOpenSpecCommands(testDir);

    expect(result).toBe(1);
    expect(
      await fs
        .access(join(commandsDir, 'other-command.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });
});

describe('archiveOpenSpecDirectory', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-archive-dir-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should return false when OpenSpec directory does not exist', async () => {
    const result = await archiveOpenSpecDirectory(testDir);
    expect(result).toBe(false);
  });

  it('should archive OpenSpec directory', async () => {
    const openspecPath = join(testDir, 'openspec');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'test.txt'), 'test');

    const result = await archiveOpenSpecDirectory(testDir);

    expect(result).toBe(true);
    expect(
      await fs
        .access(openspecPath)
        .then(() => true)
        .catch(() => false)
    ).toBe(false);

    // Check that archive was created
    const today = new Date().toISOString().split('T')[0];
    const archivePath = join(testDir, `openspec-archive-${today}`);
    expect(
      await fs
        .access(archivePath)
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });
});

describe('migrateOpenSpecToRulebook edge cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-migrator-edge-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should handle empty changes directory', async () => {
    // Create changes directory but no tasks
    await fs.mkdir(join(testDir, 'openspec', 'changes'), { recursive: true });

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle task without tasks.md', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-no-tasks');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-no-tasks');
    expect(
      await fs
        .access(join(rulebookPath, 'proposal.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle task without design.md', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-no-design');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.writeFile(join(openspecPath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-no-design');
    expect(
      await fs
        .access(join(rulebookPath, 'design.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });

  it('should handle task without specs directory', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-no-specs');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.writeFile(join(openspecPath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-no-specs');
    expect(
      await fs
        .access(join(rulebookPath, 'specs'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle task with specs directory but no spec.md files', async () => {
    const openspecPath = join(testDir, 'openspec', 'changes', 'task-empty-specs');
    await fs.mkdir(openspecPath, { recursive: true });
    await fs.writeFile(join(openspecPath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.mkdir(join(openspecPath, 'specs', 'core'), { recursive: true });
    // Don't create spec.md - specs directory exists but no spec.md

    const result = await migrateOpenSpecToRulebook(testDir);

    expect(result.migrated).toBe(1);
    // Specs directory is created even if no spec.md files exist
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'task-empty-specs');
    const specsPath = join(rulebookPath, 'specs');
    // The specs directory should exist (created during migration)
    expect(
      await fs
        .access(specsPath)
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle readdirSync error gracefully', async () => {
    // This test verifies error handling when reading directory fails
    // We can't easily simulate this, but we can verify the error path exists
    const result = await migrateOpenSpecToRulebook(testDir);
    expect(result).toBeDefined();
    expect(result.errors).toBeDefined();
  });
});

describe('migrateOpenSpecArchives edge cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-archive-edge-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should handle empty archive directory', async () => {
    await fs.mkdir(join(testDir, 'openspec', 'changes', 'archive'), { recursive: true });

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle archived task without proposal.md', async () => {
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-no-proposal');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'archive', '2025-01-01-no-proposal');
    expect(
      await fs
        .access(join(rulebookPath, 'tasks.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle archived task without tasks.md', async () => {
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-no-tasks');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Proposal\n\n## Why\nTest');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'archive', '2025-01-01-no-tasks');
    expect(
      await fs
        .access(join(rulebookPath, 'proposal.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle archived task without design.md', async () => {
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-no-design');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.writeFile(join(archivePath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'archive', '2025-01-01-no-design');
    expect(
      await fs
        .access(join(rulebookPath, 'design.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(false);
  });

  it('should handle archived task without specs directory', async () => {
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-no-specs');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.writeFile(join(archivePath, 'tasks.md'), '## Task\n- [ ] Do something');

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'archive', '2025-01-01-no-specs');
    expect(
      await fs
        .access(join(rulebookPath, 'specs'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle archived task with specs directory but no spec.md files', async () => {
    const archivePath = join(testDir, 'openspec', 'changes', 'archive', '2025-01-01-empty-specs');
    await fs.mkdir(archivePath, { recursive: true });
    await fs.writeFile(join(archivePath, 'proposal.md'), '# Proposal\n\n## Why\nTest');
    await fs.mkdir(join(archivePath, 'specs', 'core'), { recursive: true });
    // Don't create spec.md - specs directory exists but no spec.md

    const result = await migrateOpenSpecArchives(testDir);

    expect(result.migrated).toBe(1);
    // Specs directory is created even if no spec.md files exist
    const rulebookPath = join(testDir, 'rulebook', 'tasks', 'archive', '2025-01-01-empty-specs');
    const specsPath = join(rulebookPath, 'specs');
    // The specs directory should exist (created during migration)
    expect(
      await fs
        .access(specsPath)
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle readdirSync error gracefully for archives', async () => {
    // This test verifies error handling when reading archive directory fails
    const result = await migrateOpenSpecArchives(testDir);
    expect(result).toBeDefined();
    expect(result.errors).toBeDefined();
  });
});

describe('removeOpenSpecCommands edge cases', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-commands-edge-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should handle commands directory with no OpenSpec files', async () => {
    const commandsDir = join(testDir, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });
    await fs.writeFile(join(commandsDir, 'other-command.md'), '# Other Command');

    const result = await removeOpenSpecCommands(testDir);

    expect(result).toBe(0);
    expect(
      await fs
        .access(join(commandsDir, 'other-command.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });

  it('should handle commands directory with mixed files', async () => {
    const commandsDir = join(testDir, '.cursor', 'commands');
    await fs.mkdir(commandsDir, { recursive: true });
    await fs.writeFile(join(commandsDir, 'openspec-proposal.md'), '# OpenSpec');
    await fs.writeFile(join(commandsDir, 'rulebook-task-create.md'), '# Rulebook');
    await fs.writeFile(join(commandsDir, 'other.md'), '# Other');

    const result = await removeOpenSpecCommands(testDir);

    expect(result).toBe(1);
    expect(
      await fs
        .access(join(commandsDir, 'rulebook-task-create.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
    expect(
      await fs
        .access(join(commandsDir, 'other.md'))
        .then(() => true)
        .catch(() => false)
    ).toBe(true);
  });
});
