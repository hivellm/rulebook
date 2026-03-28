/**
 * Agent Template Engine — v5.0 Adaptive Agent Framework
 *
 * Loads agent templates by project type and generates tool-specific
 * agent definitions with graceful degradation:
 *
 * - Claude Code → full .claude/agents/*.md with memory directories
 * - Cursor → contextual .cursor/rules/*.mdc activated by file globs
 * - Gemini/Codex → inline conditional sections in directives file
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Types ───────────────────────────────────────────────────────────────

export type ProjectType = 'game-engine' | 'compiler' | 'web-app' | 'mobile' | 'generic';
export type ModelTier = 'core' | 'standard' | 'research';

export interface AgentTemplate {
  name: string;
  domain: string;
  filePatterns: string[];
  tier: ModelTier;
  model: string;
  description: string;
  checklist: string[];
  body: string;
}

export interface AgentGenerationResult {
  claudeCode: string[];
  cursor: string[];
  inline: string[]; // Gemini/Codex — inline sections generated
}

// ── Frontmatter Parser (reuse pattern from rule-engine) ─────────────────

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return { meta: {}, body: content };

  const meta: Record<string, unknown> = {};
  const fmLines = fmMatch[1].split(/\r?\n/);

  let currentKey = '';
  let currentList: string[] | null = null;

  for (const line of fmLines) {
    // Check for YAML list item (continuation of previous key)
    const listItem = line.match(/^\s+-\s+"?([^"]*)"?\s*$/);
    if (listItem && currentKey && currentList !== null) {
      currentList.push(listItem[1]);
      meta[currentKey] = currentList;
      continue;
    }

    // Flush any pending list
    currentList = null;

    const kv = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val: unknown = kv[2].trim();

    // Empty value after colon = start of YAML list on next lines
    if (val === '' || val === undefined) {
      currentKey = key;
      currentList = [];
      meta[key] = currentList;
      continue;
    }

    // Inline array: ["a", "b"]
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (typeof val === 'string') val = val.replace(/^["']|["']$/g, '');

    meta[key] = val;
    currentKey = key;
  }

  return { meta, body: fmMatch[2] };
}

// ── Template Loading ────────────────────────────────────────────────────

function getAgentTemplatesDir(): string {
  return join(__dirname, '..', '..', 'templates', 'agents');
}

/**
 * Load agent templates for a given project type.
 * Always includes 'generic' templates + project-type-specific templates.
 */
export async function loadAgentTemplates(projectType: ProjectType): Promise<AgentTemplate[]> {
  const baseDir = getAgentTemplatesDir();
  const templates: AgentTemplate[] = [];

  // Load generic agents (always included)
  await loadFromDir(join(baseDir, 'generic'), templates);

  // Load project-type-specific agents
  if (projectType !== 'generic') {
    const typeDir = join(baseDir, projectType);
    if (existsSync(typeDir)) {
      await loadFromDir(typeDir, templates);
    }
  }

  return templates;
}

async function loadFromDir(dir: string, templates: AgentTemplate[]): Promise<void> {
  if (!existsSync(dir)) return;

  const files = await readdir(dir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const content = await readFile(join(dir, file), 'utf-8');
    const { meta, body } = parseFrontmatter(content);

    templates.push({
      name: (meta.name as string) || basename(file, '.md'),
      domain: (meta.domain as string) || 'general',
      filePatterns: Array.isArray(meta.filePatterns) ? (meta.filePatterns as string[]) : ['*'],
      tier: (meta.tier as ModelTier) || 'standard',
      model: (meta.model as string) || 'sonnet',
      description: (meta.description as string) || '',
      checklist: Array.isArray(meta.checklist) ? (meta.checklist as string[]) : [],
      body: body.trim(),
    });
  }
}

// ── Mandatory Sections ──────────────────────────────────────────────────

