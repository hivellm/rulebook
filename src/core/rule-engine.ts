/**
 * Canonical Rule Engine — One Source, Claude Code Projection
 *
 * Rules live in `.rulebook/rules/` with YAML frontmatter. The engine reads
 * canonical rules and projects them to Claude Code's format:
 *
 * - Claude Code → `.claude/rules/<name>.md`
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';

// ── Types ───────────────────────────────────────────────────────────────

export type RuleTier = 1 | 2 | 3;

export type ToolTarget = 'all' | 'claude-code';

export interface CanonicalRule {
    name: string;
    tier: RuleTier;
    description: string;
    alwaysApply: boolean;
    filePatterns: string[];
    tools: ToolTarget[];
    body: string; // markdown content after frontmatter
}

export interface RuleProjectionResult {
    claudeCode: string[];
}

// ── Frontmatter Parser ──────────────────────────────────────────────────

/**
 * Parse YAML-like frontmatter from a markdown file.
 * Handles simple key: value, key: [array], and key: true/false.
 * Does NOT require a full YAML parser dependency.
 */
function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!fmMatch) {
        return { meta: {}, body: content };
    }

    const meta: Record<string, unknown> = {};
    const fmLines = fmMatch[1].split(/\r?\n/);

    for (const line of fmLines) {
        const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
        if (!kv) continue;
        const key = kv[1];
        let val: unknown = kv[2].trim();

        // Parse arrays: ["a", "b"] or [a, b]
        if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
            val = val
                .slice(1, -1)
                .split(',')
                .map((s) => s.trim().replace(/^["']|["']$/g, ''))
                .filter(Boolean);
        }
        // Parse booleans
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        // Parse numbers
        else if (typeof val === 'string' && /^\d+$/.test(val)) val = parseInt(val, 10);
        // Strip quotes
        else if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');

        meta[key] = val;
    }

    return { meta, body: fmMatch[2] };
}

// ── Rule Loading ────────────────────────────────────────────────────────

/**
 * Load all canonical rules from `.rulebook/rules/` directory.
 */
export async function loadCanonicalRules(projectRoot: string): Promise<CanonicalRule[]> {
    const rulesDir = join(projectRoot, '.rulebook', 'rules');
    if (!existsSync(rulesDir)) return [];

    const files = await readdir(rulesDir);
    const rules: CanonicalRule[] = [];

    for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const content = await readFile(join(rulesDir, file), 'utf-8');
        const { meta, body } = parseFrontmatter(content);

        rules.push({
            name: (meta.name as string) || basename(file, '.md'),
            tier: (meta.tier as RuleTier) || 2,
            description: (meta.description as string) || '',
            alwaysApply: meta.alwaysApply === true,
            filePatterns: Array.isArray(meta.filePatterns)
                ? (meta.filePatterns as string[])
                : ['*'],
            tools: Array.isArray(meta.tools) ? (meta.tools as ToolTarget[]) : ['all'],
            body: body.trim(),
        });
    }

    // Sort by tier (1 first) then name
    rules.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    return rules;
}

// ── Rule Projection ─────────────────────────────────────────────────────

function shouldTarget(rule: CanonicalRule, tool: ToolTarget): boolean {
    return rule.tools.includes('all') || rule.tools.includes(tool);
}

/**
 * Project rules to Claude Code format: `.claude/rules/<name>.md`
 * Claude Code rules are plain markdown — no special frontmatter.
 */
async function projectToClaudeCode(projectRoot: string, rules: CanonicalRule[]): Promise<string[]> {
    const targetRules = rules.filter((r) => shouldTarget(r, 'claude-code'));
    if (targetRules.length === 0) return [];

    const dir = join(projectRoot, '.claude', 'rules');
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    const written: string[] = [];
    for (const rule of targetRules) {
        const filePath = join(dir, `${rule.name}.md`);
        const content = `# ${rule.description || rule.name}\n\n${rule.body}\n`;
        await writeFile(filePath, content, 'utf-8');
        written.push(filePath);
    }
    return written;
}

// ── Main API ────────────────────────────────────────────────────────────

export interface DetectedTools {
    claudeCode?: boolean;
}

/**
 * Project all canonical rules to Claude Code (`.claude/rules/`).
 * One source (`.rulebook/rules/`), one projection.
 */
export async function projectRules(
    projectRoot: string,
    detectedTools: DetectedTools
): Promise<RuleProjectionResult> {
    const rules = await loadCanonicalRules(projectRoot);
    if (rules.length === 0) {
        return { claudeCode: [] };
    }

    return {
        claudeCode: detectedTools.claudeCode ? await projectToClaudeCode(projectRoot, rules) : [],
    };
}

/**
 * List all canonical rules with their metadata (for CLI/MCP).
 */
export async function listRules(
    projectRoot: string
): Promise<Array<{ name: string; tier: RuleTier; description: string; tools: ToolTarget[] }>> {
    const rules = await loadCanonicalRules(projectRoot);
    return rules.map((r) => ({
        name: r.name,
        tier: r.tier,
        description: r.description,
        tools: r.tools,
    }));
}

/**
 * Install a rule from the built-in template library into `.rulebook/rules/`.
 */
export async function installRule(
    projectRoot: string,
    templateName: string,
    templatesDir: string
): Promise<string | null> {
    const templatePath = join(templatesDir, 'rules', `${templateName}.md`);
    if (!existsSync(templatePath)) return null;

    const rulesDir = join(projectRoot, '.rulebook', 'rules');
    if (!existsSync(rulesDir)) await mkdir(rulesDir, { recursive: true });

    const destPath = join(rulesDir, `${templateName}.md`);
    const content = await readFile(templatePath, 'utf-8');
    await writeFile(destPath, content, 'utf-8');
    return destPath;
}
