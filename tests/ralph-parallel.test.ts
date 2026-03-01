import { describe, it, expect } from 'vitest';
import {
  analyzeDependencies,
  partitionForParallel,
  detectFileConflicts,
  buildParallelBatches,
} from '../src/core/ralph-parallel.js';
import type { PRDUserStory } from '../src/types.js';

/**
 * Factory helper — creates a PRDUserStory with sensible defaults.
 */
function makeStory(overrides: Partial<PRDUserStory> & { id: string }): PRDUserStory {
  return {
    title: `Story ${overrides.id}`,
    description: '',
    acceptanceCriteria: [],
    priority: 1,
    passes: false,
    notes: '',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// analyzeDependencies
// ─────────────────────────────────────────────────────────
describe('analyzeDependencies', () => {
  it('should detect a dependency when description references another story ID', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'Set up the database schema' }),
      makeStory({ id: 'US-002', description: 'Depends on US-001 for the schema' }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-001')).toEqual([]);
    expect(deps.get('US-002')).toEqual(['US-001']);
  });

  it('should detect a dependency in notes', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'GH-10', description: 'Create auth module' }),
      makeStory({ id: 'GH-11', notes: 'Requires GH-10 to be done first' }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('GH-11')).toEqual(['GH-10']);
  });

  it('should detect a dependency in acceptanceCriteria', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'Base API setup' }),
      makeStory({
        id: 'US-002',
        acceptanceCriteria: ['Must integrate with US-001 endpoints'],
      }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-002')).toEqual(['US-001']);
  });

  it('should return empty dependencies when no IDs are referenced', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'Standalone feature' }),
      makeStory({ id: 'US-002', description: 'Another standalone feature' }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-001')).toEqual([]);
    expect(deps.get('US-002')).toEqual([]);
  });

  it('should not create a self-dependency when story mentions its own ID', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'This is US-001, implementing feature X' }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-001')).toEqual([]);
  });

  it('should ignore references to IDs not in the story set', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'Mentions US-999 which does not exist' }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-001')).toEqual([]);
  });

  it('should detect multiple dependencies in a single story', () => {
    const stories: PRDUserStory[] = [
      makeStory({ id: 'US-001', description: 'Auth module' }),
      makeStory({ id: 'US-002', description: 'Database setup' }),
      makeStory({
        id: 'US-003',
        description: 'Needs US-001 for auth and US-002 for database',
      }),
    ];

    const deps = analyzeDependencies(stories);

    expect(deps.get('US-003')).toEqual(['US-001', 'US-002']);
  });
});

