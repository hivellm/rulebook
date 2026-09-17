import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { readFile as readFileUtil, writeFile as writeFileUtil } from '../../utils/file-system.js';
import type { Learning, KnowledgeCategory } from '../../types.js';
import { DecisionManager } from './decision-manager.js';
import { KnowledgeManager } from './knowledge-manager.js';
import { PROJECT_SKILLS_DIR } from '../skills/skills-manager.js';

const LEARNINGS_DIR = 'learnings';

/** A learning captured this many times (same title) is a skill candidate. */
export const SKILL_CANDIDATE_MIN_OCCURRENCES = 2;

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export type PromoteTarget = 'knowledge' | 'decision' | 'skill';

export class LearnManager {
    private projectRoot: string;
    private learningsPath: string;
    private decisionManager: DecisionManager;
    private knowledgeManager: KnowledgeManager;

    constructor(projectRoot: string, rulebookDir: string = '.rulebook') {
        const rbPath = join(projectRoot, rulebookDir);
        this.projectRoot = projectRoot;
        this.learningsPath = join(rbPath, LEARNINGS_DIR);
        this.decisionManager = new DecisionManager(projectRoot, rulebookDir);
        this.knowledgeManager = new KnowledgeManager(projectRoot, rulebookDir);
    }

    private ensureDir(): void {
        if (!existsSync(this.learningsPath)) {
            mkdirSync(this.learningsPath, { recursive: true });
        }
    }

    private renderMarkdown(learning: Learning): string {
        const seen = learning.occurrences ?? 1;
        return [
            `# ${learning.title}`,
            '',
            `**Source**: ${learning.source}`,
            `**Date**: ${learning.createdAt.split('T')[0]}`,
            seen > 1
                ? `**Seen**: ${seen} times (last ${(learning.lastSeenAt ?? learning.createdAt).split('T')[0]})`
                : '',
            learning.relatedTask ? `**Related Task**: ${learning.relatedTask}` : '',
            learning.tags.length > 0 ? `**Tags**: ${learning.tags.join(', ')}` : '',
            '',
            learning.content,
            '',
        ]
            .filter(Boolean)
            .join('\n');
    }

    private async write(learning: Learning): Promise<void> {
        await writeFileUtil(
            join(this.learningsPath, `${learning.id}.md`),
            this.renderMarkdown(learning)
        );
        await writeFileUtil(
            join(this.learningsPath, `${learning.id}.metadata.json`),
            JSON.stringify(learning, null, 2)
        );
    }

    /**
     * Capture a learning. v7.2: capturing the same title again (unpromoted)
     * is a recurrence — the count grows and the newest content wins instead
     * of a duplicate file piling up. That count is what turns a repeated
     * operator request into a skill candidate.
     */
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

        const slug = slugify(title);
        const now = new Date().toISOString();

        const existing = (await this.list()).find(
            (l) => !l.promotedTo && slugify(l.title) === slug
        );
        if (existing) {
            existing.occurrences = (existing.occurrences ?? 1) + 1;
            existing.lastSeenAt = now;
            existing.content = content;
            if (options.relatedTask) existing.relatedTask = options.relatedTask;
            if (options.relatedDecision !== undefined)
                existing.relatedDecision = options.relatedDecision;
            existing.tags = Array.from(new Set([...existing.tags, ...(options.tags ?? [])]));
            await this.write(existing);
            return existing;
        }

        const timestamp = now.replace(/[:.]/g, '-').slice(0, 19);
        // Same title within the same second (e.g. right after a promotion)
        // must not overwrite the earlier entry: suffix until the id is free.
        let id = `${timestamp}-${slug}`;
        for (let n = 2; existsSync(join(this.learningsPath, `${id}.metadata.json`)); n++) {
            id = `${timestamp}-${slug}-${n}`;
        }
        const learning: Learning = {
            id,
            title,
            content,
            source: options.source ?? 'manual',
            relatedTask: options.relatedTask,
            relatedDecision: options.relatedDecision,
            tags: options.tags ?? [],
            createdAt: now,
            occurrences: 1,
            lastSeenAt: now,
        };
        await this.write(learning);
        return learning;
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

