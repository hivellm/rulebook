import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { readFile as readFileUtil, writeFile as writeFileUtil } from '../utils/file-system.js';
import type { KnowledgeEntry, KnowledgeType, KnowledgeCategory } from '../types.js';

const KNOWLEDGE_DIR = 'knowledge';
const PATTERNS_DIR = 'patterns';
const ANTI_PATTERNS_DIR = 'anti-patterns';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function subdir(type: KnowledgeType): string {
  return type === 'pattern' ? PATTERNS_DIR : ANTI_PATTERNS_DIR;
}

export class KnowledgeManager {
  private knowledgePath: string;

  constructor(projectRoot: string, rulebookDir: string = '.rulebook') {
    this.knowledgePath = join(projectRoot, rulebookDir, KNOWLEDGE_DIR);
  }

  private ensureDir(type?: KnowledgeType): void {
    if (!existsSync(this.knowledgePath)) {
      mkdirSync(this.knowledgePath, { recursive: true });
    }
    if (type) {
      const dir = join(this.knowledgePath, subdir(type));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } else {
      // Ensure both
      for (const d of [PATTERNS_DIR, ANTI_PATTERNS_DIR]) {
        const dir = join(this.knowledgePath, d);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }
    }
  }

  async add(
    type: KnowledgeType,
    title: string,
    options: {
      category: KnowledgeCategory;
      description: string;
      example?: string;
      whenToUse?: string;
      whenNotToUse?: string;
      tags?: string[];
      source?: KnowledgeEntry['source'];
    }
  ): Promise<KnowledgeEntry> {
    this.ensureDir(type);
    const id = slugify(title);
    const dir = join(this.knowledgePath, subdir(type));

    const entry: KnowledgeEntry = {
      id,
      type,
      title,
      category: options.category,
      description: options.description,
      example: options.example,
      whenToUse: options.whenToUse,
      whenNotToUse: options.whenNotToUse,
      createdAt: new Date().toISOString(),
      tags: options.tags ?? [],
      source: options.source ?? 'manual',
    };

    // Write markdown
    const md = this.renderMarkdown(entry);
    await writeFileUtil(join(dir, `${id}.md`), md);

    // Write metadata
    await writeFileUtil(join(dir, `${id}.metadata.json`), JSON.stringify(entry, null, 2));

    return entry;
  }

  async list(type?: KnowledgeType, category?: KnowledgeCategory): Promise<KnowledgeEntry[]> {
    this.ensureDir();
    const types: KnowledgeType[] = type ? [type] : ['pattern', 'anti-pattern'];
    const entries: KnowledgeEntry[] = [];

    for (const t of types) {
      const dir = join(this.knowledgePath, subdir(t));
      if (!existsSync(dir)) continue;
      const files = readdirSync(dir).filter((f) => f.endsWith('.metadata.json'));
      for (const file of files) {
        const raw = await readFileUtil(join(dir, file));
        if (!raw) continue;
        try {
          const meta = JSON.parse(raw) as KnowledgeEntry;
          if (category && meta.category !== category) continue;
          entries.push(meta);
        } catch {
          // skip malformed
        }
      }
    }

    return entries.sort((a, b) => a.title.localeCompare(b.title));
  }

  async show(id: string): Promise<{ entry: KnowledgeEntry; content: string } | null> {
    this.ensureDir();
    // Search both dirs
    for (const t of ['pattern', 'anti-pattern'] as KnowledgeType[]) {
      const dir = join(this.knowledgePath, subdir(t));
      if (!existsSync(dir)) continue;
      const metaPath = join(dir, `${id}.metadata.json`);
      if (!existsSync(metaPath)) continue;
      const raw = await readFileUtil(metaPath);
      if (!raw) continue;
      const entry = JSON.parse(raw) as KnowledgeEntry;
      const content = (await readFileUtil(join(dir, `${id}.md`))) ?? '';
      return { entry, content };
    }
    return null;
  }

  async remove(id: string): Promise<boolean> {
    this.ensureDir();
    for (const t of ['pattern', 'anti-pattern'] as KnowledgeType[]) {
      const dir = join(this.knowledgePath, subdir(t));
      if (!existsSync(dir)) continue;
      const metaPath = join(dir, `${id}.metadata.json`);
      if (!existsSync(metaPath)) continue;
      const mdPath = join(dir, `${id}.md`);
      if (existsSync(mdPath)) rmSync(mdPath);
      rmSync(metaPath);
      return true;
    }
    return false;
  }

  async getForGenerator(): Promise<string> {
    const patterns = await this.list('pattern');
    const antiPatterns = await this.list('anti-pattern');

    if (patterns.length === 0 && antiPatterns.length === 0) return '';

    const lines = ['## Project Knowledge', ''];

    if (patterns.length > 0) {
      lines.push('### Patterns', '', 'The following patterns are enforced in this project:', '');
      for (const p of patterns) {
        lines.push(`- **${p.title}** → [spec](/.rulebook/knowledge/patterns/${p.id}.md)`);
      }
      lines.push('');
    }

    if (antiPatterns.length > 0) {
      lines.push('### Anti-Patterns to Avoid', '');
      for (const a of antiPatterns) {
        lines.push(`- **${a.title}** → [details](/.rulebook/knowledge/anti-patterns/${a.id}.md)`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderMarkdown(e: KnowledgeEntry): string {
    const lines = [
      `# ${e.title}`,
      '',
      `**Category**: ${e.category}`,
      `**Tags**: ${e.tags.join(', ') || 'none'}`,
      '',
      '## Description',
      '',
      e.description,
    ];

    if (e.example) {
      lines.push('', '## Example', '', e.example);
    }
    if (e.whenToUse) {
      lines.push('', '## When to Use', '', e.whenToUse);
    }
    if (e.whenNotToUse) {
      lines.push('', '## When NOT to Use', '', e.whenNotToUse);
    }
    lines.push('');
    return lines.join('\n');
  }
}
