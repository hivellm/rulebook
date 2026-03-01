import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateHealthScore, getHealthGrade } from '../src/core/health-scorer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

// Mock child_process to prevent actual command execution
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, options, callback) => {
    // Return safe default for npm audit
    if (cmd.includes('npm audit')) {
      const result = {
        stdout: JSON.stringify({ metadata: { vulnerabilities: { total: 0 } } }),
        stderr: '',
      };
      if (callback) callback(null, result.stdout, result.stderr);
      return result;
    }
    // Return empty for git commands
    const result = { stdout: '', stderr: '' };
    if (callback) callback(null, result.stdout, result.stderr);
    return result;
  }),
}));

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

      expect(health.overall).toBeLessThan(60);
      expect(health.recommendations.length).toBeGreaterThan(0);
    }, 10000); // 10 second timeout

    it('should give higher score with README and LICENSE', async () => {
      await fs.writeFile(path.join(testDir, 'README.md'), '# Test Project');
      await fs.writeFile(path.join(testDir, 'LICENSE'), 'MIT License');

      const health = await calculateHealthScore(testDir);

      expect(health.categories.documentation).toBeGreaterThan(0);
    }, 10000); // 10 second timeout

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
    }, 10000); // Increased timeout to 10 seconds

    it('should provide recommendations for low scores', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.recommendations.length).toBeGreaterThan(0);
      expect(health.recommendations.some((r) => r.toLowerCase().includes('documentation'))).toBe(
        true
      );
    });

    it('should include grade as a string', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.grade).toBeDefined();
      expect(typeof health.grade).toBe('string');
      expect(['A+', 'A', 'B', 'C', 'D', 'F']).toContain(health.grade);
    });

    it('should include breakdown object', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.breakdown).toBeDefined();
      expect(health.breakdown.agentsMdQuality).toBeDefined();
      expect(health.breakdown.readmeQuality).toBeDefined();
      expect(health.breakdown.ralphProgress).toBeDefined();
      expect(health.breakdown.memoryActivity).toBeDefined();
    });

    it('should return agentsMdQuality score of 0 for empty dir', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.breakdown.agentsMdQuality.score).toBe(0);
      expect(health.breakdown.agentsMdQuality.wordCount).toBe(0);
      expect(health.breakdown.agentsMdQuality.specReferences).toBe(0);
      expect(health.breakdown.agentsMdQuality.requiredSections).toBe(0);
    });

    it('should return ralphProgress score of 0 for empty dir', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.breakdown.ralphProgress.score).toBe(0);
      expect(health.breakdown.ralphProgress.totalStories).toBe(0);
      expect(health.breakdown.ralphProgress.completedStories).toBe(0);
      expect(health.breakdown.ralphProgress.passRate).toBe(0);
    });

    it('should include new category fields', async () => {
      const health = await calculateHealthScore(testDir);

      expect(health.categories.agentsMd).toBeDefined();
      expect(typeof health.categories.agentsMd).toBe('number');
      expect(health.categories.ralph).toBeDefined();
      expect(typeof health.categories.ralph).toBe('number');
      expect(health.categories.memory).toBeDefined();
      expect(typeof health.categories.memory).toBe('number');
    });

    it('should score agentsMd when AGENTS.md has rich content', async () => {
      // Create AGENTS.md with >500 words, 3+ spec references, all required sections
      const agentsContent = [
        '# AGENTS.md',
        '',
        '## Ralph Autonomous Loop',
        'This section covers the ralph autonomous loop configuration. ' +
          'It is important to set up correctly for the project to work.',
        '',
        '## Quality Enforcement',
        'All code must pass quality gates. Linting, type checking, and testing ' +
          'are enforced by pre-commit hooks.',
        '',
        '## Git Workflow',
        'Follow the git branching strategy outlined below.',
        '',
        '## Spec References',
        'See .rulebook/specs/TYPESCRIPT.md for TypeScript standards.',
        'See .rulebook/specs/QUALITY.md for quality gates.',
        'See .rulebook/specs/GIT.md for git workflow.',
        '',
        // Pad to exceed 500 words
        ...Array(60).fill(
          'Additional context about the project structure and conventions used throughout.'
        ),
      ].join('\n');

      await fs.writeFile(path.join(testDir, 'AGENTS.md'), agentsContent);

      const health = await calculateHealthScore(testDir);

      expect(health.categories.agentsMd).toBeGreaterThan(50);
      expect(health.breakdown.agentsMdQuality.wordCount).toBeGreaterThan(500);
      expect(health.breakdown.agentsMdQuality.specReferences).toBeGreaterThanOrEqual(3);
      expect(health.breakdown.agentsMdQuality.requiredSections).toBe(3);
    });

    it('should score ralph when PRD has completed stories', async () => {
      const prdDir = path.join(testDir, '.rulebook', 'ralph');
      await fs.mkdir(prdDir, { recursive: true });

      const prd = {
        project: 'test',
        branchName: 'ralph/test',
        description: 'Test project',
        userStories: [
          { id: 'US-001', title: 'Story 1', passes: true },
          { id: 'US-002', title: 'Story 2', passes: true },
          { id: 'US-003', title: 'Story 3', passes: false },
          { id: 'US-004', title: 'Story 4', passes: true },
        ],
      };

      await fs.writeFile(path.join(prdDir, 'prd.json'), JSON.stringify(prd));

      const health = await calculateHealthScore(testDir);

      expect(health.categories.ralph).toBe(75);
      expect(health.breakdown.ralphProgress.totalStories).toBe(4);
      expect(health.breakdown.ralphProgress.completedStories).toBe(3);
      expect(health.breakdown.ralphProgress.passRate).toBe(0.75);
    });

    it('should score memory when database exists', async () => {
      const memoryDir = path.join(testDir, '.rulebook', 'memory');
      await fs.mkdir(memoryDir, { recursive: true });

      // Create a fake DB file (10KB -> ~20 estimated records)
      const fakeDb = Buffer.alloc(10000, 0);
      await fs.writeFile(path.join(memoryDir, 'memory.db'), fakeDb);

      const health = await calculateHealthScore(testDir);

      expect(health.categories.memory).toBeGreaterThan(50);
      expect(health.breakdown.memoryActivity.dbExists).toBe(true);
      expect(health.breakdown.memoryActivity.recordCount).toBeGreaterThan(0);
    });

    it('should score readmeQuality breakdown for rich README', async () => {
      const readmeContent = [
        '# Test Project',
        '',
        '## Installation',
        'Run npm install to get started.',
        '',
        '## Usage',
        'Use the CLI to run commands.',
        '',
        '## Contributing',
        'Contributions are welcome!',
        '',
        '## License',
        'MIT',
        '',
        '## FAQ',
        'Frequently asked questions.',
      ].join('\n');

      await fs.writeFile(path.join(testDir, 'README.md'), readmeContent);

      const health = await calculateHealthScore(testDir);

      expect(health.breakdown.readmeQuality.sectionCount).toBeGreaterThanOrEqual(5);
      expect(health.breakdown.readmeQuality.hasRequiredSections).toBe(true);
      expect(health.breakdown.readmeQuality.hasPlaceholders).toBe(false);
      expect(health.breakdown.readmeQuality.score).toBeGreaterThanOrEqual(70);
    });
  });
});
