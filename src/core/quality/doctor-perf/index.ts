import os from 'os';
import path from 'path';
import { getTemplatesDir } from '../../generators/generator.js';
import {
    buildHookChecks,
    collectHookEntries,
    criticalPath,
    fmtMs,
    isCodexSource,
    shortCommand,
} from './hooks.js';
import { inspectCodex, inspectLeftovers } from './project-checks.js';
import { inspectMcp, listOsProcesses, mb, resolveCli } from './runtime.js';
import { collectHookTimings, timingKey } from './transcripts.js';
import type {
    HookEntryInfo,
    PerfCheck,
    PerfDoctorOptions,
    PerfReport,
    UnconfiguredHookTiming,
} from './types.js';

export type * from './types.js';

/** Default transcript window for hook timing. */
export const DEFAULT_PERF_DAYS = 3;

/**
 * `rulebook doctor --perf` (docs/analysis/multi-session-performance/
 * 07-recommendations.md C8): the per-call costs on rulebook's path, most of
 * which are not rulebook's — hooks from every config source with measured
 * p50/p90, how the hook wrapper resolves the CLI, the MCP launch form and live
 * server chains, stale PID files, leftover v5/v6 assets and the Codex side.
 *
 * Read-only: it never edits settings, never kills a process and never deletes
 * a file. Home and Codex paths, PATH, the clock and the process lister are
 * injectable so tests run against fixtures, not the real machine.
 */
export async function runPerfDoctor(options: PerfDoctorOptions): Promise<PerfReport> {
    const projectRoot = path.resolve(options.projectRoot);
    const homeDir = options.homeDir ?? os.homedir();
    const codexHome =
        options.codexHome ??
        (options.homeDir
            ? path.join(options.homeDir, '.codex')
            : process.env.CODEX_HOME || path.join(homeDir, '.codex'));
    const days = options.days && options.days > 0 ? options.days : DEFAULT_PERF_DAYS;
    const now = options.now ?? Date.now();
    const platform = options.platform ?? process.platform;
    const pathEnv = options.pathEnv ?? process.env.PATH ?? '';
    const listProcesses =
        options.listProcesses === undefined
            ? () => listOsProcesses(platform)
            : options.listProcesses;
    const templatesDir = options.templatesDir ?? getTemplatesDir();

    // 1. Hooks + timing
    const entries = await collectHookEntries({ projectRoot, homeDir, codexHome, platform });
    const t = await collectHookTimings(homeDir, projectRoot, days, now);
    const matched = new Set<string>();
    for (const e of entries) {
        if (isCodexSource(e.source) || !e.command) continue;
        const key = timingKey(e.event, e.command);
        const timing = t.timings.get(key);
        if (timing) {
            e.timing = timing;
            matched.add(key);
        }
    }
    const unconfigured: UnconfiguredHookTiming[] = [];
    for (const [key, timing] of t.timings) {
        if (matched.has(key)) continue;
        const [event, command] = key.split('\u0000');
        unconfigured.push({ event, command, timing });
    }
    unconfigured.sort((a, b) => b.timing.totalMs - a.timing.totalMs);
    const hookChecks = buildHookChecks(entries, unconfigured, days);
    if (t.files === 0) {
        hookChecks.unshift({
            id: 'hook-transcripts',
            status: 'info',
            message: `no Claude Code transcripts for this project in the last ${days} d — no timing`,
        });
    }

    // 2–5. CLI resolution, MCP, leftovers, Codex
    const jevGateWired = entries.some(
        (e) => !isCodexSource(e.source) && (e.rulebookHook ?? '').startsWith('jev-gate.sh')
    );
    const cli = await resolveCli({ projectRoot, pathEnv, platform, jevGateWired });
    const mcp = await inspectMcp({ projectRoot, homeDir, codexHome, platform, listProcesses });
    const leftovers = await inspectLeftovers({ projectRoot, templatesDir, hooks: entries });
    const codex = await inspectCodex({ projectRoot, codexHome, platform, hooks: entries });

    const report: PerfReport = {
        projectRoot,
        generatedAt: new Date(now).toISOString(),
        days,
        hooks: {
            entries,
            unconfigured,
            transcripts: { dirs: t.dirs, files: t.files, records: t.records, days },
            criticalPath: criticalPath(entries),
            checks: hookChecks,
        },
        cli,
        mcp,
        leftovers,
        codex,
        summary: { ok: 0, warn: 0, info: 0 },
    };
    for (const c of allChecks(report)) report.summary[c.status]++;
    return report;
}

