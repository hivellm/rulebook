/**
 * OpenCode Integration Generator
 *
 * Generates the OpenCode-specific surface area for a Rulebook-managed project:
 *  - opencode.json with $schema, mcp.rulebook, and instructions
 *  - .opencode/commands/<name>.md mirroring user-invocable Rulebook slash commands
 *  - .opencode/agents/<role>.md mirroring Rulebook role agents
 *  - .opencode/skills/<name>/SKILL.md normalized to OpenCode's frontmatter schema
 *  - .opencode/.rulebook-managed.json listing managed keys for safe future updates
 *
 * Idempotency: every generator preserves user-owned files. A managed file is
 * identified by either the `<!-- RULEBOOK:START -->` marker (markdown) or by
 * the `_rulebook_managed: true` JSON key (managed-keys file).
 */

import path, { dirname } from 'path';
import { existsSync } from 'fs';
import { readdir, readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import type { DetectionResult } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RULEBOOK_MARKER = '<!-- RULEBOOK:START -->';
const RULEBOOK_END_MARKER = '<!-- RULEBOOK:END -->';
const MANAGED_KEYS_FILE = '.rulebook-managed.json';
const SCHEMA_URL = 'https://opencode.ai/config.json';

const MANAGED_TOP_LEVEL_KEYS = ['$schema', 'instructions'] as const;
const MANAGED_MCP_KEY = 'rulebook';

const MODEL_TIER_MAP: Record<string, string> = {
    haiku: 'anthropic/claude-haiku-4-5',
    sonnet: 'anthropic/claude-sonnet-4-6',
    opus: 'anthropic/claude-opus-4-7',
};

const READ_ONLY_AGENTS = new Set([
    'researcher',
    'code-reviewer',
    'security-reviewer',
    'accessibility-reviewer',
    'ux-reviewer',
    'performance-engineer',
]);

interface OpencodeMcpServer {
    type: 'local';
    command: string[];
    enabled: boolean;
    environment?: Record<string, string>;
}

interface OpencodeConfig {
    $schema?: string;
    mcp?: Record<string, OpencodeMcpServer | unknown>;
    instructions?: string[];
    agent?: Record<string, unknown>;
    permission?: Record<string, unknown>;
    [key: string]: unknown;
}

interface ManagedKeysFile {
    _rulebook_managed: true;
    version: number;
    topLevel: string[];
    mcpServers: string[];
    instructions: string[];
}

export interface OpencodeGenerationResult {
    configPath?: string;
    managedKeysPath?: string;
    commands: string[];
    agents: string[];
    skills: string[];
    preserved: string[];
}

/**
 * Find the templates/ root directory (relative to dist/ at runtime).
 */
function getTemplatesDir(): string {
    return path.join(__dirname, '..', '..', '..', 'templates');
}

async function readJson<T = unknown>(p: string): Promise<T | null> {
    if (!existsSync(p)) return null;
    try {
        return JSON.parse(await readFile(p, 'utf-8')) as T;
    } catch {
        return null;
    }
}

async function writeJson(p: string, data: unknown): Promise<void> {
    const dir = path.dirname(p);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Discover rule files that should be appended to the OpenCode `instructions`
 * array. These are lazy-loaded by OpenCode when the model is consulted.
 */
async function discoverInstructionPaths(projectRoot: string): Promise<string[]> {
    const instructions: string[] = [];

    for (const candidate of ['AGENTS.md', 'AGENTS.override.md', 'CLAUDE.md']) {
        if (existsSync(path.join(projectRoot, candidate))) {
            instructions.push(candidate);
        }
    }

    const specsDir = path.join(projectRoot, '.rulebook', 'specs');
    if (existsSync(specsDir)) {
        try {
            const files = await readdir(specsDir);
            for (const file of files.sort()) {
                if (file.endsWith('.md')) {
                    instructions.push(`.rulebook/specs/${file}`);
                }
            }
        } catch {
            // ignore
        }
    }

    return instructions;
}

/**
 * Build the rulebook MCP server entry for opencode.json. Mirrors `.mcp.json`
 * if it declares a `rulebook` server; otherwise falls back to the published
 * npm command. The fallback uses `npx -y @hivellm/rulebook-mcp` per the
 * proposal — if that package name has not been published yet, projects can
 * override the entry by editing opencode.json directly.
 */
async function buildMcpRulebookEntry(projectRoot: string): Promise<OpencodeMcpServer> {
    const mcpJsonPath = path.join(projectRoot, '.mcp.json');
    const existing = await readJson<{
        mcpServers?: Record<
            string,
            { command?: string; args?: string[]; env?: Record<string, string> }
        >;
    }>(mcpJsonPath);

    const declared = existing?.mcpServers?.rulebook;
    if (declared && declared.command) {
        const cmd: string[] = [declared.command, ...(declared.args ?? [])];
        const entry: OpencodeMcpServer = {
            type: 'local',
            command: cmd,
            enabled: true,
        };
        if (declared.env && Object.keys(declared.env).length > 0) {
            entry.environment = declared.env;
        }
        return entry;
    }

    // Fallback: published name is `@hivehub/rulebook` with `mcp-server` subcommand
    // (mirrors src/core/claude/claude-mcp.ts). The legacy `@hivellm/rulebook-mcp`
    // name in the original proposal is not published — using the real one.
    return {
        type: 'local',
        command: ['npx', '-y', '@hivehub/rulebook@latest', 'mcp-server'],
        enabled: true,
    };
}

/**
 * Generate or update opencode.json with $schema, mcp.rulebook, and
 * instructions. Preserves all unrelated user keys. Writes a sibling
 * .opencode/.rulebook-managed.json listing the managed keys so future runs
 * know what may be safely refreshed.
 */
export async function generateOpencodeConfig(
    projectRoot: string,
    _detection?: DetectionResult
): Promise<{ configPath: string; managedKeysPath: string }> {
    const jsoncPath = path.join(projectRoot, 'opencode.jsonc');
    const jsonPath = path.join(projectRoot, 'opencode.json');
    const configPath = existsSync(jsoncPath) ? jsoncPath : jsonPath;

    const existing = (await readJson<OpencodeConfig>(configPath)) ?? {};

    existing.$schema = SCHEMA_URL;

    const mcpEntry = await buildMcpRulebookEntry(projectRoot);
    existing.mcp = { ...(existing.mcp ?? {}) };
    existing.mcp[MANAGED_MCP_KEY] = mcpEntry;

    const newInstructions = await discoverInstructionPaths(projectRoot);
    const existingInstructions: string[] = Array.isArray(existing.instructions)
        ? (existing.instructions as string[])
        : [];
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const entry of [...existingInstructions, ...newInstructions]) {
        if (typeof entry !== 'string') continue;
        if (seen.has(entry)) continue;
        seen.add(entry);
        merged.push(entry);
    }
    existing.instructions = merged;

    await writeJson(configPath, existing);

    const managedKeys: ManagedKeysFile = {
        _rulebook_managed: true,
        version: 1,
        topLevel: [...MANAGED_TOP_LEVEL_KEYS],
        mcpServers: [MANAGED_MCP_KEY],
        instructions: newInstructions,
    };
    const managedKeysPath = path.join(projectRoot, '.opencode', MANAGED_KEYS_FILE);
    await writeJson(managedKeysPath, managedKeys);

    return { configPath, managedKeysPath };
}

/**
 * Write a markdown file idempotently: only overwrite when the existing file
 * already carries the rulebook marker.
 *
 * @returns 'written' | 'preserved'
 */
async function writeManagedMarkdown(
    destPath: string,
    body: string
): Promise<'written' | 'preserved'> {
    const content = body.includes(RULEBOOK_MARKER)
        ? body
        : `${RULEBOOK_MARKER}\n${body.trimEnd()}\n${RULEBOOK_END_MARKER}\n`;

    if (existsSync(destPath)) {
        const existing = await readFile(destPath, 'utf-8');
        if (!existing.includes(RULEBOOK_MARKER)) {
            return 'preserved';
        }
    }

    const parent = path.dirname(destPath);
    if (!existsSync(parent)) await mkdir(parent, { recursive: true });
    await writeFile(destPath, content, 'utf-8');
    return 'written';
}

/**
 * Parse YAML-ish frontmatter at the top of a markdown file. The parser is
 * deliberately minimal: it handles the simple `key: value` and `key: [a, b]`
 * forms used by Rulebook templates, not arbitrary YAML.
 */
function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
    // Normalize line endings so CRLF-formatted templates (Windows) parse
    // identically to LF.
    const norm = text.replace(/\r\n/g, '\n');
    if (!norm.startsWith('---\n')) {
        return { meta: {}, body: norm };
    }
    const end = norm.indexOf('\n---', 4);
    if (end < 0) {
        return { meta: {}, body: norm };
    }
    const block = norm.slice(4, end);
    const body = norm.slice(end + 4).replace(/^\n/, '');
    const meta: Record<string, string> = {};
    for (const rawLine of block.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf(':');
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        meta[key] = value;
    }
    return { meta, body };
}

