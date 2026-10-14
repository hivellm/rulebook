import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import { runHookMain, sessionKey, warnOncePerSession } from '../src/cli/hook-entry';

/** Same retrying removal as the other hook suites (Windows delete-pending errors). */
const removeTempDir = (dir: string) =>
    fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

describe('rulebook-hook entry (hook-entry.ts)', () => {
    let tmp: string;

    beforeEach(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-hook-main-'));
    });

    afterEach(async () => {
        await removeTempDir(tmp);
    });

    const payload = (session: string) =>
        JSON.stringify({ session_id: session, cwd: tmp, prompt: 'fix the login bug' });
    const broken = async () => {
        throw Object.assign(new Error("Cannot find module './commands/hook.js'"), {
            code: 'ERR_MODULE_NOT_FOUND',
        });
    };

    async function run(argv: string[], stdin: string, loadHook = broken) {
        const lines: string[] = [];
        const code = await runHookMain(argv, {
            stdin,
            env: {},
            log: (l) => lines.push(l),
            tmpDir: tmp,
            loadHook,
        });
        return { code, lines };
    }

    it('a hook module that cannot load → one systemMessage per session, exit 0', async () => {
        const first = await run(['prompt-gate'], payload('sess-a'));
        expect(first.code).toBe(0);
        expect(first.lines).toHaveLength(1);
        expect(JSON.parse(first.lines[0]).systemMessage).toMatch(
            /could not load \(ERR_MODULE_NOT_FOUND\).*off for this session.*rulebook update/
        );
        expect(await run(['prompt-gate'], payload('sess-a'))).toEqual({ code: 0, lines: [] });
        expect((await run(['tool-gate'], payload('sess-b'))).lines).toHaveLength(1);
    });

    it('a working module gets the payload and answers as `rulebook hook` does', async () => {
        const calls: Array<[string, string]> = [];
        const ok = async () => ({
            hookCommand: async (event: string, o: { stdin?: unknown }) => {
                calls.push([event, String(o.stdin)]);
                return 0;
            },
        });
        const r = await run(['prompt-gate'], payload('s'), ok as never);
        expect(r).toEqual({ code: 0, lines: [] });
        expect(calls).toEqual([['prompt-gate', payload('s')]]);
    });

    it('the real hook module: gate off → no output, exit 0', async () => {
        const lines: string[] = [];
        const code = await runHookMain(['prompt-gate'], {
            stdin: payload('s'),
            env: { RULEBOOK_GATE: 'off' },
            log: (l) => lines.push(l),
            tmpDir: tmp,
        });
        expect({ code, lines }).toEqual({ code: 0, lines: [] });
    });

    it('--check: 0 when the module loads, 1 when it does not', async () => {
        expect(await runHookMain(['--check'], { loadHook: async () => ({}) as never })).toBe(0);
        expect(await runHookMain(['--check'], { loadHook: broken })).toBe(1);
    });

    it('sessionKey keeps only file-name-safe characters', () => {
        expect(sessionKey(JSON.stringify({ session_id: 'a1-B2_c3' }))).toBe('a1-B2_c3');
        expect(sessionKey(JSON.stringify({ session_id: '../../etc/x' }))).toBe('etcx');
        expect(sessionKey('not json')).toBe('nosession');
        expect(sessionKey('{}')).toBe('nosession');
    });

    it('warnOncePerSession prints only for the first call of a session', () => {
        const lines: string[] = [];
        expect(warnOncePerSession(payload('z'), 'x failed', (l) => lines.push(l), tmp)).toBe(true);
        expect(warnOncePerSession(payload('z'), 'x failed', (l) => lines.push(l), tmp)).toBe(false);
        expect(lines).toHaveLength(1);
    });
});

/** The built entry, end to end (skipped until `npm run build` has produced dist/). */
const HOOK_MAIN = path.join(process.cwd(), 'dist', 'cli', 'hook-main.js');

describe.skipIf(!existsSync(HOOK_MAIN))('dist/cli/hook-main.js', () => {
    it('runs with exit 0 and no output when the gate is off, and --check passes', () => {
        const env = { ...process.env, RULEBOOK_GATE: 'off' };
        const r = spawnSync(process.execPath, [HOOK_MAIN, 'prompt-gate'], {
            input: JSON.stringify({ session_id: 's', prompt: 'hello', cwd: os.tmpdir() }),
            encoding: 'utf-8',
            env,
        });
        expect(r.status).toBe(0);
        expect(r.stdout).toBe('');
        expect(spawnSync(process.execPath, [HOOK_MAIN, '--check']).status).toBe(0);
    });

    it('never reaches the full CLI: no dist/index.js, no commander', async () => {
        // Walk every static and dynamic import reachable from the entry.
        const seen = new Set<string>();
        const packages = new Set<string>();
        const queue = [HOOK_MAIN];
        while (queue.length > 0) {
            const file = queue.pop()!;
            if (seen.has(file)) continue;
            seen.add(file);
            const source = await fs.readFile(file, 'utf-8');
            for (const m of source.matchAll(/(?:from|import\()\s*'([^']+)'/g)) {
                if (m[1].startsWith('.')) queue.push(path.resolve(path.dirname(file), m[1]));
                else packages.add(m[1]);
            }
        }
        expect(seen.has(path.join(process.cwd(), 'dist', 'index.js'))).toBe(false);
        expect(packages.has('commander')).toBe(false);
        expect(seen.size).toBeLessThan(20);
    });
});
