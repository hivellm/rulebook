import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateHealthScore, getHealthGrade } from '../src/core/health-scorer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('health-scorer', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getHealthGrade', () => {
    it('should return A+ for score >= 90', () => {
      expect(getHealthGrade(95)).toBe('A+');
      expect(getHealthGrade(90)).toBe('A+');
    });

    it('should return A for score >= 80', () => {
      expect(getHealthGrade(85)).toBe('A');
      expect(getHealthGrade(80)).toBe('A');
    });

    it('should return B for score >= 70', () => {
      expect(getHealthGrade(75)).toBe('B');
      expect(getHealthGrade(70)).toBe('B');
    });

    it('should return C for score >= 60', () => {
      expect(getHealthGrade(65)).toBe('C');
      expect(getHealthGrade(60)).toBe('C');
    });

    it('should return D for score >= 50', () => {
      expect(getHealthGrade(55)).toBe('D');
      expect(getHealthGrade(50)).toBe('D');
    });

    it('should return F for score < 50', () => {
      expect(getHealthGrade(40)).toBe('F');
      expect(getHealthGrade(0)).toBe('F');
    });
  });

  describe('calculateHealthScore', () => {
    it('should give low score for empty project', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.overall).toBeLessThan(50);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should give higher score with README and LICENSE', async () => {
      await fs.writeFile(path.join(testDir, 'README.md'), '# Test Project');
      await fs.writeFile(path.join(testDir, 'LICENSE'), 'MIT License');

      const health = await calculateHealthScore(testDir);

      expect(health.categories.documentation).toBeGreaterThan(0);
    });

    it('should score documentation category', async () => {
      // Create documentation files
      await fs.writeFile(path.join(testDir, 'README.md'), '# Project');
      await fs.writeFile(path.join(testDir, 'CHANGELOG.md'), '# Changelog');
      await fs.writeFile(path.join(testDir, 'LICENSE'), 'MIT');
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), '# Agents');
      await fs.mkdir(path.join(testDir, 'docs'));

      const health = await calculateHealthScore(testDir);

      expect(health.categories.documentation).toBeGreaterThan(80);
    });

    it('should score testing category', async () => {
      // Create tests directory
      await fs.mkdir(path.join(testDir, 'tests'));

      // Create test framework config
      const packageJson = {
        name: 'test',
        version: '1.0.0',
        devDependencies: {
          vitest: '^1.0.0',
        },
      };
      await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const health = await calculateHealthScore(testDir);

      expect(health.categories.testing).toBeGreaterThan(0);
    });

    it('should provide recommendations for low scores', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.recommendations.length).toBeGreaterThan(0);
      expect(health.recommendations.some((r) => r.includes('documentation'))).toBe(true);
    });
  });
});
