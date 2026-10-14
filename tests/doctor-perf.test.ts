import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs, symlinkSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';
import {
    runPerfDoctor,
    formatPerfReport,
    type PerfReport,
} from '../src/core/quality/doctor-perf/index';
import { parseToml, getTable } from '../src/core/quality/doctor-perf/toml';
import { classifyLaunch, groupMcpChains } from '../src/core/quality/doctor-perf/runtime';
import { rulebookSignature, scriptPath, splitCommand } from '../src/core/quality/doctor-perf/hooks';
import { percentile, projectSlug } from '../src/core/quality/doctor-perf/transcripts';
import { snakeEvent } from '../src/core/quality/doctor-perf/project-checks';
import type { McpProcessInfo } from '../src/core/quality/doctor-perf/types';

// ─── fixtures ──────────────────────────────────────────────────────────────

const CORTEX_PRE = 'cortex-hook PreToolUse';
const CORTEX_POST = 'cortex-hook PostToolUse --fire-forget';
const CORTEX_STOP = 'cortex-hook Stop --fire-forget';
const JEV_PROMPT = 'bash $CLAUDE_PROJECT_DIR/.claude/hooks/jev-gate.sh prompt';
const OS_GUARD = 'bash $CLAUDE_PROJECT_DIR/.claude/hooks/no-os-scheduling.sh';
const RETIRED = 'bash $CLAUDE_PROJECT_DIR/.claude/hooks/enforce-no-deferred.sh';
const LOCAL_POST = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/format.mjs"';
const PLUGIN_STOP = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/stop.mjs"';
const MISSING_USER = 'python ~/hooks/gone.py';

function attachment(a: Record<string, unknown>, extra: Record<string, unknown> = {}): string {
    return JSON.stringify({
        type: 'attachment',
        attachment: a,
        timestamp: '2026-10-14T00:00:00Z',
        ...extra,
    });
}
function success(
    event: string,
    command: string,
    durationMs: number,
    stdout = '{}\n',
    toolUseID?: string
) {
    return attachment({
        type: 'hook_success',
        hookName: `${event}:Bash`,
        hookEvent: event,
        command,
        durationMs,
        stdout,
        stderr: '',
        exitCode: 0,
        ...(toolUseID ? { toolUseID } : {}),
    });
}

async function write(file: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
}

/** Every file under `dir` with size, mtime and content hash — to prove the doctor wrote nothing. */
async function snapshot(dir: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const walk = async (d: string): Promise<void> => {
        for (const e of await fs.readdir(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isSymbolicLink()) {
                out.set(p, 'link');
            } else if (e.isDirectory()) {
                out.set(p, 'dir');
                await walk(p);
            } else {
                const st = await fs.stat(p);
                const hash = createHash('sha1')
                    .update(await fs.readFile(p))
                    .digest('hex');
                out.set(p, `${st.size}:${st.mtimeMs}:${hash}`);
            }
        }
    };
    await walk(dir);
    return out;
}

