import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { hookCommand } from '../src/cli/commands/hook';
import {
    buildToolGateQuestions,
    buildToolGateState,
    decideToolCall,
    destructiveGitCheck,
    matchesTool,
    resolveToolHookConfig,
    summarizeToolCall,
    toolGateCachePath,
    toolHookTimeoutSec,
    toolStateBytes,
    TOOL_STATE_MAX_BYTES,
} from '../src/core/typesafe/tool-gate';
import type { Question } from '../src/core/typesafe/client';

const FAKE_KEY = 'ts_fake_tool_key_000';
const KEY_ENV = { TYPESAFE_API_KEY: FAKE_KEY };
const CFG = { denyBelow: 0.5, askBelow: 0.7 };
const PASS = {
    safe_reversible: 0.95,
    no_secret_exposure: 0.95,
    follows_project_rules: 0.95,
};

/** Jev answering every noul in the request with 0.95 unless overridden. */
function jevFetch(over: Record<string, number> = {}) {
    return vi.fn(async (_url: string, init: RequestInit) => {
        const req = JSON.parse(init.body as string) as { questions: Record<string, Question> };
        const answers: Record<string, unknown> = {};
        for (const id of Object.keys(req.questions)) {
            answers[id] = { type: 'noul', noul: over[id] ?? 0.95 };
        }
        return new Response(
            JSON.stringify({
                model: 'jev-1.13.0',
                answers,
                usage: { input_tokens: 600, output_tokens: 20 },
            }),
            { status: 200 }
        );
    });
}

describe('resolveToolHookConfig', () => {
    it('applies defaults: off, Bash|Edit|Write, 0.5 / 0.7, 2000 ms, 15 min', () => {
        expect(resolveToolHookConfig(null)).toEqual({
            enabled: false,
            matcher: 'Bash|Edit|Write',
            denyBelow: 0.5,
            askBelow: 0.7,
            deadlineMs: 2000,
            cacheTtlMs: 900_000,
        });
    });

    it('clamps the deadline to 500–5000 ms and keeps denyBelow ≤ askBelow', () => {
        const low = resolveToolHookConfig({
            gate: { toolHook: { deadlineMs: 1, denyBelow: 0.9, askBelow: 0.6 } },
        });
        expect(low).toMatchObject({ deadlineMs: 500, denyBelow: 0.6, askBelow: 0.6 });
        const high = resolveToolHookConfig({
            gate: { toolHook: { deadlineMs: 60_000, askBelow: 7, denyBelow: -1 } },
        });
        expect(high).toMatchObject({ deadlineMs: 5000, askBelow: 1, denyBelow: 0 });
    });

    it('is on only when enabled explicitly and TypeSafe is not opted out', () => {
        expect(resolveToolHookConfig({ gate: { toolHook: { enabled: true } } }).enabled).toBe(true);
        expect(
            resolveToolHookConfig({
                gate: { toolHook: { enabled: true } },
                integrations: { typesafe: { enabled: false } },
            }).enabled
        ).toBe(false);
    });

    it('timeout = ceil(deadline / 1000) + 2 seconds', () => {
        expect(toolHookTimeoutSec(2000)).toBe(4);
        expect(toolHookTimeoutSec(2500)).toBe(5);
    });

    it('matcher follows Claude Code semantics', () => {
        expect(matchesTool('Bash|Edit|Write', 'Edit')).toBe(true);
        expect(matchesTool('Bash|Edit|Write', 'Read')).toBe(false);
        expect(matchesTool('Bash|Edit|Write', 'MultiEdit')).toBe(false);
        expect(matchesTool('*', 'Read')).toBe(true);
        expect(matchesTool('(', 'Bash')).toBe(false);
    });
});