// ─────────────────────────────────────────────────────────
// partitionForParallel
// ─────────────────────────────────────────────────────────
describe('partitionForParallel', () => {
  it('should place 4 independent stories into 2 batches when maxWorkers=2', () => {
    const stories = [
      makeStory({ id: 'US-001' }),
      makeStory({ id: 'US-002' }),
      makeStory({ id: 'US-003' }),
      makeStory({ id: 'US-004' }),
    ];

    const deps = new Map<string, string[]>([
      ['US-001', []],
      ['US-002', []],
      ['US-003', []],
      ['US-004', []],
    ]);

    const batches = partitionForParallel(stories, 2, deps);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(2);
    expect(batches[1]).toHaveLength(2);
  });

  it('should put dependent story in later batch', () => {
    const stories = [
      makeStory({ id: 'US-001' }),
      makeStory({ id: 'US-002' }),
      makeStory({ id: 'US-003' }),
    ];

    // US-003 depends on US-001
    const deps = new Map<string, string[]>([
      ['US-001', []],
      ['US-002', []],
      ['US-003', ['US-001']],
    ]);

    const batches = partitionForParallel(stories, 3, deps);

    // US-001 and US-002 can run in batch 1
    // US-003 must wait for US-001 (batch 2)
    expect(batches.length).toBeGreaterThanOrEqual(2);

    const batch1Ids = batches[0].map((s) => s.id);
    expect(batch1Ids).toContain('US-001');
    expect(batch1Ids).toContain('US-002');
    expect(batch1Ids).not.toContain('US-003');

    // US-003 should be in a later batch
    const laterBatchIds = batches.slice(1).flatMap((b) => b.map((s) => s.id));
    expect(laterBatchIds).toContain('US-003');
  });

  it('should put all independent stories in one batch when maxWorkers >= story count', () => {
    const stories = [
      makeStory({ id: 'US-001' }),
      makeStory({ id: 'US-002' }),
      makeStory({ id: 'US-003' }),
    ];

    const deps = new Map<string, string[]>([
      ['US-001', []],
      ['US-002', []],
      ['US-003', []],
    ]);

    const batches = partitionForParallel(stories, 5, deps);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
  });

  it('should handle circular dependencies by placing them in a fallback batch', () => {
    const stories = [
      makeStory({ id: 'US-001' }),
      makeStory({ id: 'US-002' }),
    ];

    // Circular: US-001 depends on US-002 and vice versa
    const deps = new Map<string, string[]>([
      ['US-001', ['US-002']],
      ['US-002', ['US-001']],
    ]);

    const batches = partitionForParallel(stories, 2, deps);

    // Both should still be placed (fallback mechanism)
    const allIds = batches.flatMap((b) => b.map((s) => s.id));
    expect(allIds).toContain('US-001');
    expect(allIds).toContain('US-002');
  });

  it('should return empty array for empty input', () => {
    const batches = partitionForParallel([], 3, new Map());
    expect(batches).toEqual([]);
  });

  it('should handle a chain A -> B -> C as 3 separate batches', () => {
    const stories = [
      makeStory({ id: 'US-001' }),
      makeStory({ id: 'US-002' }),
      makeStory({ id: 'US-003' }),
    ];

    const deps = new Map<string, string[]>([
      ['US-001', []],
      ['US-002', ['US-001']],
      ['US-003', ['US-002']],
    ]);

    const batches = partitionForParallel(stories, 3, deps);

    // Should be 3 sequential batches
    expect(batches).toHaveLength(3);
    expect(batches[0].map((s) => s.id)).toEqual(['US-001']);
    expect(batches[1].map((s) => s.id)).toEqual(['US-002']);
    expect(batches[2].map((s) => s.id)).toEqual(['US-003']);
  });
});