const fakeProcesses = (): McpProcessInfo[] => [
    { pid: 100, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', memoryBytes: 300e6 },
    {
        pid: 101,
        ppid: 100,
        name: 'cmd.exe',
        commandLine: 'cmd.exe /d /s /c "npx -y --package=@hivehub/rulebook@latest rulebook-mcp"',
        memoryBytes: 5e6,
    },
    {
        pid: 102,
        ppid: 101,
        name: 'node.exe',
        commandLine: 'node npx-cli.js -y --package=@hivehub/rulebook@latest rulebook-mcp',
        memoryBytes: 60e6,
    },
    {
        pid: 103,
        ppid: 102,
        name: 'cmd.exe',
        commandLine: 'cmd.exe /d /s /c rulebook-mcp',
        memoryBytes: 5e6,
    },
    {
        pid: 104,
        ppid: 103,
        name: 'node.exe',
        commandLine:
            'node C:\\npx\\node_modules\\@hivehub\\rulebook\\dist\\mcp\\rulebook-server.js',
        memoryBytes: 80e6,
    },
    {
        pid: 200,
        ppid: 1,
        name: 'codex.exe',
        commandLine: 'codex.exe app-server',
        memoryBytes: 200e6,
    },
    {
        pid: 201,
        ppid: 200,
        name: 'node.exe',
        commandLine: 'node E:\\x\\dist\\mcp\\rulebook-server.js',
        memoryBytes: 80e6,
    },
    { pid: 300, ppid: 1, name: 'node.exe', commandLine: 'node unrelated.js', memoryBytes: 50e6 },
];

describe('doctor --perf (C8)', () => {
    let tmp: string;
    let home: string;
    let codexHome: string;
    let root: string;
    let binDir: string;
    let linkedSrc: string;
    let report: PerfReport;
    let before: Map<string, string>;
    let after: Map<string, string>;

    beforeAll(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-perf-'));
        home = path.join(tmp, 'home');
        codexHome = path.join(home, '.codex');
        root = path.join(tmp, 'project');
        binDir = path.join(tmp, 'bin');
        linkedSrc = path.join(tmp, 'linked-src');
        const now = Date.now();

        // User settings: cortex on every tool, blocking; a hook whose script is gone; plugins.
        await write(
            path.join(home, '.claude', 'settings.json'),
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        { matcher: '*', hooks: [{ type: 'command', command: CORTEX_PRE }] },
                    ],
                    PostToolUse: [
                        {
                            matcher: '*',
                            hooks: [{ type: 'command', command: CORTEX_POST, async: true }],
                        },
                    ],
                    Stop: [{ hooks: [{ type: 'command', command: CORTEX_STOP }] }],
                    Notification: [{ hooks: [{ type: 'command', command: MISSING_USER }] }],
                },
                enabledPlugins: { 'gate@market': true, 'off@market': false },
            })
        );
        const pluginRoot = path.join(
            home,
            '.claude',
            'plugins',
            'cache',
            'market',
            'gate',
            '1.0.0'
        );
        const offRoot = path.join(home, '.claude', 'plugins', 'cache', 'market', 'off', '1.0.0');
        await write(
            path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
            JSON.stringify({
                version: 2,
                plugins: {
                    'gate@market': [{ scope: 'user', installPath: pluginRoot }],
                    'off@market': [{ scope: 'user', installPath: offRoot }],
                },
            })
        );
        await write(
            path.join(pluginRoot, 'hooks', 'hooks.json'),
            JSON.stringify({
                hooks: {
                    Stop: [{ hooks: [{ type: 'command', command: PLUGIN_STOP, timeout: 900 }] }],
                },
            })
        );
        await write(path.join(pluginRoot, 'scripts', 'stop.mjs'), '');
        await write(
            path.join(offRoot, 'hooks', 'hooks.json'),
            JSON.stringify({
                hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node off.mjs' }] }] },
            })
        );

        // Project: rulebook hooks, a retired v5 hook, a local blocking PostToolUse.
        await write(
            path.join(root, '.claude', 'settings.json'),
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        {
                            matcher: 'Bash|Edit|Write',
                            hooks: [{ type: 'command', command: OS_GUARD }],
                        },
                        { matcher: 'Edit|Write', hooks: [{ type: 'command', command: RETIRED }] },
                    ],
                    UserPromptSubmit: [
                        { hooks: [{ type: 'command', command: JEV_PROMPT, timeout: 8 }] },
                    ],
                },
            })
        );
        await write(
            path.join(root, '.claude', 'settings.local.json'),
            JSON.stringify({
                hooks: {
                    PostToolUse: [
                        { matcher: 'Edit', hooks: [{ type: 'command', command: LOCAL_POST }] },
                    ],
                },
            })
        );
        await write(path.join(root, '.claude', 'hooks', 'jev-gate.sh'), '#!/usr/bin/env bash\n');
        await write(
            path.join(root, '.claude', 'hooks', 'no-os-scheduling.sh'),
            '#!/usr/bin/env bash\n'
        );
        await write(path.join(root, '.claude', 'hooks', 'format.mjs'), '');
        await write(path.join(root, '.claude', 'rules', 'git-safety.md'), '# old rule\n');
        await write(path.join(root, '.claude', 'rules', 'typescript.md'), '# current rule\n');
        await write(path.join(root, '.claude', 'agents', 'devops-engineer.md'), '# old agent\n');
        await write(path.join(root, '.claude', 'agents', 'implementer.md'), '# current agent\n');
        await write(path.join(root, 'AGENTS.md'), '# Agents\n');
        await write(path.join(root, 'AGENTS.override.md'), '# Override\n');

        // MCP entries: npx @latest (.mcp.json), legacy (Codex), node + missing script (local scope).
        await write(
            path.join(root, '.mcp.json'),
            JSON.stringify({
                mcpServers: {
                    rulebook: {
                        command: 'npx',
                        args: ['-y', '--package=@hivehub/rulebook@latest', 'rulebook-mcp'],
                    },
                    other: { command: 'npx', args: ['-y', 'something-else'] },
                },
            })
        );
        await write(
            path.join(root, '.codex', 'config.toml'),
            '[mcp_servers.rulebook]\ncommand = "npx"\nargs = [\n    "-y",\n    "@hivehub/rulebook@latest",\n    "mcp-server",\n]\n'
        );
        await write(
            path.join(home, '.claude.json'),
            JSON.stringify({
                projects: {
                    [root.replace(/\\/g, '/')]: {
                        mcpServers: {
                            rulebook: {
                                command: 'node',
                                args: [path.join(root, 'gone', 'rulebook-server.js')],
                            },
                        },
                    },
                },
            })
        );
        await write(path.join(root, '.rulebook', 'mcp-server.104.pid'), '104');
        await write(path.join(root, '.rulebook', 'mcp-server.999999.pid'), '999999');

        // Codex: user + project hooks, trust for one of the two project hooks, 9router provider.
        await write(
            path.join(codexHome, 'hooks.json'),
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        { matcher: '*', hooks: [{ type: 'command', command: CORTEX_PRE }] },
                    ],
                },
            })
        );
        const codexHooks = path.join(root, '.codex', 'hooks.json');
        await write(
            codexHooks,
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        { matcher: 'Edit|Write', hooks: [{ type: 'command', command: OS_GUARD }] },
                    ],
                    UserPromptSubmit: [{ hooks: [{ type: 'command', command: JEV_PROMPT }] }],
                },
            })
        );
        await write(
            path.join(codexHome, 'config.toml'),
            [
                'model_provider = "9router" # comment',
                `[projects.'${root}']`,
                'trust_level = "trusted"',
                `[hooks.state.'${codexHooks}:pre_tool_use:0:0']`,
                'trusted_hash = "sha256:abc"',
                '[model_providers.9router]',
                'name = "9Router"',
                'base_url = "http://127.0.0.1:20128/v1"',
                '[model_providers.9router.http_headers]',
                '',
            ].join('\n')
        );

        // A global `rulebook` shim whose package is a link to a checkout without dist/.
        await write(
            path.join(binDir, 'rulebook'),
            '#!/bin/sh\nexec node  "$basedir/node_modules/@hivehub/rulebook/dist/index.js" "$@"\n'
        );
        await write(path.join(linkedSrc, 'package.json'), '{"name":"@hivehub/rulebook"}');
        await fs.mkdir(path.join(binDir, 'node_modules', '@hivehub'), { recursive: true });
        symlinkSync(
            linkedSrc,
            path.join(binDir, 'node_modules', '@hivehub', 'rulebook'),
            process.platform === 'win32' ? 'junction' : 'dir'
        );

        // Transcripts: main session, a subagent, an old session outside the window.
        const slugDir = path.join(home, '.claude', 'projects', projectSlug(root).toUpperCase());
        const main: string[] = [];
        for (let d = 100; d <= 200; d += 10) main.push(success('PreToolUse', CORTEX_PRE, d));
        for (const d of [300, 320, 340]) main.push(success('PreToolUse', OS_GUARD, d, ''));
        main.push(
            attachment({
                type: 'hook_cancelled',
                hookName: 'UserPromptSubmit',
                hookEvent: 'UserPromptSubmit',
                command: JEV_PROMPT,
                durationMs: 8100,
                timedOut: true,
                timeoutMs: 8000,
            })
        );
        main.push(success('Stop', CORTEX_STOP, 80, '{}\n', 'stop-1'));
        main.push(
            JSON.stringify({
                type: 'system',
                subtype: 'stop_hook_summary',
                toolUseID: 'stop-1',
                hookInfos: [
                    { command: CORTEX_STOP, durationMs: 80 },
                    { command: PLUGIN_STOP, durationMs: 400 },
                ],
            })
        );
        main.push(success('PostToolUse', LOCAL_POST, 50, 'formatted'));
        main.push(success('PreToolUse', 'bash old-hook.sh', 70));
        main.push('not json at all durationMs "hook_');
        await write(path.join(slugDir, 'session-a.jsonl'), main.join('\n') + '\n');
        await write(
            path.join(slugDir, 'session-a', 'subagents', 'agent-1.jsonl'),
            success('PreToolUse', CORTEX_PRE, 210) + '\n'
        );
        const old = path.join(slugDir, 'session-old.jsonl');
        await write(
            old,
            Array.from({ length: 5 }, () => success('PreToolUse', CORTEX_PRE, 9999)).join('\n')
        );
        const tenDaysAgo = new Date(now - 10 * 24 * 3600 * 1000);
        await fs.utimes(old, tenDaysAgo, tenDaysAgo);

        before = await snapshot(tmp);
        report = await runPerfDoctor({
            projectRoot: root,
            homeDir: home,
            codexHome,
            days: 3,
            now,
            pathEnv: binDir,
            listProcesses: async () => fakeProcesses(),
        });
        after = await snapshot(tmp);
    });

    afterAll(async () => {
        await fs.rm(tmp, { recursive: true, force: true });
    });

    const check = (id: string, status?: string) =>
        [
            ...report.hooks.checks,
            ...report.cli.checks,
            ...report.mcp.checks,
            ...report.leftovers.checks,
            ...report.codex.checks,
        ].filter((c) => c.id === id && (!status || c.status === status));

    it('is read-only: no file under the fixture changes', () => {
        expect(after).toEqual(before);
    });

    it('merges hooks from user, project, local, enabled plugins and Codex', () => {
        const sources = new Set(report.hooks.entries.map((e) => e.source));
        expect([...sources].sort()).toEqual([
            'codex-project',
            'codex-user',
            'local',
            'plugin',
            'project',
            'user',
        ]);
        expect(report.hooks.entries.some((e) => e.command === 'node off.mjs')).toBe(false);
        const plugin = report.hooks.entries.find((e) => e.source === 'plugin')!;
        expect(plugin).toMatchObject({
            plugin: 'gate@market',
            event: 'Stop',
            timeoutSec: 900,
            owner: 'plugin',
        });
        expect(plugin.script?.exists).toBe(true);
    });

    it('tells owner, matcher, blocking/async and timeout apart', () => {
        const jev = report.hooks.entries.find(
            (e) => e.source === 'project' && e.command === JEV_PROMPT
        )!;
        expect(jev).toMatchObject({
            owner: 'rulebook',
            rulebookHook: 'jev-gate.sh prompt',
            timeoutSec: 8,
            blocking: true,
        });
        const post = report.hooks.entries.find((e) => e.command === CORTEX_POST)!;
        expect(post).toMatchObject({ owner: 'user', matcher: '*', async: true, blocking: false });
        const retired = report.hooks.entries.find((e) => e.command === RETIRED)!;
        expect(retired).toMatchObject({ owner: 'rulebook', retired: true });
        const codex = report.hooks.entries.find(
            (e) => e.source === 'codex-project' && e.command === OS_GUARD
        )!;
        expect(codex.owner).toBe('rulebook');
    });

    it('measures p50/p90 from recent transcripts, subagents included, old files excluded', () => {
        const pre = report.hooks.entries.find(
            (e) => e.source === 'user' && e.command === CORTEX_PRE
        )!;
        expect(pre.timing).toMatchObject({
            runs: 12,
            p50Ms: 150,
            p90Ms: 200,
            maxMs: 210,
            alwaysSilent: true,
        });
        expect(report.hooks.transcripts.files).toBe(2);
        // Codex entries never get Claude timing, even for the same command.
        const codexPre = report.hooks.entries.find((e) => e.source === 'codex-user')!;
        expect(codexPre.timing).toBeNull();
    });

    it('counts a Stop run once when both the attachment and the summary record it', () => {
        const stop = report.hooks.entries.find((e) => e.command === CORTEX_STOP)!;
        expect(stop.timing?.runs).toBe(1);
        const plugin = report.hooks.entries.find((e) => e.command === PLUGIN_STOP)!;
        expect(plugin.timing).toMatchObject({ runs: 1, p50Ms: 400 });
    });

    it('flags a blocking hook on every tool that always prints {}, suggesting async', () => {
        const silent = check('hook-silent', 'warn');
        expect(silent).toHaveLength(1);
        expect(silent[0].message).toContain(CORTEX_PRE);
        expect(silent[0].message).toContain('every tool call');
        expect(silent[0].action).toContain('"async": true');
    });

    it('flags a blocking PostToolUse hook and never suggests async for rulebook guards', () => {
        const post = check('hook-post-sync', 'warn');
        expect(post).toHaveLength(1);
        expect(post[0].message).toContain('format.mjs');
        const all = [
            ...check('hook-silent'),
            ...check('hook-every-tool'),
            ...check('hook-post-sync'),
        ];
        expect(all.some((c) => c.message.includes('no-os-scheduling'))).toBe(false);
    });

    it('reports timeouts with an action', () => {
        const t = check('hook-timeout', 'warn');
        expect(t).toHaveLength(1);
        expect(t[0].message).toContain('jev-gate.sh prompt');
        expect(t[0].message).toContain('timed out 1×');
        expect(t[0].action).toContain('promptHook');
    });

    it('computes the critical path per event as the slowest parallel hook', () => {
        const pre = report.hooks.criticalPath.find((c) => c.event === 'PreToolUse')!;
        expect(pre).toMatchObject({ slowestCommand: OS_GUARD, p50Ms: 320, hooks: 2 });
        const stop = report.hooks.criticalPath.find((c) => c.event === 'Stop')!;
        expect(stop.slowestCommand).toBe(PLUGIN_STOP);
    });

    it('lists commands seen in transcripts that no config declares', () => {
        expect(report.hooks.unconfigured.map((u) => u.command)).toContain('bash old-hook.sh');
    });

    it('follows the CLI resolution of jev-gate.sh and flags a global link without dist/', () => {
        expect(report.cli.jevGateInstalled).toBe(true);
        expect(report.cli.resolved?.step).toBe('path');
        expect(check('cli-jev-gate', 'warn')).toHaveLength(1);
        expect(report.cli.globalLink).toMatchObject({
            isLink: true,
            targetExists: true,
            distExists: false,
        });
        const link = check('cli-global-link', 'warn')[0];
        expect(link.message).toContain('no dist/index.js');
        expect(link.action).toContain(linkedSrc);
    });

    it('classifies MCP launch forms from .mcp.json, ~/.claude.json and Codex config', () => {
        const forms = report.mcp.launches.map((l) => `${l.client}/${l.scope}:${l.form}`).sort();
        expect(forms).toEqual([
            'claude/local:node-direct',
            'claude/project:npx-latest',
            'codex/project:legacy-mcp-server',
        ]);
        const warns = check('mcp-launch', 'warn');
        expect(warns).toHaveLength(3);
        expect(warns.find((w) => w.message.includes('npx @latest'))?.action).toContain(
            'rulebook update'
        );
        expect(warns.some((w) => w.message.includes('server script not found'))).toBe(true);
    });

    it('groups live MCP chains by host and finds stale PID files', () => {
        expect(report.mcp.processes).toMatchObject({ available: true, servers: 2, processes: 5 });
        const claude = report.mcp.processes.hosts.find((h) => h.hostPid === 100)!;
        expect(claude).toMatchObject({ chains: 1, processes: 4, serverPids: [104] });
        expect(report.mcp.processes.hosts.find((h) => h.hostPid === 200)?.host).toContain(
            'app-server'
        );
        expect(report.mcp.pidFiles.find((p) => p.pid === 104)?.alive).toBe(true);
        expect(report.mcp.pidFiles.find((p) => p.pid === 999999)?.alive).toBe(false);
        expect(check('mcp-pid-files', 'warn')[0].message).toContain('mcp-server.999999.pid');
    });

    it('finds retired assets, retired hook entries and hooks with missing scripts', () => {
        expect(report.leftovers.files.map((f) => f.path).sort()).toEqual([
            '.claude/agents/devops-engineer.md',
            '.claude/rules/git-safety.md',
        ]);
        expect(report.leftovers.retiredHooks.map((h) => h.command)).toEqual([RETIRED]);
        const missing = report.leftovers.missingScripts.map((m) => path.basename(m.script)).sort();
        expect(missing).toEqual(['enforce-no-deferred.sh', 'gone.py']);
    });

    it('checks Codex: override shadowing, trust, hook trust and 9router', () => {
        expect(check('codex-agents-override', 'warn')).toHaveLength(1);
        expect(report.codex.projectTrusted).toBe(true);
        expect(report.codex.projectHooks).toEqual({ total: 2, trusted: 1 });
        expect(check('codex-hooks-trust', 'warn')[0].message).toContain('1 of 2');
        expect(report.codex.provider).toEqual({
            id: '9router',
            isNineRouter: true,
            tokenSaverOff: false,
        });
        expect(check('codex-9router', 'warn')[0].action).toContain('x-9router-token-saver');
    });

    it('serialises to JSON and formats a human report with one action per warning', () => {
        expect(JSON.parse(JSON.stringify(report)).summary).toEqual(report.summary);
        const text = formatPerfReport(report);
        for (const header of ['Hooks', 'CLI resolution', 'MCP', 'Leftovers', 'Codex', 'Summary:']) {
            expect(text).toContain(header);
        }
        const warnLines = text.split('\n').filter((l) => l.trimStart().startsWith('⚠'));
        const actionLines = text.split('\n').filter((l) => l.trimStart().startsWith('→'));
        expect(warnLines.length).toBe(report.summary.warn);
        expect(actionLines.length).toBe(report.summary.warn);
        expect(text).toContain('claude.exe (pid 100): 1 server(s), 4 processes');
    });
});

