import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { readFile as readFileUtil, writeFile as writeFileUtil } from '../utils/file-system.js';
import type { Decision, DecisionStatus } from '../types.js';

const DECISIONS_DIR = 'decisions';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

export class DecisionManager {
  private decisionsPath: string;

  constructor(projectRoot: string, rulebookDir: string = '.rulebook') {
    this.decisionsPath = join(projectRoot, rulebookDir, DECISIONS_DIR);
  }

  private ensureDir(): void {
    if (!existsSync(this.decisionsPath)) {
      mkdirSync(this.decisionsPath, { recursive: true });
    }
  }

  async getNextId(): Promise<number> {
    this.ensureDir();
    const files = readdirSync(this.decisionsPath).filter((f) => f.endsWith('.metadata.json'));
    if (files.length === 0) return 1;
    const ids = files.map((f) => {
      const match = f.match(/^(\d+)-/);
      return match ? parseInt(match[1], 10) : 0;
    });
    return Math.max(...ids) + 1;
  }

  async create(
    title: string,
    options: {
      context?: string;
      decision?: string;
      alternatives?: string[];
      consequences?: string;
      relatedTasks?: string[];
      status?: DecisionStatus;
    } = {}
  ): Promise<Decision> {
    this.ensureDir();
    const id = await this.getNextId();
    const slug = slugify(title);
    const date = new Date().toISOString().split('T')[0];
    const status = options.status ?? 'proposed';

    const entry: Decision = {
      id,
      slug,
      title,
      status,
      date,
      context: options.context ?? '',
      decision: options.decision ?? '',
      alternatives: options.alternatives ?? [],
      consequences: options.consequences ?? '',
      relatedTasks: options.relatedTasks,
    };

    const prefix = `${pad(id)}-${slug}`;

    // Write markdown
    const md = this.renderMarkdown(entry);
    await writeFileUtil(join(this.decisionsPath, `${prefix}.md`), md);

    // Write metadata
    const metadata = {
      id: entry.id,
      slug: entry.slug,
      title: entry.title,
      status: entry.status,
      date: entry.date,
      relatedTasks: entry.relatedTasks ?? [],
      supersededBy: null,
    };
    await writeFileUtil(
      join(this.decisionsPath, `${prefix}.metadata.json`),
      JSON.stringify(metadata, null, 2)
    );

    return entry;
  }

  async list(status?: DecisionStatus): Promise<Decision[]> {
    this.ensureDir();
    const files = readdirSync(this.decisionsPath).filter((f) => f.endsWith('.metadata.json'));
    const decisions: Decision[] = [];

    for (const file of files) {
      const raw = await readFileUtil(join(this.decisionsPath, file));
      if (!raw) continue;
      try {
        const meta = JSON.parse(raw);
        if (status && meta.status !== status) continue;
        decisions.push(meta as Decision);
      } catch {
        // skip malformed
      }
    }

    return decisions.sort((a, b) => a.id - b.id);
  }

  async show(id: number): Promise<{ decision: Decision; content: string } | null> {
    this.ensureDir();
    const files = readdirSync(this.decisionsPath).filter((f) => f.endsWith('.metadata.json'));
    const metaFile = files.find((f) => {
      const match = f.match(/^(\d+)-/);
      return match ? parseInt(match[1], 10) === id : false;
    });
    if (!metaFile) return null;

    const raw = await readFileUtil(join(this.decisionsPath, metaFile));
    if (!raw) return null;

    const meta = JSON.parse(raw) as Decision;
    const mdFile = metaFile.replace('.metadata.json', '.md');
    const content = (await readFileUtil(join(this.decisionsPath, mdFile))) ?? '';

    return { decision: meta, content };
  }

  async update(
    id: number,
    fields: Partial<
      Pick<Decision, 'status' | 'context' | 'decision' | 'consequences' | 'alternatives'>
    >
  ): Promise<Decision | null> {
    const result = await this.show(id);
    if (!result) return null;

    const { decision } = result;
    const updated = { ...decision, ...fields };

    const prefix = `${pad(id)}-${decision.slug}`;
    await writeFileUtil(
      join(this.decisionsPath, `${prefix}.metadata.json`),
      JSON.stringify(
        {
          id: updated.id,
          slug: updated.slug,
          title: updated.title,
          status: updated.status,
          date: updated.date,
          relatedTasks: updated.relatedTasks ?? [],
          supersededBy: updated.supersededBy ?? null,
        },
        null,
        2
      )
    );

    // Re-render markdown if content fields changed
    if (fields.context || fields.decision || fields.consequences || fields.alternatives) {
      const md = this.renderMarkdown(updated);
      await writeFileUtil(join(this.decisionsPath, `${prefix}.md`), md);
    }

    return updated;
  }

  async supersede(oldId: number, newId: number): Promise<boolean> {
    const oldResult = await this.show(oldId);
    if (!oldResult) return false;

    const { decision: old } = oldResult;
    const prefix = `${pad(oldId)}-${old.slug}`;
    await writeFileUtil(
      join(this.decisionsPath, `${prefix}.metadata.json`),
      JSON.stringify(
        {
          id: old.id,
          slug: old.slug,
          title: old.title,
          status: 'superseded' as DecisionStatus,
          date: old.date,
          relatedTasks: old.relatedTasks ?? [],
          supersededBy: newId,
        },
        null,
        2
      )
    );

    return true;
  }

  async getForGenerator(): Promise<string> {
    const decisions = await this.list();
    const active = decisions.filter((d) => d.status === 'accepted' || d.status === 'proposed');
    if (active.length === 0) return '';

    const lines = [
      '## Decision Records',
      '',
      'The following architectural decisions are active in this project:',
      '',
    ];
    for (const d of active) {
      const prefix = `${pad(d.id)}-${d.slug}`;
      lines.push(
        `- **ADR-${pad(d.id)}: ${d.title}** (${d.status}) → [details](/.rulebook/decisions/${prefix}.md)`
      );
    }
    lines.push('');
    return lines.join('\n');
  }

  private renderMarkdown(d: Decision): string {
    const lines = [`# ${d.id}. ${d.title}`, '', `**Status**: ${d.status}`, `**Date**: ${d.date}`];

    if (d.relatedTasks && d.relatedTasks.length > 0) {
      lines.push(`**Related Tasks**: ${d.relatedTasks.join(', ')}`);
    }

    lines.push('', '## Context', '', d.context || '_No context provided._');
    lines.push('', '## Decision', '', d.decision || '_No decision recorded._');

    if (d.alternatives && d.alternatives.length > 0) {
      lines.push('', '## Alternatives Considered', '');
      for (const alt of d.alternatives) {
        lines.push(`- ${alt}`);
      }
    }

    lines.push('', '## Consequences', '', d.consequences || '_No consequences documented._');
    lines.push('');

    return lines.join('\n');
  }
}