/**
 * Serialize a small key/value object back into YAML frontmatter.
 */
function serializeFrontmatter(meta: Record<string, string | string[] | object>): string {
    const lines: string[] = ['---'];
    for (const [k, v] of Object.entries(meta)) {
        if (Array.isArray(v)) {
            lines.push(`${k}: [${v.map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(', ')}]`);
        } else if (typeof v === 'object' && v !== null) {
            lines.push(`${k}:`);
            for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
                lines.push(`  ${k2}: ${typeof v2 === 'string' ? `"${v2}"` : String(v2)}`);
            }
        } else if (typeof v === 'string' && (v.includes(':') || v.includes('#'))) {
            lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
        } else {
            lines.push(`${k}: ${v}`);
        }
    }
    lines.push('---');
    return lines.join('\n') + '\n';
}

/**
 * Generate .opencode/commands/<name>.md from each user-invocable Rulebook
 * slash-command template under templates/commands/.
 */
export async function generateOpencodeCommands(
    projectRoot: string
): Promise<{ written: string[]; preserved: string[] }> {
    const sourceDir = path.join(getTemplatesDir(), 'commands');
    const targetDir = path.join(projectRoot, '.opencode', 'commands');

    const written: string[] = [];
    const preserved: string[] = [];

    if (!existsSync(sourceDir)) {
        return { written, preserved };
    }

    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir);
    for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const sourcePath = path.join(sourceDir, entry);
        const targetPath = path.join(targetDir, entry);

        const raw = await readFile(sourcePath, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);

        const description = (meta.description || meta.id || entry.replace(/\.md$/, '')).slice(
            0,
            1024
        );

        const opencodeFm = serializeFrontmatter({
            description,
        });

        const newBody = `${opencodeFm}${RULEBOOK_MARKER}\n${body.trimEnd()}\n${RULEBOOK_END_MARKER}\n`;

        const result = await writeManagedMarkdown(targetPath, newBody);
        if (result === 'written') written.push(targetPath);
        else preserved.push(targetPath);
    }

    return { written, preserved };
}

