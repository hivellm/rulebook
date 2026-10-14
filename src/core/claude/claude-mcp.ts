/**
 * Claude Code Integration Module
 *
 * Auto-detects Claude Code installation and configures:
 * - MCP server entry in .mcp.json at project root
 * - Rulebook skills as Claude Code commands in .claude/commands/
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { fileExists, readFile, writeFile, ensureDir } from '../../utils/file-system.js';
import { WorkspaceManager } from '../workspace/workspace-manager.js';
import { resolveAgentPlaceholders, substituteAgentPlaceholders } from '../generators/generator.js';
import { detectProject } from '../detect/detector.js';
import { isCatalogued } from '../migration/legacy-catalogue.js';

export interface ClaudeCodeSetupResult {
    detected: boolean;
    mcpConfigured: boolean;
    skillsInstalled: string[];
    devSkillsInstalled: string[];
    agentTeamsEnabled: boolean;
    agentDefinitionsInstalled: string[];
    workflowDefinitionsInstalled: string[];
}

/**
 * Detect if Claude Code is installed by checking for ~/.claude directory
 */
export async function isClaudeCodeInstalled(homeDir?: string): Promise<boolean> {
    const claudeDir = join(homeDir ?? homedir(), '.claude');
    return fileExists(claudeDir);
}

const RULEBOOK_PACKAGE = '@hivehub/rulebook';

/** An MCP server entry as `.mcp.json` and `.cursor/mcp.json` store it. */
export interface McpServerEntry {
    command: string;
    args: string[];
}

/** Root of the installed package: src/core/claude/ and dist/core/claude/ sit three levels below it. */
export function getRulebookPackageRoot(): string {
    return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

/** The installed rulebook version, which generated entries pin. */
export function getInstalledRulebookVersion(): string {
    const pkgPath = join(getRulebookPackageRoot(), 'package.json');
    return (JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }).version;
}

function isRulebookRepo(projectRoot: string): boolean {
    try {
        const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
        return pkg.name === RULEBOOK_PACKAGE;
    } catch {
        return false;
    }
}

/**
 * The one builder of rulebook MCP entries (`.mcp.json`, `.cursor/mcp.json`,
 * legacy migration). The entry is pinned to the installed version, never
 * `@latest`: every session runs the same known build and no session
 * re-installs at release time (F-013/F-015). No --project-root: the server
 * finds the project via cwd walk-up, which is portable across machines.
 * In the rulebook repo itself the entry runs the local build: there npx
 * skips its cache for the same-named package and runs whatever global
 * `rulebook-mcp` is on PATH, possibly a stale one (F-018).
 */
export function buildRulebookMcpEntry(
    projectRoot: string,
    workspace?: boolean,
    version: string = getInstalledRulebookVersion()
): McpServerEntry {
    const tail = workspace ? ['--workspace'] : [];
    if (isRulebookRepo(projectRoot)) {
        return { command: 'node', args: ['./dist/mcp/rulebook-server.js', ...tail] };
    }
    return {
        command: 'npx',
        args: ['-y', `--package=${RULEBOOK_PACKAGE}@${version}`, 'rulebook-mcp', ...tail],
    };
}

/**
 * True for an entry rulebook generated: npx running @hivehub/rulebook at any
 * version, in the slim `rulebook-mcp` or the legacy `mcp-server` form. Only
 * these are rewritten; anything else (e.g. `node <path>`) is the user's.
 */
function isGeneratedRulebookEntry(entry: { command?: unknown; args?: unknown }): boolean {
    return (
        entry.command === 'npx' &&
        Array.isArray(entry.args) &&
        entry.args.some(
            (a) => typeof a === 'string' && /^(--package=)?@hivehub\/rulebook(@|$)/.test(a)
        )
    );
}

/**
 * Add or refresh the `rulebook` entry in an MCP config file: `.mcp.json` at
 * the project root unless `mcpJsonPath` names another (`.cursor/mcp.json`).
 * Other servers are never touched. An existing generated entry (`@latest`,
 * legacy `mcp-server`, `--project-root`, an older pin) is rewritten to the
 * pinned form, keeping its `--workspace` flag and any extra keys; a
 * user-customised entry is left alone. Returns true only when the entry was added.
 */
