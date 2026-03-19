/**
 * Canonical Rule Engine — v5.0 One Source, Multiple Projections
 *
 * Rules live in `.rulebook/rules/` with YAML frontmatter. The engine reads
 * canonical rules and projects them to each detected AI tool's format:
 *
 * - Claude Code → `.claude/rules/<name>.md`
 * - Cursor → `.cursor/rules/<name>.mdc` (with YAML frontmatter)
 * - Gemini → sections in `GEMINI.md`
 * - Copilot → sections in `.github/copilot-instructions.md`
 * - Windsurf → `.windsurf/rules/<name>.md`
 * - Continue.dev → `.continue/rules/<name>.md`
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';

// ── Types ───────────────────────────────────────────────────────────────

export type RuleTier = 1 | 2 | 3;

export type ToolTarget =
  | 'all'
  | 'claude-code'
  | 'cursor'
  | 'gemini'
  | 'codex'
  | 'windsurf'
  | 'continue'
  | 'copilot';

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
  cursor: string[];
  gemini: string[];
  copilot: string[];
  windsurf: string[];
  continueDev: string[];
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
      filePatterns: Array.isArray(meta.filePatterns) ? (meta.filePatterns as string[]) : ['*'],
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
async function projectToClaudeCode(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
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

/**
 * Project rules to Cursor format: `.cursor/rules/<name>.mdc`
 * Cursor uses YAML frontmatter with `description`, `alwaysApply`, and `globs`.
 */
async function projectToCursor(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
  const targetRules = rules.filter((r) => shouldTarget(r, 'cursor'));
  if (targetRules.length === 0) return [];

  const dir = join(projectRoot, '.cursor', 'rules');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const written: string[] = [];
  for (const rule of targetRules) {
    const filePath = join(dir, `${rule.name}.mdc`);

    let frontmatter = `---\ndescription: "${rule.description}"\n`;
    if (rule.alwaysApply) {
      frontmatter += `alwaysApply: true\n`;
    } else if (rule.filePatterns.length > 0 && rule.filePatterns[0] !== '*') {
      const globs = JSON.stringify(rule.filePatterns);
      frontmatter += `globs: ${globs}\n`;
    }
    frontmatter += `---\n`;

    const content = `${frontmatter}\n${rule.body}\n`;
    await writeFile(filePath, content, 'utf-8');
    written.push(filePath);
  }
  return written;
}

/**
 * Project rules to Gemini format: sections in `GEMINI.md`.
 * Groups rules by tier with appropriate headings.
 */
async function projectToGemini(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
  const targetRules = rules.filter((r) => shouldTarget(r, 'gemini'));
  if (targetRules.length === 0) return [];

  const filePath = join(projectRoot, 'GEMINI.md');

  const tierHeadings: Record<number, string> = {
    1: '## Highest Precedence Rules (Tier 1)',
    2: '## Mandatory Workflow Rules (Tier 2)',
    3: '## Standards (Tier 3)',
  };

  const sections: string[] = [
    '<!-- RULEBOOK:START -->',
    '# Project Rules for Gemini',
    '',
    'Generated by @hivehub/rulebook. Do not edit manually.',
    '',
  ];

  for (const tier of [1, 2, 3] as RuleTier[]) {
    const tierRules = targetRules.filter((r) => r.tier === tier);
    if (tierRules.length === 0) continue;

    sections.push(tierHeadings[tier]);
    sections.push('');
    for (const rule of tierRules) {
      sections.push(`### ${rule.description || rule.name}`);
      sections.push('');
      sections.push(rule.body);
      sections.push('');
    }
  }

  sections.push('<!-- RULEBOOK:END -->');
  sections.push('');

  // Preserve user content outside RULEBOOK markers
  if (existsSync(filePath)) {
    const existing = await readFile(filePath, 'utf-8');
    if (existing.includes('<!-- RULEBOOK:START -->')) {
      const before = existing.split('<!-- RULEBOOK:START -->')[0];
      const afterParts = existing.split('<!-- RULEBOOK:END -->');
      const after = afterParts.length > 1 ? afterParts[afterParts.length - 1] : '';
      await writeFile(filePath, before + sections.join('\n') + after, 'utf-8');
    } else if (!existing.includes('<!-- RULEBOOK:START -->')) {
      // User-owned file without markers — skip
      return [];
    }
  } else {
    await writeFile(filePath, sections.join('\n'), 'utf-8');
  }

  return [filePath];
}

