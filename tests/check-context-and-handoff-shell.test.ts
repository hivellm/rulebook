/**
 * Integration tests for templates/hooks/check-context-and-handoff.sh (v5.6.0).
 *
 * The hook estimates context usage from the Stop hook's transcript_path
 * payload field (no $HOME/.claude/projects scan) and emits a /handoff
 * advisory when usage crosses warn or force thresholds.
 *
 * These tests skip when bash or jq is unavailable — both are required for
 * the threshold logic. The `transcript_path resolution` group runs even
 * without jq because that path is a simple no-op.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '..');
const HOOK = join(REPO_ROOT, 'templates/hooks/check-context-and-handoff.sh');

function tryRun(cmd: string): boolean {
    try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
const BASH_OK = tryRun('bash --version');
const JQ_OK = tryRun('jq --version');

interface RunResult {
    stdout: string;
    status: number;
}

function runHook(payload: unknown, cwd: string): RunResult {
    const r = spawnSync('bash', [HOOK], {
        input: JSON.stringify(payload),
        encoding: 'utf8',
        timeout: 10_000,
        cwd,
    });
    return {
        stdout: (r.stdout ?? '').trim(),
        status: r.status ?? -1,
    };
}

let projectRoot: string;

beforeEach(() => {
    projectRoot = join(tmpdir(), `rulebook-handoff-hook-${Date.now()}-${process.pid}`);
    mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
});

afterEach(() => {
    try {
        rmSync(projectRoot, { recursive: true, force: true });
    } catch {
        /* ignore */
    }
});

describe.skipIf(!BASH_OK)('check-context-and-handoff.sh — transcript_path resolution', () => {
    it('emits empty {} when transcript_path is missing from payload', () => {
        const r = runHook({ cwd: projectRoot }, projectRoot);
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('{}');
    });

    it('emits empty {} when transcript_path points at a missing file', () => {
        const r = runHook(
            {
                cwd: projectRoot,
                transcript_path: join(projectRoot, 'does-not-exist.jsonl'),
            },
            projectRoot
        );
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('{}');
    });
});

describe.skipIf(!BASH_OK || !JQ_OK)('check-context-and-handoff.sh — threshold detection', () => {
    it('emits no advisory when transcript is below warn threshold', () => {
        const transcriptPath = join(projectRoot, 't.jsonl');
        // 100 KB ≈ ~6% of 1.6 M-char default budget — well below 75 % warn.
        writeFileSync(transcriptPath, 'x'.repeat(100 * 1024));
        const r = runHook({ cwd: projectRoot, transcript_path: transcriptPath }, projectRoot);
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('{}');
    });

    it('emits warn advisory when transcript crosses 75 % of budget', () => {
        const transcriptPath = join(projectRoot, 't.jsonl');
        // 1.3 M chars = 81 % of 1.6 M default — between warn (75) and force (90).
        writeFileSync(transcriptPath, 'x'.repeat(1_300_000));
        const r = runHook({ cwd: projectRoot, transcript_path: transcriptPath }, projectRoot);
        expect(r.status).toBe(0);
        const parsed = JSON.parse(r.stdout);
        // Warn is advisory → surfaced to the user via systemMessage (Stop has no
        // additionalContext field).
        expect(parsed.systemMessage).toMatch(/Context at \d+%.*invoke \/handoff/i);
    });

    it('emits force advisory when transcript crosses 90 % of budget', () => {
        const transcriptPath = join(projectRoot, 't.jsonl');
        // 1.55 M chars ≈ 96 % of 1.6 M default.
        writeFileSync(transcriptPath, 'x'.repeat(1_550_000));
        const r = runHook({ cwd: projectRoot, transcript_path: transcriptPath }, projectRoot);
        expect(r.status).toBe(0);
        const parsed = JSON.parse(r.stdout);
        // Force blocks the stop and feeds the instruction back to the model.
        expect(parsed.decision).toBe('block');
        expect(parsed.reason).toMatch(/FORCE THRESHOLD.*MUST invoke \/handoff/i);
    });

    it('honors handoff thresholds from .rulebook/rulebook.json', () => {
        writeFileSync(
            join(projectRoot, '.rulebook/rulebook.json'),
            JSON.stringify({ handoff: { warnThresholdPct: 5, forceThresholdPct: 95 } })
        );
        const transcriptPath = join(projectRoot, 't.jsonl');
        // ~6 % — above the lowered warn=5 threshold but below force=95.
        writeFileSync(transcriptPath, 'x'.repeat(100 * 1024));
        const r = runHook({ cwd: projectRoot, transcript_path: transcriptPath }, projectRoot);
        expect(r.status).toBe(0);
        const parsed = JSON.parse(r.stdout);
        expect(parsed.systemMessage).toMatch(/Context at \d+%.*invoke \/handoff/i);
    });
});