export async function configureMcpJson(
    projectRoot: string,
    workspace?: boolean,
    mcpJsonPath: string = join(projectRoot, '.mcp.json')
): Promise<boolean> {
    let mcpConfig: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

    if (await fileExists(mcpJsonPath)) {
        try {
            const raw = await readFile(mcpJsonPath);
            mcpConfig = JSON.parse(raw);
        } catch {
            // If JSON is invalid, start fresh
            mcpConfig = { mcpServers: {} };
        }
    }

    mcpConfig.mcpServers = mcpConfig.mcpServers ?? {};

    const existing = mcpConfig.mcpServers.rulebook as
        { command?: unknown; args?: unknown[] } | undefined;

    if (existing) {
        if (!isGeneratedRulebookEntry(existing)) return false;
        const expected = buildRulebookMcpEntry(
            projectRoot,
            workspace || existing.args?.includes('--workspace')
        );
        const current = JSON.stringify([existing.command, existing.args]);
        if (current !== JSON.stringify([expected.command, expected.args])) {
            mcpConfig.mcpServers.rulebook = { ...existing, ...expected };
            await writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
        }
        return false; // Entry already existed (possibly upgraded)
    }

    mcpConfig.mcpServers.rulebook = buildRulebookMcpEntry(projectRoot, workspace);

    await writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    return true;
}

/**
 * Install rulebook skill templates as Claude Code commands (legacy format).
 * Copies templates/commands/*.md to .claude/commands/ in the project.
 */
export async function installClaudeCodeSkills(
    projectRoot: string,
    templatesPath: string
): Promise<string[]> {
    const commandsSourceDir = join(templatesPath, 'commands');
    const commandsTargetDir = join(projectRoot, '.claude', 'commands');

    if (!(await fileExists(commandsSourceDir))) {
        return [];
    }

    await ensureDir(commandsTargetDir);

    const entries = await readdir(commandsSourceDir);
    const installed: string[] = [];

    for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;

        const sourcePath = join(commandsSourceDir, entry);
        const targetPath = join(commandsTargetDir, entry);

        const content = await readFile(sourcePath);
        await writeFile(targetPath, content);
        installed.push(entry);
    }

    return installed;
}

/**
 * Install dev skills to .claude/skills/ (modern Claude Code format).
 * Each skill is a directory with a SKILL.md file.
 * Copies templates/dev-skills/<name>/SKILL.md to .claude/skills/<name>/SKILL.md.
 */
/**
 * v7: only Rulebook-specific skills ship by default. Generic engineering
 * skills duplicate native harness capabilities (F-010) and are opt-in via
 * `rulebook skills` management.
 */
export const DEFAULT_DEV_SKILLS: readonly string[] = ['analysis', 'spec'];

export async function installDevSkills(
    projectRoot: string,
    templatesPath: string,
    skillNames: readonly string[] = DEFAULT_DEV_SKILLS
): Promise<string[]> {
    const skillsSourceDir = join(templatesPath, 'skills', 'dev');
    const skillsTargetDir = join(projectRoot, '.claude', 'skills');

    if (!(await fileExists(skillsSourceDir))) {
        return [];
    }

    await ensureDir(skillsTargetDir);

    const entries = await readdir(skillsSourceDir, { withFileTypes: true });
    const installed: string[] = [];

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!skillNames.includes(entry.name)) continue;

        const skillFile = join(skillsSourceDir, entry.name, 'SKILL.md');
        if (!(await fileExists(skillFile))) continue;

        const targetSkillDir = join(skillsTargetDir, entry.name);
        const targetFile = join(targetSkillDir, 'SKILL.md');
        // An installed copy the user edited (not any shipped version) is kept.
        if (await fileExists(targetFile)) {
            const installedContent = await readFile(targetFile);
            if (!isCatalogued(`.claude/skills/${entry.name}/SKILL.md`, installedContent)) {
                continue;
            }
        }
        await ensureDir(targetSkillDir);

        const content = await readFile(skillFile);
        await writeFile(targetFile, content);
        installed.push(entry.name);
    }

    return installed;
}

/**
 * Configure .claude/settings.json to enable CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS.
 * Creates the file if it does not exist. Preserves existing settings.
 * Returns true if the settings were modified, false if already configured.
 */
export async function configureClaudeSettings(projectRoot: string): Promise<boolean> {
    const settingsPath = join(projectRoot, '.claude', 'settings.json');

    let settings: Record<string, unknown> = {};

    if (await fileExists(settingsPath)) {
        try {
            const raw = await readFile(settingsPath);
            settings = JSON.parse(raw);
        } catch {
            settings = {};
        }
    }

    const env = (settings.env as Record<string, string> | undefined) ?? {};

    if (env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1') {
        return false;
    }

    settings.env = { ...env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' };

    await ensureDir(join(projectRoot, '.claude'));
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    return true;
}

/**
 * Install agent definition templates into .claude/agents/.
 * Copies templates/agents/*.md to the project's .claude/agents/ directory.
 * Creates the target directory even when no source templates exist.
 * Returns the list of installed file names.
 */
export async function installAgentDefinitions(
    projectRoot: string,
    templatesPath: string,
    language?: string
): Promise<string[]> {
    const agentsSourceDir = join(templatesPath, 'agents');
    const agentsTargetDir = join(projectRoot, '.claude', 'agents');

    await ensureDir(agentsTargetDir);

    if (!(await fileExists(agentsSourceDir))) {
        return [];
    }

    // Agent templates carry {{language}}/{{file_naming}}/{{test_framework}}
    // placeholders. Resolve them from the project's primary language so the
    // installed agents are stack-correct (e.g. TypeScript/kebab-case/vitest)
    // instead of leaking raw placeholders to the consumer.
    const placeholders = resolveAgentPlaceholders(language);

    const entries = await readdir(agentsSourceDir);
    const installed: string[] = [];

    for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;

        const sourcePath = join(agentsSourceDir, entry);
        const targetPath = join(agentsTargetDir, entry);

        const content = await readFile(sourcePath);
        await writeFile(targetPath, substituteAgentPlaceholders(content, placeholders));
        installed.push(entry);
    }

    return installed;
}

