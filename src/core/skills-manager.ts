/**
 * Skills Manager Module
 *
 * Handles discovery, loading, merging, and management of skills for Rulebook v2.0.
 * Skills are self-contained capability modules with SKILL.md files containing
 * YAML frontmatter (metadata) and guidance content.
 *
 * Compatible with:
 * - Hugging Face Skills format
 * - Claude Code plugin system
 * - Codex AGENTS.md format
 * - Gemini CLI extensions
 */

import { readdir } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileExists, readFile, writeFile } from '../utils/file-system.js';
import type {
  Skill,
  SkillMetadata,
  SkillCategory,
  SkillsIndex,
  SkillValidationResult,
  RulebookConfig,
} from '../types.js';

// Default skills directory relative to templates
const DEFAULT_SKILLS_DIR = 'skills';
const SKILL_FILE_NAME = 'SKILL.md';
const LEGACY_TEMPLATE_EXTENSIONS = ['.md'];

// Category mappings from legacy template structure
const CATEGORY_MAPPINGS: Record<string, SkillCategory> = {
  languages: 'languages',
  frameworks: 'frameworks',
  modules: 'modules',
  services: 'services',
  workflows: 'workflows',
  ides: 'ides',
  core: 'core',
  cli: 'cli',
  git: 'git',
  hooks: 'hooks',
};

/**
 * Parse YAML frontmatter from SKILL.md content
 */
export function parseSkillFrontmatter(content: string): {
  metadata: SkillMetadata;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    // No frontmatter, treat entire content as body
    return {
      metadata: {
        name: 'Unknown',
        description: 'No description provided',
      },
      body: content,
    };
  }

  const [, yamlContent, body] = match;
  const metadata = parseYamlMetadata(yamlContent);

  return { metadata, body };
}

/**
 * Parse simple YAML metadata (key: value format)
 */
function parseYamlMetadata(yaml: string): SkillMetadata {
  const lines = yaml.split('\n');
  const metadata: Record<string, unknown> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle arrays (simple format: [item1, item2])
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    }
    // Handle quoted strings
    else if (typeof value === 'string' && /^['"].*['"]$/.test(value)) {
      value = value.slice(1, -1);
    }

    if (key && value !== '') {
      metadata[key] = value;
    }
  }

  return {
    name: (metadata.name as string) || 'Unknown',
    description: (metadata.description as string) || 'No description provided',
    version: metadata.version as string | undefined,
    category: metadata.category as SkillCategory | undefined,
    author: metadata.author as string | undefined,
    tags: metadata.tags as string[] | undefined,
    dependencies: metadata.dependencies as string[] | undefined,
    conflicts: metadata.conflicts as string[] | undefined,
  };
}

/**
 * Generate YAML frontmatter from metadata
 */
export function generateSkillFrontmatter(metadata: SkillMetadata): string {
  const lines: string[] = ['---'];

  lines.push(`name: "${metadata.name}"`);
  lines.push(`description: "${metadata.description}"`);

  if (metadata.version) {
    lines.push(`version: "${metadata.version}"`);
  }
  if (metadata.category) {
    lines.push(`category: "${metadata.category}"`);
  }
  if (metadata.author) {
    lines.push(`author: "${metadata.author}"`);
  }
  if (metadata.tags && metadata.tags.length > 0) {
    lines.push(`tags: [${metadata.tags.map((t) => `"${t}"`).join(', ')}]`);
  }
  if (metadata.dependencies && metadata.dependencies.length > 0) {
    lines.push(`dependencies: [${metadata.dependencies.map((d) => `"${d}"`).join(', ')}]`);
  }
  if (metadata.conflicts && metadata.conflicts.length > 0) {
    lines.push(`conflicts: [${metadata.conflicts.map((c) => `"${c}"`).join(', ')}]`);
  }

  lines.push('---');

  return lines.join('\n');
}

/**
 * Convert legacy template to skill format
 */