/**
 * Translate a Rulebook role-agent definition to the OpenCode agent schema.
 */
function buildOpencodeAgentBody(meta: Record<string, string>, body: string, name: string): string {
    const description = (meta.description || `${name} role agent`).slice(0, 1024);
    const tier = (meta.model || 'sonnet').toLowerCase();
    const model = MODEL_TIER_MAP[tier] || MODEL_TIER_MAP.sonnet;
    const isReadOnly = READ_ONLY_AGENTS.has(name);
    const mode = name === 'team-lead' ? 'primary' : 'subagent';

    const fm = [
        '---',
        `description: "${description.replace(/"/g, '\\"')}"`,
        `mode: ${mode}`,
        `model: ${model}`,
        'permission:',
        `  edit: ${isReadOnly ? 'deny' : 'allow'}`,
        `  bash: ${isReadOnly ? 'ask' : 'allow'}`,
        '  webfetch: allow',
        '---',
        '',
    ].join('\n');

    return `${fm}${RULEBOOK_MARKER}\n${body.trimEnd()}\n${RULEBOOK_END_MARKER}\n`;
}

/**
 * Generate .opencode/agents/<role>.md from each Rulebook role agent.
 * Sources are templates/agents/<role>.md; we emit one OpenCode agent per
 * source role.
 */
export async function generateOpencodeAgents(
    projectRoot: string
): Promise<{ written: string[]; preserved: string[] }> {
    const sourceDir = path.join(getTemplatesDir(), 'agents');
    const targetDir = path.join(projectRoot, '.opencode', 'agents');

    const written: string[] = [];
    const preserved: string[] = [];

    if (!existsSync(sourceDir)) {
        return { written, preserved };
    }

    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir);
    for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const name = entry.replace(/\.md$/, '');
        const sourcePath = path.join(sourceDir, entry);
        const sourceStat = await stat(sourcePath);
        if (!sourceStat.isFile()) continue;

        const raw = await readFile(sourcePath, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);
        const newContent = buildOpencodeAgentBody(meta, body, name);

        const targetPath = path.join(targetDir, entry);
        const result = await writeManagedMarkdown(targetPath, newContent);
        if (result === 'written') written.push(targetPath);
        else preserved.push(targetPath);
    }

    return { written, preserved };
}

