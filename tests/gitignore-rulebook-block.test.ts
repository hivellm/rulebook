import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
    createConfigManager,
    RULEBOOK_GITIGNORE_BLOCK,
    RULEBOOK_GITIGNORE_HEADER,
} from '../src/core/state/config-manager.js';

const execFileAsync = promisify(execFile);

/**
 * `/.rulebook/*` ignores the whole directory, so anything worth sharing has to
 * be named as an exception. Project memory (decisions, knowledge, learnings) and
 * the task archive were missing from that list: they were written locally and
 * never reached collaborators.
 *
 * The keep/ignore assertions run against real `git check-ignore` rather than
 * string matching, because gitignore precedence is the thing under test.
 */
describe('rulebook .gitignore block', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-gitignore-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    const SHARED = [
        '.rulebook/specs/git.md',
        '.rulebook/tasks/phase1_x/tasks.md',
        '.rulebook/tasks/phase1_x/.metadata.json',
        '.rulebook/archive/2026-01-01-phase0_y/proposal.md',
        '.rulebook/decisions/adr-001.md',
        '.rulebook/knowledge/patterns/caching.md',
        '.rulebook/knowledge/anti-patterns/god-object.md',
        '.rulebook/learnings/2026-01-01.md',
        '.rulebook/rulebook.json',
    ];

    const RUNTIME = [
        '.rulebook/backup/CLAUDE.md.backup-1',
        '.rulebook/logs/run.log',
        '.rulebook/telemetry/events.json',
        '.rulebook/handoff/_pending.md',
    ];

    /** Ask git itself, so the assertion reflects real gitignore precedence. */
    async function isIgnored(relPath: string): Promise<boolean> {
        try {
            await execFileAsync('git', ['check-ignore', '-q', relPath], { cwd: projectRoot });
            return true;
        } catch {
            return false;
        }
    }

    async function seedRepo() {
        await execFileAsync('git', ['init', '-q'], { cwd: projectRoot });
        for (const rel of [...SHARED, ...RUNTIME]) {
            const full = path.join(projectRoot, rel);
            await fs.mkdir(path.dirname(full), { recursive: true });
            await fs.writeFile(full, 'x\n');
        }
    }

    it('keeps project memory and the archive out of the ignore list', async () => {
        await seedRepo();
        await createConfigManager(projectRoot).ensureGitignore();

        for (const rel of SHARED) {
            expect(await isIgnored(rel), `${rel} must be committable`).toBe(false);
        }
    });

    it('still ignores runtime data', async () => {
        await seedRepo();
        await createConfigManager(projectRoot).ensureGitignore();

        for (const rel of RUNTIME) {
            expect(await isIgnored(rel), `${rel} must stay ignored`).toBe(true);
        }
    });

    it('names every shared directory explicitly', async () => {
        await createConfigManager(projectRoot).ensureGitignore();
        const content = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        for (const dir of ['specs', 'tasks', 'archive', 'decisions', 'knowledge', 'learnings']) {
            expect(content).toContain(`!/.rulebook/${dir}/`);
        }
    });

    it('upgrades an existing project that predates the new exceptions', async () => {
        // Exactly what a pre-7.1 install left behind.
        await fs.writeFile(
            path.join(projectRoot, '.gitignore'),
            [
                'node_modules/',
                '',
                '# Rulebook - ignore runtime data, keep specs and tasks',
                '/.rulebook/*',
                '!/.rulebook/specs/',
                '!/.rulebook/tasks/',
                '!/.rulebook/tasks/**/*.md',
                '!/.rulebook/rulebook.json',
                '',
            ].join('\n')
        );

        await createConfigManager(projectRoot).ensureGitignore();
        const content = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        expect(content).toContain('!/.rulebook/decisions/');
        expect(content).toContain('!/.rulebook/knowledge/');
        expect(content).toContain('!/.rulebook/learnings/');
        expect(content).toContain('!/.rulebook/archive/');
        // The user's own entries survive, and the superseded block is gone.
        expect(content).toContain('node_modules/');
        expect(content).not.toContain('# Rulebook - ignore runtime data, keep specs and tasks\n');
        expect(content).not.toContain('!/.rulebook/tasks/**/*.md');
    });

    it('absorbs a hand-added exception instead of duplicating it', async () => {
        await fs.writeFile(
            path.join(projectRoot, '.gitignore'),
            ['/.rulebook/*', '!/.rulebook/archive/', ''].join('\n')
        );

        await createConfigManager(projectRoot).ensureGitignore();
        const content = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        expect(content.match(/!\/\.rulebook\/archive\//g)).toHaveLength(1);
        expect(content.match(/^\/\.rulebook\/\*$/gm)).toHaveLength(1);
    });

    it('is idempotent — a second run changes nothing', async () => {
        await fs.writeFile(path.join(projectRoot, '.gitignore'), 'dist/\n');

        const cm = createConfigManager(projectRoot);
        await cm.ensureGitignore();
        const first = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        await cm.ensureGitignore();
        const second = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        expect(second).toBe(first);
        expect(first).toContain('dist/');
        expect(first.match(new RegExp(RULEBOOK_GITIGNORE_HEADER, 'g'))).toHaveLength(1);
    });

    it('creates the file when a project has no .gitignore', async () => {
        await createConfigManager(projectRoot).ensureGitignore();
        const content = await fs.readFile(path.join(projectRoot, '.gitignore'), 'utf-8');

        expect(content).toBe(RULEBOOK_GITIGNORE_BLOCK.join('\n') + '\n');
    });
});
