import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { OS_SCHEDULING_GUARD_SCRIPT } from '../src/core/claude/claude-settings-manager';

/**
 * v7.5 — the OS-scheduling guard against a corpus of realistic PreToolUse
 * payloads (docs/analysis/multi-session-performance F-001..F-003): prose in
 * descriptions, heredocs and file contents must never deny, almost every
 * ordinary call takes the fast path, and every true scheduling call still
 * denies. `RULEBOOK_GUARD_TRACE=1` makes the script report its path on stderr.
 */

const SCRIPT = path.join(process.cwd(), 'templates', 'hooks', OS_SCHEDULING_GUARD_SCRIPT);
const CORPUS_FILE = path.join(process.cwd(), 'tests', 'fixtures', 'guard-payloads', 'corpus.json');

interface CorpusCase {
    id: string;
    expect: 'allow' | 'deny';
    reason?: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
}
interface Corpus {
    envelope: Record<string, unknown>;
    cases: CorpusCase[];
}

function loadCorpus(): Corpus {
    return JSON.parse(readFileSync(CORPUS_FILE, 'utf-8')) as Corpus;
}

function hasBash(): boolean {
    try {
        execFileSync('bash', ['-c', 'echo ok'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

interface GuardRun {
    decision: 'allow' | 'deny' | 'none';
    reason: string;
    path: string;
}

function runGuard(corpus: Corpus, c: CorpusCase): GuardRun {
    const payload = {
        ...corpus.envelope,
        tool_name: c.tool_name,
        tool_input: c.tool_input,
        tool_use_id: `toolu_corpus_${c.id}`,
    };
    const r = spawnSync('bash', [SCRIPT], {
        input: JSON.stringify(payload),
        encoding: 'utf-8',
        env: { ...process.env, RULEBOOK_GUARD_TRACE: '1' },
    });
    expect(r.status, `${c.id}: exit code (stderr: ${r.stderr})`).toBe(0);
    const tracePath = /no-os-scheduling: (\w+)/.exec(r.stderr)?.[1] ?? '';
    const out = r.stdout.trim();
    if (!out) return { decision: 'none', reason: '', path: tracePath };
    const parsed = JSON.parse(out) as {
        hookSpecificOutput: {
            permissionDecision: 'allow' | 'deny';
            permissionDecisionReason?: string;
        };
    };
    return {
        decision: parsed.hookSpecificOutput.permissionDecision,
        reason: parsed.hookSpecificOutput.permissionDecisionReason ?? '',
        path: tracePath,
    };
}

describe.skipIf(!hasBash())('no-os-scheduling guard — payload corpus', () => {
    const corpus = loadCorpus();
    const allowCases = corpus.cases.filter((c) => c.expect === 'allow');
    const denyCases = corpus.cases.filter((c) => c.expect === 'deny');

    it('is a corpus of ~40+ payloads with both outcomes and unique ids', () => {
        expect(corpus.cases.length).toBeGreaterThanOrEqual(40);
        expect(allowCases.length).toBeGreaterThan(0);
        expect(denyCases.length).toBeGreaterThan(0);
        expect(new Set(corpus.cases.map((c) => c.id)).size).toBe(corpus.cases.length);
    });

    it.each(denyCases.map((c) => [c.id, c] as const))('denies %s', (_id, c) => {
        const r = runGuard(corpus, c);
        expect(r.decision).toBe('deny');
        expect(r.reason).toContain('Tier 1 #7');
        expect(r.reason).toContain(c.reason ?? '');
        expect(r.path).toBe('deny');
    });

    it('never denies an ordinary payload, and takes the fast path on >= 95 % of them', () => {
        const slow: string[] = [];
        for (const c of allowCases) {
            const r = runGuard(corpus, c);
            expect(r.decision, `${c.id} must not be denied (${r.reason})`).not.toBe('deny');
            expect(['fast', 'slow'], `${c.id}: trace path`).toContain(r.path);
            if (r.path !== 'fast') slow.push(c.id);
        }
        const fastShare = (allowCases.length - slow.length) / allowCases.length;
        expect(fastShare, `slow path: ${slow.join(', ')}`).toBeGreaterThanOrEqual(0.95);
    });
});