export function convertLegacyTemplateToSkill(
  templateContent: string,
  templateName: string,
  category: SkillCategory
): { metadata: SkillMetadata; content: string } {
  // Extract name from filename (e.g., TYPESCRIPT.md -> TypeScript)
  const name = templateName
    .replace(/\.md$/i, '')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Try to extract description from first paragraph
  const lines = templateContent.split('\n');
  let description = `${name} skill for Rulebook`;

  // Look for first non-empty, non-header line
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('<!--')) {
      description = trimmed.slice(0, 150);
      break;
    }
  }

  const metadata: SkillMetadata = {
    name,
    description,
    version: '1.0.0',
    category,
    tags: [category],
  };

  return { metadata, content: templateContent };
}

/**
 * Skills Manager Class
 */
export class SkillsManager {
  private templatesPath: string;
  private skillsPath: string;
  private skillsIndex: SkillsIndex | null = null;

  constructor(templatesPath: string, _projectPath: string = process.cwd()) {
    this.templatesPath = templatesPath;
    this.skillsPath = join(templatesPath, DEFAULT_SKILLS_DIR);
    // _projectPath reserved for future custom skills path support
  }

  /**
   * Discover all available skills from templates directory
   */
  async discoverSkills(): Promise<SkillsIndex> {
    const skills: Skill[] = [];
    const categories: Record<SkillCategory, Skill[]> = {
      languages: [],
      frameworks: [],
      modules: [],
      services: [],
      workflows: [],
      ides: [],
      core: [],
      cli: [],
      git: [],
      hooks: [],
    };

    // First, check if new skills directory exists
    if (await fileExists(this.skillsPath)) {
      await this.scanSkillsDirectory(this.skillsPath, skills, categories);
    }

    // Also scan legacy template directories for backward compatibility
    await this.scanLegacyTemplates(skills, categories);

    this.skillsIndex = {
      skills,
      categories,
      lastUpdated: new Date().toISOString(),
    };

    return this.skillsIndex;
  }