/**
 * Project rules to Copilot format: sections in `.github/copilot-instructions.md`.
 */
async function projectToCopilot(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
  const targetRules = rules.filter((r) => shouldTarget(r, 'copilot'));
  if (targetRules.length === 0) return [];

  const dir = join(projectRoot, '.github');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  const filePath = join(dir, 'copilot-instructions.md');

  const sections: string[] = [
    '<!-- RULEBOOK:START -->',
    '# Project Rules for GitHub Copilot',
    '',
    'Generated by @hivehub/rulebook. Do not edit between RULEBOOK markers.',
    '',
  ];

  for (const rule of targetRules) {
    sections.push(`## ${rule.description || rule.name}`);
    sections.push('');
    sections.push(rule.body);
    sections.push('');
  }

  sections.push('<!-- RULEBOOK:END -->');
  sections.push('');

  // Preserve user content outside markers
  if (existsSync(filePath)) {
    const existing = await readFile(filePath, 'utf-8');
    if (existing.includes('<!-- RULEBOOK:START -->')) {
      const before = existing.split('<!-- RULEBOOK:START -->')[0];
      const afterParts = existing.split('<!-- RULEBOOK:END -->');
      const after = afterParts.length > 1 ? afterParts[afterParts.length - 1] : '';
      await writeFile(filePath, before + sections.join('\n') + after, 'utf-8');
    } else {
      return []; // User-owned file
    }
  } else {
    await writeFile(filePath, sections.join('\n'), 'utf-8');
  }

  return [filePath];
}

/**
 * Project rules to Windsurf format: `.windsurf/rules/<name>.md`
 */
async function projectToWindsurf(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
  const targetRules = rules.filter((r) => shouldTarget(r, 'windsurf'));
  if (targetRules.length === 0) return [];

  const dir = join(projectRoot, '.windsurf', 'rules');
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

/**
 * Project rules to Continue.dev format: `.continue/rules/<name>.md`
 */
async function projectToContinueDev(
  projectRoot: string,
  rules: CanonicalRule[]
): Promise<string[]> {
  const targetRules = rules.filter((r) => shouldTarget(r, 'continue'));
  if (targetRules.length === 0) return [];

  const dir = join(projectRoot, '.continue', 'rules');
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
  cursor?: boolean;
  gemini?: boolean;
  codex?: boolean;
  windsurf?: boolean;
  continueDev?: boolean;
  copilot?: boolean;
}

/**
 * Project all canonical rules to all detected tools.
 * One source (`.rulebook/rules/`), multiple projections.
 */
export async function projectRules(
  projectRoot: string,
  detectedTools: DetectedTools
): Promise<RuleProjectionResult> {
  const rules = await loadCanonicalRules(projectRoot);
  if (rules.length === 0) {
    return {
      claudeCode: [],
      cursor: [],
      gemini: [],
      copilot: [],
      windsurf: [],
      continueDev: [],
    };
  }

  const result: RuleProjectionResult = {
    claudeCode: detectedTools.claudeCode ? await projectToClaudeCode(projectRoot, rules) : [],
    cursor: detectedTools.cursor ? await projectToCursor(projectRoot, rules) : [],
    gemini: detectedTools.gemini ? await projectToGemini(projectRoot, rules) : [],
    copilot: detectedTools.copilot ? await projectToCopilot(projectRoot, rules) : [],
    windsurf: detectedTools.windsurf ? await projectToWindsurf(projectRoot, rules) : [],
    continueDev: detectedTools.continueDev
      ? await projectToContinueDev(projectRoot, rules)
      : [],
  };

  return result;
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
