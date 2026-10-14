import path from 'path';
import { execFile } from 'child_process';
import { existsSync, lstatSync, promises as fs, readFileSync, readlinkSync, statSync } from 'fs';
import { promisify } from 'util';
import { readJson, normPath } from './hooks.js';
import { getTable, parseToml, type TomlTable } from './toml.js';
import type {
    CliSection,
    CliStep,
    GlobalCliLink,
    McpHostGroup,
    McpLaunchEntry,
    McpLaunchForm,
    McpProcessInfo,
    McpSection,
    PerfCheck,
    PidFileInfo,
} from './types.js';

const execFileAsync = promisify(execFile);

// ─── CLI resolution ────────────────────────────────────────────────────────

/**
 * The `rulebook` shim the hook wrapper would find on PATH (`command -v
 * rulebook` in bash: the extensionless shim, or an .exe on Windows).
 */
export function findOnPath(
    name: string,
    pathEnv: string,
    platform: NodeJS.Platform
): string | null {
    const sep = platform === 'win32' ? ';' : ':';
    const names = platform === 'win32' ? [name, `${name}.exe`] : [name];
    for (const dir of pathEnv.split(sep)) {
        if (!dir) continue;
        for (const n of names) {
            const p = path.join(dir, n);
            try {
                const st = lstatSync(p);
                if (st.isFile() || st.isSymbolicLink()) return p;
            } catch {
                // not here
            }
        }
    }
    return null;
}

/** Follow a global `rulebook` shim to the package it runs, and check that package's build. */
export function inspectGlobalLink(shim: string): GlobalCliLink {
    let script: string | null = null;
    try {
        if (lstatSync(shim).isSymbolicLink()) {
            // Unix global install: bin/rulebook -> ../lib/node_modules/@hivehub/rulebook/dist/index.js
            script = path.resolve(path.dirname(shim), readlinkSync(shim));
        }
    } catch {
        // unreadable
    }
    if (!script) {
        try {
            // npm cmd-shim: "$basedir/node_modules/@hivehub/rulebook/dist/index.js"
            const text = readShim(shim);
            const m = text.match(
                /node_modules[\\/]+(@hivehub[\\/]+rulebook)[\\/]+dist[\\/]+index\.js/
            );
            if (m)
                script = path.join(
                    path.dirname(shim),
                    'node_modules',
                    '@hivehub',
                    'rulebook',
                    'dist',
                    'index.js'
                );
        } catch {
            // binary or unreadable
        }
    }
    const packageDir = script ? path.dirname(path.dirname(script)) : null;
    let isLink = false;
    let linkTarget: string | null = null;
    if (packageDir) {
        try {
            if (lstatSync(packageDir).isSymbolicLink()) {
                isLink = true;
                linkTarget = path.resolve(path.dirname(packageDir), readlinkSync(packageDir));
            }
        } catch {
            // package dir absent
        }
    }
    return {
        shim,
        packageDir,
        isLink,
        linkTarget,
        targetExists: packageDir ? existsSync(packageDir) : false,
        distExists: packageDir ? existsSync(path.join(packageDir, 'dist', 'index.js')) : false,
    };
}

/** Text of a small shim file; throws for anything large (a native binary). */
function readShim(file: string): string {
    if (statSync(file).size > 64 * 1024) throw new Error('not a shim');
    return readFileSync(file, 'utf-8');
}

/**
 * How `.claude/hooks/jev-gate.sh` would resolve the rulebook CLI: the
 * project's node_modules/.bin, then the repo's own dist (only in the rulebook
 * repo), then PATH. Also follows the global link on PATH and flags a missing
 * build — the stale global junction measured in 01/02 (0.5 s per prompt).
 */
