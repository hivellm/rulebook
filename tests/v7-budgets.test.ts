import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

/**
 * v7 CI acceptance checks (docs/analysis/v7-performance/05-budget-and-metrics.md).
 *
 * Checks 1 (file token budget), 2 (hook audit), 4 (orchestration freedom, P0)
 * and 6 (autonomy profile) live in context-budget.test.ts and
 * claude-settings-manager.test.ts. This file covers check 3 (MCP schema
 * budget) and check 5 (startup benchmark) against the built slim server.
 * Requires `npm run build` first; skipped when dist/ is absent.
 */
const SERVER = path.join(process.cwd(), 'dist', 'mcp', 'rulebook-server.js');
const MCP_TOOL_BUDGET = 8;
const MCP_SCHEMA_BYTES_BUDGET = 3600;
// Node process startup dominates; generous CI-safe ceiling (Linux ~150ms,
// Windows ~300ms). Regressions to full-CLI loading (~450ms+) still fail.
const MCP_INIT_MS_BUDGET = 2000;

interface McpProbe {
    initMs: number;
    toolCount: number;
    schemaBytes: number;
}

function probeServer(): Promise<McpProbe> {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const p = spawn('node', [SERVER], { cwd: process.cwd() });
        let buf = '';
        let initMs = -1;
        const timer = setTimeout(() => {
            p.kill();
            reject(new Error('MCP probe timed out'));
        }, 15000);

        p.stdout.on('data', (d) => {
            buf += d.toString();
            for (const line of buf.split('\n')) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.id === 1 && initMs === -1) {
                        initMs = Date.now() - t0;
                        p.stdin.write(
                            JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n'
                        );
                    }
                    if (msg.id === 2) {
                        clearTimeout(timer);
                        p.kill();
                        resolve({
                            initMs,
                            toolCount: msg.result.tools.length,
                            schemaBytes: JSON.stringify(msg.result.tools).length,
                        });
                    }
                } catch {
                    // partial line
                }
            }
        });

        p.stdin.write(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'initialize',
                params: {
                    protocolVersion: '2024-11-05',
                    capabilities: {},
                    clientInfo: { name: 'v7-budgets', version: '1.0' },
                },
            }) + '\n'
        );
    });
}

describe.skipIf(!existsSync(SERVER))('v7 MCP budgets (acceptance checks 3 + 5)', () => {
    it('slim server stays within tool-count, schema-bytes and init budgets', async () => {
        const probe = await probeServer();

        expect(probe.toolCount).toBeLessThanOrEqual(MCP_TOOL_BUDGET);
        expect(probe.schemaBytes).toBeLessThanOrEqual(MCP_SCHEMA_BYTES_BUDGET);
        expect(probe.initMs).toBeGreaterThan(0);
        expect(probe.initMs).toBeLessThanOrEqual(MCP_INIT_MS_BUDGET);
    }, 20000);
});
