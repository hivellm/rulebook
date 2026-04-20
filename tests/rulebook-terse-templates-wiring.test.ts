/**
 * Integration tests for phase1_terse-templates-wiring.
 *
 * Verifies that `rulebook init`/`rulebook update` copy the terse skill
 * family into `<project>/.claude/skills/` via the generator pipeline.
 * The real flow runs inside `generateModularAgents`, but the install
 * step is factored into `installSkillsFromSource` + the exported
 * `INVOCABLE_CORE_SKILLS` list, which is what this test exercises.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  installSkillsFromSource,
  INVOCABLE_CORE_SKILLS,
  getTemplatesDir,
} from '../src/core/generator.js';

const ROOT = resolve(__dirname, '..');

describe('phase1_terse-templates-wiring — INVOCABLE_CORE_SKILLS registration', () => {
  it('declares exactly the three terse family skill names', () => {
    expect([...INVOCABLE_CORE_SKILLS].sort()).toEqual([
      'rulebook-terse',
      'rulebook-terse-commit',
      'rulebook-terse-review',
    ]);
  });

  it('each invocable core skill has a matching source directory + SKILL.md', () => {
    for (const name of INVOCABLE_CORE_SKILLS) {
      const skillFile = resolve(ROOT, 'templates', 'skills', 'core', name, 'SKILL.md');
      expect(existsSync(skillFile), `missing ${skillFile}`).toBe(true);
    }
  });
});

describe('phase1_terse-templates-wiring — installSkillsFromSource pipeline', () => {
  let projectRoot: string;
  let targetSkillsDir: string;

  beforeEach(() => {
    projectRoot = join(tmpdir(), `rulebook-terse-wiring-${Date.now()}`);
    mkdirSync(projectRoot, { recursive: true });
    targetSkillsDir = join(projectRoot, '.claude', 'skills');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('copies every filtered core skill to the target .claude/skills/ dir', async () => {
    const sourceDir = join(getTemplatesDir(), 'skills', 'core');
    await installSkillsFromSource(sourceDir, targetSkillsDir, INVOCABLE_CORE_SKILLS);

    for (const name of INVOCABLE_CORE_SKILLS) {
      const target = join(targetSkillsDir, name, 'SKILL.md');
      expect(existsSync(target), `expected ${target} to exist`).toBe(true);
    }
  });

  it('does NOT copy non-invocable core skills (e.g. agent-automation) when filter is set', async () => {
    const sourceDir = join(getTemplatesDir(), 'skills', 'core');
    await installSkillsFromSource(sourceDir, targetSkillsDir, INVOCABLE_CORE_SKILLS);

    expect(existsSync(join(targetSkillsDir, 'agent-automation', 'SKILL.md'))).toBe(false);
    expect(existsSync(join(targetSkillsDir, 'quality-enforcement', 'SKILL.md'))).toBe(false);
    expect(existsSync(join(targetSkillsDir, 'dag', 'SKILL.md'))).toBe(false);
  });

  it('installed SKILL.md contents match the source byte-for-byte', async () => {
    const sourceDir = join(getTemplatesDir(), 'skills', 'core');
    await installSkillsFromSource(sourceDir, targetSkillsDir, INVOCABLE_CORE_SKILLS);

    for (const name of INVOCABLE_CORE_SKILLS) {
      const src = readFileSync(join(sourceDir, name, 'SKILL.md'), 'utf8');
      const dst = readFileSync(join(targetSkillsDir, name, 'SKILL.md'), 'utf8');
      expect(dst).toBe(src);
    }
  });

  it('is idempotent — running twice produces the same tree', async () => {
    const sourceDir = join(getTemplatesDir(), 'skills', 'core');
    await installSkillsFromSource(sourceDir, targetSkillsDir, INVOCABLE_CORE_SKILLS);
    await installSkillsFromSource(sourceDir, targetSkillsDir, INVOCABLE_CORE_SKILLS);

    for (const name of INVOCABLE_CORE_SKILLS) {
      const target = join(targetSkillsDir, name, 'SKILL.md');
      expect(existsSync(target)).toBe(true);
    }
  });

  it('no filter means copy everything in the source dir (dev skills behavior preserved)', async () => {
    const devSource = join(getTemplatesDir(), 'skills', 'dev');
    await installSkillsFromSource(devSource, targetSkillsDir);

    // dev/ has ~15 skills — sample a couple known ones instead of full enum.
    expect(existsSync(join(targetSkillsDir, 'architect', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(targetSkillsDir, 'debug', 'SKILL.md'))).toBe(true);
  });

  it('skips non-existent source directory without throwing', async () => {
    const bogus = join(tmpdir(), `does-not-exist-${Date.now()}`);
    await expect(
      installSkillsFromSource(bogus, targetSkillsDir, INVOCABLE_CORE_SKILLS)
    ).resolves.not.toThrow();
    // And did not create the target on the empty pass
    expect(existsSync(join(targetSkillsDir, 'rulebook-terse'))).toBe(false);
  });
});

describe('phase1_terse-templates-wiring — autoDetectSkills includes terse family', () => {
  it('terse family skills are in the auto-detected list for fresh projects', async () => {
    const { SkillsManager } = await import('../src/core/skills-manager.js');
    const mgr = new SkillsManager(resolve(ROOT, 'templates'));
    const detected = await mgr.autoDetectSkills({
      languages: ['typescript'],
      frameworks: [],
      modules: [],
      services: [],
    });

    // Core skills are always included per skills-manager contract.
    // The skill IDs use the form `core/<name>`.
    for (const name of INVOCABLE_CORE_SKILLS) {
      expect(
        detected.some((id) => id === `core/${name}` || id.endsWith(`/${name}`)),
        `expected detected to include terse family member ${name}, got ${detected.join(', ')}`
      ).toBe(true);
    }
  });
});
