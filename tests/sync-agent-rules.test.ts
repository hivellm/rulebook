/**
 * Unit tests for `scripts/sync-agent-rules.ts`.
 *
 * The fan-out runs in CI on every push to main that touches the
 * source SKILL.md files. These tests verify the projection logic
 * (frontmatter prepending, source-frontmatter stripping) and the
 * end-to-end sync against a temp repo fixture.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildProjectionContent, syncAgentRules } from '../scripts/sync-agent-rules.js';

describe('sync-agent-rules — buildProjectionContent', () => {
  it('strips the source YAML frontmatter', () => {
    const src = `---\nname: Source\nversion: 1.0\n---\n# Body\nContent`;
    const out = buildProjectionContent(src, undefined, false);
    expect(out).not.toContain('name: Source');
    expect(out).toContain('# Body');
  });

  it('prepends platform-specific frontmatter when provided', () => {
    const src = `---\nname: Source\n---\n# Body`;
    const out = buildProjectionContent(src, '---\nalwaysApply: true\n---\n', false);
    expect(out.startsWith('---\nalwaysApply: true\n---\n')).toBe(true);
    expect(out).toContain('# Body');
  });

  it('adds the do-not-edit banner when requested', () => {
    const src = `# Body`;
    const out = buildProjectionContent(src, undefined, true);
    expect(out).toContain('AUTO-GENERATED');
    expect(out).toContain('do not edit');
  });

  it('places frontmatter before the banner', () => {
    const src = `# Body`;
    const out = buildProjectionContent(src, '---\nalwaysApply: true\n---\n', true);
    const fmIdx = out.indexOf('alwaysApply');
    const banIdx = out.indexOf('AUTO-GENERATED');
    expect(fmIdx).toBeGreaterThan(-1);
    expect(banIdx).toBeGreaterThan(-1);
    expect(fmIdx).toBeLessThan(banIdx);
  });
});

describe('sync-agent-rules — syncAgentRules end-to-end', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = join(tmpdir(), `rulebook-sync-${Date.now()}-${process.pid}`);
    mkdirSync(repoRoot, { recursive: true });
    // Seed all three source SKILL.md files with representative content.
    for (const name of ['rulebook-terse', 'rulebook-terse-commit', 'rulebook-terse-review']) {
      const dir = join(repoRoot, 'templates', 'skills', 'core', name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'SKILL.md'),
        `---\nname: ${name}\nversion: 1.0\n---\n# ${name} Body\nContent for ${name}.\n`
      );
    }
  });

  afterEach(() => {
    try {
      rmSync(repoRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('writes all expected projections', () => {
    const { written } = syncAgentRules(repoRoot);
    // 3 skills × 5 projections each = 15 files.
    expect(written.length).toBe(15);
    for (const rel of written) {
      expect(existsSync(join(repoRoot, rel)), `missing: ${rel}`).toBe(true);
    }
  });

  it('Cursor rule file carries alwaysApply frontmatter for base skill', () => {
    syncAgentRules(repoRoot);
    const content = readFileSync(join(repoRoot, '.cursor/rules/rulebook-terse.mdc'), 'utf8');
    expect(content).toMatch(/alwaysApply:\s*true/);
  });

  it('Windsurf rule file carries trigger: always_on for base skill', () => {
    syncAgentRules(repoRoot);
    const content = readFileSync(join(repoRoot, '.windsurf/rules/rulebook-terse.md'), 'utf8');
    expect(content).toMatch(/trigger:\s*always_on/);
  });

  it('Claude skill directory preserves the full SKILL.md including frontmatter', () => {
    syncAgentRules(repoRoot);
    const content = readFileSync(join(repoRoot, '.claude/skills/rulebook-terse/SKILL.md'), 'utf8');
    expect(content).toMatch(/^---\s*\nname: rulebook-terse/);
  });

  it('Cline + Codex rule files have no YAML frontmatter (stripped source only)', () => {
    syncAgentRules(repoRoot);
    const cline = readFileSync(join(repoRoot, '.clinerules/rulebook-terse.md'), 'utf8');
    const codex = readFileSync(join(repoRoot, '.codex/rulebook-terse.md'), 'utf8');
    for (const content of [cline, codex]) {
      // Banner comment is present, but no ---...--- YAML block.
      expect(content).toContain('AUTO-GENERATED');
      expect(content.slice(0, 200)).not.toMatch(/^---\s*\n\w+:/m);
    }
  });

  it('commit and review sub-skills use on-demand frontmatter, not always-on', () => {
    syncAgentRules(repoRoot);
    const cursorCommit = readFileSync(
      join(repoRoot, '.cursor/rules/rulebook-terse-commit.mdc'),
      'utf8'
    );
    expect(cursorCommit).toMatch(/alwaysApply:\s*false/);
    const windsurfReview = readFileSync(
      join(repoRoot, '.windsurf/rules/rulebook-terse-review.md'),
      'utf8'
    );
    expect(windsurfReview).toMatch(/trigger:\s*manual/);
  });

  it('skips silently when a source SKILL.md is missing', () => {
    rmSync(join(repoRoot, 'templates/skills/core/rulebook-terse-review'), {
      recursive: true,
      force: true,
    });
    const { skipped } = syncAgentRules(repoRoot);
    expect(skipped.length).toBeGreaterThan(0);
  });

  it('is idempotent — running twice produces identical files', () => {
    syncAgentRules(repoRoot);
    const first = readFileSync(join(repoRoot, '.cursor/rules/rulebook-terse.mdc'), 'utf8');
    syncAgentRules(repoRoot);
    const second = readFileSync(join(repoRoot, '.cursor/rules/rulebook-terse.mdc'), 'utf8');
    expect(second).toBe(first);
  });
});
