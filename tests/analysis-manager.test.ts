import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createAnalysis, listAnalyses, showAnalysis, slugify } from '../src/core/analysis-manager';

describe('analysis-manager (v5.3.0 F-NEW-4)', () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-analysis-'));
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe('slugify', () => {
    it('lowercases and replaces special chars', () => {
      expect(slugify('Auth Refactor v2')).toBe('auth-refactor-v2');
    });

    it('deduplicates hyphens', () => {
      expect(slugify('perf -- startup')).toBe('perf-startup');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('  --foo--  ')).toBe('foo');
    });

    it('truncates to 80 chars', () => {
      const long = 'a'.repeat(100);
      expect(slugify(long).length).toBe(80);
    });
  });

  describe('createAnalysis', () => {
    it('creates the analysis directory with skeleton files', async () => {
      const result = await createAnalysis(projectRoot, { topic: 'Perf Startup' });

      expect(result.slug).toBe('perf-startup');
      expect(result.dir).toBe(path.join(projectRoot, 'docs', 'analysis', 'perf-startup'));
      expect(result.files.length).toBeGreaterThanOrEqual(4);

      const readme = await fs.readFile(path.join(result.dir, 'README.md'), 'utf-8');
      expect(readme).toContain('Analysis: Perf Startup');

      const findings = await fs.readFile(path.join(result.dir, 'findings.md'), 'utf-8');
      expect(findings).toContain('F-001');

      const plan = await fs.readFile(path.join(result.dir, 'execution-plan.md'), 'utf-8');
      expect(plan).toContain('Phase 1');

      const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf-8'));
      expect(manifest.slug).toBe('perf-startup');
      expect(manifest.topic).toBe('Perf Startup');
    });

    it('is idempotent: re-running does not overwrite existing content files', async () => {
      await createAnalysis(projectRoot, { topic: 'Test Topic' });
      const readmePath = path.join(projectRoot, 'docs', 'analysis', 'test-topic', 'README.md');
      await fs.writeFile(readmePath, '# Customized by user\n');

      await createAnalysis(projectRoot, { topic: 'Test Topic' });
      const after = await fs.readFile(readmePath, 'utf-8');
      expect(after).toBe('# Customized by user\n');
    });

    it('updates manifest.json even on re-run', async () => {
      const r1 = await createAnalysis(projectRoot, { topic: 'X' });
      const m1 = JSON.parse(await fs.readFile(r1.manifestPath, 'utf-8'));

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      const r2 = await createAnalysis(projectRoot, { topic: 'X' });
      const m2 = JSON.parse(await fs.readFile(r2.manifestPath, 'utf-8'));

      expect(m2.createdAt).not.toBe(m1.createdAt);
    });
  });

  describe('listAnalyses', () => {
    it('returns empty array when docs/analysis/ does not exist', async () => {
      const result = await listAnalyses(projectRoot);
      expect(result).toEqual([]);
    });

    it('lists analyses sorted by createdAt descending', async () => {
      await createAnalysis(projectRoot, { topic: 'First' });
      await new Promise((r) => setTimeout(r, 10));
      await createAnalysis(projectRoot, { topic: 'Second' });

      const result = await listAnalyses(projectRoot);
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('second');
      expect(result[1].slug).toBe('first');
    });
  });

  describe('showAnalysis', () => {
    it('returns null for non-existent slug', async () => {
      const result = await showAnalysis(projectRoot, 'does-not-exist');
      expect(result).toBeNull();
    });

    it('returns full content for an existing analysis', async () => {
      await createAnalysis(projectRoot, { topic: 'Show Test' });
      const result = await showAnalysis(projectRoot, 'show-test');
      expect(result).not.toBeNull();
      expect(result!.slug).toBe('show-test');
      expect(result!.readme).toContain('Analysis: Show Test');
      expect(result!.findings).toContain('F-001');
      expect(result!.plan).toContain('Phase 1');
    });
  });
});