// ─────────────────────────────────────────────────────────
// detectFileConflicts
// ─────────────────────────────────────────────────────────
describe('detectFileConflicts', () => {
  it('should detect conflict when both stories mention the same files', () => {
    const story1 = makeStory({
      id: 'US-001',
      description: 'Modify `src/core/auth.ts` and `src/core/user.ts`',
    });
    const story2 = makeStory({
      id: 'US-002',
      description: 'Update `src/core/auth.ts` and `src/core/user.ts` for new API',
    });

    expect(detectFileConflicts(story1, story2)).toBe(true);
  });

  it('should not detect conflict when stories mention no files', () => {
    const story1 = makeStory({
      id: 'US-001',
      description: 'Add a new feature for user authentication',
    });
    const story2 = makeStory({
      id: 'US-002',
      description: 'Implement caching layer',
    });

    expect(detectFileConflicts(story1, story2)).toBe(false);
  });

  it('should not detect conflict when stories mention different files', () => {
    const story1 = makeStory({
      id: 'US-001',
      description: 'Modify `src/auth.ts` and `src/login.ts`',
    });
    const story2 = makeStory({
      id: 'US-002',
      description: 'Modify `src/cache.ts` and `src/database.ts`',
    });

    expect(detectFileConflicts(story1, story2)).toBe(false);
  });

  it('should not detect conflict when only one file overlaps (threshold is > 1)', () => {
    const story1 = makeStory({
      id: 'US-001',
      description: 'Modify `src/shared.ts` and `src/auth.ts`',
    });
    const story2 = makeStory({
      id: 'US-002',
      description: 'Modify `src/shared.ts` and `src/cache.ts`',
    });

    expect(detectFileConflicts(story1, story2)).toBe(false);
  });

  it('should detect conflict across description, notes, and acceptanceCriteria', () => {
    const story1 = makeStory({
      id: 'US-001',
      description: 'Change `src/api/routes.ts`',
      notes: 'Also touches `src/api/middleware.ts`',
    });
    const story2 = makeStory({
      id: 'US-002',
      acceptanceCriteria: [
        'Must update `src/api/routes.ts`',
        'Must update `src/api/middleware.ts`',
      ],
    });

    expect(detectFileConflicts(story1, story2)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// buildParallelBatches
// ─────────────────────────────────────────────────────────
describe('buildParallelBatches', () => {
  it('should split 4 independent stories into 2 batches with maxWorkers=2', () => {
    const stories = [
      makeStory({ id: 'US-001', description: 'Feature A' }),
      makeStory({ id: 'US-002', description: 'Feature B' }),
      makeStory({ id: 'US-003', description: 'Feature C' }),
      makeStory({ id: 'US-004', description: 'Feature D' }),
    ];

    const batches = buildParallelBatches(stories, 2);

    expect(batches.length).toBeGreaterThanOrEqual(2);
    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(2);
    }

    // All stories should appear exactly once
    const allIds = batches.flatMap((b) => b.map((s) => s.id));
    expect(allIds.sort()).toEqual(['US-001', 'US-002', 'US-003', 'US-004']);
  });

  it('should create sequential batches for a dependency chain A -> B -> C', () => {
    const stories = [
      makeStory({ id: 'US-001', description: 'Base setup' }),
      makeStory({ id: 'US-002', description: 'Extends US-001' }),
      makeStory({ id: 'US-003', description: 'Depends on US-002' }),
    ];

    const batches = buildParallelBatches(stories, 3);

    // Should be 3 sequential single-story batches
    expect(batches).toHaveLength(3);
    expect(batches[0].map((s) => s.id)).toEqual(['US-001']);
    expect(batches[1].map((s) => s.id)).toEqual(['US-002']);
    expect(batches[2].map((s) => s.id)).toEqual(['US-003']);
  });

  it('should separate file-conflicting stories into different batches', () => {
    const stories = [
      makeStory({
        id: 'US-001',
        description: 'Modify `src/core/auth.ts` and `src/core/user.ts`',
      }),
      makeStory({
        id: 'US-002',
        description: 'Update `src/core/auth.ts` and `src/core/user.ts`',
      }),
    ];

    const batches = buildParallelBatches(stories, 2);

    // Should be 2 separate batches because of file conflicts
    expect(batches.length).toBeGreaterThanOrEqual(2);
    // Each batch should have at most 1 story from these conflicting ones
    for (const batch of batches) {
      const conflictIds = batch
        .filter((s) => s.id === 'US-001' || s.id === 'US-002')
        .map((s) => s.id);
      expect(conflictIds.length).toBeLessThanOrEqual(1);
    }
  });

  it('should return empty array for empty input', () => {
    const batches = buildParallelBatches([], 3);
    expect(batches).toEqual([]);
  });

  it('should handle single story', () => {
    const stories = [makeStory({ id: 'US-001', description: 'Solo story' })];

    const batches = buildParallelBatches(stories, 3);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0][0].id).toBe('US-001');
  });

  it('should combine dependency ordering and file-conflict splitting', () => {
    // US-001 is independent
    // US-002 depends on US-001
    // US-003 is independent but conflicts with US-001 on files
    const stories = [
      makeStory({
        id: 'US-001',
        description: 'Create `src/db/schema.ts` and `src/db/migrate.ts`',
      }),
      makeStory({
        id: 'US-002',
        description: 'Depends on US-001 for the schema',
      }),
      makeStory({
        id: 'US-003',
        description: 'Modify `src/db/schema.ts` and `src/db/migrate.ts`',
      }),
    ];

    const batches = buildParallelBatches(stories, 3);

    // US-001 and US-003 conflict on files, so they cannot be in the same batch
    // US-002 depends on US-001, so it goes after US-001
    // All stories should be placed
    const allIds = batches.flatMap((b) => b.map((s) => s.id));
    expect(allIds.sort()).toEqual(['US-001', 'US-002', 'US-003']);

    // US-001 must come before US-002
    const batch1Ids = batches[0].map((s) => s.id);
    const us001BatchIndex = batches.findIndex((b) => b.some((s) => s.id === 'US-001'));
    const us002BatchIndex = batches.findIndex((b) => b.some((s) => s.id === 'US-002'));
    expect(us001BatchIndex).toBeLessThan(us002BatchIndex);

    // US-001 and US-003 should not be in the same batch
    for (const batch of batches) {
      const ids = batch.map((s) => s.id);
      const hasUS001 = ids.includes('US-001');
      const hasUS003 = ids.includes('US-003');
      expect(hasUS001 && hasUS003).toBe(false);
    }
  });
});
