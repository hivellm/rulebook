import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generateLeanAgents } from '../src/core/generator.js';
import type { ProjectConfig } from '../src/types.js';

let tmpDir: string;

async function setup() {
  tmpDir = await mkdtemp(join(tmpdir(), 'lean-test-'));
  return tmpDir;
}

async function teardown() {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

const baseConfig: ProjectConfig = {
  languages: ['typescript'],
  modules: [],
  frameworks: [],
  ides: [],
  projectType: 'application',
  coverageThreshold: 75,
  strictDocs: true,
  generateWorkflows: false,
  agentsMode: 'lean',
};

describe('generateLeanAgents', () => {
  it('generates AGENTS.md smaller than 3KB', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      expect(Buffer.byteLength(content, 'utf-8')).toBeLessThan(3 * 1024);
    } finally {
      await teardown();
    }
  });

  it('includes RULEBOOK.md reference', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      expect(content).toContain('RULEBOOK.md');
    } finally {
      await teardown();
    }
  });

  it('includes QUALITY_ENFORCEMENT.md reference', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      expect(content).toContain('QUALITY_ENFORCEMENT.md');
    } finally {
      await teardown();
    }
  });

  it('includes GIT.md reference', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      expect(content).toContain('GIT.md');
    } finally {
      await teardown();
    }
  });

  it('includes language spec references', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(
        { ...baseConfig, languages: ['typescript', 'python'] },
        dir
      );
      expect(content).toContain('TYPESCRIPT.md');
      expect(content).toContain('PYTHON.md');
    } finally {
      await teardown();
    }
  });

  it('contains RULEBOOK:START and RULEBOOK:END markers', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      expect(content).toContain('<!-- RULEBOOK:START -->');
      expect(content).toContain('<!-- RULEBOOK:END -->');
    } finally {
      await teardown();
    }
  });

  it('does NOT include full rulebook instructions inline', async () => {
    const dir = await setup();
    try {
      const content = await generateLeanAgents(baseConfig, dir);
      // Lean mode should not contain the verbose inline rules
      expect(content).not.toContain('MANDATORY: All task creation MUST follow Rulebook task management system');
    } finally {
      await teardown();
    }
  });

  it('writes spec files to .rulebook/specs/', async () => {
    const dir = await setup();
    try {
      await generateLeanAgents(baseConfig, dir);
      const { existsSync } = await import('fs');
      // Modular generation still runs, so spec files exist
      expect(existsSync(join(dir, '.rulebook', 'specs', 'RULEBOOK.md'))).toBe(true);
    } finally {
      await teardown();
    }
  });
});
