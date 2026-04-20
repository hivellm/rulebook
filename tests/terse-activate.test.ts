/**
 * Unit tests for `src/hooks/terse-activate.ts` (SessionStart hook).
 *
 * Covers:
 *   - YAML frontmatter stripping.
 *   - Intensity-level filtering (the core compression mechanism).
 *   - SessionStart output assembly (full SKILL.md + fallback).
 *   - SKILL.md lookup across installed / template paths.
 *   - `main()` writes the flag file and emits stdout as hidden context.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';
import {
  buildSessionStartOutput,
  filterSkillForLevel,
  loadSkillBody,
  main,
  stripFrontmatter,
} from '../src/hooks/terse-activate.js';
import { readFlag } from '../src/hooks/safe-flag-io.js';
import { getFlagPath } from '../src/hooks/terse-config.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-terse-activate-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('terse-activate — stripFrontmatter', () => {
  it('removes a YAML frontmatter block cleanly', () => {
    const src = `---\nname: Test\nversion: 1.0\n---\n# Body\nContent`;
    expect(stripFrontmatter(src)).toBe('# Body\nContent');
  });

  it('returns unchanged content when no frontmatter is present', () => {
    const src = `# No frontmatter\nJust body`;
    expect(stripFrontmatter(src)).toBe(src);
  });

  it('handles multi-line values in frontmatter', () => {
    const src = `---\ndescription: >\n  Multi\n  line\n---\n# Body`;
    expect(stripFrontmatter(src)).toBe('# Body');
  });
});

describe('terse-activate — filterSkillForLevel', () => {
  const sampleBody = `## Intensity
| Level | What changes |
|-------|-------------|
| **off** | No compression. |
| **brief** | Drop filler. |
| **terse** | Drop articles. |
| **ultra** | Abbreviate. |

### Example
- **off**: "Verbose prose"
- **brief**: "Less filler"
- **terse**: "Drop articles"
- **ultra**: "Abbreviate."
`;

  it('keeps only the active level row in the table', () => {
    const out = filterSkillForLevel(sampleBody, 'terse');
    expect(out).toContain('| **terse** |');
    expect(out).not.toContain('| **off** |');
    expect(out).not.toContain('| **brief** |');
    expect(out).not.toContain('| **ultra** |');
  });

  it('keeps only the active level in the example list', () => {
    const out = filterSkillForLevel(sampleBody, 'brief');
    expect(out).toContain('- **brief**:');
    expect(out).not.toContain('- **off**:');
    expect(out).not.toContain('- **terse**:');
    expect(out).not.toContain('- **ultra**:');
  });

  it('preserves table header + separator rows', () => {
    const out = filterSkillForLevel(sampleBody, 'ultra');
    expect(out).toContain('| Level |');
    expect(out).toContain('|-------|');
  });

  it('preserves non-level content verbatim', () => {
    const out = filterSkillForLevel(sampleBody, 'off');
    expect(out).toContain('## Intensity');
    expect(out).toContain('### Example');
  });

  it('produces shorter output than the unfiltered body', () => {
    const filtered = filterSkillForLevel(sampleBody, 'terse');
    expect(filtered.length).toBeLessThan(sampleBody.length);
    // 4 levels → 3 level-rows dropped, should be ≥ 30% reduction on this fixture.
    expect(filtered.length / sampleBody.length).toBeLessThan(0.75);
  });
});

describe('terse-activate — buildSessionStartOutput', () => {
  it('uses fallback rules when skillBody is null', () => {
    const out = buildSessionStartOutput({ mode: 'brief', skillBody: null });
    expect(out).toContain('RULEBOOK-TERSE MODE ACTIVE');
    expect(out).toContain('Respond tersely');
    expect(out.toLowerCase()).toContain('auto-clarity');
  });

  it('prefixes the active level in the header', () => {
    const out = buildSessionStartOutput({ mode: 'ultra', skillBody: null });
    expect(out).toContain('level: ultra');
  });

  it('filters the skill body when provided', () => {
    const body = `## Intensity
| Level | x |
|-------|---|
| **brief** | keep-brief |
| **ultra** | keep-ultra |
`;
    const out = buildSessionStartOutput({ mode: 'brief', skillBody: body });
    expect(out).toContain('keep-brief');
    expect(out).not.toContain('keep-ultra');
  });
});

describe('terse-activate — loadSkillBody', () => {
  it('returns null when no SKILL.md is present anywhere', () => {
    expect(loadSkillBody(projectRoot)).toBeNull();
  });

  it('prefers <project>/.claude/skills/rulebook-terse/SKILL.md when present', () => {
    const dir = join(projectRoot, '.claude', 'skills', 'rulebook-terse');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: X\n---\n## From installed\n`
    );

    const body = loadSkillBody(projectRoot);
    expect(body).toContain('## From installed');
  });

  it('falls back to templates/skills/core/rulebook-terse/SKILL.md', () => {
    const dir = join(projectRoot, 'templates', 'skills', 'core', 'rulebook-terse');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'SKILL.md'),
      `---\nname: X\n---\n## From templates\n`
    );

    const body = loadSkillBody(projectRoot);
    expect(body).toContain('## From templates');
  });
});

describe('terse-activate — main() end-to-end', () => {
  function collectStdout(): { stream: Writable; get: () => string } {
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb();
      },
    }) as Writable;
    return { stream, get: () => Buffer.concat(chunks).toString('utf8') };
  }

  it('writes the flag file with the resolved mode', () => {
    const { stream } = collectStdout();
    main({
      projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'terse' } as NodeJS.ProcessEnv,
      stdout: stream as unknown as NodeJS.WriteStream,
    });

    const flag = readFlag(getFlagPath(projectRoot));
    expect(flag).toBe('terse');
  });

  it('deletes the flag when mode resolves to off', () => {
    // Seed a pre-existing flag.
    const { stream } = collectStdout();
    main({
      projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'brief' } as NodeJS.ProcessEnv,
      stdout: stream as unknown as NodeJS.WriteStream,
    });
    expect(readFlag(getFlagPath(projectRoot))).toBe('brief');

    // Now resolve to off.
    main({
      projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'off' } as NodeJS.ProcessEnv,
      stdout: stream as unknown as NodeJS.WriteStream,
    });
    expect(existsSync(getFlagPath(projectRoot))).toBe(false);
  });

  it('emits stdout containing the active level header', () => {
    const { stream, get } = collectStdout();
    main({
      projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'ultra' } as NodeJS.ProcessEnv,
      stdout: stream as unknown as NodeJS.WriteStream,
    });
    const out = get();
    expect(out).toContain('RULEBOOK-TERSE MODE ACTIVE');
    expect(out).toContain('level: ultra');
  });

  it('does not throw when the project root does not exist', () => {
    const bogus = join(tmpdir(), `absent-${Date.now()}`);
    const { stream } = collectStdout();
    expect(() =>
      main({
        projectRoot: bogus,
        env: { RULEBOOK_TERSE_MODE: 'brief' } as NodeJS.ProcessEnv,
        stdout: stream as unknown as NodeJS.WriteStream,
      })
    ).not.toThrow();
  });

  it('when skill body comes from templates, filters to active level', () => {
    const templDir = join(projectRoot, 'templates', 'skills', 'core', 'rulebook-terse');
    mkdirSync(templDir, { recursive: true });
    writeFileSync(
      join(templDir, 'SKILL.md'),
      `---\nname: X\n---\n## Intensity
| Level | x |
|-------|---|
| **brief** | KEEP-BRIEF |
| **ultra** | KEEP-ULTRA |
`
    );

    const { stream, get } = collectStdout();
    main({
      projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'brief' } as NodeJS.ProcessEnv,
      stdout: stream as unknown as NodeJS.WriteStream,
    });

    const out = get();
    expect(out).toContain('KEEP-BRIEF');
    expect(out).not.toContain('KEEP-ULTRA');
  });
});
