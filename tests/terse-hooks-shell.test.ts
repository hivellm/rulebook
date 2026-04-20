/**
 * Integration tests for templates/hooks/terse-activate.sh and
 * templates/hooks/terse-mode-tracker.sh.
 *
 * Invokes the real shell scripts via subprocess in a throw-away temp
 * project. Windows without bash is skipped.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '..');
const ACTIVATE_SH = join(REPO_ROOT, 'templates/hooks/terse-activate.sh');
const TRACKER_SH = join(REPO_ROOT, 'templates/hooks/terse-mode-tracker.sh');

// Bash availability probe — Windows dev boxes without Git Bash skip.
function bashAvailable(): boolean {
  try {
    execSync('bash --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const BASH_OK = bashAvailable();

interface RunResult {
  stdout: string;
  stderr: string;
  status: number;
}

function runHook(
  scriptPath: string,
  opts: { stdin?: string; env?: Record<string, string>; cwd: string }
): RunResult {
  // Neutralize parent env vars that would leak into PROJECT_ROOT
  // resolution — tests pin cwd explicitly via spawn options + stdin.
  const sanitizedEnv = { ...process.env, ...(opts.env ?? {}) };
  if (opts.env?.CLAUDE_PROJECT_DIR === undefined) {
    delete sanitizedEnv.CLAUDE_PROJECT_DIR;
  }

  const result = spawnSync('bash', [scriptPath], {
    cwd: opts.cwd,
    input: opts.stdin ?? '',
    env: sanitizedEnv,
    encoding: 'utf8',
    timeout: 10_000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? -1,
  };
}

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-terse-hook-shell-${Date.now()}-${process.pid}`);
  mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
  // Install the base skill so activate has a SKILL.md to filter.
  mkdirSync(join(projectRoot, '.claude/skills/rulebook-terse'), { recursive: true });
  writeFileSync(
    join(projectRoot, '.claude/skills/rulebook-terse/SKILL.md'),
    readFileSync(join(REPO_ROOT, 'templates/skills/core/rulebook-terse/SKILL.md'), 'utf8')
  );
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe.skipIf(!BASH_OK)('terse-activate.sh — mode resolution', () => {
  it('writes "terse" to flag when no config + no env (default fallback)', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: '' },
    });
    expect(r.status).toBe(0);
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('terse');
  });

  it('env var RULEBOOK_TERSE_MODE overrides everything', () => {
    writeFileSync(
      join(projectRoot, '.rulebook/rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'brief' } })
    );
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'ultra' },
    });
    expect(r.status).toBe(0);
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('ultra');
  });

  it('invalid env var falls through to project config', () => {
    writeFileSync(
      join(projectRoot, '.rulebook/rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'brief' } })
    );
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'not-a-mode' },
    });
    expect(r.status).toBe(0);
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('brief');
  });

  it('mode=off removes the flag (no hidden context emitted)', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'off' },
    });
    expect(r.status).toBe(0);
    expect(existsSync(join(projectRoot, '.rulebook/.terse-mode'))).toBe(false);
    expect(r.stdout).toBe('');
  });

  it('honors .rulebook/rulebook.json terse.defaultMode', () => {
    writeFileSync(
      join(projectRoot, '.rulebook/rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'ultra' } })
    );
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: '' },
    });
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('ultra');
  });

  it('parses cwd from stdin JSON when piped', () => {
    const otherProject = join(tmpdir(), `other-${Date.now()}`);
    mkdirSync(join(otherProject, '.rulebook'), { recursive: true });
    try {
      const r = runHook(ACTIVATE_SH, {
        cwd: REPO_ROOT,
        env: { RULEBOOK_TERSE_MODE: 'brief' },
        stdin: JSON.stringify({ cwd: otherProject }),
      });
      expect(r.status).toBe(0);
      // Flag lands in the project passed via stdin.cwd, NOT cwd of the shell.
      expect(readFileSync(join(otherProject, '.rulebook/.terse-mode'), 'utf8')).toBe('brief');
    } finally {
      rmSync(otherProject, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!BASH_OK)('terse-activate.sh — SKILL.md filtering', () => {
  it('emits RULEBOOK-TERSE MODE ACTIVE header with active level', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'ultra' },
    });
    expect(r.stdout).toMatch(/RULEBOOK-TERSE MODE ACTIVE — level: ultra/);
  });

  it('filters the intensity table to the active level only', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'terse' },
    });
    expect(r.stdout).toMatch(/\|\s*\*\*terse\*\*\s*\|/);
    expect(r.stdout).not.toMatch(/\|\s*\*\*brief\*\*\s*\|/);
    expect(r.stdout).not.toMatch(/\|\s*\*\*ultra\*\*\s*\|/);
    expect(r.stdout).not.toMatch(/\|\s*\*\*off\*\*\s*\|/);
  });

  it('filters worked-example lines to the active level only', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'brief' },
    });
    // Matches `- **brief**:` but never `- **ultra**:`.
    expect(r.stdout).toMatch(/-\s+\*\*brief\*\*\s*:/);
    expect(r.stdout).not.toMatch(/-\s+\*\*ultra\*\*\s*:/);
    expect(r.stdout).not.toMatch(/-\s+\*\*terse\*\*\s*:/);
  });

  it('YAML frontmatter is stripped from the emitted body', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'brief' },
    });
    // SKILL.md starts with `---\nname: "Rulebook Terse"` — must NOT appear.
    expect(r.stdout).not.toContain('name: "Rulebook Terse"');
    expect(r.stdout).not.toMatch(/^---\s*$/m);
  });

  it('preserves Auto-Clarity + Boundaries sections untouched', () => {
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'terse' },
    });
    expect(r.stdout).toMatch(/## Auto-Clarity/);
    expect(r.stdout).toMatch(/## Boundaries/);
  });

  it('falls back to hardcoded minimal rules when SKILL.md missing', () => {
    rmSync(join(projectRoot, '.claude/skills'), { recursive: true, force: true });
    rmSync(join(projectRoot, 'templates'), { recursive: true, force: true });
    const r = runHook(ACTIVATE_SH, {
      cwd: projectRoot,
      env: { RULEBOOK_TERSE_MODE: 'brief' },
    });
    expect(r.stdout).toMatch(/RULEBOOK-TERSE MODE ACTIVE/);
    expect(r.stdout).toMatch(/## Persistence/);
    expect(r.stdout).toMatch(/## Auto-Clarity/);
    expect(r.stdout).toMatch(/Drop filler/);
  });
});

describe.skipIf(!BASH_OK)('terse-mode-tracker.sh — slash commands', () => {
  function run(prompt: string, env: Record<string, string> = {}): RunResult {
    return runHook(TRACKER_SH, {
      cwd: projectRoot,
      stdin: JSON.stringify({ prompt, cwd: projectRoot }),
      env,
    });
  }

  it('/rulebook-terse ultra sets flag to ultra', () => {
    const r = run('/rulebook-terse ultra');
    expect(r.status).toBe(0);
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('ultra');
  });

  it('/rulebook-terse brief sets flag to brief', () => {
    const r = run('/rulebook-terse brief');
    expect(r.status).toBe(0);
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('brief');
  });

  it('/rulebook-terse (no arg) uses resolved default', () => {
    writeFileSync(
      join(projectRoot, '.rulebook/rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'terse' } })
    );
    const r = run('/rulebook-terse');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('terse');
  });

  it('/rulebook-terse off removes the flag', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    run('/rulebook-terse off');
    expect(existsSync(join(projectRoot, '.rulebook/.terse-mode'))).toBe(false);
  });

  it('/rulebook-terse-commit flips to commit sub-skill', () => {
    run('/rulebook-terse-commit');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('commit');
  });

  it('/rulebook-terse-review flips to review sub-skill', () => {
    run('/rulebook-terse-review');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('review');
  });

  it('unknown slash arg leaves flag unchanged', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    run('/rulebook-terse xyzzy');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('brief');
  });
});

describe.skipIf(!BASH_OK)('terse-mode-tracker.sh — natural-language triggers', () => {
  function run(prompt: string): RunResult {
    return runHook(TRACKER_SH, {
      cwd: projectRoot,
      stdin: JSON.stringify({ prompt, cwd: projectRoot }),
    });
  }

  it('"be terse" activates the default mode', () => {
    run('be terse please');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('terse');
  });

  it('"less tokens please" activates the default mode', () => {
    run('give me less tokens please');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('terse');
  });

  it('"stop terse" deactivates', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    run('stop terse now');
    expect(existsSync(join(projectRoot, '.rulebook/.terse-mode'))).toBe(false);
  });

  it('"normal mode" deactivates', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'terse');
    run('switch back to normal mode');
    expect(existsSync(join(projectRoot, '.rulebook/.terse-mode'))).toBe(false);
  });

  it('unrelated prompts do not change flag state', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    run('help me fix this bug');
    expect(readFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'utf8')).toBe('brief');
  });
});

describe.skipIf(!BASH_OK)('terse-mode-tracker.sh — attention-anchor emission', () => {
  function run(prompt: string): RunResult {
    return runHook(TRACKER_SH, {
      cwd: projectRoot,
      stdin: JSON.stringify({ prompt, cwd: projectRoot }),
    });
  }

  it('emits valid JSON with UserPromptSubmit event name (persistent mode)', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'terse');
    const r = run('continue working on the bug');
    expect(r.stdout.length).toBeGreaterThan(0);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(parsed.hookSpecificOutput.additionalContext).toMatch(/\(terse\)/);
  });

  it('brief mode anchor says "Keep articles and full sentences"', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'brief');
    const r = run('any prompt');
    const parsed = JSON.parse(r.stdout);
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Keep articles');
  });

  it('terse / ultra anchors say "Fragments OK"', () => {
    for (const mode of ['terse', 'ultra']) {
      writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), mode);
      const r = run('any prompt');
      const parsed = JSON.parse(r.stdout);
      expect(parsed.hookSpecificOutput.additionalContext).toContain('Fragments OK');
    }
  });

  it('commit mode emits no anchor (independent sub-skill)', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'commit');
    const r = run('any prompt');
    expect(r.stdout.trim()).toBe('');
  });

  it('review mode emits no anchor (independent sub-skill)', () => {
    writeFileSync(join(projectRoot, '.rulebook/.terse-mode'), 'review');
    const r = run('any prompt');
    expect(r.stdout.trim()).toBe('');
  });

  it('no flag → no anchor', () => {
    const r = run('help me with this');
    expect(r.stdout.trim()).toBe('');
  });
});

const SYMLINK_OK: boolean = (() => {
  if (!BASH_OK) return false;
  const dir = join(tmpdir(), `rulebook-shell-symlink-probe-${process.pid}`);
  const target = join(dir, 'target');
  const link = join(dir, 'link');
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(target, 'x');
    execSync(`ln -s "${target}" "${link}"`);
    return true;
  } catch {
    return false;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
})();

describe.skipIf(!BASH_OK)('terse-mode-tracker.sh — symlink-safe flag writes', () => {
  function run(prompt: string): RunResult {
    return runHook(TRACKER_SH, {
      cwd: projectRoot,
      stdin: JSON.stringify({ prompt, cwd: projectRoot }),
    });
  }

  it.skipIf(!SYMLINK_OK)('refuses to clobber via symlinked flag path', () => {
    const secret = join(projectRoot, 'secret.txt');
    writeFileSync(secret, 'SECRET_CONTENT');
    const flagPath = join(projectRoot, '.rulebook/.terse-mode');
    execSync(`ln -sf "${secret}" "${flagPath}"`);

    run('/rulebook-terse ultra');

    // Secret must be untouched — the write was refused.
    expect(readFileSync(secret, 'utf8')).toBe('SECRET_CONTENT');
  });
});