const MANDATORY_FOOTER = `
## Mandatory Rules (Injected by Rulebook)

### No Shortcuts — Quality Over Speed
NEVER simplify logic, add TODO/FIXME/HACK, create stubs, use placeholders, reduce scope,
skip edge cases, or deliver partial implementations. Quality is everything.

### Incremental Implementation — Step by Step
NEVER implement everything at once. Decompose into small steps, implement ONE step, test/verify
immediately, fix errors before proceeding. If stuck after 3 failed attempts on the same error:
STOP, record the failure as anti-pattern, remove broken code, restart from scratch with a
different approach. The line between persistence and stubbornness is thin.

### Knowledge Base — Check Before, Record After
BEFORE implementing: check \`.rulebook/knowledge/\` for existing patterns and anti-patterns.
AFTER implementing: record what worked (pattern) and what failed (anti-pattern).
After debugging: capture learnings with \`rulebook learn capture\`.
The knowledge base exists so you don't repeat mistakes across sessions.

### Update tasks.md After Every Completion
After completing ANY task, update the corresponding \`.rulebook/tasks/*/tasks.md\` file.
Change \`- [ ]\` to \`- [x]\` with a brief description. Do this BEFORE reporting completion.

### Never Mark Tasks as Deferred
If a task is in tasks.md, implement it. If it has a dependency, implement the dependency first.

### Research Before Implementing
NEVER guess. State what you know, what you don't know, research the unknown, then implement.
`;

// ── Claude Code Agent Generation ────────────────────────────────────────

/**
 * Generate full Claude Code agent definitions with memory directories.
 */
async function generateClaudeCodeAgents(
  projectRoot: string,
  templates: AgentTemplate[]
): Promise<string[]> {
  const agentsDir = join(projectRoot, '.claude', 'agents');
  if (!existsSync(agentsDir)) await mkdir(agentsDir, { recursive: true });

  const written: string[] = [];

  for (const tmpl of templates) {
    const filePath = join(agentsDir, `${tmpl.name}.md`);

    // Build Claude Code agent definition with frontmatter
    let content = `---\n`;
    content += `name: ${tmpl.name}\n`;
    content += `description: "${tmpl.description}"\n`;
    content += `model: ${tmpl.model}\n`;
    content += `---\n\n`;
    content += tmpl.body;

    // Append pre-flight checklist if present
    if (tmpl.checklist.length > 0) {
      content += `\n\n## Pre-Flight Checklist (MANDATORY)\n\n`;
      content += `Before returning code, answer ALL of these:\n\n`;
      for (const q of tmpl.checklist) {
        content += `- ${q}\n`;
      }
    }

    // Append mandatory rules
    content += MANDATORY_FOOTER;

    // Append memory instructions
    content += `\n## Agent Memory\n\n`;
    content += `You have a persistent memory directory at \`${projectRoot}/.claude/agent-memory/${tmpl.name}/\`.\n`;
    content += `Record stable patterns, key decisions, and solutions to recurring problems.\n`;

    await writeFile(filePath, content, 'utf-8');
    written.push(filePath);

    // Create memory directory
    const memDir = join(projectRoot, '.claude', 'agent-memory', tmpl.name);
    if (!existsSync(memDir)) {
      await mkdir(memDir, { recursive: true });
      // Create empty MEMORY.md index
      const memoryMd = join(memDir, 'MEMORY.md');
      if (!existsSync(memoryMd)) {
        await writeFile(memoryMd, `# ${tmpl.name} Memory\n\nNo entries yet.\n`, 'utf-8');
      }
    }
  }

  return written;
}

// ── Cursor Graceful Degradation ─────────────────────────────────────────

/**
 * Generate Cursor contextual rules that simulate agent specialization.
 * Each agent becomes a .mdc rule activated by file glob patterns.
 */
