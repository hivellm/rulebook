import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import {
    buildFastMcpEntry,
    codexTomlSnippet,
    getInstalledServerPath,
    readLocalRulebookEntry,
    refreshLocalFastEntry,
    registerLocalMcpEntry,
    type ClaudeRunner,
} from '../src/core/claude/mcp-fast-path';
import { mcpFastInitCommand } from '../src/cli/commands/mcp';

const VERSION = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')).version;

function recordingRunner(fail?: (args: readonly string[]) => boolean) {
    const calls: Array<{ args: string[]; cwd: string }> = [];
    const runner: ClaudeRunner = async (args, cwd) => {
        calls.push({ args: [...args], cwd });
        if (fail?.(args)) throw new Error('spawn claude ENOENT\nmore detail');
    };
    return { calls, runner };
}

describe('MCP fast path (opt-in node + absolute path)', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-fast-path-'));
        // Claude Code keys local scope by git root; make `dir` one.
        await fs.mkdir(path.join(dir, '.git'));
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await fs.rm(dir, { recursive: true, force: true });
    });

    /** A fake rulebook install: <root>/package.json + <root>/dist/mcp/rulebook-server.js. */
    async function fakeInstall(name: string, version: string): Promise<string> {
        const root = path.join(dir, name);
        await fs.mkdir(path.join(root, 'dist', 'mcp'), { recursive: true });
        await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ version }));
        const server = path.join(root, 'dist', 'mcp', 'rulebook-server.js');
        await fs.writeFile(server, '');
        return server;
    }

    async function claudeConfig(projectKey: string, rulebook: unknown): Promise<string> {
        const file = path.join(dir, '.claude.json');
        const config = { projects: { [projectKey]: { mcpServers: { rulebook } } } };
        await fs.writeFile(file, JSON.stringify(config));
        return file;
    }

    it('points at an absolute, existing server file of this install', async () => {
        const serverPath = getInstalledServerPath();
        expect(path.isAbsolute(serverPath)).toBe(true);
        expect(serverPath).toMatch(/[\\/]dist[\\/]mcp[\\/]rulebook-server(\.bundle)?\.js$/);
        expect(buildFastMcpEntry(serverPath, true)).toEqual({
            command: 'node',
            args: [serverPath, '--workspace'],
        });
    });

    it('registers in Claude Code local scope, replacing an earlier local entry', async () => {
        const { calls, runner } = recordingRunner();
        const entry = buildFastMcpEntry('/opt/rb/dist/mcp/rulebook-server.js');

        const result = await registerLocalMcpEntry(dir, entry, runner);

        expect(result.registered).toBe(true);
        expect(calls).toEqual([
            { args: ['mcp', 'remove', '--scope', 'local', 'rulebook'], cwd: dir },
            {
                args: [
                    'mcp',
                    'add',
                    '--scope',
                    'local',
                    'rulebook',
                    '--',
                    'node',
                    '/opt/rb/dist/mcp/rulebook-server.js',
                ],
                cwd: dir,
            },
        ]);
    });

    it('returns the exact manual command when the Claude CLI is unavailable', async () => {
        const { runner } = recordingRunner(() => true);
        const entry = buildFastMcpEntry('C:\\Program Files\\rb\\dist\\mcp\\rulebook-server.js');

        const result = await registerLocalMcpEntry(dir, entry, runner);

        expect(result).toEqual({
            registered: false,
            error: 'spawn claude ENOENT',
            manualCommand:
                'claude mcp add --scope local rulebook -- node "C:\\Program Files\\rb\\dist\\mcp\\rulebook-server.js"',
        });
    });

    it('prints a valid Codex config.toml snippet', () => {
        const snippet = codexTomlSnippet(
            buildFastMcpEntry('C:\\rb\\dist\\mcp\\rulebook-server.js')
        );
        expect(snippet).toBe(
            [
                '[mcp_servers.rulebook]',
                'command = "node"',
                'args = ["C:\\\\rb\\\\dist\\\\mcp\\\\rulebook-server.js"]',
            ].join('\n')
        );
    });

    it('reads the local-scope entry for the project (keyed by git root) from the Claude config', async () => {
        const entry = { command: 'node', args: ['/x/dist/mcp/rulebook-server.js'] };
        const configPath = await claudeConfig(dir.replace(/\\/g, '/') + '/', entry);
        const sub = path.join(dir, 'packages', 'app');
        await fs.mkdir(sub, { recursive: true });

        expect(readLocalRulebookEntry(dir, configPath)).toEqual(entry);
        expect(readLocalRulebookEntry(sub, configPath)).toEqual(entry);
        expect(readLocalRulebookEntry(path.dirname(dir), configPath)).toBeNull();
        expect(readLocalRulebookEntry(dir, path.join(dir, 'missing.json'))).toBeNull();
    });

    describe('refresh on update', () => {
        it('does nothing without a local fast-path entry', async () => {
            const { calls, runner } = recordingRunner();
            const configPath = await claudeConfig(dir, { command: 'npx', args: ['-y', 'x'] });

            expect(await refreshLocalFastEntry(dir, { runner, configPath })).toEqual({
                status: 'none',
            });
            expect(calls).toHaveLength(0);
        });

        it('leaves an entry that names a live install of this version', async () => {
            const { calls, runner } = recordingRunner();
            const server = await fakeInstall('same', VERSION);
            const configPath = await claudeConfig(dir, { command: 'node', args: [server] });

            const result = await refreshLocalFastEntry(dir, { runner, configPath });

            expect(result.status).toBe('current');
            expect(calls).toHaveLength(0);
        });

        it('re-points an entry whose install is another version, keeping --workspace', async () => {
            const { calls, runner } = recordingRunner();
            const old = await fakeInstall('old', '0.0.1');
            const configPath = await claudeConfig(dir, {
                command: 'node',
                args: [old, '--workspace'],
            });

            const result = await refreshLocalFastEntry(dir, {
                runner,
                configPath,
                serverPath: '/new/dist/mcp/rulebook-server.bundle.js',
            });

            expect(result.status).toBe('updated');
            expect(calls.at(-1)?.args.slice(-3)).toEqual([
                'node',
                '/new/dist/mcp/rulebook-server.bundle.js',
                '--workspace',
            ]);
        });

        it('re-points an entry whose server file is gone, or reports the manual command', async () => {
            const { runner } = recordingRunner(() => true);
            const configPath = await claudeConfig(dir, {
                command: 'node',
                args: [path.join(dir, 'gone', 'dist', 'mcp', 'rulebook-server.js')],
            });

            const result = await refreshLocalFastEntry(dir, {
                runner,
                configPath,
                serverPath: '/new/dist/mcp/rulebook-server.js',
            });

            expect(result.status).toBe('manual');
            expect(result.manualCommand).toBe(
                'claude mcp add --scope local rulebook -- node /new/dist/mcp/rulebook-server.js'
            );
        });
    });

    describe('rulebook mcp init --fast', () => {
        it('registers the installed server and prints the Codex snippet', async () => {
            const { calls, runner } = recordingRunner();
            const logs: string[] = [];
            vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
                logs.push(a.join(' '));
            });

            // A fake install: CI runs the tests without `npm run build`, so dist/ may not exist.
            const serverPath = await fakeInstall('rb-installed', VERSION);
            const code = await mcpFastInitCommand({ serverPath }, runner);

            expect(code).toBe(0);
            expect(calls.at(-1)?.args).toEqual([
                'mcp',
                'add',
                '--scope',
                'local',
                'rulebook',
                '--',
                'node',
                serverPath,
            ]);
            const out = logs.join('\n');
            expect(out).toContain('~/.codex/config.toml');
            expect(out).toContain('[mcp_servers.rulebook]');
        });

        it('fails with exit code 1 when the installed server is missing', async () => {
            const { calls, runner } = recordingRunner();
            vi.spyOn(console, 'error').mockImplementation(() => {});

            const code = await mcpFastInitCommand(
                { serverPath: path.join(dir, 'missing', 'rulebook-server.js') },
                runner
            );

            expect(code).toBe(1);
            expect(calls).toEqual([]);
        });
    });
});