describe('doctor --perf on a clean project', () => {
    let tmp: string;
    beforeAll(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-perf-clean-'));
    });
    afterAll(async () => {
        await fs.rm(tmp, { recursive: true, force: true });
    });

    it('reports no warnings and skips what is absent', async () => {
        const root = path.join(tmp, 'project');
        await fs.mkdir(root, { recursive: true });
        const report = await runPerfDoctor({
            projectRoot: root,
            homeDir: path.join(tmp, 'home'),
            pathEnv: '',
            listProcesses: null,
        });
        expect(report.summary.warn).toBe(0);
        expect(report.hooks.entries).toEqual([]);
        expect(report.cli.globalLink).toBeNull();
        expect(report.mcp.processes.available).toBe(false);
        expect(report.codex.installed).toBe(false);
        expect(report.days).toBe(3);
        expect(formatPerfReport(report)).toContain('no Claude Code transcripts');
    });

    it('resolves the CLI from the repo dist in the rulebook repo itself', async () => {
        const root = path.join(tmp, 'repo');
        await write(path.join(root, 'package.json'), '{"name":"@hivehub/rulebook"}');
        await write(path.join(root, 'dist', 'index.js'), '');
        await write(path.join(root, '.claude', 'hooks', 'jev-gate.sh'), '');
        await write(
            path.join(root, '.claude', 'settings.json'),
            JSON.stringify({
                hooks: {
                    UserPromptSubmit: [{ hooks: [{ type: 'command', command: JEV_PROMPT }] }],
                },
            })
        );
        const report = await runPerfDoctor({
            projectRoot: root,
            homeDir: path.join(tmp, 'home2'),
            pathEnv: '',
            listProcesses: null,
        });
        expect(report.cli.resolved?.step).toBe('repo-dist');
        expect(check(report, 'cli-jev-gate')[0].status).toBe('ok');
    });

    // 7.5 shape: the Codex rules block lives in AGENTS.override.md, and the
    // scaffolding guard only spawns behind an `if` filter.
    it('accepts the 7.5 Codex block and if-filtered guards without warnings', async () => {
        const root = path.join(tmp, 'v75');
        const home = path.join(tmp, 'home3');
        await write(path.join(home, '.codex', 'config.toml'), '');
        await write(path.join(root, 'AGENTS.md'), '# rules\n');
        await write(
            path.join(root, 'AGENTS.override.md'),
            '<!-- RULEBOOK-CODEX:START\n## Rulebook rules (Codex)\nRULEBOOK-CODEX:END -->\n\n# Mine\n'
        );
        await write(path.join(root, '.claude', 'hooks', 'protect-task-scaffolding.sh'), '');
        const guard = 'bash $CLAUDE_PROJECT_DIR/.claude/hooks/protect-task-scaffolding.sh';
        await write(
            path.join(root, '.claude', 'settings.json'),
            JSON.stringify({
                hooks: {
                    PreToolUse: [
                        {
                            matcher: 'Edit|Write',
                            hooks: [
                                {
                                    type: 'command',
                                    if: 'Edit(**/.rulebook/tasks/**)',
                                    command: guard,
                                },
                                {
                                    type: 'command',
                                    if: 'Write(**/.rulebook/tasks/**)',
                                    command: guard,
                                },
                            ],
                        },
                    ],
                },
            })
        );
        const report = await runPerfDoctor({
            projectRoot: root,
            homeDir: home,
            pathEnv: '',
            listProcesses: null,
        });

        const override = report.codex.checks.find((c) => c.id === 'codex-agents-override');
        expect(override?.status).toBe('ok');
        expect(override?.message).toContain('RULEBOOK-CODEX');
        expect(report.hooks.entries.map((e) => e.ifRule)).toEqual([
            'Edit(**/.rulebook/tasks/**)',
            'Write(**/.rulebook/tasks/**)',
        ]);
        expect(report.hooks.checks.filter((c) => c.status === 'warn')).toEqual([]);
        expect(formatPerfReport(report)).toContain('if Write(**/.rulebook/tasks/**)');
    });

    function check(r: PerfReport, id: string) {
        return r.cli.checks.filter((c) => c.id === id);
    }
});

