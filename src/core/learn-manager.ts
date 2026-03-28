import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { readFile as readFileUtil, writeFile as writeFileUtil } from '../utils/file-system.js';
import type { Learning, KnowledgeCategory } from '../types.js';
import { DecisionManager } from './decision-manager.js';
import { KnowledgeManager } from './knowledge-manager.js';

const LEARNINGS_DIR = 'learnings';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class LearnManager {
  private learningsPath: string;
  private ralphHistoryPath: string;
  private decisionManager: DecisionManager;
  private knowledgeManager: KnowledgeManager;

  constructor(projectRoot: string, rulebookDir: string = '.rulebook') {
    const rbPath = join(projectRoot, rulebookDir);
    this.learningsPath = join(rbPath, LEARNINGS_DIR);
    this.ralphHistoryPath = join(rbPath, 'ralph', 'history');
    this.decisionManager = new DecisionManager(projectRoot, rulebookDir);
    this.knowledgeManager = new KnowledgeManager(projectRoot, rulebookDir);
  }

  private ensureDir(): void {
    if (!existsSync(this.learningsPath)) {
      mkdirSync(this.learningsPath, { recursive: true });
    }
  }

  async capture(
    title: string,
    content: string,
    options: {
      source?: Learning['source'];
      relatedTask?: string;
      relatedDecision?: number;
      tags?: string[];
    } = {}
  ): Promise<Learning> {
    this.ensureDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const slug = slugify(title);
    const id = `${timestamp}-${slug}`;

    const learning: Learning = {
      id,
      title,
      content,
      source: options.source ?? 'manual',
      relatedTask: options.relatedTask,
      relatedDecision: options.relatedDecision,
      tags: options.tags ?? [],
      createdAt: new Date().toISOString(),
    };

    // Write markdown
    const md = [
      `# ${title}`,
      '',
      `**Source**: ${learning.source}`,
      `**Date**: ${learning.createdAt.split('T')[0]}`,
      learning.relatedTask ? `**Related Task**: ${learning.relatedTask}` : '',
      learning.tags.length > 0 ? `**Tags**: ${learning.tags.join(', ')}` : '',
      '',
      content,
      '',
    ]
      .filter(Boolean)
      .join('\n');

    await writeFileUtil(join(this.learningsPath, `${id}.md`), md);
    await writeFileUtil(
      join(this.learningsPath, `${id}.metadata.json`),
      JSON.stringify(learning, null, 2)
    );

    return learning;
  }

  async fromRalph(): Promise<Learning[]> {
    this.ensureDir();
    if (!existsSync(this.ralphHistoryPath)) return [];

    const files = readdirSync(this.ralphHistoryPath).filter(
      (f) => f.startsWith('iteration-') && f.endsWith('.json')
    );

    // Load existing learning titles for dedup
    const existing = await this.list();
    const existingTitles = new Set(existing.map((l) => l.title));

    const newLearnings: Learning[] = [];

    for (const file of files) {
      const raw = await readFileUtil(join(this.ralphHistoryPath, file));
      if (!raw) continue;
      try {
        const iteration = JSON.parse(raw);
        const learnings: string[] = iteration.learnings ?? [];
        for (const text of learnings) {
          // Use first line or first 60 chars as title
          const title = text.split('\n')[0].slice(0, 80);
          if (existingTitles.has(title)) continue;
          existingTitles.add(title);

          const learning = await this.capture(title, text, {
            source: 'ralph',
            relatedTask: iteration.task_id,
            tags: ['ralph', `iteration-${iteration.iteration}`],
          });
          newLearnings.push(learning);
        }
      } catch {
        // skip malformed
      }
    }

    return newLearnings;
  }

  async list(limit?: number): Promise<Learning[]> {
    this.ensureDir();
    const files = readdirSync(this.learningsPath).filter((f) => f.endsWith('.metadata.json'));
    const learnings: Learning[] = [];

    for (const file of files) {
      const raw = await readFileUtil(join(this.learningsPath, file));
      if (!raw) continue;
      try {
        learnings.push(JSON.parse(raw) as Learning);
      } catch {
        // skip malformed
      }
    }

    // Sort newest first
    learnings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? learnings.slice(0, limit) : learnings;
  }

  async show(id: string): Promise<{ learning: Learning; content: string } | null> {
    this.ensureDir();
    const metaPath = join(this.learningsPath, `${id}.metadata.json`);
    if (!existsSync(metaPath)) return null;

    const raw = await readFileUtil(metaPath);
    if (!raw) return null;

    const learning = JSON.parse(raw) as Learning;
    const content = (await readFileUtil(join(this.learningsPath, `${id}.md`))) ?? '';
    return { learning, content };
  }

  async promote(
    id: string,
    target: 'knowledge' | 'decision',
    options: {
      title?: string;
      category?: KnowledgeCategory;
    } = {}
  ): Promise<{ type: 'knowledge' | 'decision'; id: string } | null> {
    const result = await this.show(id);
    if (!result) return null;

    const { learning } = result;
    const title = options.title ?? learning.title;

    let targetId: string;

    if (target === 'knowledge') {
      const entry = await this.knowledgeManager.add('pattern', title, {
        category: options.category ?? 'code',
        description: learning.content,
        tags: learning.tags,
        source: 'learn',
      });
      targetId = entry.id;
    } else {
      const decision = await this.decisionManager.create(title, {
        context: learning.content,
        relatedTasks: learning.relatedTask ? [learning.relatedTask] : undefined,
      });
      targetId = String(decision.id);
    }

    // Mark as promoted
    learning.promotedTo = { type: target, id: targetId };
    await writeFileUtil(
      join(this.learningsPath, `${id}.metadata.json`),
      JSON.stringify(learning, null, 2)
    );

    return { type: target, id: targetId };
  }
}
