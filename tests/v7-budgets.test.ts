import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { buildRulebookMcpEntry } from '../src/core/claude/claude-mcp';

/**
 * v7 CI acceptance checks (docs/analysis/v7-performance/05-budget-and-metrics.md).
 *
 * Checks 1 (injected-context budget), 4 (orchestration freedom, P0) and 6
 * (autonomy profile) live in context-budget.test.ts and
 * claude-settings-manager.test.ts, check 2 (hook audit) in
 * hook-spawn-budget.test.ts. This file covers check 3 (MCP schema
 * budget) and check 5 (startup benchmark) against the built slim server.
 * Requires `npm run build` first; skipped when dist/ is absent.
 */
const SERVER = path.join(process.cwd(), 'dist', 'mcp', 'rulebook-server.js');
// F-019: probe the launch command rulebook generates for this repo, not a
// hand-written one, so a regression of the generated form fails here.
const LAUNCH = buildRulebookMcpEntry(process.cwd());
const MCP_TOOL_BUDGET = 8;
// v7.0 shipped at ~3.2 KB. v7.2 adds the decision-request surface to
// rulebook_task (ask|answer|questions + 7 terse params) rather than an extra
// tool, which costs ~0.6 KB of schema; the ceiling moves once to cover it.
// v7.4 adds the rulebook_gate tool (Jev entry gate, ~0.5 KB); the ceiling moves once more.
// Measured 4869 of 4900 at v7.4.0 (31 B headroom): any change to the rulebook_gate
// description or input schema can trip this check — re-measure before moving the ceiling.
// MCP SDK 1.26 adds `"execution":{"taskSupport":"forbidden"}` to every registered tool
// (6 × 40 B = 240 B, not ours): measured 5109 = 4869 + 240, so the ceiling moves by that.
// v7.5: create takes the task content (why/what/items/impact) so tasks are born complete
// (measured 5550 = 5109 + 441; ceiling = measured + 2 %).
// v7.5: tool annotations (read-only/destructive/idempotent/open-world hints, F-037) are
// client metadata, not input schema; they add 584 B (measured 6134 = 5550 + 584;
// ceiling = measured + 2 %).
const MCP_SCHEMA_BYTES_BUDGET = 6260;
// Node process startup dominates; generous CI-safe ceiling (Linux ~150ms,
// Windows ~300ms). Regressions to full-CLI loading (~450ms+) still fail.
const MCP_INIT_MS_BUDGET = 2000;

interface McpProbe {
    initMs: number;
    serverVersion: string;
    toolCount: number;
    schemaBytes: number;
}

function probeServer(command: string, args: string[]): Promise<McpProbe> {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const p = spawn(command, args, { cwd: process.cwd() });
        let buf = '';
        let initMs = -1;
        let serverVersion = '';
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
                        serverVersion = msg.result.serverInfo.version;
                        p.stdin.write(
                            JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n'
                        );
                    }
                    if (msg.id === 2) {
                        clearTimeout(timer);
                        p.kill();
                        resolve({
                            initMs,
                            serverVersion,
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
        const probe = await probeServer(LAUNCH.command, LAUNCH.args);

        const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        expect(probe.serverVersion).toBe(pkg.version);
        expect(probe.toolCount).toBeLessThanOrEqual(MCP_TOOL_BUDGET);
        expect(probe.schemaBytes).toBeLessThanOrEqual(MCP_SCHEMA_BYTES_BUDGET);
        expect(probe.initMs).toBeGreaterThan(0);
        expect(probe.initMs).toBeLessThanOrEqual(MCP_INIT_MS_BUDGET);
    }, 20000);
});

// The single-file bundle (`npm run build:mcp-bundle`) the fast path launches:
// same tools, same version lookup (its import.meta.url rewrite), same budgets.
const BUNDLE = path.join(process.cwd(), 'dist', 'mcp', 'rulebook-server.bundle.js');
describe.skipIf(!existsSync(BUNDLE) || !existsSync(SERVER))('bundled MCP server', () => {
    it('serves the same tools as the unbundled server within the same budgets', async () => {
        const bundled = await probeServer('node', [BUNDLE]);
        const unbundled = await probeServer('node', [SERVER]);

        const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        expect(bundled.serverVersion).toBe(pkg.version);
        expect(bundled.toolCount).toBe(unbundled.toolCount);
        expect(bundled.schemaBytes).toBe(unbundled.schemaBytes);
        expect(bundled.initMs).toBeLessThanOrEqual(MCP_INIT_MS_BUDGET);
    }, 40000);
});

describe('generated MCP launch command (F-013, F-019)', () => {
    it('pins the installed version for other projects and never uses @latest', () => {
        const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
        const entry = buildRulebookMcpEntry(path.join(os.tmpdir(), 'not-the-rulebook-repo'));

        expect(entry).toEqual({
            command: 'npx',
            args: ['-y', `--package=@hivehub/rulebook@${pkg.version}`, 'rulebook-mcp'],
        });
        expect(entry.args.join(' ')).not.toMatch(/@latest|mcp-server/);
    });

    it('runs the local build in the rulebook repo itself (F-018)', () => {
        expect(LAUNCH).toEqual({ command: 'node', args: ['./dist/mcp/rulebook-server.js'] });
    });
});
