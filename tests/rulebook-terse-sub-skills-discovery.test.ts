/**
 * Integration tests for phase1_terse-sub-skills.
 *
 * The commit + review sub-skills must be discoverable independently
 * of the base rulebook-terse skill, carry their own name, description,
 * and activation triggers, and NOT claim any dependency on the base
 * skill (they must stand alone so users can enable one without the
 * other).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { SkillsManager, parseSkillFrontmatter } from '../src/core/skills-manager.js';
import { readFileSync } from 'node:fs';
import type { Skill } from '../src/types.js';

const TEMPLATES_PATH = resolve(__dirname, '..', 'templates');

function findSkill(skills: Skill[], name: string): Skill | undefined {
  return skills.find((s) => s.metadata.name === name);
}

describe('phase1_terse-sub-skills — commit sub-skill', () => {
  let commit: Skill | undefined;

  beforeAll(async () => {
    const mgr = new SkillsManager(TEMPLATES_PATH);
    const index = await mgr.discoverSkills();
    commit = findSkill(index.skills, 'Rulebook Terse Commit');
  });

  it('SkillsManager discovers the commit sub-skill', () => {
    expect(commit).toBeDefined();
  });

  it('commit sub-skill is in core category', () => {
    expect(commit?.category).toBe('core');
  });

  it('commit sub-skill has its own independent identity', () => {
    expect(commit?.metadata.name).toBe('Rulebook Terse Commit');
    expect(commit?.metadata.name).not.toBe('Rulebook Terse');
  });

  it('commit description references commit/git activation triggers', () => {
    const desc = (commit?.metadata.description ?? '').toLowerCase();
    expect(desc).toMatch(/commit/);
  });

  it('commit sub-skill body enforces Conventional Commits + ≤50 char subject', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-commit/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body.toLowerCase()).toMatch(/conventional commits/);
    expect(body).toMatch(/feat|fix|refactor|perf|docs|test|chore/);
    expect(body).toMatch(/≤50|50 chars|50 char/);
  });

  it('commit sub-skill has a never-include list AND rejects AI attribution', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-commit/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body.toLowerCase()).toMatch(/never include/);
    expect(body.toLowerCase()).toMatch(/ai attribution|generated with claude/);
  });

  it('commit sub-skill has Auto-Clarity section covering breaking changes', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-commit/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body).toMatch(/## Auto-Clarity/);
    expect(body.toLowerCase()).toMatch(/breaking change/);
  });

  it('commit sub-skill stands alone (no dependency on base terse skill)', () => {
    const deps = (commit?.metadata.dependencies ?? []).filter((d) => d.trim().length > 0);
    expect(deps.some((d) => /rulebook-terse/i.test(d) && !/commit/i.test(d))).toBe(false);
  });
});

describe('phase1_terse-sub-skills — review sub-skill', () => {
  let review: Skill | undefined;

  beforeAll(async () => {
    const mgr = new SkillsManager(TEMPLATES_PATH);
    const index = await mgr.discoverSkills();
    review = findSkill(index.skills, 'Rulebook Terse Review');
  });

  it('SkillsManager discovers the review sub-skill', () => {
    expect(review).toBeDefined();
  });

  it('review sub-skill is in core category', () => {
    expect(review?.category).toBe('core');
  });

  it('review sub-skill has its own independent identity', () => {
    expect(review?.metadata.name).toBe('Rulebook Terse Review');
    expect(review?.metadata.name).not.toBe('Rulebook Terse');
  });

  it('review description references review activation triggers', () => {
    const desc = (review?.metadata.description ?? '').toLowerCase();
    expect(desc).toMatch(/review|pr/);
  });

  it('review sub-skill defines the one-line format template', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-review/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body).toMatch(/L<line>/);
    expect(body).toMatch(/<severity>/);
    expect(body).toMatch(/<problem>/);
    expect(body).toMatch(/<fix>/);
  });

  it('review sub-skill declares all four severity prefixes', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-review/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body).toMatch(/🔴.*bug/);
    expect(body).toMatch(/🟡.*risk/);
    expect(body).toMatch(/🔵.*nit/);
    expect(body).toMatch(/❓.*q/);
  });

  it('review sub-skill has Auto-Clarity covering security + architecture', () => {
    const raw = readFileSync(
      resolve(TEMPLATES_PATH, 'skills/core/rulebook-terse-review/SKILL.md'),
      'utf8'
    );
    const { body } = parseSkillFrontmatter(raw);
    expect(body).toMatch(/## Auto-Clarity/);
    expect(body.toLowerCase()).toMatch(/security finding|cve/);
    expect(body.toLowerCase()).toMatch(/architectural/);
  });

  it('review sub-skill stands alone (no dependency on base terse skill)', () => {
    const deps = (review?.metadata.dependencies ?? []).filter((d) => d.trim().length > 0);
    expect(deps.some((d) => /rulebook-terse/i.test(d) && !/review/i.test(d))).toBe(false);
  });
});

describe('phase1_terse-sub-skills — sub-skills compose with base skill', () => {
  let all: Skill[];

  beforeAll(async () => {
    const mgr = new SkillsManager(TEMPLATES_PATH);
    const index = await mgr.discoverSkills();
    all = index.skills;
  });

  it('all three terse-family skills are discovered in core', () => {
    const terseFamily = all.filter((s) => /^Rulebook Terse/.test(s.metadata.name ?? ''));
    const names = terseFamily.map((s) => s.metadata.name).sort();
    expect(names).toEqual(['Rulebook Terse', 'Rulebook Terse Commit', 'Rulebook Terse Review']);
  });

  it('no two terse-family skills share a skill id', () => {
    const terseFamily = all.filter((s) => /^Rulebook Terse/.test(s.metadata.name ?? ''));
    const ids = new Set(terseFamily.map((s) => s.id));
    expect(ids.size).toBe(terseFamily.length);
  });
});