export async function resolveCli(ctx: {
    projectRoot: string;
    pathEnv: string;
    platform: NodeJS.Platform;
    /** A Claude Code hook entry runs jev-gate.sh. */
    jevGateWired: boolean;
}): Promise<CliSection> {
    const { projectRoot, pathEnv, platform, jevGateWired } = ctx;
    const jevGateInstalled = existsSync(path.join(projectRoot, '.claude', 'hooks', 'jev-gate.sh'));
    const candidates: CliSection['candidates'] = [];

    const bin = path.join(projectRoot, 'node_modules', '.bin', 'rulebook');
    candidates.push({
        step: 'project-bin',
        path: existsSync(bin) ? bin : null,
        usable:
            existsSync(bin) &&
            existsSync(
                path.join(projectRoot, 'node_modules', '@hivehub', 'rulebook', 'dist', 'index.js')
            ),
    });

    const dist = path.join(projectRoot, 'dist', 'index.js');
    const pkg = (await readJson(path.join(projectRoot, 'package.json'))) as {
        name?: string;
    } | null;
    const isRepo = pkg?.name === '@hivehub/rulebook';
    candidates.push({
        step: 'repo-dist',
        path: isRepo && existsSync(dist) ? dist : null,
        usable: isRepo && existsSync(dist),
    });

    const shim = findOnPath('rulebook', pathEnv, platform);
    const globalLink = shim ? inspectGlobalLink(shim) : null;
    candidates.push({
        step: 'path',
        path: shim,
        usable: !!globalLink && (globalLink.packageDir === null || globalLink.distExists),
    });

    // The wrapper picks the first step whose file exists, usable or not.
    const picked = candidates.find((c) => c.path !== null) ?? null;
    const resolved = picked ? { step: picked.step, path: picked.path as string } : null;

    const checks: PerfCheck[] = [];
    const label: Record<CliStep, string> = {
        'project-bin': 'project node_modules/.bin',
        'repo-dist': 'repo dist/index.js',
        path: 'PATH',
    };
    if (!jevGateInstalled || !jevGateWired) {
        checks.push({
            id: 'cli-jev-gate',
            status: 'ok',
            message: jevGateInstalled
                ? 'jev-gate.sh is installed but no hook entry runs it'
                : 'jev-gate.sh not installed — no CLI lookup per prompt',
        });
    } else if (!resolved) {
        checks.push({
            id: 'cli-jev-gate',
            status: 'warn',
            message:
                'jev-gate.sh is installed but finds no rulebook CLI — the gate silently does nothing',
            action: 'install @hivehub/rulebook as a dev dependency, or turn the prompt gate off and run `rulebook update`',
        });
    } else {
        const usable = candidates.find((c) => c.step === resolved.step)?.usable;
        checks.push({
            id: 'cli-jev-gate',
            status: usable ? 'ok' : 'warn',
            message: `jev-gate.sh resolves the CLI from ${label[resolved.step]}: ${resolved.path}${usable ? '' : ' (broken)'}`,
            ...(usable
                ? {}
                : {
                      action: 'fix the CLI it picks (see below) or install @hivehub/rulebook as a dev dependency',
                  }),
        });
    }
    if (globalLink && globalLink.packageDir && !globalLink.distExists) {
        const target = globalLink.isLink ? ` → ${globalLink.linkTarget}` : '';
        checks.push({
            id: 'cli-global-link',
            status: 'warn',
            message:
                `global rulebook on PATH (${shim}) runs ${globalLink.packageDir}${target}` +
                `${globalLink.targetExists ? ' which has no dist/index.js' : ', which does not exist'}` +
                ' — every call through it fails after starting node',
            action: globalLink.isLink
                ? `rebuild it (npm run build in ${globalLink.linkTarget}) or remove the link: npm rm -g @hivehub/rulebook`
                : 'reinstall it (npm i -g @hivehub/rulebook) or remove it: npm rm -g @hivehub/rulebook',
        });
    } else if (globalLink) {
        checks.push({
            id: 'cli-global-link',
            status: 'ok',
            message: `global rulebook on PATH is runnable (${shim})`,
        });
    }
    return { jevGateInstalled, candidates, resolved, globalLink, checks };
}

// ─── MCP launch form ───────────────────────────────────────────────────────

