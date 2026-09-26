import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { fileExists, readFile, writeFile, ensureDir } from '../../utils/file-system.js';
import { promises as fs } from 'fs';

/**
 * TypeSafe (https://typesafe.ai) integration — v7.3, on by default since v7.4.
 *
 * TypeSafe ships a Claude Code plugin (`typesafe@typesafe-ai`) carrying the
 * skill that teaches an agent to build with its System One model, Jev, and
 * powers rulebook's entry gate (`rulebook_gate`). `init`/`update`/`claude
 * setup` enable it unless the operator opted out (`--no-typesafe`, or a stored
 * `integrations.typesafe.enabled: false`), make sure the plugin is installed
 * (without reinstalling), tell the agent it is available, and say plainly how
 * to provide the API key. The key is never written by rulebook.
 *
 * Facts below come from the plugin README and https://docs.typesafe.ai/agent-skill.
 */

export const TYPESAFE_PLUGIN_ID = 'typesafe@typesafe-ai';
export const TYPESAFE_MARKETPLACE = 'typesafe-ai/skills';
export const TYPESAFE_ENV_VAR = 'TYPESAFE_API_KEY';
export const TYPESAFE_KEYS_URL = 'https://console.typesafe.ai/keys';
export const TYPESAFE_SKILL = '/typesafe:typesafe-ai';
export const TYPESAFE_RULE_FILE = 'typesafe.md';
export const TYPESAFE_RULE_MARKER = '<!-- rulebook:typesafe -->';

/** The exact commands the plugin README documents. */
export const TYPESAFE_INSTALL_COMMANDS: ReadonlyArray<readonly string[]> = [
    ['claude', 'plugin', 'marketplace', 'add', TYPESAFE_MARKETPLACE],
    ['claude', 'plugin', 'install', TYPESAFE_PLUGIN_ID],
];

export type CommandRunner = (
    cmd: string,
    args: readonly string[]
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile);

const defaultRunner: CommandRunner = async (cmd, args) => {
    const { stdout, stderr } = await execFileAsync(cmd, [...args], {
        windowsHide: true,
        // `claude` is a .cmd shim on Windows; a shell resolves it.
        shell: process.platform === 'win32',
    });
    return { stdout: String(stdout), stderr: String(stderr) };
};

export interface TypesafeSetupOptions {
    homeDir?: string;
    env?: NodeJS.ProcessEnv;
    runner?: CommandRunner;
}

export interface TypesafeSetupResult {
    /** Plugin present in the Claude Code registry after setup. */
    installed: boolean;
    /** This call ran the install commands. */
    installedNow: boolean;
    /** Install was attempted and failed; the message names the manual commands. */
    installError?: string;
    /** TYPESAFE_API_KEY is set in the environment or the project's `.env`. */
    tokenPresent: boolean;
    /** `.claude/rules/typesafe.md` path (always written on setup). */
    rulePath: string;
}

export function getInstalledPluginsPath(homeDir: string = os.homedir()): string {
    return path.join(homeDir, '.claude', 'plugins', 'installed_plugins.json');
}

/**
 * The registry is the source of truth: `installed_plugins.json` maps
 * `<plugin>@<marketplace>` to a non-empty list of installs. Anything
 * unreadable reads as "not installed" — the worst case is one redundant
 * install command, which the CLI itself makes idempotent.
 */
export async function isTypesafePluginInstalled(homeDir?: string): Promise<boolean> {
    const registry = getInstalledPluginsPath(homeDir);
    if (!(await fileExists(registry))) return false;
    try {
        const parsed = JSON.parse(await readFile(registry)) as {
            plugins?: Record<string, unknown>;
        };
        const entry = parsed.plugins?.[TYPESAFE_PLUGIN_ID];
        return Array.isArray(entry) ? entry.length > 0 : Boolean(entry);
    } catch {
        return false;
    }
}

/**
 * Is the key available? Environment first, then `<projectRoot>/.env` — the
 * MCP server is spawned by Claude Code and may not inherit the shell profile.
 * Only a yes/no leaves this function; the value is never logged or stored.
 * Same resolution as the gate client (`resolveTypesafeKey`), loaded lazily
 * because that module imports constants from this one.
 */
export async function hasTypesafeToken(
    projectRoot?: string,
    env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
    if (env[TYPESAFE_ENV_VAR]?.trim()) return true;
    if (!projectRoot) return false;
    const { resolveTypesafeKey } = await import('../typesafe/client.js');
    return (await resolveTypesafeKey(projectRoot, env)).key !== null;
}

