import path from 'path';
import { existsSync, promises as fs } from 'fs';
import {
    GUARD_SIGNATURE,
    JEV_GATE_SCRIPT,
    LEGACY_SIGNATURES,
    OS_SCHEDULING_GUARD_SIGNATURE,
} from '../../claude/claude-settings-manager.js';
import type {
    CriticalPathEntry,
    HookEntryInfo,
    HookOwner,
    HookSource,
    PerfCheck,
    UnconfiguredHookTiming,
} from './types.js';

/**
 * Hook inventory for `rulebook doctor --perf`: every hook entry Claude Code or
 * Codex would run for this project, from user, project, local, plugin and
 * Codex config, with owner, matcher, blocking/async and timeout. Read-only.
 */

interface RawHook {
    type?: unknown;
    command?: unknown;
    timeout?: unknown;
    async?: unknown;
}
interface RawGroup {
    matcher?: unknown;
    hooks?: unknown;
}

/** Events whose matcher selects tools: an empty or `*` matcher runs on every tool call. */
const TOOL_EVENTS = new Set([
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'PermissionRequest',
]);

const SCRIPT_EXT = /\.(sh|bash|ps1|py|js|mjs|cjs|ts|cmd|bat)$/i;

/** Read a JSON file; null when absent or malformed. */
export async function readJson(file: string): Promise<unknown> {
    try {
        const raw = await fs.readFile(file, 'utf-8');
        // Drop a UTF-8 byte-order mark (editors on Windows add one).
        return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
    } catch {
        return null;
    }
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/**
 * Which rulebook hook a command is, if any. Matches every hook rulebook wires
 * today (the guards, the Jev gate wrapper, a direct `rulebook hook …` /
 * `rulebook-hook` entry) and every hook it wired in v5/v6 (retired).
 */
export function rulebookSignature(command: string): { name: string; retired: boolean } | null {
    for (const sig of LEGACY_SIGNATURES) {
        if (command.includes(sig)) return { name: sig, retired: true };
    }
    const jev = command.match(new RegExp(`${JEV_GATE_SCRIPT.replace('.', '\\.')}['"]?\\s+(\\w+)`));
    if (jev) return { name: `${JEV_GATE_SCRIPT} ${jev[1]}`, retired: false };
    if (command.includes(JEV_GATE_SCRIPT)) return { name: JEV_GATE_SCRIPT, retired: false };
    if (command.includes(OS_SCHEDULING_GUARD_SIGNATURE)) {
        return { name: OS_SCHEDULING_GUARD_SIGNATURE, retired: false };
    }
    if (command.includes(GUARD_SIGNATURE)) return { name: GUARD_SIGNATURE, retired: false };
    // Direct entries: `rulebook hook <event>`, the `rulebook-hook` bin, `node …/hook-main.js <event>`.
    const direct = command.match(
        /(?:\brulebook-hook|hook-main\.js)['"]?(?:\s+([\w-]+))?|\brulebook(?:\.cmd)?['"]?\s+hook\s+([\w-]+)/
    );
    if (direct) {
        const sub = direct[1] ?? direct[2];
        return { name: sub ? `rulebook hook ${sub}` : 'rulebook-hook', retired: false };
    }
    if (/@hivehub[\\/]rulebook/.test(command)) return { name: 'rulebook', retired: false };
    return null;
}

/** Split a command line into words, honouring quotes. Backslashes stay literal (Windows paths). */
export function splitCommand(command: string): string[] {
    const words: string[] = [];
    let cur = '';
    let quote: '"' | "'" | null = null;
    let has = false;
    for (const c of command) {
        if (quote) {
            if (c === quote) quote = null;
            else cur += c;
        } else if (c === '"' || c === "'") {
            quote = c;
            has = true;
        } else if (c === ' ' || c === '\t') {
            if (has || cur) words.push(cur);
            cur = '';
            has = false;
        } else {
            cur += c;
            has = true;
        }
    }
    if (has || cur) words.push(cur);
    return words;
}

/**
 * The script a hook command runs, with `$CLAUDE_PROJECT_DIR`,
 * `${CLAUDE_PLUGIN_ROOT}` and `~`/`$HOME` expanded. Undefined when the command
 * runs a binary (no script word) or the path still holds an unknown variable.
 */
export function scriptPath(
    command: string,
    ctx: { projectRoot: string; homeDir: string; pluginRoot?: string }
): string | undefined {
    const word = splitCommand(command).find((w) => SCRIPT_EXT.test(w));
    if (!word) return undefined;
    let p = word
        .replace(/\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PROJECT_DIR\b/g, ctx.projectRoot)
        .replace(/\$\{HOME\}|\$HOME\b|%USERPROFILE%/g, ctx.homeDir);
    if (ctx.pluginRoot) {
        p = p.replace(/\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g, ctx.pluginRoot);
    }
    if (p.startsWith('~/') || p.startsWith('~\\')) p = path.join(ctx.homeDir, p.slice(2));
    if (/\$\{?\w+\}?|%\w+%/.test(p)) return undefined;
    return path.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p) ? p : path.join(ctx.projectRoot, p);
}

function ownerFor(source: HookSource): HookOwner {
    switch (source) {
        case 'user':
            return 'user';
        case 'project':
        case 'local':
            return 'project';
        case 'plugin':
            return 'plugin';
        case 'codex-user':
        case 'codex-project':
            return 'codex';
    }
}

/** Flatten a `hooks` object (`{Event: [{matcher, hooks: [...]}]}`) into entries. */
export function entriesFromHooks(
    hooks: unknown,
    meta: {
        source: HookSource;
        sourcePath: string;
        plugin?: string;
        pluginRoot?: string;
        projectRoot: string;
        homeDir: string;
    }
): HookEntryInfo[] {
    const out: HookEntryInfo[] = [];
    const events = asRecord(hooks);
    if (!events) return out;
    for (const [event, groups] of Object.entries(events)) {
        if (!Array.isArray(groups)) continue;
        groups.forEach((g: RawGroup, groupIndex) => {
            const group = asRecord(g) as RawGroup | null;
            if (!group || !Array.isArray(group.hooks)) return;
            const matcher = typeof group.matcher === 'string' ? group.matcher : '';
            (group.hooks as RawHook[]).forEach((h, hookIndex) => {
                const hook = asRecord(h) as RawHook | null;
                if (!hook) return;
                const command = typeof hook.command === 'string' ? hook.command : '';
                const sig = command ? rulebookSignature(command) : null;
                const isAsync = hook.async === true;
                const script = command
                    ? scriptPath(command, {
                          projectRoot: meta.projectRoot,
                          homeDir: meta.homeDir,
                          pluginRoot: meta.pluginRoot,
                      })
                    : undefined;
                out.push({
                    source: meta.source,
                    sourcePath: meta.sourcePath,
                    ...(meta.plugin ? { plugin: meta.plugin } : {}),
                    event,
                    matcher,
                    command,
                    type: typeof hook.type === 'string' ? hook.type : 'command',
                    owner: sig ? 'rulebook' : ownerFor(meta.source),
                    ...(sig ? { rulebookHook: sig.name } : {}),
                    retired: sig?.retired ?? false,
                    async: isAsync,
                    blocking: !isAsync,
                    timeoutSec: typeof hook.timeout === 'number' ? hook.timeout : null,
                    groupIndex,
                    hookIndex,
                    ...(script ? { script: { path: script, exists: existsSync(script) } } : {}),
                    timing: null,
                });
            });
        });
    }
    return out;
}

/** Normalize a path for comparison (Windows: case-insensitive, `\\?\` prefix dropped). */
export function normPath(p: string, platform: NodeJS.Platform = process.platform): string {
    let s = p
        .replace(/^\\\\\?\\/, '')
        .replace(/\\/g, '/')
        .replace(/\/+$/, '');
    if (platform === 'win32' || /^[A-Za-z]:\//.test(s)) s = s.toLowerCase();
    return s;
}

interface PluginInstall {
    scope?: string;
    installPath?: string;
    projectPath?: string;
}

/** Hooks of every enabled plugin, read from its install dir. */
async function pluginHookEntries(
    enabled: Map<string, boolean>,
    ctx: { projectRoot: string; homeDir: string; platform: NodeJS.Platform }
): Promise<HookEntryInfo[]> {
    const installed = asRecord(
        await readJson(path.join(ctx.homeDir, '.claude', 'plugins', 'installed_plugins.json'))
    );
    const plugins = asRecord(installed?.plugins);
    if (!plugins) return [];
    const root = normPath(ctx.projectRoot, ctx.platform);
    const out: HookEntryInfo[] = [];
    for (const [id, on] of enabled) {
        if (!on) continue;
        const installs = Array.isArray(plugins[id]) ? (plugins[id] as PluginInstall[]) : [];
        const install =
            installs.find(
                (i) =>
                    i.projectPath && normPath(i.projectPath, ctx.platform) === root && i.installPath
            ) ?? installs.find((i) => (i.scope ?? 'user') === 'user' && i.installPath);
        if (!install?.installPath) continue;
        const pluginRoot = install.installPath;
        for (const file of await pluginHookFiles(pluginRoot)) {
            const data = asRecord(await readJson(file));
            out.push(
                ...entriesFromHooks(data?.hooks ?? data, {
                    source: 'plugin',
                    sourcePath: file,
                    plugin: id,
                    pluginRoot,
                    projectRoot: ctx.projectRoot,
                    homeDir: ctx.homeDir,
                })
            );
        }
    }
    return out;
}

/** `hooks/hooks.json` plus any hook files `.claude-plugin/plugin.json` names. */
async function pluginHookFiles(pluginRoot: string): Promise<string[]> {
    const files = new Set<string>();
    const def = path.join(pluginRoot, 'hooks', 'hooks.json');
    if (existsSync(def)) files.add(def);
    const manifest = asRecord(
        await readJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'))
    );
    const declared = manifest?.hooks;
    const list =
        typeof declared === 'string' ? [declared] : Array.isArray(declared) ? declared : [];
    for (const rel of list) {
        if (typeof rel !== 'string') continue;
        const p = path.resolve(pluginRoot, rel.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, pluginRoot));
        if (existsSync(p)) files.add(p);
    }
    return [...files];
}

/** Every hook entry for this project, from all sources. */
export async function collectHookEntries(ctx: {
    projectRoot: string;
    homeDir: string;
    codexHome: string;
    platform: NodeJS.Platform;
}): Promise<HookEntryInfo[]> {
    const { projectRoot, homeDir, codexHome } = ctx;
    const entries: HookEntryInfo[] = [];
    const enabledPlugins = new Map<string, boolean>();
    const settingsFiles: Array<{ source: HookSource; file: string }> = [
        { source: 'user', file: path.join(homeDir, '.claude', 'settings.json') },
        { source: 'project', file: path.join(projectRoot, '.claude', 'settings.json') },
        { source: 'local', file: path.join(projectRoot, '.claude', 'settings.local.json') },
    ];
    for (const { source, file } of settingsFiles) {
        const data = asRecord(await readJson(file));
        if (!data) continue;
        entries.push(
            ...entriesFromHooks(data.hooks, { source, sourcePath: file, projectRoot, homeDir })
        );
        for (const [id, on] of Object.entries(asRecord(data.enabledPlugins) ?? {})) {
            enabledPlugins.set(id, on === true);
        }
    }
    entries.push(...(await pluginHookEntries(enabledPlugins, ctx)));
    const codexFiles: Array<{ source: HookSource; file: string }> = [
        { source: 'codex-user', file: path.join(codexHome, 'hooks.json') },
        { source: 'codex-project', file: path.join(projectRoot, '.codex', 'hooks.json') },
    ];
    for (const { source, file } of codexFiles) {
        const data = asRecord(await readJson(file));
        if (!data) continue;
        entries.push(
            ...entriesFromHooks(data.hooks ?? data, {
                source,
                sourcePath: file,
                projectRoot,
                homeDir,
            })
        );
    }
    return entries;
}

export function isCodexSource(source: HookSource): boolean {
    return source === 'codex-user' || source === 'codex-project';
}

/** Short display of a command for one report line. */
export function shortCommand(command: string, max = 72): string {
    const c = command.replace(/\s+/g, ' ').trim();
    return c.length > max ? `${c.slice(0, max - 1)}…` : c;
}

export function fmtMs(ms: number): string {
    if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
    if (ms >= 10_000) return `${(ms / 1000).toFixed(1)} s`;
    return `${Math.round(ms)} ms`;
}

function where(e: HookEntryInfo): string {
    const src = e.source === 'plugin' ? `plugin ${e.plugin}` : e.source;
    return `${src} ${e.event}${e.matcher ? ` ${e.matcher}` : ''}`;
}

/**
 * Warnings for the hook inventory: blocking hooks on every tool call, hooks
 * that never decide anything (suggest `async: true`), blocking PostToolUse
 * hooks and timeouts. One action per warning.
 */
export function buildHookChecks(
    entries: HookEntryInfo[],
    unconfigured: UnconfiguredHookTiming[],
    days: number
): PerfCheck[] {
    const checks: PerfCheck[] = [];
    let timeoutTotal = 0;
    for (const e of entries) {
        if (isCodexSource(e.source) || e.retired || e.type !== 'command' || !e.command) continue;
        const t = e.timing;
        if (t && t.timeouts > 0) {
            timeoutTotal += t.timeouts;
            checks.push({
                id: 'hook-timeout',
                status: 'warn',
                message:
                    `${shortCommand(e.command, 60)} [${where(e)}] timed out ${t.timeouts}× in ${days} d` +
                    ` (limit ${e.timeoutSec !== null ? `${e.timeoutSec} s` : 'default'}, p90 ${fmtMs(t.p90Ms)})`,
                action:
                    e.owner === 'rulebook' && e.event === 'UserPromptSubmit'
                        ? 'turn the prompt gate off ("gate": {"promptHook": {"enabled": false}} in .rulebook/rulebook.json) and run `rulebook update`'
                        : `make the hook faster or raise its "timeout" in ${e.sourcePath}`,
            });
        }
        if (!e.blocking) continue;
        const reasons: string[] = [];
        const everyTool = TOOL_EVENTS.has(e.event) && (e.matcher === '' || e.matcher === '*');
        if (everyTool) reasons.push('blocks every tool call (matcher *)');
        const silent = e.owner !== 'rulebook' && t?.alwaysSilent === true;
        if (silent) reasons.push(`printed {} or nothing in all ${t!.outputRuns} runs`);
        const post = e.event === 'PostToolUse';
        if (post) reasons.push('PostToolUse is not async');
        if (reasons.length === 0) continue;
        const cost = t
            ? `; p50 ${fmtMs(t.p50Ms)}, ${fmtMs(t.totalMs)} total over ${t.runs} runs`
            : '';
        let action: string;
        if (silent) {
            action = `set "async": true on it in ${e.sourcePath} — it never returned a decision`;
        } else if (post) {
            action = `set "async": true on it in ${e.sourcePath} unless its output must reach the model`;
        } else if (e.owner === 'rulebook') {
            action =
                'narrow the tool gate matcher (gate.toolHook.matcher) and run `rulebook update`';
        } else {
            action = `narrow its matcher to the tools it needs in ${e.sourcePath}`;
        }
        checks.push({
            id: silent ? 'hook-silent' : post ? 'hook-post-sync' : 'hook-every-tool',
            status: 'warn',
            message: `${shortCommand(e.command, 60)} [${where(e)}]: ${reasons.join('; ')}${cost}`,
            action,
        });
    }
    for (const u of unconfigured) {
        if (u.timing.timeouts === 0) continue;
        timeoutTotal += u.timing.timeouts;
        checks.push({
            id: 'hook-timeout',
            status: 'warn',
            message: `${shortCommand(u.command, 60)} [${u.event}, no longer configured] timed out ${u.timing.timeouts}× in ${days} d`,
            action: 'nothing to do if you already removed it; otherwise find where it is configured',
        });
    }
    if (entries.some((e) => e.event === 'UserPromptSubmit' && !isCodexSource(e.source))) {
        checks.push({
            id: 'hook-prompt-timing',
            status: 'info',
            message:
                'Claude Code records UserPromptSubmit runs only when they fail or time out, so they have no p50/p90 here',
        });
    }
    if (timeoutTotal === 0) {
        checks.push({
            id: 'hook-timeout',
            status: 'ok',
            message: `no hook timed out in the last ${days} d`,
        });
    }
    if (!checks.some((c) => c.status === 'warn' && c.id !== 'hook-timeout')) {
        checks.push({
            id: 'hook-hot-path',
            status: 'ok',
            message: 'no blocking hook runs on every tool call or always prints {}',
        });
    }
    return checks;
}

/** Per event: hooks run in parallel, so the slowest one is the critical path. */
export function criticalPath(entries: HookEntryInfo[]): CriticalPathEntry[] {
    const byEvent = new Map<string, HookEntryInfo[]>();
    for (const e of entries) {
        if (isCodexSource(e.source) || !e.timing || e.timing.runs === 0) continue;
        const list = byEvent.get(e.event) ?? [];
        if (!list.some((x) => x.command === e.command)) list.push(e);
        byEvent.set(e.event, list);
    }
    const out: CriticalPathEntry[] = [];
    for (const [event, list] of byEvent) {
        const slowest = list.reduce((a, b) => (b.timing!.p50Ms > a.timing!.p50Ms ? b : a));
        out.push({
            event,
            hooks: list.length,
            slowestCommand: slowest.command,
            p50Ms: slowest.timing!.p50Ms,
            p90Ms: slowest.timing!.p90Ms,
        });
    }
    return out.sort((a, b) => b.p50Ms - a.p50Ms);
}
