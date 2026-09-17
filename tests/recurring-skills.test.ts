import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { LearnManager, SKILL_CANDIDATE_MIN_OCCURRENCES } from '../src/core/tasks/learn-manager.js';
import { SkillsManager, PROJECT_SKILLS_DIR } from '../src/core/skills/skills-manager.js';
import { getDefaultTemplatesPath } from '../src/core/skills/skills-manager.js';

/**
 * v7.2: a request the operator keeps making should converge on a skill.
 * Learnings captured under the same title are counted, 2+ makes a skill
 * candidate, and promotion writes a project skill the SkillsManager sees.
 */
describe('recurring learnings → skills', () => {
    let root: string;
    let lm: LearnManager;

    beforeEach(() => {
        root = join(
            tmpdir(),
            `rulebook-recur-${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
        mkdirSync(root, { recursive: true });
        lm = new LearnManager(root);
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    const learningFiles = () =>
        readdirSync(join(root, '.rulebook', 'learnings')).filter((f) =>
            f.endsWith('.metadata.json')
        );

    it('counts a recapture under the same title instead of duplicating it', async () => {
        const first = await lm.capture('Regenerate API client', 'run gen v1', { tags: ['api'] });
        expect(first.occurrences).toBe(1);

        const second = await lm.capture('regenerate api CLIENT', 'run gen v2', {
            tags: ['codegen'],
        });
        expect(second.id).toBe(first.id);
        expect(second.occurrences).toBe(2);
        expect(second.content).toBe('run gen v2');
        expect(second.tags).toEqual(['api', 'codegen']);
        expect(second.lastSeenAt! >= first.createdAt).toBe(true);
        expect(learningFiles()).toHaveLength(1);

        const md = readFileSync(join(root, '.rulebook', 'learnings', `${first.id}.md`), 'utf-8');
        expect(md).toContain('**Seen**: 2 times');
        expect(md).toContain('run gen v2');
    });

    it('does not merge into a promoted learning', async () => {
        const l = await lm.capture('Rotate secrets', 'step');
        await lm.promote(l.id, 'knowledge');
        const again = await lm.capture('Rotate secrets', 'step again');
        expect(again.id).not.toBe(l.id);
        expect(again.occurrences).toBe(1);
        expect(learningFiles()).toHaveLength(2);
    });

    it('treats legacy learnings without a counter as seen once', async () => {
        const dir = join(root, '.rulebook', 'learnings');
        mkdirSync(dir, { recursive: true });
        writeFileSync(
            join(dir, 'legacy-old-thing.metadata.json'),
            JSON.stringify({
                id: 'legacy-old-thing',
                title: 'Old thing',
                content: 'x',
                source: 'manual',
                tags: [],
                createdAt: '2026-01-01T00:00:00.000Z',
            })
        );
        expect(await lm.skillCandidates()).toEqual([]);
        const bumped = await lm.capture('Old thing', 'y');
        expect(bumped.id).toBe('legacy-old-thing');
        expect(bumped.occurrences).toBe(2);
    });

    it('lists skill candidates at the threshold, most recurrent first', async () => {
        expect(SKILL_CANDIDATE_MIN_OCCURRENCES).toBe(2);
        await lm.capture('once', 'a');
        await lm.capture('twice', 'b');
        await lm.capture('twice', 'b');
        await lm.capture('thrice', 'c');
        await lm.capture('thrice', 'c');
        await lm.capture('thrice', 'c');
        const candidates = await lm.skillCandidates();
        expect(candidates.map((c) => c.title)).toEqual(['thrice', 'twice']);
        expect((await lm.skillCandidates(3)).map((c) => c.title)).toEqual(['thrice']);
    });

    it('promotes a learning to a project skill written as a procedure', async () => {
        const l = await lm.capture(
            'Deploy docs site',
            '1. npm run docs:build\n2. npm run docs:push'
        );
        await lm.capture('Deploy docs site', '1. npm run docs:build\n2. npm run docs:push');

        const result = await lm.promote(l.id, 'skill', { description: 'Build and push the docs' });
        const path = join(root, PROJECT_SKILLS_DIR, 'deploy-docs-site', 'SKILL.md');
        expect(result).toEqual({ type: 'skill', id: 'deploy-docs-site', path });
        expect(existsSync(path)).toBe(true);

        const skill = readFileSync(path, 'utf-8');
        expect(
            skill.startsWith(
                '---\nname: deploy-docs-site\ndescription: Build and push the docs\n---'
            )
        ).toBe(true);
        expect(skill).toContain('## When to use');
        expect(skill).toContain('## Steps');
        expect(skill).toContain('npm run docs:push');
        expect(skill).toContain('## Verify');
        expect(skill).toContain('captured 2 times');

        const meta = JSON.parse(
            readFileSync(join(root, '.rulebook', 'learnings', `${l.id}.metadata.json`), 'utf-8')
        );
        expect(meta.promotedTo).toEqual({ type: 'skill', id: 'deploy-docs-site' });
        expect(await lm.skillCandidates()).toEqual([]);
    });

    it('refuses to overwrite an existing skill', async () => {
        const l = await lm.capture('Deploy docs site', 'x');
        const path = join(root, PROJECT_SKILLS_DIR, 'deploy-docs-site', 'SKILL.md');
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, 'hand-written');
        await expect(lm.promote(l.id, 'skill')).rejects.toThrow(/already exists/);
        expect(readFileSync(path, 'utf-8')).toBe('hand-written');
        const meta = JSON.parse(
            readFileSync(join(root, '.rulebook', 'learnings', `${l.id}.metadata.json`), 'utf-8')
        );
        expect(meta.promotedTo).toBeUndefined();
    });

    it('SkillsManager discovers project skills under category "project"', async () => {
        const dir = join(root, PROJECT_SKILLS_DIR, 'deploy-docs');
        mkdirSync(dir, { recursive: true });
        writeFileSync(
            join(dir, 'SKILL.md'),
            '---\nname: deploy-docs\ndescription: Build and push docs\n---\n## Steps\n1. go\n'
        );
        // A directory without SKILL.md is ignored.
        mkdirSync(join(root, PROJECT_SKILLS_DIR, 'empty'), { recursive: true });

        const sm = new SkillsManager(getDefaultTemplatesPath(), root);
        const skills = await sm.getSkills();
        const project = skills.filter((s) => s.category === 'project');
        expect(project).toHaveLength(1);
        expect(project[0].id).toBe('project/deploy-docs');
        expect(project[0].metadata.description).toBe('Build and push docs');
        expect(project[0].content).toContain('## Steps');
        expect(project[0].enabled).toBe(false);
        expect(await sm.getSkillsByCategory('project')).toHaveLength(1);
        expect((await sm.getSkillById('project/deploy-docs'))?.path).toBe(join(dir, 'SKILL.md'));
    });

    it('promoted skills are visible to the SkillsManager right away', async () => {
        const l = await lm.capture('Release checklist', 'steps');
        await lm.promote(l.id, 'skill');
        const sm = new SkillsManager(getDefaultTemplatesPath(), root);
        expect((await sm.getSkillsByCategory('project')).map((s) => s.id)).toEqual([
            'project/release-checklist',
        ]);
    });
});
