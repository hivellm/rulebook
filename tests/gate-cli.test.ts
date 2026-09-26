import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { gateCommand } from '../src/cli/commands/gate';

const FAKE_KEY = 'ts_fake_cli_key_000';

function jevFetch() {
    return vi.fn(async (_url: string, init: RequestInit) => {
        const req = JSON.parse(init.body as string);
        const answers: Record<string, unknown> = {};
        for (const [id, q] of Object.entries(req.questions) as Array<
            [string, { type: string; criteria?: Record<string, string> }]
        >) {
            if (q.type === 'choice') {
                const keys = Object.keys(q.criteria ?? {});
                const probabilities = Object.fromEntries(
                    keys.map((k, i) => [k, i === 0 ? 0.9 : 0.1 / (keys.length - 1)])
                );
                answers[id] = { type: 'choice', choice: keys[0], confidence: 0.9, probabilities };
            } else {
                answers[id] = { type: 'noul', noul: id === 'ping' ? 0.99 : 0.05 };
            }
        }
        return new Response(
            JSON.stringify({
                model: 'jev-1.13.0',
                answers,
                usage: { input_tokens: 40, output_tokens: 5 },
            }),
            { status: 200 }
        );
    });
}

describe('rulebook gate CLI', () => {
    let root: string;
    let lines: string[];
    const log = (line: string) => lines.push(line);

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-gate-cli-'));
        lines = [];
    });

    afterEach(async () => {
        await fs.rm(root, { recursive: true, force: true });
    });

    it('--json prints the full gate result', async () => {
        const code = await gateCommand('fix the typo in README', {
            json: true,
            cwd: root,
            env: { TYPESAFE_API_KEY: FAKE_KEY },
            fetch: jevFetch() as never,
            log,
        });
        expect(code).toBe(0);
        const result = JSON.parse(lines.join('\n'));
        expect(result.available).toBe(true);
        expect(result.routing.kind).toBe('small-fix');
        expect(result.routing.needsTask).toBe(false);
        expect(lines.join('\n')).not.toContain(FAKE_KEY);
    });

    it('prints a readable routing block', async () => {
        const code = await gateCommand('fix the typo', {
            cwd: root,
            env: { TYPESAFE_API_KEY: FAKE_KEY },
            fetch: jevFetch() as never,
            log,
        });
        expect(code).toBe(0);
        const out = lines.join('\n');
        expect(out).toMatch(/Jev gate — available \(jev-1\.13\.0/);
        expect(out).toMatch(/kind\s+small-fix/);
        expect(out).toMatch(/→ Jev routing:/);
    });

    it('without a key: unavailable, instructions always printed, exit 0', async () => {
        const code = await gateCommand('anything', { cwd: root, env: {}, log });
        expect(code).toBe(0);
        const out = lines.join('\n');
        expect(out).toMatch(/unavailable \(no-key\)/);
        expect(out).toMatch(/TYPESAFE_API_KEY/);
    });

    it('no prompt and no --check → usage, exit 1', async () => {
        expect(await gateCommand(undefined, { cwd: root, env: {}, log })).toBe(1);
        expect(lines[0]).toMatch(/^Usage: rulebook gate/);
    });

    it('--check with a key: one ping call, reports source/latency/usage, never the key', async () => {
        const fetchMock = jevFetch();
        const code = await gateCommand(undefined, {
            check: true,
            json: true,
            cwd: root,
            env: { TYPESAFE_API_KEY: FAKE_KEY },
            fetch: fetchMock as never,
            log,
        });
        expect(code).toBe(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(body.state).toBe('ping');
        expect(Object.keys(body.questions)).toEqual(['ping']);
        const c = JSON.parse(lines.join('\n'));
        expect(c).toMatchObject({ available: true, keySource: 'env', model: 'jev-1.13.0' });
        expect(c.usage).toEqual({ input_tokens: 40, output_tokens: 5 });
        expect(lines.join('\n')).not.toContain(FAKE_KEY);
    });

    it('--check reads the key from .env and says so', async () => {
        await fs.writeFile(path.join(root, '.env'), `TYPESAFE_API_KEY="${FAKE_KEY}"\n`);
        const code = await gateCommand(undefined, {
            check: true,
            cwd: root,
            env: {},
            fetch: jevFetch() as never,
            log,
        });
        expect(code).toBe(0);
        const out = lines.join('\n');
        expect(out).toMatch(/TYPESAFE_API_KEY\s+found \(\.env\)/);
        expect(out).toMatch(/Jev\s+available/);
        expect(out).not.toContain(FAKE_KEY);
    });

    it('--check unavailable: exit 0, or 2 with --strict', async () => {
        expect(await gateCommand(undefined, { check: true, cwd: root, env: {}, log })).toBe(0);
        expect(lines.join('\n')).toMatch(/not found/);
        expect(
            await gateCommand(undefined, { check: true, strict: true, cwd: root, env: {}, log })
        ).toBe(2);
    });

    it('--check on a 401 reports http without the key', async () => {
        const fetchMock = vi.fn(
            async () =>
                new Response(JSON.stringify({ error: { message: `bad ${FAKE_KEY}` } }), {
                    status: 401,
                })
        );
        const code = await gateCommand(undefined, {
            check: true,
            strict: true,
            cwd: root,
            env: { TYPESAFE_API_KEY: FAKE_KEY },
            fetch: fetchMock as never,
            log,
        });
        expect(code).toBe(2);
        const out = lines.join('\n');
        expect(out).toMatch(/unavailable \(http/);
        expect(out).not.toContain(FAKE_KEY);
    });

    it('--check honours RULEBOOK_GATE=off without a network call', async () => {
        const fetchMock = vi.fn();
        await gateCommand(undefined, {
            check: true,
            cwd: root,
            env: { TYPESAFE_API_KEY: FAKE_KEY, RULEBOOK_GATE: 'off' },
            fetch: fetchMock as never,
            log,
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(lines.join('\n')).toMatch(/unavailable \(disabled\)/);
    });

    it('--check under RULEBOOK_GATE=off does not read .env', async () => {
        await fs.writeFile(path.join(root, '.env'), `TYPESAFE_API_KEY=${FAKE_KEY}\n`);
        const fetchMock = vi.fn();
        await gateCommand(undefined, {
            check: true,
            json: true,
            cwd: root,
            env: { RULEBOOK_GATE: 'off' },
            fetch: fetchMock as never,
            log,
        });
        const c = JSON.parse(lines.join('\n'));
        expect(c).toEqual({ available: false, reason: 'disabled', keySource: null });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