    /**
     * Unpromoted learnings captured at least `min` times, most recurrent
     * first. These are the "the operator keeps asking for this" signals.
     */
    async skillCandidates(min: number = SKILL_CANDIDATE_MIN_OCCURRENCES): Promise<Learning[]> {
        const all = await this.list();
        return all
            .filter((l) => !l.promotedTo && (l.occurrences ?? 1) >= min)
            .sort(
                (a, b) =>
                    (b.occurrences ?? 1) - (a.occurrences ?? 1) ||
                    (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt)
            );
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

    /** Where `promote(id, "skill")` writes: `.claude/skills/<slug>/SKILL.md`. */
    skillPath(slug: string): string {
        return join(this.projectRoot, PROJECT_SKILLS_DIR, slug, 'SKILL.md');
    }

    /**
     * Render a learning as a project skill. A skill is only worth its context
     * cost as a procedure, so the body is forced into when-to-use / steps /
     * verify sections; the learning content lands under Steps for the author
     * to tighten.
     */
    static renderSkill(learning: Learning, slug: string, description: string): string {
        const seen = learning.occurrences ?? 1;
        return [
            '---',
            `name: ${slug}`,
            `description: ${description.replace(/\n/g, ' ').trim()}`,
            '---',
            `# ${learning.title}`,
            '',
            `Promoted from learning \`${learning.id}\` (captured ${seen} time${seen === 1 ? '' : 's'}).`,
            'Keep this a procedure: exact commands, files touched, how to verify.',
            '',
            '## When to use',
            '',
            `The operator asks for: ${learning.title}.`,
            '',
            '## Steps',
            '',
            learning.content.trim(),
            '',
            '## Verify',
            '',
            '- State what must be true when the procedure is done (tests green, file present, output shape).',
            '',
        ].join('\n');
    }

    async promote(
        id: string,
        target: PromoteTarget,
        options: {
            title?: string;
            category?: KnowledgeCategory;
            /** skill: one-line description for the SKILL.md frontmatter. */
            description?: string;
        } = {}
    ): Promise<{ type: PromoteTarget; id: string; path?: string } | null> {
        const result = await this.show(id);
        if (!result) return null;

        const { learning } = result;
        const title = options.title ?? learning.title;

        let targetId: string;
        let path: string | undefined;

        if (target === 'knowledge') {
            const entry = await this.knowledgeManager.add('pattern', title, {
                category: options.category ?? 'code',
                description: learning.content,
                tags: learning.tags,
                source: 'learn',
            });
            targetId = entry.id;
        } else if (target === 'decision') {
            const decision = await this.decisionManager.create(title, {
                context: learning.content,
                relatedTasks: learning.relatedTask ? [learning.relatedTask] : undefined,
            });
            targetId = String(decision.id);
        } else {
            const slug = slugify(title);
            if (!slug) throw new Error(`Cannot derive a skill name from "${title}"`);
            path = this.skillPath(slug);
            if (existsSync(path)) {
                throw new Error(
                    `Skill "${slug}" already exists at ${path} — edit it instead of promoting again`
                );
            }
            mkdirSync(join(path, '..'), { recursive: true });
            await writeFileUtil(
                path,
                LearnManager.renderSkill(
                    learning,
                    slug,
                    options.description ?? `Procedure for: ${learning.title}`
                )
            );
            targetId = slug;
        }

        // Mark as promoted
        learning.promotedTo = { type: target, id: targetId };
        await writeFileUtil(
            join(this.learningsPath, `${id}.metadata.json`),
            JSON.stringify(learning, null, 2)
        );

        return path ? { type: target, id: targetId, path } : { type: target, id: targetId };
    }
}