const GUIDANCE: Record<McpLaunchForm, string> = {
    'node-direct': 'direct node: init ~0.23–0.31 s, 1 process, ~84 MB',
    'global-bin':
        'global rulebook-mcp shim: init ~0.27–0.32 s, 2 processes, ~90 MB; breaks when the global install drifts',
    'npx-pinned':
        'npx pinned: init ~1.0–1.2 s, 4 processes, ~189 MB private; same version every session',
    'npx-latest':
        'npx @latest: init ~0.9–1.7 s, 4 processes, ~189 MB private, plus a ~12 s cold install after each release',
    'legacy-mcp-server':
        'legacy full-CLI entry (mcp-server): init ~1.15–1.37 s, 4 processes, ~227 MB private',
    other: 'unrecognised launch form',
};

function isRulebookServer(name: string, command: string, args: string[]): boolean {
    const all = [command, ...args].join(' ');
    return name === 'rulebook' || /@hivehub\/rulebook|rulebook-mcp|rulebook-server/.test(all);
}

/** Classify a rulebook MCP launch (03-mcp-lifecycle.md F-013/F-015). */
export function classifyLaunch(
    command: string,
    args: string[]
): { form: McpLaunchForm; version?: string; script?: string } {
    let cmd = command;
    let rest = args;
    // `cmd /c npx …` (Windows) → look at the wrapped command.
    if (/^cmd(\.exe)?$/i.test(path.basename(cmd)) && /^\/c$/i.test(rest[0] ?? '')) {
        cmd = rest[1] ?? '';
        rest = rest.slice(2);
    }
    const base = path
        .basename(cmd)
        .toLowerCase()
        .replace(/\.(cmd|exe)$/, '');
    const all = [cmd, ...rest].join(' ');
    if (rest.includes('mcp-server') && /rulebook/.test(all)) return { form: 'legacy-mcp-server' };
    if (
        base === 'npx' ||
        base === 'pnpx' ||
        (base === 'pnpm' && rest[0] === 'dlx') ||
        base === 'bunx'
    ) {
        const spec = rest
            .map((a) => a.replace(/^--package=/, ''))
            .find((a) => a.startsWith('@hivehub/rulebook'));
        const version = spec?.match(/^@hivehub\/rulebook@(.+)$/)?.[1];
        if (version && version !== 'latest' && /^\d/.test(version))
            return { form: 'npx-pinned', version };
        return { form: 'npx-latest' };
    }
    if (base === 'node') {
        const script = rest.find((a) => /rulebook-server\.js$|[\\/]dist[\\/]index\.js$/.test(a));
        if (script) return { form: 'node-direct', script };
    }
    if (base === 'rulebook-mcp') return { form: 'global-bin' };
    return { form: 'other' };
}

interface RawServer {
    command?: unknown;
    args?: unknown;
}

function launchesFrom(
    servers: Record<string, unknown> | TomlTable | undefined,
    meta: { client: 'claude' | 'codex'; scope: 'project' | 'local' | 'user'; file: string }
): McpLaunchEntry[] {
    const out: McpLaunchEntry[] = [];
    for (const [name, raw] of Object.entries(servers ?? {})) {
        const s = raw as RawServer;
        if (!s || typeof s !== 'object') continue;
        const command = typeof s.command === 'string' ? s.command : '';
        const args = Array.isArray(s.args)
            ? s.args.filter((a): a is string => typeof a === 'string')
            : [];
        if (!isRulebookServer(name, command, args)) continue;
        const c = classifyLaunch(command, args);
        out.push({
            ...meta,
            name,
            command,
            args,
            form: c.form,
            ...(c.version ? { version: c.version } : {}),
            guidance: GUIDANCE[c.form],
        });
    }
    return out;
}

async function readToml(file: string): Promise<TomlTable | null> {
    try {
        return parseToml(await fs.readFile(file, 'utf-8'));
    } catch {
        return null;
    }
}

