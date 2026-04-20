/**
 * Structural tests for phase0_terse-foundations.
 *
 * These tests verify that the phase 0 scaffolding — project spec,
 * three skill files, and the smoke-test eval harness — exists and is
 * well-formed. They deliberately avoid testing behavior (no hooks
 * exist yet in phase 0) and instead enforce the invariants that later
 * phases depend on.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
  category: string;
  author: string;
  tags: string[];
  dependencies: string[];
  conflicts: string[];
}

function readSkillFile(relPath: string): {
  raw: string;
  frontmatter: SkillFrontmatter;
  body: string;
} {
  const abs = resolve(ROOT, relPath);
  // Normalize CRLF → LF so the regex below matches regardless of
  // how git checked out the file (Windows pulls often yield CRLF).
  const raw = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error(`No YAML frontmatter in ${relPath}`);

  const fm: Record<string, unknown> = {};
  for (const line of fmMatch[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value: unknown = kv[2].trim();
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (typeof value === 'string') {
      value = value.replace(/^["']|["']$/g, '');
    }
    fm[key] = value;
  }

  return {
    raw,
    frontmatter: fm as unknown as SkillFrontmatter,
    body: fmMatch[2],
  };
}

describe('phase0_terse-foundations — project spec', () => {
  const SPEC_PATH = '.rulebook/specs/RULEBOOK_TERSE.md';

  it('project spec file exists', () => {
    expect(existsSync(resolve(ROOT, SPEC_PATH))).toBe(true);
  });

  it('project spec has RULEBOOK_TERSE START/END markers', () => {
    const raw = readFileSync(resolve(ROOT, SPEC_PATH), 'utf8');
    expect(raw).toMatch(/<!-- RULEBOOK_TERSE:START -->/);
    expect(raw).toMatch(/<!-- RULEBOOK_TERSE:END -->/);
  });

  it('project spec defines all four intensity levels', () => {
    const raw = readFileSync(resolve(ROOT, SPEC_PATH), 'utf8');
    for (const level of ['off', 'brief', 'terse', 'ultra']) {
      expect(raw).toMatch(new RegExp(`\\b${level}\\b`));
    }
  });

  it('project spec documents the five auto-clarity triggers', () => {
    const raw = readFileSync(resolve(ROOT, SPEC_PATH), 'utf8');
    expect(raw.toLowerCase()).toMatch(/security warning/);
    expect(raw.toLowerCase()).toMatch(/destructive/);
    expect(raw.toLowerCase()).toMatch(/quality-gate/);
    expect(raw.toLowerCase()).toMatch(/multi-step/);
    expect(raw.toLowerCase()).toMatch(/user confusion/);
  });

  it('project spec declares safety invariants for flag IO', () => {
    const raw = readFileSync(resolve(ROOT, SPEC_PATH), 'utf8');
    expect(raw).toMatch(/safe-flag-io/);
    expect(raw).toMatch(/O_NOFOLLOW/);
    expect(raw).toMatch(/VALID_MODES/);
    expect(raw).toMatch(/MAX_FLAG_BYTES/);
  });

  it('project spec pins the evaluation contract to skill-vs-terse', () => {
    const raw = readFileSync(resolve(ROOT, SPEC_PATH), 'utf8');
    expect(raw).toMatch(
      /rulebook-terse.*vs.*terse|terse.*vs.*baseline|baseline.*terse.*rulebook-terse/s
    );
  });
});

describe('phase0_terse-foundations — task delta spec', () => {
  // Active path while task is in-progress; archive path after archival.
  // Both are valid — the test resolves to whichever exists.
  const ACTIVE = '.rulebook/tasks/phase0_terse-foundations/specs/rulebook-terse/spec.md';
  const ARCHIVE_GLOB = '.rulebook/archive';

  function resolveDeltaPath(): string | null {
    const activeAbs = resolve(ROOT, ACTIVE);
    if (existsSync(activeAbs)) return activeAbs;

    // Fall back to the most recent archive entry for this task.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const archiveRoot = resolve(ROOT, ARCHIVE_GLOB);
    if (!existsSync(archiveRoot)) return null;
    const matches = readdirSync(archiveRoot)
      .filter((d: string) => d.endsWith('-phase0_terse-foundations'))
      .sort()
      .reverse();
    for (const dir of matches) {
      const candidate = resolve(archiveRoot, dir, 'specs/rulebook-terse/spec.md');
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  it('task delta spec exists (active or archived)', () => {
    expect(resolveDeltaPath()).not.toBeNull();
  });

  it('task delta uses ADDED Requirements header', () => {
    const p = resolveDeltaPath();
    expect(p).not.toBeNull();
    const raw = readFileSync(p!, 'utf8');
    expect(raw).toMatch(/## ADDED Requirements/);
  });

  it('task delta uses Scenario with four hashtags', () => {
    const p = resolveDeltaPath();
    expect(p).not.toBeNull();
    const raw = readFileSync(p!, 'utf8');
    expect(raw).toMatch(/^#### Scenario:/m);
  });

  it('task delta uses SHALL/MUST requirement language', () => {
    const p = resolveDeltaPath();
    expect(p).not.toBeNull();
    const raw = readFileSync(p!, 'utf8');
    expect(raw).toMatch(/\b(SHALL|MUST)\b/);
  });

  it('task delta has Given/When/Then structure', () => {
    const p = resolveDeltaPath();
    expect(p).not.toBeNull();
    const raw = readFileSync(p!, 'utf8');
    expect(raw).toMatch(/\bGiven\b/);
    expect(raw).toMatch(/\bWhen\b/);
    expect(raw).toMatch(/\bThen\b/);
  });
});

describe('phase0_terse-foundations — base skill file', () => {
  const BASE = 'templates/skills/core/rulebook-terse/SKILL.md';

  it('base skill file exists', () => {
    expect(existsSync(resolve(ROOT, BASE))).toBe(true);
  });

  it('base skill has all required frontmatter fields', () => {
    const { frontmatter } = readSkillFile(BASE);
    expect(frontmatter.name).toBeTruthy();
    expect(frontmatter.description).toBeTruthy();
    expect(frontmatter.version).toBeTruthy();
    expect(frontmatter.category).toBe('core');
    expect(frontmatter.author).toBeTruthy();
    expect(Array.isArray(frontmatter.tags)).toBe(true);
    expect(Array.isArray(frontmatter.dependencies)).toBe(true);
    expect(Array.isArray(frontmatter.conflicts)).toBe(true);
  });

  it('base skill description includes natural-language activation triggers', () => {
    const { frontmatter } = readSkillFile(BASE);
    const desc = frontmatter.description.toLowerCase();
    expect(desc).toMatch(/terse|less tokens|be brief|\/rulebook-terse/);
  });

  it('base skill body has RULEBOOK_TERSE START/END markers', () => {
    const { body } = readSkillFile(BASE);
    expect(body).toMatch(/<!-- RULEBOOK_TERSE:START -->/);
    expect(body).toMatch(/<!-- RULEBOOK_TERSE:END -->/);
  });

  it('base skill body documents all four intensity levels', () => {
    const { body } = readSkillFile(BASE);
    for (const level of ['off', 'brief', 'terse', 'ultra']) {
      expect(body).toMatch(new RegExp(`\\*\\*${level}\\*\\*`));
    }
  });

  it('base skill body contains before/after example', () => {
    const { body } = readSkillFile(BASE);
    // Example uses ❌/✅ markers per SKILL.md contract
    expect(body).toMatch(/❌/);
    expect(body).toMatch(/✅/);
  });

  it('base skill body has Auto-Clarity section', () => {
    const { body } = readSkillFile(BASE);
    expect(body).toMatch(/## Auto-Clarity/);
  });

  it('base skill body has Boundaries section', () => {
    const { body } = readSkillFile(BASE);
    expect(body).toMatch(/## Boundaries/);
  });

  it('base skill body has Persistence section', () => {
    const { body } = readSkillFile(BASE);
    expect(body).toMatch(/## Persistence/);
  });
});

describe('phase0_terse-foundations — commit sub-skill', () => {
  const COMMIT = 'templates/skills/core/rulebook-terse-commit/SKILL.md';

  it('commit sub-skill file exists', () => {
    expect(existsSync(resolve(ROOT, COMMIT))).toBe(true);
  });

  it('commit sub-skill is independent (own name + description)', () => {
    const { frontmatter } = readSkillFile(COMMIT);
    expect(frontmatter.name).not.toBe('Rulebook Terse');
    expect(frontmatter.description).toMatch(/commit/i);
  });

  it('commit sub-skill body enforces Conventional Commits format', () => {
    const { body } = readSkillFile(COMMIT);
    expect(body).toMatch(/conventional commits/i);
    expect(body).toMatch(/feat|fix|refactor|perf|docs|test|chore/);
  });

  it('commit sub-skill body declares the never-include list', () => {
    const { body } = readSkillFile(COMMIT);
    expect(body.toLowerCase()).toMatch(/never include|ai attribution|claude code/);
  });

  it('commit sub-skill has Auto-Clarity for breaking changes', () => {
    const { body } = readSkillFile(COMMIT);
    expect(body).toMatch(/## Auto-Clarity/);
    expect(body.toLowerCase()).toMatch(/breaking change/);
  });
});

describe('phase0_terse-foundations — review sub-skill', () => {
  const REVIEW = 'templates/skills/core/rulebook-terse-review/SKILL.md';

  it('review sub-skill file exists', () => {
    expect(existsSync(resolve(ROOT, REVIEW))).toBe(true);
  });

  it('review sub-skill is independent (own name + description)', () => {
    const { frontmatter } = readSkillFile(REVIEW);
    expect(frontmatter.name).not.toBe('Rulebook Terse');
    expect(frontmatter.description).toMatch(/review/i);
  });

  it('review sub-skill defines the one-line format', () => {
    const { body } = readSkillFile(REVIEW);
    expect(body).toMatch(/L<line>/);
    expect(body).toMatch(/<severity>/);
    expect(body).toMatch(/<problem>/);
    expect(body).toMatch(/<fix>/);
  });

  it('review sub-skill declares all four severity prefixes', () => {
    const { body } = readSkillFile(REVIEW);
    expect(body).toMatch(/🔴.*bug/);
    expect(body).toMatch(/🟡.*risk/);
    expect(body).toMatch(/🔵.*nit/);
    expect(body).toMatch(/❓.*q/);
  });

  it('review sub-skill has Auto-Clarity for security findings', () => {
    const { body } = readSkillFile(REVIEW);
    expect(body).toMatch(/## Auto-Clarity/);
    expect(body.toLowerCase()).toMatch(/security finding/);
  });
});

describe('phase0_terse-foundations — eval harness smoke test', () => {
  it('evals/README.md exists', () => {
    expect(existsSync(resolve(ROOT, 'evals/README.md'))).toBe(true);
  });

  it('evals/arms.json defines exactly three arms', () => {
    const arms = JSON.parse(readFileSync(resolve(ROOT, 'evals/arms.json'), 'utf8'));
    expect(arms.arms).toHaveLength(3);
    const ids = arms.arms.map((a: { id: string }) => a.id);
    expect(ids).toEqual(['baseline', 'terse', 'rulebook-terse']);
  });

  it('evals/arms.json declares honest delta as rulebook-terse vs terse', () => {
    const arms = JSON.parse(readFileSync(resolve(ROOT, 'evals/arms.json'), 'utf8'));
    expect(arms.honestDelta).toEqual({ numerator: 'rulebook-terse', denominator: 'terse' });
  });

  it('evals/arms.json has a lift threshold', () => {
    const arms = JSON.parse(readFileSync(resolve(ROOT, 'evals/arms.json'), 'utf8'));
    expect(typeof arms.liftThreshold).toBe('number');
    expect(arms.liftThreshold).toBeGreaterThan(0);
    expect(arms.liftThreshold).toBeLessThan(1);
  });

  it('evals/prompts/en.txt has at least three prompts', () => {
    const raw = readFileSync(resolve(ROOT, 'evals/prompts/en.txt'), 'utf8');
    const lines = raw
      .trim()
      .split('\n')
      .filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it('evals/snapshots/results.json has entries for all three arms per prompt', () => {
    const snap = JSON.parse(readFileSync(resolve(ROOT, 'evals/snapshots/results.json'), 'utf8'));
    expect(snap.prompts.length).toBeGreaterThanOrEqual(3);
    for (const p of snap.prompts) {
      expect(p.responses).toHaveProperty('baseline');
      expect(p.responses).toHaveProperty('terse');
      expect(p.responses).toHaveProperty('rulebook-terse');
    }
  });

  it('evals/measure.ts exists and is TypeScript', () => {
    expect(existsSync(resolve(ROOT, 'evals/measure.ts'))).toBe(true);
    const raw = readFileSync(resolve(ROOT, 'evals/measure.ts'), 'utf8');
    expect(raw).toMatch(/import\b/);
  });
});
