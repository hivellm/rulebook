import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { writeState, getStatePath, isManuallyMaintained } from '../src/core/state-writer';

describe('state-writer (v5.3.0 F3)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-state-writer-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  it('creates STATE.md with active task info', async () => {
    const result = await writeState(projectRoot, {
      activeTask: { id: 'phase1_foo', phase: 'phase1', progress: '3/5 items' },
      updatedAt: '2026-04-07T18:00:00Z',
    });

    expect(result.written).toBe(true);
    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('phase1_foo');
    expect(content).toContain('3/5 items');
  });

  it('creates STATE.md with no active task', async () => {
    const result = await writeState(projectRoot, {
      activeTask: null,
      updatedAt: '2026-04-07T18:00:00Z',
    });

    expect(result.written).toBe(true);
    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('No active task');
  });

  it('includes Ralph and health sections when provided', async () => {
    const result = await writeState(projectRoot, {
      activeTask: null,
      lastRalphIteration: 5,
      lastQualityGate: 'type-check ✓, lint ✓, tests ✓',
      healthScore: 87,
      updatedAt: '2026-04-07T18:00:00Z',
    });

    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toContain('Last iteration**: 5');
    expect(content).toContain('type-check ✓');
    expect(content).toContain('87/100');
  });

  it('respects manual: true frontmatter (no-op)', async () => {
    const target = getStatePath(projectRoot);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, '---\nmanual: true\n---\n# My hand-maintained state\n');

    const result = await writeState(projectRoot, {
      activeTask: { id: 'phase1_x', phase: 'phase1', progress: '1/1' },
      updatedAt: '2026-04-07T18:00:00Z',
    });

    expect(result.written).toBe(false);
    const content = await fs.readFile(target, 'utf-8');
    expect(content).toContain('My hand-maintained state');
    expect(content).not.toContain('phase1_x');
  });

  it('isManuallyMaintained returns false when file does not exist', async () => {
    expect(await isManuallyMaintained(projectRoot)).toBe(false);
  });

  it('overwrites a non-manual STATE.md on every call', async () => {
    await writeState(projectRoot, {
      activeTask: { id: 'phase1_a', phase: '1', progress: '0/3' },
      updatedAt: '2026-04-07T18:00:00Z',
    });
    await writeState(projectRoot, {
      activeTask: { id: 'phase1_b', phase: '1', progress: '2/3' },
      updatedAt: '2026-04-07T18:01:00Z',
    });

    const content = await fs.readFile(getStatePath(projectRoot), 'utf-8');
    expect(content).toContain('phase1_b');
    expect(content).not.toContain('phase1_a');
  });

  it('output is under 40 lines', async () => {
    await writeState(projectRoot, {
      activeTask: { id: 'phase1_x', phase: '1', progress: '5/10' },
      lastRalphIteration: 12,
      lastQualityGate: 'all pass',
      healthScore: 92,
      updatedAt: '2026-04-07T18:00:00Z',
    });

    const content = await fs.readFile(getStatePath(projectRoot), 'utf-8');
    expect(content.split('\n').length).toBeLessThan(40);
  });
});
