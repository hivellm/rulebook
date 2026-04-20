/**
 * Integration tests for phase1_terse-skill-source.
 *
 * Load the `rulebook-terse` SKILL.md through the project's own
 * `SkillsManager.discoverSkills()` pipeline — the same code path used
 * by `rulebook init` / `rulebook update` to surface skills to user
 * projects. If discovery finds the skill with the right category and
 * valid frontmatter, the skill will be installable without extra
 * wiring. That's the invariant phase 1.1 promises.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { SkillsManager, parseSkillFrontmatter } from '../src/core/skills-manager.js';
import { readFileSync } from 'node:fs';
import type { Skill } from '../src/types.js';

const TEMPLATES_PATH = resolve(__dirname, '..', 'templates');

describe('phase1_terse-skill-source — SkillsManager integration', () => {
  let discovered: Skill[];
  let terse: Skill | undefined;

  beforeAll(async () => {
    const mgr = new SkillsManager(TEMPLATES_PATH);
    const index = await mgr.discoverSkills();
    discovered = index.skills;
    terse = discovered.find(
      (s) => /rulebook-terse$/i.test(s.id) || s.metadata.name === 'Rulebook Terse'
    );
  });

  it('SkillsManager discovers the base rulebook-terse skill', () => {
    expect(terse).toBeDefined();
  });

  it('skill is categorized as core', () => {
    expect(terse?.category).toBe('core');
  });

  it('skill exposes name + description from frontmatter', () => {
    expect(terse?.metadata.name).toBe('Rulebook Terse');
    expect(terse?.metadata.description).toBeTruthy();
    expect(terse!.metadata.description!.length).toBeGreaterThan(40);
  });

  it('skill description contains at least one natural-language activation trigger', () => {
    const desc = (terse?.metadata.description ?? '').toLowerCase();
    const triggers = ['terse', 'less tokens', 'be brief', '/rulebook-terse', 'token'];
    const matched = triggers.filter((t) => desc.includes(t));
    expect(matched.length).toBeGreaterThan(0);
  });

  it('skill has a version field', () => {
    expect(terse?.metadata.version).toBeTruthy();
  });

  it('skill has category=core in metadata + core tag', () => {
    expect(terse?.metadata.category).toBe('core');
    expect(terse?.metadata.tags).toContain('core');
  });

  it('skill body survives round-trip through the frontmatter parser', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse/SKILL.md'),
      'utf8'
    );
    const { metadata, body } = parseSkillFrontmatter(raw);
    expect(metadata.name).toBe('Rulebook Terse');
    expect(body).toMatch(/## Persistence/);
    expect(body).toMatch(/## Rules/);
    expect(body).toMatch(/## Intensity/);
    expect(body).toMatch(/## Auto-Clarity/);
    expect(body).toMatch(/## Boundaries/);
  });

  it('skill has no dependencies and no conflicts (stands alone)', () => {
    // The YAML parser treats `dependencies: []` as an array containing a single
    // empty string. Treat either form as "no dependencies".
    const isEmpty = (arr: string[] | undefined) =>
      !arr || arr.length === 0 || (arr.length === 1 && arr[0] === '');
    expect(isEmpty(terse?.metadata.dependencies)).toBe(true);
    expect(isEmpty(terse?.metadata.conflicts)).toBe(true);
  });

  it('every intensity level has a row in the intensity table AND a worked example', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse/SKILL.md'),
      'utf8'
    );
    for (const level of ['off', 'brief', 'terse', 'ultra']) {
      // Intensity table row: | **level** | ...
      expect(raw).toMatch(new RegExp(`\\|\\s*\\*\\*${level}\\*\\*\\s*\\|`));
      // Worked example line: - **level**: "..."
      expect(raw).toMatch(new RegExp(`-\\s*\\*\\*${level}\\*\\*\\s*:\\s*"`));
    }
  });
});
