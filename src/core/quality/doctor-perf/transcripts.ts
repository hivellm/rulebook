import path from 'path';
import { createReadStream, promises as fs } from 'fs';
import { createInterface } from 'readline';
import type { HookTiming } from './types.js';

/**
 * Hook timing from Claude Code transcripts (`~/.claude/projects/<slug>/`).
 *
 * Claude Code records each hook run as an `attachment` line —
 * `hook_success` (with `stdout`, `exitCode`), `hook_non_blocking_error`,
 * `hook_cancelled` (with `timedOut`, `timeoutMs`) — carrying `hookEvent`,
 * `command` and `durationMs`. Stop hooks are also summarised in a
 * `system`/`stop_hook_summary` line (`hookInfos: [{command, durationMs}]`),
 * which is the only record for Stop hooks that print nothing; it is merged
 * with the attachments by `toolUseID` + command so no run counts twice.
 */

/** Minimum recorded outputs before a hook is called "always silent". */
export const MIN_SILENT_RUNS = 10;

/** Claude Code's transcript folder name for a project path: every non-alphanumeric → `-`. */
export function projectSlug(projectRoot: string): string {
    return projectRoot.replace(/[^a-zA-Z0-9]/g, '-');
}

/** Transcript folders for the project (drive-letter case varies, so match case-insensitively). */
export async function findTranscriptDirs(homeDir: string, projectRoot: string): Promise<string[]> {
    const base = path.join(homeDir, '.claude', 'projects');
    const slug = projectSlug(projectRoot).toLowerCase();
    try {
        const names = await fs.readdir(base);
        return names.filter((n) => n.toLowerCase() === slug).map((n) => path.join(base, n));
    } catch {
        return [];
    }
}

/** `*.jsonl` files under a transcript folder (sessions + `<session>/subagents/**`) modified since `sinceMs`. */
export async function listTranscriptFiles(
    dir: string,
    sinceMs: number,
    depth = 0
): Promise<string[]> {
    const out: string[] = [];
    let entries: import('fs').Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (depth < 4 && e.name !== 'memory' && e.name !== 'tool-results') {
                out.push(...(await listTranscriptFiles(p, sinceMs, depth + 1)));
            }
        } else if (e.isFile() && e.name.endsWith('.jsonl')) {
            try {
                if ((await fs.stat(p)).mtimeMs >= sinceMs) out.push(p);
            } catch {
                // vanished between readdir and stat
            }
        }
    }
    return out;
}

interface Samples {
    durations: number[];
    timeouts: number;
    errors: number;
    outputRuns: number;
    silentRuns: number;
}

export type TimingKey = string;
export function timingKey(event: string, command: string): TimingKey {
    return `${event}\u0000${command}`;
}

interface Attachment {
    type?: string;
    hookEvent?: string;
    hookName?: string;
    command?: string;
    durationMs?: number;
    stdout?: string;
    exitCode?: number;
    timedOut?: boolean;
    toolUseID?: string;
}

interface StopSummary {
    toolUseID?: string;
    isSidechain?: boolean;
    agentId?: string;
    hookInfos?: Array<{ command?: string; durationMs?: number }>;
}

function sample(map: Map<TimingKey, Samples>, key: TimingKey): Samples {
    let s = map.get(key);
    if (!s) {
        s = { durations: [], timeouts: 0, errors: 0, outputRuns: 0, silentRuns: 0 };
        map.set(key, s);
    }
    return s;
}

async function scanFile(file: string, map: Map<TimingKey, Samples>): Promise<number> {
    let records = 0;
    const seen = new Set<string>();
    const summaries: StopSummary[] = [];
    const rl = createInterface({
        input: createReadStream(file, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        if (!line.includes('durationMs')) continue;
        const isSummary = line.includes('stop_hook_summary');
        if (!isSummary && !line.includes('"hook_')) continue;
        let rec: { attachment?: Attachment; subtype?: string } & StopSummary;
        try {
            rec = JSON.parse(line);
        } catch {
            continue;
        }
        if (rec.subtype === 'stop_hook_summary') {
            summaries.push(rec);
            continue;
        }
        const a = rec.attachment;
        if (!a || typeof a.type !== 'string' || !a.type.startsWith('hook_')) continue;
        if (typeof a.durationMs !== 'number' || typeof a.command !== 'string') continue;
        const event = a.hookEvent ?? a.hookName?.split(':')[0] ?? 'unknown';
        const s = sample(map, timingKey(event, a.command));
        s.durations.push(a.durationMs);
        records++;
        if (a.toolUseID) seen.add(`${a.toolUseID}|${a.command}`);
        if (a.type === 'hook_cancelled' || a.timedOut === true) s.timeouts++;
        else if (a.type === 'hook_non_blocking_error') s.errors++;
        if (a.type === 'hook_success' && typeof a.stdout === 'string') {
            s.outputRuns++;
            const out = a.stdout.trim();
            if ((a.exitCode ?? 0) === 0 && (out === '' || out === '{}')) s.silentRuns++;
        }
    }
    for (const sum of summaries) {
        const event = sum.isSidechain || sum.agentId ? 'SubagentStop' : 'Stop';
        for (const info of sum.hookInfos ?? []) {
            if (typeof info.command !== 'string' || typeof info.durationMs !== 'number') continue;
            if (sum.toolUseID && seen.has(`${sum.toolUseID}|${info.command}`)) continue;
            sample(map, timingKey(event, info.command)).durations.push(info.durationMs);
            records++;
        }
    }
    return records;
}

/** Nearest-rank percentile of a sorted list. */
export function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[idx];
}

function toTiming(s: Samples): HookTiming {
    const sorted = [...s.durations].sort((a, b) => a - b);
    return {
        runs: sorted.length,
        p50Ms: percentile(sorted, 0.5),
        p90Ms: percentile(sorted, 0.9),
        maxMs: sorted.length ? sorted[sorted.length - 1] : 0,
        totalMs: sorted.reduce((a, b) => a + b, 0),
        timeouts: s.timeouts,
        errors: s.errors,
        outputRuns: s.outputRuns,
        silentRuns: s.silentRuns,
        alwaysSilent: s.outputRuns >= MIN_SILENT_RUNS && s.silentRuns === s.outputRuns,
    };
}

export interface TranscriptTimings {
    dirs: string[];
    files: number;
    records: number;
    timings: Map<TimingKey, HookTiming>;
}

/** Hook timing per (event, command) from the project's transcripts of the last `days` days. */
export async function collectHookTimings(
    homeDir: string,
    projectRoot: string,
    days: number,
    now: number
): Promise<TranscriptTimings> {
    const dirs = await findTranscriptDirs(homeDir, projectRoot);
    const since = now - days * 24 * 60 * 60 * 1000;
    const map = new Map<TimingKey, Samples>();
    let files = 0;
    let records = 0;
    for (const dir of dirs) {
        for (const file of await listTranscriptFiles(dir, since)) {
            files++;
            try {
                records += await scanFile(file, map);
            } catch {
                // unreadable transcript — skip it
            }
        }
    }
    const timings = new Map<TimingKey, HookTiming>();
    for (const [k, s] of map) timings.set(k, toTiming(s));
    return { dirs, files, records, timings };
}