/** Rulebook MCP entries Claude Code (.mcp.json, ~/.claude.json) and Codex (config.toml) would launch. */
export async function collectMcpLaunches(ctx: {
    projectRoot: string;
    homeDir: string;
    codexHome: string;
    platform: NodeJS.Platform;
}): Promise<McpLaunchEntry[]> {
    const out: McpLaunchEntry[] = [];
    const mcpJson = path.join(ctx.projectRoot, '.mcp.json');
    const project = (await readJson(mcpJson)) as { mcpServers?: Record<string, unknown> } | null;
    out.push(
        ...launchesFrom(project?.mcpServers, { client: 'claude', scope: 'project', file: mcpJson })
    );

    const claudeJson = path.join(ctx.homeDir, '.claude.json');
    const global = (await readJson(claudeJson)) as {
        mcpServers?: Record<string, unknown>;
        projects?: Record<string, { mcpServers?: Record<string, unknown> }>;
    } | null;
    if (global) {
        const root = normPath(ctx.projectRoot, ctx.platform);
        for (const [p, cfg] of Object.entries(global.projects ?? {})) {
            if (normPath(p, ctx.platform) !== root) continue;
            out.push(
                ...launchesFrom(cfg?.mcpServers, {
                    client: 'claude',
                    scope: 'local',
                    file: claudeJson,
                })
            );
        }
        out.push(
            ...launchesFrom(global.mcpServers, {
                client: 'claude',
                scope: 'user',
                file: claudeJson,
            })
        );
    }

    for (const [scope, file] of [
        ['project', path.join(ctx.projectRoot, '.codex', 'config.toml')],
        ['user', path.join(ctx.codexHome, 'config.toml')],
    ] as const) {
        const toml = await readToml(file);
        if (toml)
            out.push(
                ...launchesFrom(getTable(toml, 'mcp_servers'), { client: 'codex', scope, file })
            );
    }
    return out;
}

// ─── Live processes ────────────────────────────────────────────────────────