describe('doctor --perf helpers', () => {
    it('derives the transcript folder slug like Claude Code', () => {
        expect(projectSlug('e:\\HiveLLM\\Rulebook')).toBe('e--HiveLLM-Rulebook');
        expect(projectSlug('E:\\UzEngine-0.2')).toBe('E--UzEngine-0-2');
        expect(projectSlug('/home/me/my.app')).toBe('-home-me-my-app');
    });

    it('computes nearest-rank percentiles', () => {
        expect(percentile([], 0.5)).toBe(0);
        expect(percentile([10], 0.9)).toBe(10);
        expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
        expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    });

    it('classifies rulebook MCP launch forms', () => {
        expect(
            classifyLaunch('npx', ['-y', '--package=@hivehub/rulebook@latest', 'rulebook-mcp']).form
        ).toBe('npx-latest');
        expect(
            classifyLaunch('npx', ['-y', '--package=@hivehub/rulebook@7.5.0', 'rulebook-mcp'])
        ).toEqual({
            form: 'npx-pinned',
            version: '7.5.0',
        });
        expect(
            classifyLaunch('cmd', ['/c', 'npx', '-y', '@hivehub/rulebook@latest', 'mcp-server'])
                .form
        ).toBe('legacy-mcp-server');
        expect(classifyLaunch('node', ['C:/x/dist/mcp/rulebook-server.js']).form).toBe(
            'node-direct'
        );
        expect(classifyLaunch('rulebook-mcp.cmd', []).form).toBe('global-bin');
        expect(classifyLaunch('docker', ['run', 'x']).form).toBe('other');
    });

    it('recognises rulebook hooks by signature', () => {
        expect(rulebookSignature(JEV_PROMPT)).toEqual({
            name: 'jev-gate.sh prompt',
            retired: false,
        });
        expect(rulebookSignature("bash 'e:\\p\\.codex\\hooks\\jev-gate.sh' tool")?.name).toBe(
            'jev-gate.sh tool'
        );
        expect(
            rulebookSignature(
                'node "C:/p/node_modules/@hivehub/rulebook/dist/cli/hook-main.js" prompt-gate'
            )?.name
        ).toBe('rulebook hook prompt-gate');
        expect(rulebookSignature('rulebook hook tool-gate')?.name).toBe('rulebook hook tool-gate');
        expect(rulebookSignature(RETIRED)).toEqual({ name: 'enforce-no-deferred', retired: true });
        expect(rulebookSignature(CORTEX_PRE)).toBeNull();
    });

    it('extracts the script a hook command runs', () => {
        const ctx = { projectRoot: '/p', homeDir: '/h', pluginRoot: '/plug' };
        expect(scriptPath(OS_GUARD, ctx)).toBe('/p/.claude/hooks/no-os-scheduling.sh');
        expect(scriptPath(PLUGIN_STOP, ctx)).toBe('/plug/scripts/stop.mjs');
        expect(scriptPath('"$CLAUDE_PROJECT_DIR"/.claude/hooks/x.sh', ctx)).toBe(
            '/p/.claude/hooks/x.sh'
        );
        expect(scriptPath(CORTEX_PRE, ctx)).toBeUndefined();
        expect(scriptPath('bash $OTHER/x.sh', ctx)).toBeUndefined();
        expect(splitCommand(`bash 'e:\\a b\\x.sh' prompt`)).toEqual([
            'bash',
            'e:\\a b\\x.sh',
            'prompt',
        ]);
    });

    it('reads the Codex TOML fields it needs', () => {
        const t = parseToml(
            [
                'model_provider = "9router" # trailing comment',
                "[projects.'e:\\hivellm\\synap']",
                'trust_level = "trusted"',
                '[hooks.state."codex@openai-codex:hooks/hooks.json:stop:0:0"]',
                'trusted_hash = "sha256:x"',
                '[mcp_servers.rulebook]',
                'command = "npx"',
                'args = [',
                '    "-y", # inline comment',
                '    "--package=@hivehub/rulebook@latest",',
                ']',
                'env = { A = "1" }',
                'n = 1_000',
                'on = true',
                '[[array_table]]',
                'x = 1',
            ].join('\n')
        );
        expect(t.model_provider).toBe('9router');
        expect(getTable(t, 'projects', 'e:\\hivellm\\synap')?.trust_level).toBe('trusted');
        expect(Object.keys(getTable(t, 'hooks', 'state') ?? {})).toEqual([
            'codex@openai-codex:hooks/hooks.json:stop:0:0',
        ]);
        const mcp = getTable(t, 'mcp_servers', 'rulebook')!;
        expect(mcp.args).toEqual(['-y', '--package=@hivehub/rulebook@latest']);
        expect(mcp.n).toBe(1000);
        expect(mcp.on).toBe(true);
        expect(t.array_table).toBeUndefined();
    });

    it('maps hook events to Codex trust-key names', () => {
        expect(snakeEvent('PreToolUse')).toBe('pre_tool_use');
        expect(snakeEvent('UserPromptSubmit')).toBe('user_prompt_submit');
        expect(snakeEvent('Stop')).toBe('stop');
    });

    it('treats an orphaned chain as hosted by a gone process', () => {
        const groups = groupMcpChains([
            {
                pid: 5,
                ppid: 4,
                name: 'node',
                commandLine: 'node /x/rulebook-server.js',
                memoryBytes: 1,
            },
        ]);
        expect(groups).toEqual([
            {
                hostPid: 4,
                host: '(gone, pid 4)',
                chains: 1,
                processes: 1,
                memoryBytes: 1,
                serverPids: [5],
            },
        ]);
    });
});