/**
 * Install multi-agent workflow scripts into .claude/workflows/.
 * Copies templates/claude-workflows/*.js to the project's .claude/workflows/
 * directory so the Claude Code Workflow tool can run them by name. Existing
 * files are overwritten to keep them in sync on `rulebook update`.
 * Returns the list of installed file names.
 */
export async function installWorkflowDefinitions(
    projectRoot: string,
    templatesPath: string
): Promise<string[]> {
    const workflowsSourceDir = join(templatesPath, 'claude-workflows');
    const workflowsTargetDir = join(projectRoot, '.claude', 'workflows');

    if (!(await fileExists(workflowsSourceDir))) {
        return [];
    }

    await ensureDir(workflowsTargetDir);

    const entries = await readdir(workflowsSourceDir);
    const installed: string[] = [];

    for (const entry of entries) {
        if (!entry.endsWith('.js')) continue;

        const sourcePath = join(workflowsSourceDir, entry);
        const targetPath = join(workflowsTargetDir, entry);

        const content = await readFile(sourcePath);
        await writeFile(targetPath, content);
        installed.push(entry);
    }

    return installed;
}

/**
 * Get the templates path (same logic as generator.ts getTemplatesDir)
 */
function getTemplatesPath(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, '..', '..', '..', 'templates');
}

/**
 * Main entry point: detect Claude Code and set up MCP + skills.
 * Non-blocking: returns silently if Claude Code is not detected.
 */
export interface ClaudeCodeSetupOptions {
    /** Install agent definitions (v7: opt-in — native harness agents cover the defaults). */
    includeAgents?: boolean;
    /** Install orchestration workflows (v7: opt-in). */
    includeWorkflows?: boolean;
}

export async function setupClaudeCodeIntegration(
    projectRoot: string,
    templatesPath?: string,
    homeDir?: string,
    options: ClaudeCodeSetupOptions = {}
): Promise<ClaudeCodeSetupResult> {
    const detected = await isClaudeCodeInstalled(homeDir);

    if (!detected) {
        return {
            detected: false,
            mcpConfigured: false,
            skillsInstalled: [],
            devSkillsInstalled: [],
            agentTeamsEnabled: false,
            agentDefinitionsInstalled: [],
            workflowDefinitionsInstalled: [],
        };
    }

    const resolvedTemplatesPath = templatesPath ?? getTemplatesPath();

    // Auto-detect workspace mode for .mcp.json configuration
    const isWorkspace = WorkspaceManager.findWorkspaceConfig(projectRoot) !== null;
    const mcpConfigured = await configureMcpJson(projectRoot, isWorkspace);
    const skillsInstalled = await installClaudeCodeSkills(projectRoot, resolvedTemplatesPath);
    const devSkillsInstalled = await installDevSkills(projectRoot, resolvedTemplatesPath);
    const agentTeamsEnabled = await configureClaudeSettings(projectRoot);

    // v7 (F-010): agents and workflows are opt-in. The native harness ships
    // general-purpose/exploration/review agents; duplicating them by default
    // pads every session's context and creates upgrade churn.
    let agentDefinitionsInstalled: string[] = [];
    if (options.includeAgents) {
        let primaryLanguage: string | undefined;
        try {
            const detection = await detectProject(projectRoot);
            primaryLanguage = detection.languages[0]?.language;
        } catch {
            // Detection failure → installAgentDefinitions falls back to TypeScript defaults.
        }
        agentDefinitionsInstalled = await installAgentDefinitions(
            projectRoot,
            resolvedTemplatesPath,
            primaryLanguage
        );
    }

    const workflowDefinitionsInstalled = options.includeWorkflows
        ? await installWorkflowDefinitions(projectRoot, resolvedTemplatesPath)
        : [];

    return {
        detected: true,
        mcpConfigured,
        skillsInstalled,
        devSkillsInstalled,
        agentTeamsEnabled,
        agentDefinitionsInstalled,
        workflowDefinitionsInstalled,
    };
}
