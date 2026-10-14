import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import {
    OS_SCHEDULING_DENY_RULES,
    OS_SCHEDULING_GUARD_SCRIPT,
} from '../src/core/claude/claude-settings-manager';

/**
 * v7.5 — the OS-scheduling guard against a corpus of realistic PreToolUse
 * payloads (docs/analysis/multi-session-performance F-001..F-003): prose in
 * descriptions, heredocs and file contents must never deny, almost every
 * ordinary call takes the fast path, and every true scheduling call still
 * denies. `RULEBOOK_GUARD_TRACE=1` makes the script report its path on stderr.
 *
 * The same corpus checks the `permissions.deny` rules that replace the script
 * in Claude Code settings (parity, with the documented gaps listed).
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

// --- permissions.deny parity ---------------------------------------------------
// A small model of Claude Code's documented rule matching
// (code.claude.com/docs/en/permissions): Bash rules match each subcommand from
// its start (`*` = any text; a single trailing ` *` also matches the bare
// command); heredoc bodies are data; `>`/`>>` and `tee` targets are checked
// against Edit rules; Edit rules are gitignore-style globs, `//` = filesystem
// root, `~/` = home.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function stripHeredocs(cmd: string): string {
    return cmd.replace(
        /(^|[^<])<<-?[ \t]*["'\\]?([A-Za-z_]\w*)["'\\]?([^\n]*)\n[\s\S]*?^\2$\n?/gm,
        '$1$3\n'
    );
}

/** Split on && || ; | & newlines, subshells and $( ), outside quotes. */
function subcommands(cmd: string): string[] {
    const out: string[] = [];
    const stack: string[] = [];
    let cur = '';
    const flush = () => {
        if (cur.trim()) out.push(cur.trim());
        cur = '';
    };
    for (let i = 0; i < cmd.length; i++) {
        const ch = cmd[i];
        const top = stack[stack.length - 1];
        if (top === "'") {
            if (ch === "'") stack.pop();
            cur += ch;
            continue;
        }
        if (ch === '\\') {
            cur += ch + (cmd[i + 1] ?? '');
            i++;
            continue;
        }
        const opensSubst = ch === '$' && cmd[i + 1] === '(';
        if (top === '"') {
            if (ch === '"') stack.pop();
            if (opensSubst) {
                stack.push('(');
                flush();
                i++;
                continue;
            }
            cur += ch;
            continue;
        }
        if (ch === "'" || ch === '"') {
            stack.push(ch);
            cur += ch;
        } else if (opensSubst || ch === '(') {
            stack.push('(');
            flush();
            if (opensSubst) i++;
        } else if (ch === ')' && top === '(') {
            stack.pop();
            flush();
        } else if (';&|\n'.includes(ch)) {
            flush();
        } else {
            cur += ch;
        }
    }
    flush();
    return out;
}

function bashRuleMatches(spec: string, sub: string): boolean {
    const re = new RegExp('^' + spec.split('*').map(escapeRegExp).join('[\\s\\S]*') + '$');
    if (re.test(sub)) return true;
    return (
        spec.endsWith(' *') && spec.indexOf('*') === spec.length - 1 && sub === spec.slice(0, -2)
    );
}

function globToRegExp(glob: string): RegExp {
    let re = '';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*' && glob[i + 1] === '*' && glob[i + 2] === '/') {
            re += '(?:.*/)?';
            i += 2;
        } else if (c === '*' && glob[i + 1] === '*') {
            re += '.*';
            i++;
        } else if (c === '*') re += '[^/]*';
        else if (c === '?') re += '[^/]';
        else re += escapeRegExp(c);
    }
    return new RegExp('^' + re + '$');
}

const HOME = '/home/dev';
const ruleSpecs = (tool: string) =>
    OS_SCHEDULING_DENY_RULES.filter((r) => r.startsWith(`${tool}(`)).map((r) =>
        r.slice(tool.length + 1, -1)
    );

function editRulesDeny(filePath: string): boolean {
    const p = filePath
        .replace(/\\/g, '/')
        .replace(/^([A-Za-z]):/, (_m, d: string) => `/${d.toLowerCase()}`)
        .replace(/^~\//, `${HOME}/`);
    return ruleSpecs('Edit').some((spec) => {
        const glob = spec.startsWith('//') ? spec.slice(1) : spec.replace(/^~\//, `${HOME}/`);
        return globToRegExp(glob).test(p);
    });
}

function rulesDeny(c: CorpusCase): boolean {
    if (c.tool_name === 'Edit' || c.tool_name === 'Write') {
        return editRulesDeny(String(c.tool_input.file_path ?? ''));
    }
    if (c.tool_name !== 'Bash' && c.tool_name !== 'PowerShell') return false;
    const specs = ruleSpecs(c.tool_name);
    return subcommands(stripHeredocs(String(c.tool_input.command ?? ''))).some((sub) => {
        if (specs.some((spec) => bashRuleMatches(spec, sub))) return true;
        const targets = [...sub.matchAll(/>>?\s*([^\s;&|]+)/g)].map((m) => m[1]);
        if (/^tee\s/.test(sub)) {
            targets.push(
                ...sub
                    .split(/\s+/)
                    .slice(1)
                    .filter((a) => !a.startsWith('-'))
            );
        }
        return targets.some((t) => editRulesDeny(t));
    });
}

/** Script denials the deny rules do not reproduce (the opt-in tool gate still runs the script). */
const KNOWN_GAPS: Record<string, string> = {
    'deny-sudo-crontab-file': 'sudo is not stripped before Bash rules match',
    'deny-tee-cron-d': 'the tee target is behind sudo',
    'deny-cp-timer-unit': 'cp into a scheduler directory (cp targets are not path-checked)',
    'deny-cp-launch-agent': 'cp into a scheduler directory (cp targets are not path-checked)',
    'deny-register-scheduledtask':
        'powershell -c "…" run from Bash (PowerShell rules cover the PowerShell tool)',
};
/** Ordinary calls the deny rules block although the script lets them pass. */
const READ_ONLY_DENIED: Record<string, string> = {
    'bash-crontab-list': 'Bash(crontab *) also matches crontab -l',
};

describe('OS_SCHEDULING_DENY_RULES — parity with the guard script on the corpus', () => {
    const corpus = loadCorpus();

    it('the rule model matches the documented examples', () => {
        expect(bashRuleMatches('ls *', 'ls -la')).toBe(true);
        expect(bashRuleMatches('ls *', 'ls')).toBe(true);
        expect(bashRuleMatches('ls *', 'lsof')).toBe(false);
        expect(bashRuleMatches('at *', 'cat foo')).toBe(false);
        expect(subcommands('git status && npm test')).toEqual(['git status', 'npm test']);
        expect(subcommands('echo "a; at 5" | wc -l')).toEqual(['echo "a; at 5"', 'wc -l']);
        expect(globToRegExp('/**/.env').test('/home/dev/.env')).toBe(true);
    });

    it('every script denial is reproduced by a deny rule, except the listed gaps', () => {
        const missing: string[] = [];
        for (const c of corpus.cases.filter((x) => x.expect === 'deny')) {
            if (!rulesDeny(c)) missing.push(c.id);
        }
        expect(missing.sort()).toEqual(Object.keys(KNOWN_GAPS).sort());
    });

    it('no ordinary payload is denied by the rules, except listed read-only forms', () => {
        const denied = corpus.cases
            .filter((c) => c.expect === 'allow' && rulesDeny(c))
            .map((c) => c.id);
        expect(denied.sort()).toEqual(Object.keys(READ_ONLY_DENIED).sort());
    });
});