/** Human instructions for the one step rulebook cannot do: the API key. */
export function typesafeTokenInstructions(): string[] {
    return [
        `TypeSafe needs an API key in ${TYPESAFE_ENV_VAR} (not found in this shell or the project's .env).`,
        `  1. Create a key: ${TYPESAFE_KEYS_URL}`,
        `  2. Export it where the agent runs, e.g. add to your shell profile:`,
        `       export ${TYPESAFE_ENV_VAR}=ts_...`,
        `     or to the project's untracked .env — never commit it.`,
        `  3. Restart Claude Code (or /reload-plugins) so the skill sees the key.`,
        `The Jev gate (rulebook_gate) runs once ${TYPESAFE_ENV_VAR} is set, in the shell or the project's untracked .env.`,
    ];
}

/** Commands to run by hand when the CLI is unavailable. */
export function typesafeManualInstall(): string {
    return TYPESAFE_INSTALL_COMMANDS.map((c) => c.join(' ')).join(' && ');
}

/**
 * Install the plugin through the Claude CLI. `marketplace add` fails when the
 * marketplace is already registered — harmless, so it is tolerated; a failed
 * `plugin install` is the real error and is reported with the manual command.
 */
export async function installTypesafePlugin(runner: CommandRunner = defaultRunner): Promise<void> {
    const [addMarketplace, installPlugin] = TYPESAFE_INSTALL_COMMANDS;
    try {
        await runner(addMarketplace[0], addMarketplace.slice(1));
    } catch (error) {
        const detail = describe(error);
        if (!/already/i.test(detail)) {
            throw new Error(
                `Could not register the TypeSafe marketplace (${detail}). Run by hand: ${typesafeManualInstall()}`
            );
        }
    }
    try {
        await runner(installPlugin[0], installPlugin.slice(1));
    } catch (error) {
        throw new Error(
            `Could not install ${TYPESAFE_PLUGIN_ID} (${describe(error)}). Run by hand: ${typesafeManualInstall()}`
        );
    }
}

function describe(error: unknown): string {
    const err = error as { code?: string; stderr?: string; message?: string };
    if (err?.code === 'ENOENT') return '`claude` CLI not found on PATH';
    return (err?.stderr || err?.message || String(error)).trim().split('\n')[0];
}

export function getTypesafeRulePath(projectRoot: string): string {
    return path.join(projectRoot, '.claude', 'rules', TYPESAFE_RULE_FILE);
}

/**
 * What the agent needs to know, and nothing more: the capability exists, when
 * to reach for it, where the key comes from. The skill itself carries the
 * how-to, so this stays a pointer. It has no `paths:` frontmatter, so it is
 * always loaded in every project — keep it within ~90 tokens.
 */
export function renderTypesafeRule(): string {
    return [
        TYPESAFE_RULE_MARKER,
        '# TypeSafe (Jev)',
        `- Semantic judgments plain code can't make: \`${TYPESAFE_SKILL}\`.`,
        '- `rulebook_gate` runs on every operator prompt.',
        `- Key: \`${TYPESAFE_ENV_VAR}\` (shell or untracked .env; ${TYPESAFE_KEYS_URL}). Never commit it.`,
        '- Managed by `rulebook update`.',
        '',
    ].join('\n');
}

export async function writeTypesafeRule(projectRoot: string): Promise<string> {
    const target = getTypesafeRulePath(projectRoot);
    await ensureDir(path.dirname(target));
    await writeFile(target, renderTypesafeRule());
    return target;
}

/** Remove the rule file only when it is rulebook-owned (carries the marker). */
export async function removeTypesafeRule(projectRoot: string): Promise<boolean> {
    const target = getTypesafeRulePath(projectRoot);
    if (!(await fileExists(target))) return false;
    const content = await readFile(target);
    if (!content.startsWith(TYPESAFE_RULE_MARKER)) return false;
    await fs.rm(target, { force: true });
    return true;
}

/**
 * Bring a project to "TypeSafe enabled": plugin present (installed only when
 * missing), rule file written, token checked. Never throws for a failed
 * install — the result says what went wrong so init/update keep going.
 */
export async function setupTypesafeIntegration(
    projectRoot: string,
    options: TypesafeSetupOptions = {}
): Promise<TypesafeSetupResult> {
    const runner = options.runner ?? defaultRunner;
    let installed = await isTypesafePluginInstalled(options.homeDir);
    let installedNow = false;
    let installError: string | undefined;

    if (!installed) {
        try {
            await installTypesafePlugin(runner);
            installedNow = true;
            // Trust the CLI's exit status; the registry may lag on some setups.
            installed = true;
        } catch (error) {
            installError = error instanceof Error ? error.message : String(error);
        }
    }

    const rulePath = await writeTypesafeRule(projectRoot);

    return {
        installed,
        installedNow,
        installError,
        tokenPresent: await hasTypesafeToken(projectRoot, options.env),
        rulePath,
    };
}
