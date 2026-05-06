/**
 * Integration tests for templates/hooks/enforce-pre-tool.sh (v5.6.0).
 *
 * The hook consolidates the three legacy PreToolUse deny rules
 * (no-deferred, no-shortcuts, mcp-for-tasks) into a single bash + node
 * invocation. These tests pipe a representative `tool_input` JSON into
 * the script and assert the emitted permissionDecision.
 */

import { describe, expect, it } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..');
const HOOK = `${REPO_ROOT}/templates/hooks/enforce-pre-tool.sh`;

function bashAvailable(): boolean {
  try {
    execSync('bash --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const BASH_OK = bashAvailable();

function runHook(payload: unknown): {
  decision: string;
  reason?: string;
  raw: string;
} {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 10_000,
  });
  const out = (r.stdout ?? '').trim();
  if (!out) return { decision: 'NONE', raw: '' };
  const parsed = JSON.parse(out);
  return {
    decision: parsed.hookSpecificOutput?.permissionDecision ?? 'NONE',
    reason: parsed.hookSpecificOutput?.permissionDecisionReason,
    raw: out,
  };
}

describe.skipIf(!BASH_OK)('enforce-pre-tool.sh — allow path', () => {
  it('allows ordinary Edit on a non-task source file', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/foo.ts',
        new_string: 'export const x = 1;',
      },
    });
    expect(r.decision).toBe('allow');
  });

  it('allows Bash commands that are not mkdir-into-tasks', () => {
    const r = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
    });
    expect(r.decision).toBe('allow');
  });

  it('allows TODO in test files (filtered by path)', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'tests/foo.test.ts',
        new_string: '// TODO: cover edge case\nit("works", () => {})',
      },
    });
    expect(r.decision).toBe('allow');
  });
});

describe.skipIf(!BASH_OK)('enforce-pre-tool.sh — no-shortcuts rule', () => {
  it('denies // TODO in source files', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/foo.ts',
        new_string: '// TODO: implement\nexport const x = 1;',
      },
    });
    expect(r.decision).toBe('deny');
    expect(r.reason).toMatch(/TODO|FIXME|HACK/);
  });

  it('denies // FIXME in source files', () => {
    const r = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: 'src/bar.js',
        content: '// FIXME: broken\nconst y = 2;',
      },
    });
    expect(r.decision).toBe('deny');
  });

  it('denies "stub" in source files', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'src/foo.ts',
        new_string: 'export function stub() { return 0; }',
      },
    });
    expect(r.decision).toBe('deny');
    expect(r.reason).toMatch(/placeholder|stub/i);
  });
});

describe.skipIf(!BASH_OK)('enforce-pre-tool.sh — no-deferred rule', () => {
  it('denies "deferred" in tasks.md', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'phase1/tasks.md',
        new_string: '- [ ] 1.1 deferred until later',
      },
    });
    expect(r.decision).toBe('deny');
    expect(r.reason).toMatch(/deferred|skip|later|TODO/);
  });

  it('denies "todo" in tasks.md', () => {
    const r = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: 'foo/tasks.md',
        content: '- [ ] 1.1 TODO when free',
      },
    });
    expect(r.decision).toBe('deny');
  });

  it('allows tasks.md without trigger words', () => {
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: 'foo/tasks.md',
        new_string: '- [x] 1.1 implementation done',
      },
    });
    expect(r.decision).toBe('allow');
  });
});

describe.skipIf(!BASH_OK)('enforce-pre-tool.sh — mcp-for-tasks rule', () => {
  it('denies mkdir into .rulebook/tasks/', () => {
    const r = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'mkdir -p .rulebook/tasks/phase999_evil' },
    });
    expect(r.decision).toBe('deny');
    expect(r.reason).toMatch(/rulebook_task_create/);
  });

  it('denies Write of new proposal.md inside non-existent task dir', () => {
    const r = runHook({
      tool_name: 'Write',
      tool_input: {
        file_path: '.rulebook/tasks/phase999_evil/proposal.md',
        content: '# Proposal',
      },
    });
    expect(r.decision).toBe('deny');
  });

  it('allows Edit of EXISTING proposal.md (real task dir)', () => {
    // The script tests with -f against the literal path; pick any active
    // task whose proposal.md exists under .rulebook/tasks/ in this repo.
    const r = runHook({
      tool_name: 'Edit',
      tool_input: {
        file_path: `${REPO_ROOT}/.rulebook/tasks/phase2_remove-health-scorer/proposal.md`,
        new_string: 'edit',
      },
    });
    expect(r.decision).toBe('allow');
  });
});

describe.skipIf(!BASH_OK)('enforce-pre-tool.sh — graceful failures', () => {
  it('treats malformed JSON as ALLOW (fail-open for input bugs)', () => {
    const r = spawnSync('bash', [HOOK], {
      input: 'not-json',
      encoding: 'utf8',
      timeout: 10_000,
    });
    const out = JSON.parse((r.stdout ?? '').trim());
    expect(out.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