async function generateCursorAgentRules(
  projectRoot: string,
  templates: AgentTemplate[]
): Promise<string[]> {
  const rulesDir = join(projectRoot, '.cursor', 'rules');
  if (!existsSync(rulesDir)) await mkdir(rulesDir, { recursive: true });

  const written: string[] = [];

  for (const tmpl of templates) {
    // Skip generic agents that don't have meaningful file patterns
    if (
      tmpl.filePatterns.length === 1 &&
      tmpl.filePatterns[0] === '*' &&
      tmpl.domain === 'research'
    ) {
      continue;
    }

    const filePath = join(rulesDir, `agent-${tmpl.name}.mdc`);

    let frontmatter = `---\n`;
    frontmatter += `description: "${tmpl.description}"\n`;

    if (tmpl.filePatterns.length === 1 && tmpl.filePatterns[0] === '*') {
      frontmatter += `alwaysApply: true\n`;
    } else {
      frontmatter += `globs: ${JSON.stringify(tmpl.filePatterns)}\n`;
    }
    frontmatter += `---\n\n`;

    let content = frontmatter;
    content += tmpl.body;

    if (tmpl.checklist.length > 0) {
      content += `\n\n## Pre-Flight Checklist\n\n`;
      for (const q of tmpl.checklist) {
        content += `- ${q}\n`;
      }
    }

    // Add condensed mandatory rules (Cursor has smaller context)
    content += `\n\n## Rules\n`;
    content += `- No stubs, TODOs, placeholders, or approximations\n`;
    content += `- Update tasks.md after completion\n`;
    content += `- Research before implementing — never guess\n`;

    await writeFile(filePath, content, 'utf-8');
    written.push(filePath);
  }

  return written;
}

// ── Inline Sections (Gemini/Codex) ──────────────────────────────────────

/**
 * Generate inline conditional sections for tools without agent support.
 * Returns an array of markdown sections to be embedded in the directives file.
 */
function generateInlineSections(templates: AgentTemplate[]): string[] {
  const sections: string[] = [];

  for (const tmpl of templates) {
    if (tmpl.filePatterns.length === 1 && tmpl.filePatterns[0] === '*') continue;

    const patterns = tmpl.filePatterns.join(', ');
    sections.push(`### When Editing ${patterns}\n`);
    sections.push(`**Role**: ${tmpl.description}\n`);
    sections.push(tmpl.body);

    if (tmpl.checklist.length > 0) {
      sections.push(`\n**Checklist before returning code:**`);
      for (const q of tmpl.checklist) {
        sections.push(`- ${q}`);
      }
    }
    sections.push('');
  }

  return sections;
}

// ── Main API ────────────────────────────────────────────────────────────

export interface DetectedTools {
  claudeCode?: boolean;
  cursor?: boolean;
  gemini?: boolean;
  codex?: boolean;
}

/**
 * Generate agent definitions for all detected tools.
 * Claude Code gets full agents. Cursor gets contextual rules. Others get inline sections.
 */
export async function generateAgents(
  projectRoot: string,
  projectType: ProjectType,
  detectedTools: DetectedTools
): Promise<AgentGenerationResult> {
  const templates = await loadAgentTemplates(projectType);

  const result: AgentGenerationResult = {
    claudeCode: [],
    cursor: [],
    inline: [],
  };

  if (detectedTools.claudeCode) {
    result.claudeCode = await generateClaudeCodeAgents(projectRoot, templates);
  }

  if (detectedTools.cursor) {
    result.cursor = await generateCursorAgentRules(projectRoot, templates);
  }

  if (detectedTools.gemini || detectedTools.codex) {
    result.inline = generateInlineSections(templates);
  }

  return result;
}

/**
 * List available project types and their agent counts.
 */
export async function listProjectTypes(): Promise<
  Array<{ type: ProjectType; agentCount: number }>
> {
  const types: ProjectType[] = ['game-engine', 'compiler', 'web-app', 'mobile', 'generic'];
  const result: Array<{ type: ProjectType; agentCount: number }> = [];

  for (const type of types) {
    const templates = await loadAgentTemplates(type);
    result.push({ type, agentCount: templates.length });
  }

  return result;
}