/** Command lines of the processes in a rulebook MCP chain (npx wrapper, cmd shims, the server). */
const RULEBOOK_MCP_RE =
    /rulebook-mcp|rulebook-server(\.js)?\b|@hivehub[\\/]rulebook\S*["']?\s+mcp-server\b|\brulebook(\.cmd)?["']?\s+mcp-server\b/i;

export function isRulebookMcpProcess(p: McpProcessInfo): boolean {
    return RULEBOOK_MCP_RE.test(p.commandLine);
}

/** OS process list: PowerShell CIM on Windows, `ps` elsewhere. Informational only. */
export async function listOsProcesses(
    platform: NodeJS.Platform = process.platform
): Promise<McpProcessInfo[]> {
    if (platform === 'win32') {
        const script =
            'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,WorkingSetSize | ConvertTo-Json -Compress';
        const { stdout } = await execFileAsync(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-Command', script],
            {
                maxBuffer: 64 * 1024 * 1024,
                timeout: 30_000,
                windowsHide: true,
            }
        );
        // Windows PowerShell 5.1 leaves some control characters in command lines unescaped.
        // eslint-disable-next-line no-control-regex -- stripping control characters is the point
        const cleaned = stdout.replace(/[\u0000-\u001f]/g, ' ').trim();
        const parsed = JSON.parse(cleaned || '[]') as unknown;
        const rows = (Array.isArray(parsed) ? parsed : [parsed]) as Array<{
            ProcessId: number;
            ParentProcessId: number;
            Name: string | null;
            CommandLine: string | null;
            WorkingSetSize: number | null;
        }>;
        return rows.map((r) => ({
            pid: r.ProcessId,
            ppid: r.ParentProcessId,
            name: r.Name ?? '',
            commandLine: r.CommandLine ?? '',
            memoryBytes: Number(r.WorkingSetSize ?? 0),
        }));
    }
    const { stdout } = await execFileAsync('ps', ['-A', '-ww', '-o', 'pid=,ppid=,rss=,command='], {
        maxBuffer: 64 * 1024 * 1024,
        timeout: 30_000,
    });
    const out: McpProcessInfo[] = [];
    for (const line of stdout.split('\n')) {
        const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
        if (!m) continue;
        const commandLine = m[4].trim();
        out.push({
            pid: Number(m[1]),
            ppid: Number(m[2]),
            name: path.basename(commandLine.split(/\s+/)[0] ?? ''),
            commandLine,
            memoryBytes: Number(m[3]) * 1024,
        });
    }
    return out;
}

function hostLabel(p: McpProcessInfo | undefined, pid: number): string {
    if (!p) return `(gone, pid ${pid})`;
    const hint = /app-server/.test(p.commandLine) ? ' app-server' : '';
    return `${p.name}${hint} (pid ${pid})`;
}

/** Group rulebook MCP process chains by the process that launched them. */
export function groupMcpChains(all: McpProcessInfo[]): McpHostGroup[] {
    const byPid = new Map(all.map((p) => [p.pid, p]));
    const matched = new Map(all.filter(isRulebookMcpProcess).map((p) => [p.pid, p]));
    const children = new Map<number, McpProcessInfo[]>();
    for (const p of matched.values()) {
        if (!matched.has(p.ppid)) continue;
        const list = children.get(p.ppid) ?? [];
        list.push(p);
        children.set(p.ppid, list);
    }
    const groups = new Map<number, McpHostGroup>();
    for (const root of matched.values()) {
        if (matched.has(root.ppid)) continue;
        const chain: McpProcessInfo[] = [];
        const queue = [root];
        while (queue.length) {
            const p = queue.shift()!;
            chain.push(p);
            queue.push(...(children.get(p.pid) ?? []));
        }
        const g = groups.get(root.ppid) ?? {
            hostPid: root.ppid,
            host: hostLabel(byPid.get(root.ppid), root.ppid),
            chains: 0,
            processes: 0,
            memoryBytes: 0,
            serverPids: [],
        };
        g.chains++;
        g.processes += chain.length;
        g.memoryBytes += chain.reduce((a, p) => a + p.memoryBytes, 0);
        g.serverPids.push(...chain.filter((p) => !children.has(p.pid)).map((p) => p.pid));
        groups.set(root.ppid, g);
    }
    return [...groups.values()].sort(
        (a, b) => b.chains - a.chains || b.memoryBytes - a.memoryBytes
    );
}

// ─── PID files ─────────────────────────────────────────────────────────────

function pidAlive(pid: number): boolean {
    try {
        process.kill(pid, 0); // signal 0: existence check only, never kills
        return true;
    } catch (err) {
        return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
}

/** `.rulebook/mcp-server.<pid>.pid` (and the legacy `mcp-server.pid`) with liveness. */
export async function inspectPidFiles(
    projectRoot: string,
    liveServers: Set<number> | null
): Promise<PidFileInfo[]> {
    const dir = path.join(projectRoot, '.rulebook');
    let names: string[];
    try {
        names = await fs.readdir(dir);
    } catch {
        return [];
    }
    const out: PidFileInfo[] = [];
    for (const name of names) {
        const m = name.match(/^mcp-server\.(\d+)\.pid$/);
        if (!m && name !== 'mcp-server.pid') continue;
        let pid: number | null = m ? Number(m[1]) : null;
        if (!m) {
            try {
                const n = parseInt((await fs.readFile(path.join(dir, name), 'utf-8')).trim(), 10);
                pid = Number.isNaN(n) ? null : n;
            } catch {
                pid = null;
            }
        }
        const alive = pid !== null && (liveServers ? liveServers.has(pid) : pidAlive(pid));
        out.push({ file: path.join(dir, name), pid, alive });
    }
    return out;
}

export function mb(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** The MCP section: launch forms, live chains per host, stale PID files. */
export async function inspectMcp(ctx: {
    projectRoot: string;
    homeDir: string;
    codexHome: string;
    platform: NodeJS.Platform;
    listProcesses: (() => Promise<McpProcessInfo[]>) | null;
}): Promise<McpSection> {
    const launches = await collectMcpLaunches(ctx);
    const checks: PerfCheck[] = [];
    if (launches.length === 0) {
        checks.push({
            id: 'mcp-launch',
            status: 'info',
            message: 'no rulebook MCP entry in .mcp.json, ~/.claude.json or Codex config',
        });
    }
    for (const l of launches) {
        const where = `${l.client} ${l.scope} (${l.file})`;
        const shown = [l.command, ...l.args].join(' ');
        if (l.form === 'npx-latest') {
            checks.push({
                id: 'mcp-launch',
                status: 'warn',
                message: `${where}: ${shown} — ${l.guidance}`,
                action: 'run `rulebook update` to pin it; for the fastest start use `node <abs path>/dist/mcp/rulebook-server.js` in local scope',
            });
        } else if (l.form === 'legacy-mcp-server') {
            checks.push({
                id: 'mcp-launch',
                status: 'warn',
                message: `${where}: ${shown} — ${l.guidance}`,
                action: 'run `rulebook update` — it rewrites legacy `mcp-server` entries to the slim server',
            });
        } else if (l.form === 'node-direct') {
            const script = classifyLaunch(l.command, l.args).script;
            // Claude Code and Codex start project servers in the project dir.
            const exists = !!script && existsSync(path.resolve(ctx.projectRoot, script));
            checks.push({
                id: 'mcp-launch',
                status: exists ? 'ok' : 'warn',
                message: `${where}: ${shown} — ${exists ? l.guidance : 'server script not found'}`,
                ...(exists
                    ? {}
                    : {
                          action: 'fix the path to dist/mcp/rulebook-server.js or run `rulebook update`',
                      }),
            });
        } else {
            checks.push({
                id: 'mcp-launch',
                status: l.form === 'other' ? 'info' : 'ok',
                message: `${where}: ${shown} — ${l.guidance}`,
            });
        }
    }

    let processes: McpSection['processes'] = {
        available: false,
        servers: 0,
        processes: 0,
        memoryBytes: 0,
        hosts: [],
    };
    let liveServers: Set<number> | null = null;
    if (ctx.listProcesses) {
        try {
            const all = await ctx.listProcesses();
            const hosts = groupMcpChains(all);
            liveServers = new Set(all.filter(isRulebookMcpProcess).map((p) => p.pid));
            processes = {
                available: true,
                servers: hosts.reduce((a, h) => a + h.serverPids.length, 0),
                processes: hosts.reduce((a, h) => a + h.processes, 0),
                memoryBytes: hosts.reduce((a, h) => a + h.memoryBytes, 0),
                hosts,
            };
            checks.push({
                id: 'mcp-processes',
                status: 'info',
                message: `${processes.servers} rulebook MCP server(s) live on this machine in ${processes.processes} processes (${mb(processes.memoryBytes)})${hosts.length ? ', by host:' : ''}`,
            });
        } catch (err) {
            processes = { ...processes, error: err instanceof Error ? err.message : String(err) };
            checks.push({
                id: 'mcp-processes',
                status: 'info',
                message: `process scan unavailable: ${processes.error}`,
            });
        }
    }

    const pidFiles = await inspectPidFiles(ctx.projectRoot, liveServers);
    const stale = pidFiles.filter((p) => !p.alive);
    if (stale.length > 0) {
        checks.push({
            id: 'mcp-pid-files',
            status: 'warn',
            message: `${stale.length} stale MCP PID file(s): ${stale.map((p) => path.basename(p.file)).join(', ')}`,
            action: 'delete them from .rulebook/ — they enforce nothing and a killed server never removes its own',
        });
    } else {
        checks.push({
            id: 'mcp-pid-files',
            status: 'ok',
            message: pidFiles.length
                ? `${pidFiles.length} MCP PID file(s), all live`
                : 'no MCP PID files',
        });
    }
    return { launches, processes, pidFiles, checks };
}