function allChecks(r: PerfReport): PerfCheck[] {
    return [
        ...r.hooks.checks,
        ...r.cli.checks,
        ...r.mcp.checks,
        ...r.leftovers.checks,
        ...r.codex.checks,
    ];
}

const ICON: Record<PerfCheck['status'], string> = { ok: '✔', warn: '⚠', info: 'ℹ' };

function checkLines(checks: PerfCheck[], details: Record<string, string[]> = {}): string[] {
    const lines: string[] = [];
    for (const c of checks) {
        lines.push(`  ${ICON[c.status]} ${c.message}`);
        if (c.status === 'warn' && c.action) lines.push(`    → ${c.action}`);
        for (const d of details[c.id] ?? []) lines.push(`      ${d}`);
    }
    return lines;
}

function sourceLabel(e: HookEntryInfo): string {
    const src = e.source === 'plugin' ? `plugin:${(e.plugin ?? '').split('@')[0]}` : e.source;
    return e.owner === 'rulebook' ? `rulebook/${src}` : src;
}

function inventoryLine(e: HookEntryInfo): string {
    const timing = e.timing
        ? `p50 ${fmtMs(e.timing.p50Ms)} · p90 ${fmtMs(e.timing.p90Ms)} · n=${e.timing.runs}`
        : isCodexSource(e.source)
          ? '(Codex: no timing)'
          : '(none recorded)';
    const mode = e.async ? 'async' : 'blocking';
    const timeout = e.timeoutSec !== null ? ` ${e.timeoutSec}s` : '';
    return (
        `  ${e.event.padEnd(17)} ${(e.matcher || '(all)').padEnd(16)} ${sourceLabel(e).padEnd(22)} ` +
        `${(mode + timeout).padEnd(13)} ${timing.padEnd(36)} ${shortCommand(e.command, 64)}`
    );
}

/** Human report: short sections of ✔/⚠/ℹ lines, one suggested action (→) per warning. */
export function formatPerfReport(r: PerfReport): string {
    const out: string[] = [];
    out.push(`rulebook doctor --perf — ${r.projectRoot}`);
    out.push('Read-only report: nothing was changed.');
    out.push('');

    const h = r.hooks;
    out.push(
        `Hooks — ${h.entries.length} entr${h.entries.length === 1 ? 'y' : 'ies'}; ` +
            `timing from ${h.transcripts.files} transcript file(s), ${h.transcripts.records} hook runs, last ${h.transcripts.days} d`
    );
    for (const e of h.entries) out.push(inventoryLine(e));
    out.push(...checkLines(h.checks));
    if (h.criticalPath.length > 0) {
        out.push('  · critical path per event (hooks run in parallel; the slowest sets the wait):');
        for (const c of h.criticalPath) {
            out.push(
                `      ${c.event.padEnd(17)} p50 ${fmtMs(c.p50Ms)} · p90 ${fmtMs(c.p90Ms)} — ${shortCommand(c.slowestCommand, 60)}` +
                    (c.hooks > 1 ? ` (slowest of ${c.hooks})` : '')
            );
        }
    }
    const extra = h.unconfigured.slice(0, 5);
    if (extra.length > 0) {
        out.push('  · in transcripts but not in current config:');
        for (const u of extra) {
            out.push(
                `      ${u.event} ${shortCommand(u.command, 60)} — p50 ${fmtMs(u.timing.p50Ms)}, n=${u.timing.runs}`
            );
        }
    }
    out.push('');

    out.push('CLI resolution');
    out.push(...checkLines(r.cli.checks));
    out.push('');

    out.push('MCP');
    out.push(
        ...checkLines(r.mcp.checks, {
            'mcp-processes': r.mcp.processes.hosts.map(
                (h) =>
                    `${h.host}: ${h.chains} server(s), ${h.processes} processes, ${mb(h.memoryBytes)}` +
                    (h.processes > h.chains
                        ? ` (${(h.processes / h.chains).toFixed(1)} processes per server)`
                        : '')
            ),
        })
    );
    out.push('');

    out.push('Leftovers');
    out.push(...checkLines(r.leftovers.checks));
    out.push('');

    out.push('Codex');
    out.push(...checkLines(r.codex.checks));
    out.push('');

    out.push(`Summary: ${r.summary.ok} ok · ${r.summary.warn} warning(s) · ${r.summary.info} info`);
    return out.join('\n');
}
