import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { isRulebookHook } from '../src/core/claude/claude-settings-manager';

const execFileAsync = promisify(execFile);

/**
 * Hot-path hook budget (docs/analysis/multi-session-performance/08, C7):
 * "Rulebook process spawns per ordinary tool call: 0" and "Prompt hook wall
 * time, default install: 0 ms (off)". Claude Code spawns a hook process for
 * every matching PreToolUse entry unless the handler carries an `if` rule that
 * the call does not match, and for every UserPromptSubmit entry on every
 * prompt. So in a project the real CLI generated, every rulebook PreToolUse
 * handler must carry an `if` filter, and no rulebook UserPromptSubmit entry may
 * exist unless gate.promptHook.enabled is true.
 *
 * Runs the built CLI (`npm run build` first; skipped without dist/) in a temp
 * project with a temp HOME where Claude Code and the TypeSafe plugin look
 * installed, so init/update take the default path without touching the real
 * home or the network-bound plugin install.
 */
const CLI = path.join(process.cwd(), 'dist', 'index.js');

interface HookHandler {
    type: string;
    command: string;
    args?: string[];
    if?: string;
}
type Hooks = Record<string, Array<{ matcher?: string; hooks: HookHandler[] }>>;

/** Same retrying removal as the other hook suites (Windows delete-pending errors). */
const removeTempDir = (dir: string) =>
    fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });

describe.skipIf(!existsSync(CLI))('hot-path hook budget (C7)', () => {
    let tmp: string;
    let project: string;
    let env: NodeJS.ProcessEnv;

    const rulebook = (...args: string[]) =>
        execFileAsync('node', [CLI, ...args], { cwd: project, env, timeout: 60_000 });

    async function hooks(): Promise<Hooks> {
        const raw = await fs.readFile(path.join(project, '.claude', 'settings.json'), 'utf-8');
        return (JSON.parse(raw) as { hooks?: Hooks }).hooks ?? {};
    }

    /** `[event, handler]` for every rulebook-owned hook handler in settings.json. */
    async function rulebookHandlers(): Promise<Array<[string, HookHandler]>> {
        const out: Array<[string, HookHandler]> = [];
        for (const [event, entries] of Object.entries(await hooks())) {
            for (const entry of entries) {
                for (const h of entry.hooks) {
                    if (isRulebookHook([h.command, ...(h.args ?? [])].join(' '))) {
                        out.push([event, h]);
                    }
                }
            }
        }
        return out;
    }

    async function readConfig(): Promise<Record<string, unknown>> {
        return JSON.parse(
            await fs.readFile(path.join(project, '.rulebook', 'rulebook.json'), 'utf-8')
        );
    }

    beforeAll(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'rb-hook-budget-'));
        project = path.join(tmp, 'project');
        const home = path.join(tmp, 'home');
        await fs.mkdir(path.join(home, '.claude', 'plugins'), { recursive: true });
        await fs.writeFile(
            path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
            JSON.stringify({ plugins: { 'typesafe@typesafe-ai': [{ scope: 'user' }] } })
        );
        await fs.mkdir(project);
        await fs.writeFile(
            path.join(project, 'package.json'),
            JSON.stringify({ name: 'hook-budget-fixture', version: '1.0.0' })
        );
        await fs.writeFile(path.join(project, 'tsconfig.json'), '{}');
        env = { ...process.env, HOME: home, USERPROFILE: home };
        await rulebook('init', '--yes');
    }, 90_000);

    afterAll(async () => {
        await removeTempDir(tmp);
    });

    it('a default project spawns no rulebook hook on an ordinary Bash/Edit/Write call', async () => {
        const handlers = await rulebookHandlers();
        expect(handlers.length).toBeGreaterThan(0); // the task-scaffolding guard
        for (const [event, h] of handlers) {
            expect(event, h.command).toBe('PreToolUse');
            expect(h.if, `${event} ${h.command} has no if filter`).toBeTruthy();
        }
        expect((await hooks()).UserPromptSubmit).toBeUndefined();
        expect((await readConfig()).gate).toBeUndefined();
        // The scripts only the opt-in tool gate runs are not installed.
        expect(await fs.readdir(path.join(project, '.claude', 'hooks'))).toEqual([
            'protect-task-scaffolding.sh',
        ]);
    });

    it('installs the prompt hook only once gate.promptHook.enabled is true, and update keeps it', async () => {
        // A loadable entry in the project's node_modules, as `npm i -D @hivehub/rulebook` leaves it.
        const pkgDir = path.join(project, 'node_modules', '@hivehub');
        await fs.mkdir(pkgDir, { recursive: true });
        await fs.symlink(process.cwd(), path.join(pkgDir, 'rulebook'), 'junction');
        const config = await readConfig();
        await fs.writeFile(
            path.join(project, '.rulebook', 'rulebook.json'),
            JSON.stringify({ ...config, gate: { promptHook: { enabled: true } } }, null, 2)
        );

        for (let run = 0; run < 2; run++) {
            await rulebook('update', '--yes');
            const prompt = (await rulebookHandlers()).filter(([e]) => e === 'UserPromptSubmit');
            expect(prompt, `update #${run + 1}`).toHaveLength(1);
            expect(prompt[0][1].command).toBe('node');
            expect(prompt[0][1].args?.[1]).toBe('prompt-gate');
            // The setting itself survives the update that installed the hook.
            expect((await readConfig()).gate).toEqual({ promptHook: { enabled: true } });
        }
    }, 120_000);

    it('installs the tool-gate scripts with gate.toolHook.enabled and removes them when it is off', async () => {
        const hooksDir = path.join(project, '.claude', 'hooks');
        const setToolHook = async (enabled: boolean) => {
            const config = await readConfig();
            const gate = { ...(config.gate as object), toolHook: { enabled } };
            await fs.writeFile(
                path.join(project, '.rulebook', 'rulebook.json'),
                JSON.stringify({ ...config, gate }, null, 2)
            );
        };
        const toolEntries = async () =>
            (await rulebookHandlers()).filter(
                ([e, h]) => e === 'PreToolUse' && h.command.endsWith('jev-gate.sh tool')
            );

        await setToolHook(true);
        await rulebook('update', '--yes');
        expect((await fs.readdir(hooksDir)).sort()).toEqual([
            'jev-gate.sh',
            'no-os-scheduling.sh',
            'protect-task-scaffolding.sh',
        ]);
        expect(await toolEntries()).toHaveLength(1);

        await setToolHook(false);
        const { stdout } = await rulebook('update', '--yes');
        expect(await fs.readdir(hooksDir)).toEqual(['protect-task-scaffolding.sh']);
        expect(await toolEntries()).toHaveLength(0);
        expect(stdout).toContain('removed .claude/hooks/no-os-scheduling.sh');
    }, 120_000);
});