/**
 * Normalize a skill name to OpenCode's regex `[a-z0-9](-[a-z0-9])*` with a
 * 64-char limit. Sequences of non-alphanumerics collapse into single hyphens
 * and any leading/trailing hyphens are stripped.
 */
export function normalizeOpencodeSkillName(raw: string): string {
    const lower = raw.toLowerCase();
    const collapsed = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const truncated = collapsed.slice(0, 64).replace(/-+$/g, '');
    return truncated || 'skill';
}

/**
 * Bound description to OpenCode's [1, 1024]-char range.
 */
function clampDescription(raw: string, fallback: string): string {
    const text = (raw && raw.trim()) || fallback;
    if (text.length <= 1024) return text;
    return text.slice(0, 1021).trimEnd() + '...';
}

/**
 * Generate .opencode/skills/<normalized-name>/SKILL.md for every dev skill
 * under templates/skills/dev/. Throws on a name collision so two source
 * skills never silently overwrite each other.
 */
export async function generateOpencodeSkills(
    projectRoot: string
): Promise<{ written: string[]; preserved: string[]; orphaned: string[] }> {
    const sourceDir = path.join(getTemplatesDir(), 'skills', 'dev');
    const targetDir = path.join(projectRoot, '.opencode', 'skills');

    const written: string[] = [];
    const preserved: string[] = [];
    const orphaned: string[] = [];

    if (!existsSync(sourceDir)) {
        return { written, preserved, orphaned };
    }

    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir, { withFileTypes: true });
    const collisions = new Map<string, string[]>();
    const sourceNames = new Set<string>();

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillFile = path.join(sourceDir, entry.name, 'SKILL.md');
        if (!existsSync(skillFile)) continue;

        const raw = await readFile(skillFile, 'utf-8');
        const { meta, body } = parseFrontmatter(raw);

        const sourceName = meta.name || entry.name;
        const normalized = normalizeOpencodeSkillName(sourceName);
        if (!collisions.has(normalized)) collisions.set(normalized, []);
        collisions.get(normalized)!.push(entry.name);

        if (collisions.get(normalized)!.length > 1) {
            throw new Error(
                `OpenCode skill name collision: source skills [${collisions
                    .get(normalized)!
                    .join(', ')}] all normalize to "${normalized}"`
            );
        }
        sourceNames.add(normalized);

        const description = clampDescription(meta.description, `${normalized} skill`);
        const fm = serializeFrontmatter({ name: normalized, description });
        const newBody = `${fm}${RULEBOOK_MARKER}\n${body.trimEnd()}\n${RULEBOOK_END_MARKER}\n`;

        const targetPath = path.join(targetDir, normalized, 'SKILL.md');
        const result = await writeManagedMarkdown(targetPath, newBody);
        if (result === 'written') written.push(targetPath);
        else preserved.push(targetPath);
    }

    // Cleanup: remove managed skill dirs whose source no longer exists.
    if (existsSync(targetDir)) {
        const existing = await readdir(targetDir, { withFileTypes: true });
        for (const dirent of existing) {
            if (!dirent.isDirectory()) continue;
            if (sourceNames.has(dirent.name)) continue;
            const skillPath = path.join(targetDir, dirent.name, 'SKILL.md');
            if (!existsSync(skillPath)) continue;
            const content = await readFile(skillPath, 'utf-8');
            if (!content.includes(RULEBOOK_MARKER)) continue;
            await rm(path.join(targetDir, dirent.name), { recursive: true, force: true });
            orphaned.push(path.join(targetDir, dirent.name));
        }
    }

    return { written, preserved, orphaned };
}

/**
 * Run all four OpenCode generators in sequence and aggregate the results.
 * This is the entry point used by `init` and `update`.
 */
export async function generateOpencodeIntegration(
    projectRoot: string,
    detection?: DetectionResult
): Promise<OpencodeGenerationResult> {
    const result: OpencodeGenerationResult = {
        commands: [],
        agents: [],
        skills: [],
        preserved: [],
    };

    const cfg = await generateOpencodeConfig(projectRoot, detection);
    result.configPath = cfg.configPath;
    result.managedKeysPath = cfg.managedKeysPath;

    const cmds = await generateOpencodeCommands(projectRoot);
    result.commands = cmds.written;
    result.preserved.push(...cmds.preserved);

    const agents = await generateOpencodeAgents(projectRoot);
    result.agents = agents.written;
    result.preserved.push(...agents.preserved);

    const skills = await generateOpencodeSkills(projectRoot);
    result.skills = skills.written;
    result.preserved.push(...skills.preserved);

    return result;
}
