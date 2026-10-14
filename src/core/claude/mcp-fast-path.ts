/**
 * Opt-in MCP fast path (F-013, operator decision Q4).
 *
 * The checked-in `.mcp.json` keeps the pinned npx entry (portable, ~1 s and
 * 4 processes per session). The fast path runs `node <absolute path>` instead
 * (1 process, ~0.1–0.3 s), but that path is machine-specific, so it goes to
 * Claude Code's local scope (`~/.claude.json`, per project, never checked in),
 * where it overrides the project entry of the same name. Codex gets a printed
 * `~/.codex/config.toml` snippet; rulebook never edits that file.
 */

import { exec, execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { promisify } from 'util';
import {
    getInstalledRulebookVersion,
    getRulebookPackageRoot,
    type McpServerEntry,
} from './claude-mcp.js';

/** Runs `claude <args>` in `cwd`; rejects when the CLI is missing or fails. */
export type ClaudeRunner = (args: readonly string[], cwd: string) => Promise<void>;

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/** Quote an argument that holds whitespace or a backslash (Windows paths). */
function quoteArg(arg: string): string {
    return /[\s\\"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

const runClaude: ClaudeRunner = async (args, cwd) => {
    if (process.platform === 'win32') {
        // `claude` may be a .cmd shim on Windows, which only a shell resolves.
        await execAsync(['claude', ...args.map(quoteArg)].join(' '), { cwd, windowsHide: true });
        return;
    }
    await execFileAsync('claude', [...args], { cwd });
};

/**
 * Absolute path of the installed server: the single-file bundle when the
 * build produced it (~110 ms init instead of ~230 ms, F-017), else
 * dist/mcp/rulebook-server.js.
 */
export function getInstalledServerPath(): string {
    const mcpDir = join(getRulebookPackageRoot(), 'dist', 'mcp');
    const bundle = join(mcpDir, 'rulebook-server.bundle.js');
    return existsSync(bundle) ? bundle : join(mcpDir, 'rulebook-server.js');
}

export function buildFastMcpEntry(serverPath: string, workspace?: boolean): McpServerEntry {
    return { command: 'node', args: [serverPath, ...(workspace ? ['--workspace'] : [])] };
}

function localAddArgs(entry: McpServerEntry): string[] {
    return ['mcp', 'add', '--scope', 'local', 'rulebook', '--', entry.command, ...entry.args];
}

/** The `claude mcp add` command to run by hand when the CLI is unavailable. */
export function manualAddCommand(entry: McpServerEntry): string {
    return ['claude', ...localAddArgs(entry)].map(quoteArg).join(' ');
}

/** `~/.codex/config.toml` snippet; JSON strings are valid TOML basic strings. */
export function codexTomlSnippet(entry: McpServerEntry): string {
    return [
        '[mcp_servers.rulebook]',
        `command = ${JSON.stringify(entry.command)}`,
        `args = [${entry.args.map((a) => JSON.stringify(a)).join(', ')}]`,
    ].join('\n');
}

export interface LocalRegistration {
    registered: boolean;
    manualCommand: string;
    error?: string;
}

/**
 * Register `entry` as the `rulebook` server in Claude Code's local scope for
 * `projectRoot`. `claude mcp add` refuses an existing name, so our previous
 * local entry is removed first (none there is fine).
 */
export async function registerLocalMcpEntry(
    projectRoot: string,
    entry: McpServerEntry,
    runner: ClaudeRunner = runClaude
): Promise<LocalRegistration> {
    const manualCommand = manualAddCommand(entry);
    try {
        await runner(['mcp', 'remove', '--scope', 'local', 'rulebook'], projectRoot).catch(
            () => undefined
        );
        await runner(localAddArgs(entry), projectRoot);
        return { registered: true, manualCommand };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { registered: false, manualCommand, error: message.split('\n')[0] };
    }
}

/** Where Claude Code keeps local-scope servers (`projects[<dir>].mcpServers`). */
export function claudeConfigPath(env: NodeJS.ProcessEnv = process.env): string {
    return join(env.CLAUDE_CONFIG_DIR ?? homedir(), '.claude.json');
}

function samePath(a: string, b: string): boolean {
    const norm = (p: string) => {
        const s = p.replace(/\\/g, '/').replace(/\/+$/, '');
        return process.platform === 'win32' ? s.toLowerCase() : s;
    };
    return norm(a) === norm(b);
}

/** Claude Code keys local scope by the enclosing git root, else the directory itself. */
function claudeProjectDir(projectRoot: string): string {
    for (let dir = projectRoot; ; dir = dirname(dir)) {
        if (existsSync(join(dir, '.git'))) return dir;
        if (dirname(dir) === dir) return projectRoot;
    }
}

/** The local-scope `rulebook` entry Claude Code holds for `projectRoot`, if any. */
export function readLocalRulebookEntry(
    projectRoot: string,
    configPath: string = claudeConfigPath()
): McpServerEntry | null {
    const key = claudeProjectDir(projectRoot);
    try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8')) as {
            projects?: Record<string, { mcpServers?: Record<string, Partial<McpServerEntry>> }>;
        };
        for (const [dir, project] of Object.entries(config.projects ?? {})) {
            if (!samePath(dir, key)) continue;
            const entry = project?.mcpServers?.rulebook;
            if (typeof entry?.command === 'string' && Array.isArray(entry.args)) {
                return { command: entry.command, args: entry.args };
            }
        }
    } catch {
        // No readable Claude config: no local entry.
    }
    return null;
}

/** Version of the rulebook install a server path belongs to (dist/mcp/ sits two levels down). */
function serverVersion(serverPath: string): string | undefined {
    try {
        const pkgPath = join(dirname(serverPath), '..', '..', 'package.json');
        return (JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string }).version;
    } catch {
        return undefined;
    }
}

export interface FastPathRefresh {
    status: 'none' | 'current' | 'updated' | 'manual';
    serverPath?: string;
    manualCommand?: string;
    error?: string;
}

/**
 * `rulebook update`: keep a fast-path entry pointing at a live install of the
 * running version. Rewritten only when it names a server file that is gone
 * or belongs to another version; any other local entry is left alone.
 */
export async function refreshLocalFastEntry(
    projectRoot: string,
    options: { runner?: ClaudeRunner; configPath?: string; serverPath?: string } = {}
): Promise<FastPathRefresh> {
    const existing = readLocalRulebookEntry(projectRoot, options.configPath);
    const registered = existing?.command === 'node' ? existing.args[0] : undefined;
    if (!existing || !registered || !/rulebook-server(\.bundle)?\.js$/.test(registered)) {
        return { status: 'none' };
    }
    if (existsSync(registered) && serverVersion(registered) === getInstalledRulebookVersion()) {
        return { status: 'current' };
    }
    const serverPath = options.serverPath ?? getInstalledServerPath();
    const entry = buildFastMcpEntry(serverPath, existing.args.includes('--workspace'));
    const result = await registerLocalMcpEntry(projectRoot, entry, options.runner);
    return {
        status: result.registered ? 'updated' : 'manual',
        serverPath,
        manualCommand: result.manualCommand,
        error: result.error,
    };
}