describe('decideToolCall', () => {
    it('p < 0.5 → deny, the reason names the criterion and its probability', () => {
        const v = decideToolCall({ ...PASS, safe_reversible: 0.3 }, CFG);
        expect(v.decision).toBe('deny');
        expect(v.reason).toContain('safe_reversible p=0.30');
    });

    it('0.5 ≤ p < 0.7 → ask', () => {
        expect(decideToolCall({ ...PASS, follows_project_rules: 0.6 }, CFG).decision).toBe('ask');
        expect(decideToolCall({ ...PASS, follows_project_rules: 0.5 }, CFG).decision).toBe('ask');
    });

    it('all at or above askBelow → none with no reason', () => {
        expect(decideToolCall({ ...PASS, no_secret_exposure: 0.7 }, CFG)).toEqual({
            decision: 'none',
            reason: '',
        });
    });

    it('in_task_scope never goes past ask', () => {
        const v = decideToolCall({ ...PASS, in_task_scope: 0.1 }, CFG);
        expect(v.decision).toBe('ask');
        expect(v.reason).toContain('in_task_scope p=0.10');
    });

    it('the most severe criterion wins and every failing one is listed', () => {
        const v = decideToolCall(
            { ...PASS, in_task_scope: 0.2, safe_reversible: 0.4, no_secret_exposure: 0.65 },
            CFG
        );
        expect(v.decision).toBe('deny');
        expect(v.reason).toMatch(
            /safe_reversible p=0\.40.*no_secret_exposure p=0\.65.*in_task_scope p=0\.20/
        );
    });
});

describe('destructiveGitCheck', () => {
    const asks = [
        'git reset --hard HEAD~1',
        'git reset --hard',
        'git push --force origin main',
        'git push -f',
        'git push origin main --force-with-lease',
        'git clean -fd',
        'git clean -xdf',
        'git checkout -- .',
        'git restore .',
        'git stash',
        'git stash pop',
        'git branch -D feature/x',
        'npm test && git reset --hard origin/main',
        'git -C ../repo reset --hard',
        'cd sub; git stash push -m wip',
        'git push origin +main',
        'git push origin +HEAD:refs/heads/main',
        'git -C "a b" reset --hard',
        "git -c 'user.name=x y' stash",
        'git checkout -- ./',
        'git restore ./',
    ];
    const passes = [
        'git status',
        'git reset HEAD file.ts',
        'git reset --soft HEAD~1',
        'git push origin main',
        'git push --follow-tags',
        'git push origin my-feature',
        'git clean -n',
        'git checkout -b feature/x',
        'git checkout -- src/a.ts',
        'git restore src/a.ts',
        'git stash list',
        'git stash show -p',
        'git branch -d merged-branch',
        'echo "git reset --hard is dangerous"',
        'git log --oneline',
    ];

    it.each(asks)('asks for %s, citing Git safety', (command) => {
        const v = destructiveGitCheck(command);
        expect(v?.decision).toBe('ask');
        expect(v?.reason).toContain('"Git safety"');
    });

    it.each(passes)('passes %s', (command) => {
        expect(destructiveGitCheck(command)).toBeNull();
    });
});

describe('summarizeToolCall / state / questions', () => {
    const root = path.resolve(os.tmpdir(), 'rb-tool-summary');

    it('Bash: command, redacted and capped at 1024 chars', () => {
        const s = summarizeToolCall(
            { tool_name: 'Bash', tool_input: { command: 'echo ' + 'x'.repeat(5000) } },
            root
        );
        expect(s?.tool).toBe('Bash');
        expect(s?.command?.length).toBe(1024);
    });

    it('Edit: relative path, sizes and a new_string preview ≤ 512 chars', () => {
        const s = summarizeToolCall(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: path.join(root, 'src', 'a.ts'),
                    old_string: 'abc',
                    new_string: 'y'.repeat(900),
                },
            },
            root
        );
        expect(s).toMatchObject({ file: 'src/a.ts', oldChars: 3, newChars: 900 });
        expect(s?.preview?.length).toBe(512);
    });

    it('Write: content size and preview; a path outside the project stays absolute', () => {
        const s = summarizeToolCall(
            { tool_name: 'Write', tool_input: { file_path: '/etc/hosts', content: 'hello' } },
            root
        );
        expect(s).toMatchObject({ file: '/etc/hosts', chars: 5, preview: 'hello' });
    });

    it('no tool name → null', () => {
        expect(summarizeToolCall({ tool_input: {} }, root)).toBeNull();
    });

    it('state stays within 3072 bytes with multi-byte content', () => {
        const summary = summarizeToolCall(
            {
                tool_name: 'Write',
                tool_input: { file_path: path.join(root, 'a.md'), content: '€'.repeat(2000) },
            },
            root
        )!;
        summary.command = '€'.repeat(1024);
        const state = buildToolGateState(
            { projectId: 'p', languages: ['typescript'] },
            { id: 't1', title: 'Task' },
            summary
        );
        expect(toolStateBytes(state)).toBeLessThanOrEqual(TOOL_STATE_MAX_BYTES);
        expect(state.rules.length).toBeGreaterThan(0);
        expect(state.task).toEqual({ id: 't1', title: 'Task' });
    });

    it('in_task_scope is asked only when a task is active', () => {
        const summary = { tool: 'Bash', command: 'ls' };
        const without = buildToolGateQuestions(buildToolGateState(null, null, summary));
        expect(Object.keys(without)).toEqual([
            'safe_reversible',
            'no_secret_exposure',
            'follows_project_rules',
        ]);
        const withTask = buildToolGateQuestions(
            buildToolGateState(null, { id: 't', title: 'T' }, summary)
        );
        expect(Object.keys(withTask)).toContain('in_task_scope');
        for (const q of Object.values(withTask)) expect(q.type).toBe('noul');
    });
});

