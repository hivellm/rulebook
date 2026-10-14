import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

/**
 * F-016: the MCP server must exit when its client closes stdin, even while
 * something else (a timer, socket or watcher) keeps the event loop alive.
 * A preload holds an interval open for the whole run; without the explicit
 * stdin end/close handler the server would never exit.
 * Requires `npm run build` first; skipped when dist/ is absent.
 */
const SERVER = path.join(process.cwd(), 'dist', 'mcp', 'rulebook-server.js');
const EXIT_AFTER_STDIN_CLOSE_MS = 100;

const tmp = mkdtempSync(path.join(os.tmpdir(), 'rulebook-mcp-lifecycle-'));
const HOLD_TIMER = path.join(tmp, 'hold-timer.cjs');
writeFileSync(HOLD_TIMER, 'setInterval(() => {}, 60000);\n');

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function exitDelayAfterStdinClose(): Promise<{ ms: number; code: number | null }> {
    return new Promise((resolve, reject) => {
        const p = spawn('node', ['-r', HOLD_TIMER, SERVER], { cwd: process.cwd() });
        let buf = '';
        let closedAt = 0;
        const timer = setTimeout(() => {
            p.kill();
            reject(new Error('server did not exit after stdin closed'));
        }, 10000);

        p.on('exit', (code) => {
            clearTimeout(timer);
            if (!closedAt) return reject(new Error(`server exited before stdin closed (${code})`));
            resolve({ ms: performance.now() - closedAt, code });
        });

        p.stdout.on('data', (d) => {
            buf += d.toString();
            if (closedAt || !buf.includes('"id":1')) return;
            // Initialized: the transport is reading stdin. Now the client goes away.
            closedAt = performance.now();
            p.stdin.end();
        });

        p.stdin.write(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'mcp-lifecycle', version: '1.0' },
                },
            }) + '\n'
        );
    });
}

describe.skipIf(!existsSync(SERVER))('MCP server lifecycle (F-016)', () => {
    it('exits promptly when stdin closes while a timer holds the event loop', async () => {
        const { ms, code } = await exitDelayAfterStdinClose();
        expect(code).toBe(0);
        expect(ms).toBeLessThanOrEqual(EXIT_AFTER_STDIN_CLOSE_MS);
    }, 15000);
});
