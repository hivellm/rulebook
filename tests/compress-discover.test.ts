/**
 * Unit tests for `src/core/compress/discover.ts`.
 *
 * Verifies listCompressCandidates walks the right set of root files
 * and .rulebook/ subpaths and reports backup state correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listCompressCandidates } from '../src/core/compress/discover.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-compress-discover-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('compress-discover — listCompressCandidates', () => {
  it('empty project returns empty candidate list', async () => {
    const result = await listCompressCandidates(projectRoot);
    expect(result).toEqual([]);
  });

  it('picks up root memory files (CLAUDE.md, AGENTS.md, AGENTS.override.md)', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), '# Claude');
    writeFileSync(join(projectRoot, 'AGENTS.md'), '# Agents');
    writeFileSync(join(projectRoot, 'AGENTS.override.md'), '# Override');

    const result = await listCompressCandidates(projectRoot);
    const names = result.map((c) => c.relPath).sort();
    expect(names).toEqual(['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md']);
  });

  it('picks up .rulebook/PLANS.md and STATE.md', async () => {
    const rb = join(projectRoot, '.rulebook');
    mkdirSync(rb, { recursive: true });
    writeFileSync(join(rb, 'PLANS.md'), '# Plans');
    writeFileSync(join(rb, 'STATE.md'), '# State');

    const result = await listCompressCandidates(projectRoot);
    const names = result.map((c) => c.relPath.replace(/\\/g, '/')).sort();
    expect(names).toContain('.rulebook/PLANS.md');
    expect(names).toContain('.rulebook/STATE.md');
  });

  it('walks .rulebook/knowledge/ and .rulebook/learnings/ recursively for .md files', async () => {
    const kn = join(projectRoot, '.rulebook', 'knowledge');
    const le = join(projectRoot, '.rulebook', 'learnings');
    mkdirSync(join(kn, 'patterns'), { recursive: true });
    mkdirSync(le, { recursive: true });
    writeFileSync(join(kn, 'patterns', 'p1.md'), '# P1');
    writeFileSync(join(le, 'l1.md'), '# L1');

    const result = await listCompressCandidates(projectRoot);
    const names = result.map((c) => c.relPath.replace(/\\/g, '/'));
    expect(names.some((n) => n.endsWith('p1.md'))).toBe(true);
    expect(names.some((n) => n.endsWith('l1.md'))).toBe(true);
  });

  it('skips *.original.md backup files from the candidate list', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), '# Claude');
    writeFileSync(join(projectRoot, 'CLAUDE.original.md'), '# Claude original');
    mkdirSync(join(projectRoot, '.rulebook', 'knowledge'), { recursive: true });
    writeFileSync(join(projectRoot, '.rulebook', 'knowledge', 'x.md'), '# X');
    writeFileSync(join(projectRoot, '.rulebook', 'knowledge', 'x.original.md'), '# X backup');

    const result = await listCompressCandidates(projectRoot);
    const names = result.map((c) => c.relPath);
    expect(names).toContain('CLAUDE.md');
    expect(names.filter((n) => n.includes('.original'))).toHaveLength(0);
  });

  it('reports backup state + ratio when a backup exists', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), 'compressed');
    writeFileSync(join(projectRoot, 'CLAUDE.original.md'), 'original original original');

    const result = await listCompressCandidates(projectRoot);
    const claude = result.find((c) => c.relPath === 'CLAUDE.md');
    expect(claude?.hasBackup).toBe(true);
    expect(claude?.backupBytes).toBe(Buffer.byteLength('original original original', 'utf8'));
    expect(claude?.backupRatio).toBeLessThan(1);
  });

  it('sorts results by size descending (largest first)', async () => {
    writeFileSync(join(projectRoot, 'CLAUDE.md'), 'x'.repeat(100));
    writeFileSync(join(projectRoot, 'AGENTS.md'), 'y'.repeat(5000));
    writeFileSync(join(projectRoot, 'AGENTS.override.md'), 'z'.repeat(1000));

    const result = await listCompressCandidates(projectRoot);
    expect(result[0].bytes).toBeGreaterThan(result[1].bytes);
    expect(result[1].bytes).toBeGreaterThan(result[2].bytes);
  });

  it('silent-fails on missing directories', async () => {
    mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
    // knowledge/ and learnings/ not created — walker should just skip.
    const result = await listCompressCandidates(projectRoot);
    expect(Array.isArray(result)).toBe(true);
  });
});