describe('rulebook hook tool-gate', () => {
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-tool-hook-'));
        await writeConfig({ gate: { toolHook: { enabled: true } } });
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    async function writeConfig(cfg: Record<string, unknown>) {
        await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
        await fs.writeFile(path.join(root, '.rulebook', 'rulebook.json'), JSON.stringify(cfg));
    }

    async function activeTask(id: string) {
        const dir = path.join(root, '.rulebook', 'tasks', id);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(
            path.join(dir, '.metadata.json'),
            JSON.stringify({ status: 'in-progress' })
        );
    }

    async function run(
        payload: Record<string, unknown> | string,
        opts: { env?: NodeJS.ProcessEnv; fetch?: unknown } = {}
    ) {
        const lines: string[] = [];
        const code = await hookCommand('tool-gate', {
            stdin:
                typeof payload === 'string'
                    ? payload
                    : JSON.stringify({ hook_event_name: 'PreToolUse', cwd: root, ...payload }),
            env: opts.env ?? KEY_ENV,
            fetch: opts.fetch as typeof fetch,
            log: (l) => lines.push(l),
        });
        return { code, lines };
    }

    const bash = (command: string) => ({ tool_name: 'Bash', tool_input: { command } });

    function decisionOf(lines: string[]) {
        expect(lines).toHaveLength(1);
        const out = JSON.parse(lines[0]);
        expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
        expect(out.hookSpecificOutput.permissionDecision).not.toBe('allow');
        return out.hookSpecificOutput as {
            permissionDecision: string;
            permissionDecisionReason: string;
        };
    }

    const cacheFile = () => toolGateCachePath(root, '.rulebook');

    it('safe_reversible 0.3 → deny naming the criterion, one Jev request', async () => {
        const fetchMock = jevFetch({ safe_reversible: 0.3 });
        const { code, lines } = await run(bash('rm -rf src/'), { fetch: fetchMock });
        expect(code).toBe(0);
        const out = decisionOf(lines);
        expect(out.permissionDecision).toBe('deny');
        expect(out.permissionDecisionReason).toContain('safe_reversible p=0.30');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('follows_project_rules 0.6 → ask', async () => {
        const { lines } = await run(bash('npm publish'), {
            fetch: jevFetch({ follows_project_rules: 0.6 }),
        });
        expect(decisionOf(lines).permissionDecision).toBe('ask');
    });

    it('all criteria pass → no output, exactly one Jev request', async () => {
        const fetchMock = jevFetch();
        const { code, lines } = await run(bash('npm run build'), { fetch: fetchMock });
        expect(code).toBe(0);
        expect(lines).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('in_task_scope 0.1 on an edit → ask, not deny; the active task is sent', async () => {
        await activeTask('phase1_login');
        const fetchMock = jevFetch({ in_task_scope: 0.1 });
        const { lines } = await run(
            {
                tool_name: 'Edit',
                tool_input: {
                    file_path: path.join(root, 'docs', 'x.md'),
                    old_string: 'a',
                    new_string: 'b',
                },
            },
            { fetch: fetchMock }
        );
        expect(decisionOf(lines).permissionDecision).toBe('ask');
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(body.state.task).toEqual({ id: 'phase1_login', title: 'phase1_login' });
        expect(Object.keys(body.questions)).toContain('in_task_scope');
        expect(body.state.call.file).toBe('docs/x.md');
    });

    it('destructive git → ask citing Git safety with zero Jev requests', async () => {
        const fetchMock = jevFetch();
        const { lines } = await run(bash('git reset --hard HEAD~1'), { fetch: fetchMock });
        const out = decisionOf(lines);
        expect(out.permissionDecision).toBe('ask');
        expect(out.permissionDecisionReason).toContain('Git safety');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('a token in the command never reaches Jev', async () => {
        const fetchMock = jevFetch();
        await run(bash('curl -H "Authorization: Bearer ghp_abc123def456" https://api.github.com'), {
            fetch: fetchMock,
        });
        const body = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
        expect(body).not.toContain('ghp_abc123def456');
    });

    it('cache hit makes no second request; an expired entry makes a new one', async () => {
        const fetchMock = jevFetch({ follows_project_rules: 0.6 });
        const first = await run(bash('npm run build'), { fetch: fetchMock });
        const second = await run(bash('npm run build'), { fetch: fetchMock });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(decisionOf(second.lines)).toEqual(decisionOf(first.lines));

        const cache = JSON.parse(await fs.readFile(cacheFile(), 'utf-8'));
        const keys = Object.keys(cache.entries);
        expect(keys).toHaveLength(1);
        cache.entries[keys[0]].t = Date.now() - 900_001;
        await fs.writeFile(cacheFile(), JSON.stringify(cache));

        await run(bash('npm run build'), { fetch: fetchMock });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('a different command or active task misses the cache', async () => {
        const fetchMock = jevFetch();
        await run(bash('npm run build'), { fetch: fetchMock });
        await run(bash('npm run lint'), { fetch: fetchMock });
        await activeTask('phase1_other');
        await run(bash('npm run build'), { fetch: fetchMock });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('an unreadable cache file is treated as empty', async () => {
        await fs.mkdir(path.dirname(cacheFile()), { recursive: true });
        await fs.writeFile(cacheFile(), '{not json');
        const fetchMock = jevFetch();
        const { code, lines } = await run(bash('ls'), { fetch: fetchMock });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(
            Object.keys(JSON.parse(await fs.readFile(cacheFile(), 'utf-8')).entries)
        ).toHaveLength(1);
    });

    it('no key → no output and no request', async () => {
        const fetchMock = vi.fn();
        const { code, lines } = await run(bash('ls'), { env: {}, fetch: fetchMock });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('timeout → no output within about the deadline, nothing cached', async () => {
        await writeConfig({ gate: { toolHook: { enabled: true, deadlineMs: 500 } } });
        const never = vi.fn(() => new Promise<Response>(() => {}));
        const t0 = Date.now();
        const { code, lines } = await run(bash('ls'), { fetch: never });
        expect(Date.now() - t0).toBeLessThan(2000);
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        await expect(fs.access(cacheFile())).rejects.toThrow();
    });

    it('a bad JSON response → no output, nothing cached', async () => {
        const bad = vi.fn(async () => new Response('not json', { status: 200 }));
        const { code, lines } = await run(bash('ls'), { fetch: bad });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        await expect(fs.access(cacheFile())).rejects.toThrow();
    });

    it('Jev down (network error) → no output, nothing cached', async () => {
        const down = vi.fn(async () => {
            throw new Error('connect ECONNREFUSED');
        });
        const { code, lines } = await run(bash('ls'), { fetch: down });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
        await expect(fs.access(cacheFile())).rejects.toThrow();
    });

    it('bad stdin → no output, exit 0', async () => {
        for (const stdin of ['', 'not json', '[1]']) {
            expect(await run(stdin, { fetch: vi.fn() })).toEqual({ code: 0, lines: [] });
        }
    });

    it('a tool outside the matcher is skipped, even a destructive one', async () => {
        const fetchMock = jevFetch({ safe_reversible: 0.1 });
        const read = await run(
            { tool_name: 'Read', tool_input: { file_path: 'a.ts' } },
            { fetch: fetchMock }
        );
        expect(read.lines).toEqual([]);
        await writeConfig({ gate: { toolHook: { enabled: true, matcher: 'Edit' } } });
        const git = await run(bash('git reset --hard'), { fetch: fetchMock });
        expect(git.lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('disabled (the default), RULEBOOK_GATE=off or TypeSafe opted out → nothing', async () => {
        const fetchMock = jevFetch({ safe_reversible: 0.1 });
        await writeConfig({});
        expect((await run(bash('git reset --hard'), { fetch: fetchMock })).lines).toEqual([]);
        await writeConfig({
            gate: { toolHook: { enabled: true } },
            integrations: { typesafe: { enabled: false } },
        });
        expect((await run(bash('rm -rf /'), { fetch: fetchMock })).lines).toEqual([]);
        await writeConfig({ gate: { toolHook: { enabled: true } } });
        const off = await run(bash('rm -rf /'), {
            env: { ...KEY_ENV, RULEBOOK_GATE: 'off' },
            fetch: fetchMock,
        });
        expect(off.lines).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('logs hash, decision and probabilities — never the command or the key', async () => {
        await writeConfig({ gate: { toolHook: { enabled: true } }, features: { logging: true } });
        await run(bash('echo super-secret-command-text'), {
            fetch: jevFetch({ safe_reversible: 0.3 }),
        });
        await run(bash('echo super-secret-command-text'), { fetch: jevFetch() });
        const raw = await fs.readFile(
            path.join(root, '.rulebook', 'logs', 'tool-gate.jsonl'),
            'utf-8'
        );
        const [first, second] = raw
            .trim()
            .split('\n')
            .map((l) => JSON.parse(l));
        expect(first).toMatchObject({ tool: 'Bash', decision: 'deny', cached: false });
        expect(first.summaryHash).toMatch(/^[0-9a-f]{16}$/);
        expect(first.probabilities.safe_reversible).toBe(0.3);
        expect(typeof first.elapsedMs).toBe('number');
        expect(second).toMatchObject({ decision: 'deny', cached: true });
        expect(raw).not.toContain('super-secret-command-text');
        expect(raw).not.toContain(FAKE_KEY);
    });
});

function hasBash(): boolean {
    try {
        execFileSync('bash', ['-c', 'echo ok'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/**
 * The wrapper is exercised for real through bash (skipped where bash is
 * absent). A fake `rulebook` first on PATH records whether the CLI — and so
 * Jev — was reached.
 */
describe.skipIf(!hasBash())('jev-gate.sh tool (wrapper)', () => {
    const WRAPPER = path.join(process.cwd(), 'templates', 'hooks', 'jev-gate.sh');
    const GUARD = path.join(process.cwd(), 'templates', 'hooks', 'no-os-scheduling.sh');
    let root: string;
    let marker: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-tool-wrapper-'));
        marker = path.join(root, 'cli-called');
        await fs.mkdir(path.join(root, '.claude', 'hooks'), { recursive: true });
        await fs.copyFile(GUARD, path.join(root, '.claude', 'hooks', 'no-os-scheduling.sh'));
        await fs.mkdir(path.join(root, 'bin'));
        const fake = path.join(root, 'bin', 'rulebook');
        await fs.writeFile(
            fake,
            '#!/usr/bin/env bash\necho "$*" > "$CLAUDE_PROJECT_DIR/cli-called"\necho \'{"fake":true}\'\n'
        );
        await fs.chmod(fake, 0o755);
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    function runWrapper(command: string): string {
        const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: root };
        const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
        env[pathKey] = path.join(root, 'bin') + path.delimiter + (env[pathKey] ?? '');
        return execFileSync('bash', [WRAPPER, 'tool'], {
            input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
            encoding: 'utf-8',
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    }

    it('crontab -e → the guard deny is printed and the CLI is never called', async () => {
        const out = JSON.parse(runWrapper('crontab -e').trim());
        expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
        expect(out.hookSpecificOutput.permissionDecisionReason).toMatch(/OS-level scheduling/);
        await expect(fs.access(marker)).rejects.toThrow();
    });

    it('anything else → handed to `rulebook hook tool-gate`', async () => {
        expect(JSON.parse(runWrapper('npm test').trim())).toEqual({ fake: true });
        expect((await fs.readFile(marker, 'utf-8')).trim()).toBe('hook tool-gate');
    });
});

/**
 * Fail-open contract of the wrapper itself: whatever the CLI does, the hook
 * exits 0, and only the CLI's stdout passes through. `PATH` is stripped of any
 * directory holding a `rulebook` so a global install cannot leak in.
 */
describe.skipIf(!hasBash())('jev-gate.sh fail-open (wrapper)', () => {
    const WRAPPER = path.join(process.cwd(), 'templates', 'hooks', 'jev-gate.sh');
    let root: string;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-wrapper-open-'));
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    async function fakeCli(file: string, body: string): Promise<void> {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, `#!/usr/bin/env bash\n${body}\n`);
        await fs.chmod(file, 0o755);
    }

    function runWrapper(arg: string, extraPath?: string) {
        const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: root };
        const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
        const entries = (env[pathKey] ?? '')
            .split(path.delimiter)
            .filter(
                (dir) =>
                    dir &&
                    !['rulebook', 'rulebook.exe', 'rulebook.cmd'].some((name) =>
                        existsSync(path.join(dir, name))
                    )
            );
        env[pathKey] = [extraPath, ...entries].filter(Boolean).join(path.delimiter);
        return spawnSync('bash', [WRAPPER, arg], {
            input: JSON.stringify({ prompt: 'hello', tool_name: 'Bash', tool_input: {} }),
            encoding: 'utf-8',
            env,
        });
    }

    it('prompt with no CLI → exit 0, no output', () => {
        const r = runWrapper('prompt');
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('');
    });

    it('a CLI that fails with a stack trace → exit 0, no output', async () => {
        await fakeCli(
            path.join(root, 'bin', 'rulebook'),
            "echo 'Error: Cannot find module x (MODULE_NOT_FOUND)' >&2\nexit 1"
        );
        for (const arg of ['prompt', 'tool']) {
            const r = runWrapper(arg, path.join(root, 'bin'));
            expect(r.status).toBe(0);
            expect(r.stdout).toBe('');
        }
    });

    it('the project node_modules/.bin CLI wins over one on PATH', async () => {
        await fakeCli(path.join(root, 'bin', 'rulebook'), 'echo \'{"from":"path"}\'');
        await fakeCli(
            path.join(root, 'node_modules', '.bin', 'rulebook'),
            'echo "{\\"from\\":\\"local\\",\\"args\\":\\"$*\\"}"'
        );
        const r = runWrapper('prompt', path.join(root, 'bin'));
        expect(r.status).toBe(0);
        expect(JSON.parse(r.stdout.trim())).toEqual({ from: 'local', args: 'hook prompt-gate' });
    });

    /** A rulebook-repo checkout: package.json named @hivehub/rulebook + a fake dist/index.js. */
    async function rulebookRepo(name: string): Promise<string> {
        await fs.writeFile(
            path.join(root, 'package.json'),
            JSON.stringify({ name, version: '0.0.0' }, null, 2)
        );
        await fs.mkdir(path.join(root, 'dist'), { recursive: true });
        await fs.writeFile(
            path.join(root, 'dist', 'index.js'),
            "console.log(JSON.stringify({ from: 'dist', args: process.argv.slice(2).join(' ') }));\n"
        );
        // `node` on PATH without re-adding a directory that holds a rulebook shim.
        const nodeBin = path.join(root, 'nodebin');
        await fakeCli(path.join(nodeBin, 'node'), `exec "${process.execPath}" "$@"`);
        return nodeBin;
    }

    it("in the rulebook repo itself, runs the repo's dist/index.js", async () => {
        const nodeBin = await rulebookRepo('@hivehub/rulebook');
        const r = runWrapper('prompt', nodeBin);
        expect(r.status).toBe(0);
        expect(JSON.parse(r.stdout.trim())).toEqual({ from: 'dist', args: 'hook prompt-gate' });
    });

    it('a project whose package.json is not @hivehub/rulebook does not run its dist', async () => {
        const nodeBin = await rulebookRepo('some-other-app');
        const r = runWrapper('prompt', nodeBin);
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('');
    });

    it('node_modules/.bin still wins over the rulebook repo dist', async () => {
        const nodeBin = await rulebookRepo('@hivehub/rulebook');
        await fakeCli(
            path.join(root, 'node_modules', '.bin', 'rulebook'),
            'echo "{\\"from\\":\\"local\\",\\"args\\":\\"$*\\"}"'
        );
        const r = runWrapper('prompt', nodeBin);
        expect(r.status).toBe(0);
        expect(JSON.parse(r.stdout.trim())).toEqual({ from: 'local', args: 'hook prompt-gate' });
    });
});