  /**
   * Scan skills directory for SKILL.md files
   */
  private async scanSkillsDirectory(
    dir: string,
    skills: Skill[],
    categories: Record<SkillCategory, Skill[]>
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Check if this directory contains SKILL.md
          const skillFilePath = join(entryPath, SKILL_FILE_NAME);
          if (await fileExists(skillFilePath)) {
            const skill = await this.loadSkillFromFile(skillFilePath, entry.name);
            if (skill) {
              skills.push(skill);
              categories[skill.category].push(skill);
            }
          } else {
            // Recurse into subdirectories
            await this.scanSkillsDirectory(entryPath, skills, categories);
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Scan legacy template directories
   */
  private async scanLegacyTemplates(
    skills: Skill[],
    categories: Record<SkillCategory, Skill[]>
  ): Promise<void> {
    for (const [dirName, category] of Object.entries(CATEGORY_MAPPINGS)) {
      const dirPath = join(this.templatesPath, dirName);

      if (!(await fileExists(dirPath))) continue;

      try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isFile()) continue;

          const ext = entry.name.slice(entry.name.lastIndexOf('.'));
          if (!LEGACY_TEMPLATE_EXTENSIONS.includes(ext.toLowerCase())) continue;

          // Skip if already loaded as skill
          const skillId = this.generateSkillId(entry.name, category);
          if (skills.some((s) => s.id === skillId)) continue;

          const filePath = join(dirPath, entry.name);
          const skill = await this.loadLegacyTemplate(filePath, entry.name, category);

          if (skill) {
            skills.push(skill);
            categories[category].push(skill);
          }
        }
      } catch {
        // Directory can't be read
      }
    }
  }

  /**
   * Load skill from SKILL.md file
   */
  private async loadSkillFromFile(filePath: string, dirName: string): Promise<Skill | null> {
    try {
      const content = await readFile(filePath);
      const { metadata, body } = parseSkillFrontmatter(content);

      // Determine category from directory structure
      const relPath = relative(this.skillsPath, dirname(filePath));
      const pathParts = relPath.split(/[/\\]/);
      const category = (CATEGORY_MAPPINGS[pathParts[0]] || metadata.category || 'core') as SkillCategory;

      const skillId = this.generateSkillId(metadata.name || dirName, category);

      return {
        id: skillId,
        path: filePath,
        metadata,
        content: body,
        category,
        enabled: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Load legacy template as skill
   */
  private async loadLegacyTemplate(
    filePath: string,
    fileName: string,
    category: SkillCategory
  ): Promise<Skill | null> {
    try {
      const content = await readFile(filePath);
      const { metadata, content: skillContent } = convertLegacyTemplateToSkill(
        content,
        fileName,
        category
      );

      const skillId = this.generateSkillId(fileName.replace(/\.md$/i, ''), category);

      return {
        id: skillId,
        path: filePath,
        metadata,
        content: skillContent,
        category,
        enabled: false,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate unique skill ID
   */
  private generateSkillId(name: string, category: SkillCategory): string {
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${category}/${cleanName}`;
  }

  /**
   * Get all available skills
   */
  async getSkills(): Promise<Skill[]> {
    if (!this.skillsIndex) {
      await this.discoverSkills();
    }
    return this.skillsIndex!.skills;
  }

  /**
   * Get skills by category
   */
  async getSkillsByCategory(category: SkillCategory): Promise<Skill[]> {
    if (!this.skillsIndex) {
      await this.discoverSkills();
    }
    return this.skillsIndex!.categories[category] || [];
  }

  /**
   * Get skill by ID
   */
  async getSkillById(id: string): Promise<Skill | null> {
    const skills = await this.getSkills();
    return skills.find((s) => s.id === id) || null;
  }

  /**
   * Search skills by name or description
   */
  async searchSkills(query: string): Promise<Skill[]> {
    const skills = await this.getSkills();
    const lowerQuery = query.toLowerCase();

    return skills.filter(
      (s) =>
        s.id.toLowerCase().includes(lowerQuery) ||
        s.metadata.name.toLowerCase().includes(lowerQuery) ||
        s.metadata.description.toLowerCase().includes(lowerQuery) ||
        (s.metadata.tags || []).some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Enable a skill in the configuration
   */
  async enableSkill(skillId: string, config: RulebookConfig): Promise<RulebookConfig> {
    const skill = await this.getSkillById(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Initialize skills config if not present
    if (!config.skills) {
      config.skills = {
        enabled: [],
        disabled: [],
        order: [],
        autoDetect: true,
      };
    }

    // Initialize optional arrays if not present
    if (!config.skills.disabled) {
      config.skills.disabled = [];
    }
    if (!config.skills.order) {
      config.skills.order = [];
    }

    // Remove from disabled if present
    config.skills.disabled = config.skills.disabled.filter((id) => id !== skillId);

    // Add to enabled if not present
    if (!config.skills.enabled.includes(skillId)) {
      config.skills.enabled.push(skillId);
    }

    // Add to order if not present
    if (!config.skills.order.includes(skillId)) {
      config.skills.order.push(skillId);
    }

    return config;
  }

  /**
   * Disable a skill in the configuration
   */
  async disableSkill(skillId: string, config: RulebookConfig): Promise<RulebookConfig> {
    const skill = await this.getSkillById(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Initialize skills config if not present
    if (!config.skills) {
      config.skills = {
        enabled: [],
        disabled: [],
        order: [],
        autoDetect: true,
      };
    }

    // Initialize optional arrays if not present
    if (!config.skills.disabled) {
      config.skills.disabled = [];
    }
    if (!config.skills.order) {
      config.skills.order = [];
    }

    // Remove from enabled if present
    config.skills.enabled = config.skills.enabled.filter((id) => id !== skillId);

    // Add to disabled if not present
    if (!config.skills.disabled.includes(skillId)) {
      config.skills.disabled.push(skillId);
    }

    // Remove from order
    config.skills.order = config.skills.order.filter((id) => id !== skillId);

    return config;
  }

  /**
   * Validate skills configuration
   */
  async validateSkills(config: RulebookConfig): Promise<SkillValidationResult> {
    const result: SkillValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      conflicts: [],
    };

    if (!config.skills) {
      return result;
    }

    const enabledSkills: Skill[] = [];

    // Check that all enabled skills exist
    for (const skillId of config.skills.enabled) {
      const skill = await this.getSkillById(skillId);
      if (!skill) {
        result.errors.push(`Enabled skill not found: ${skillId}`);
        result.valid = false;
      } else {
        enabledSkills.push(skill);
      }
    }

    // Check for conflicts
    for (let i = 0; i < enabledSkills.length; i++) {
      const skillA = enabledSkills[i];
      const conflictsA = skillA.metadata.conflicts || [];

      for (let j = i + 1; j < enabledSkills.length; j++) {
        const skillB = enabledSkills[j];

        // Check if A conflicts with B
        if (conflictsA.includes(skillB.id) || conflictsA.includes(skillB.metadata.name)) {
          result.conflicts.push({
            skillA: skillA.id,
            skillB: skillB.id,
            reason: `${skillA.metadata.name} conflicts with ${skillB.metadata.name}`,
          });
          result.warnings.push(
            `Conflict detected: ${skillA.metadata.name} and ${skillB.metadata.name}`
          );
        }

        // Check if B conflicts with A
        const conflictsB = skillB.metadata.conflicts || [];
        if (conflictsB.includes(skillA.id) || conflictsB.includes(skillA.metadata.name)) {
          if (!result.conflicts.some((c) => c.skillA === skillA.id && c.skillB === skillB.id)) {
            result.conflicts.push({
              skillA: skillB.id,
              skillB: skillA.id,
              reason: `${skillB.metadata.name} conflicts with ${skillA.metadata.name}`,
            });
            result.warnings.push(
              `Conflict detected: ${skillB.metadata.name} and ${skillA.metadata.name}`
            );
          }
        }
      }
    }

    // Check dependencies
    for (const skill of enabledSkills) {
      const deps = skill.metadata.dependencies || [];
      for (const dep of deps) {
        const depEnabled = enabledSkills.some((s) => s.id === dep || s.metadata.name === dep);
        if (!depEnabled) {
          result.warnings.push(
            `Skill ${skill.metadata.name} depends on ${dep}, which is not enabled`
          );
        }
      }
    }

    return result;
  }

  /**
   * Get enabled skills in order
   */
  async getEnabledSkills(config: RulebookConfig): Promise<Skill[]> {
    if (!config.skills || config.skills.enabled.length === 0) {
      return [];
    }

    const skills = await this.getSkills();
    const enabledIds = new Set(config.skills.enabled);
    const order = config.skills.order || [];

    // Filter and sort by order
    const enabledSkills = skills.filter((s) => enabledIds.has(s.id));
    enabledSkills.sort((a, b) => {
      const indexA = order.indexOf(a.id);
      const indexB = order.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return enabledSkills.map((s) => ({ ...s, enabled: true }));
  }

  /**
   * Merge enabled skills into single content for AGENTS.md
   */
  async mergeSkillsContent(config: RulebookConfig): Promise<string> {
    const enabledSkills = await this.getEnabledSkills(config);

    if (enabledSkills.length === 0) {
      return '';
    }

    const sections: string[] = [];

    // Add skills index header
    sections.push('<!-- RULEBOOK:SKILLS_INDEX:START -->');
    sections.push('## Installed Skills\n');
    sections.push('| Category | Skill | Description |');
    sections.push('|----------|-------|-------------|');

    for (const skill of enabledSkills) {
      const category = skill.category.charAt(0).toUpperCase() + skill.category.slice(1);
      sections.push(`| ${category} | ${skill.metadata.name} | ${skill.metadata.description} |`);
    }

    sections.push('\n<!-- RULEBOOK:SKILLS_INDEX:END -->\n');

    // Add each skill's content
    for (const skill of enabledSkills) {
      sections.push(`<!-- RULEBOOK:SKILL:${skill.id}:START -->`);
      sections.push(skill.content);
      sections.push(`<!-- RULEBOOK:SKILL:${skill.id}:END -->\n`);
    }

    return sections.join('\n');
  }

  /**
   * Auto-detect skills based on project configuration
   */
  async autoDetectSkills(config: Partial<RulebookConfig>): Promise<string[]> {
    const detectedSkills: string[] = [];

    // Detect language skills
    if (config.languages) {
      for (const lang of config.languages) {
        const skillId = `languages/${lang.toLowerCase()}`;
        const skill = await this.getSkillById(skillId);
        if (skill) {
          detectedSkills.push(skillId);
        }
      }
    }

    // Detect framework skills
    if (config.frameworks) {
      for (const framework of config.frameworks) {
        const skillId = `frameworks/${framework.toLowerCase()}`;
        const skill = await this.getSkillById(skillId);
        if (skill) {
          detectedSkills.push(skillId);
        }
      }
    }

    // Detect module skills
    if (config.modules) {
      for (const module of config.modules) {
        const skillId = `modules/${module.toLowerCase()}`;
        const skill = await this.getSkillById(skillId);
        if (skill) {
          detectedSkills.push(skillId);
        }
      }
    }

    // Detect service skills
    if (config.services) {
      for (const service of config.services) {
        const skillId = `services/${service.toLowerCase()}`;
        const skill = await this.getSkillById(skillId);
        if (skill) {
          detectedSkills.push(skillId);
        }
      }
    }

    // Always include core skills
    const coreSkills = await this.getSkillsByCategory('core');
    for (const skill of coreSkills) {
      if (!detectedSkills.includes(skill.id)) {
        detectedSkills.push(skill.id);
      }
    }

    return detectedSkills;
  }

  /**
   * Create a new skill from template
   */
  async createSkill(
    name: string,
    description: string,
    category: SkillCategory,
    content: string = ''
  ): Promise<Skill> {
    const metadata: SkillMetadata = {
      name,
      description,
      version: '1.0.0',
      category,
      tags: [category],
    };

    const skillId = this.generateSkillId(name, category);
    const skillDir = join(this.skillsPath, category, skillId.split('/')[1]);
    const skillFile = join(skillDir, SKILL_FILE_NAME);

    // Generate SKILL.md content
    const frontmatter = generateSkillFrontmatter(metadata);
    const fullContent = `${frontmatter}\n\n${content || `# ${name}\n\n${description}`}`;

    // Write skill file
    await writeFile(skillFile, fullContent);

    return {
      id: skillId,
      path: skillFile,
      metadata,
      content: content || `# ${name}\n\n${description}`,
      category,
      enabled: false,
    };
  }

  /**
   * Get skills summary for display
   */
  async getSkillsSummary(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    categories: SkillCategory[];
  }> {
    const index = await this.discoverSkills();

    const byCategory: Record<string, number> = {};
    const categories: SkillCategory[] = [];

    for (const [cat, skills] of Object.entries(index.categories)) {
      if (skills.length > 0) {
        byCategory[cat] = skills.length;
        categories.push(cat as SkillCategory);
      }
    }

    return {
      total: index.skills.length,
      byCategory,
      categories,
    };
  }
}

/**
 * Create a new SkillsManager instance
 */
export function createSkillsManager(templatesPath: string, projectPath?: string): SkillsManager {
  return new SkillsManager(templatesPath, projectPath);
}

/**
 * Get the default templates path
 */
export function getDefaultTemplatesPath(): string {
  // In production, templates are in the package's templates directory
  // In development, they're in the project root
  const packagePath = dirname(dirname(dirname(import.meta.url.replace('file:///', ''))));
  return join(packagePath, 'templates');
}
