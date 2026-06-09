import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectLibraries } from '../src/core/detect/detector';
import { generateLibraryRules } from '../src/core/generators/generator';
import { generateRules } from '../src/core/generators/rules-generator';
import { LIBRARY_REGISTRY } from '../src/core/detect/library-registry';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('library detection', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-lib-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    const ids = (libs: { library: string }[]) => libs.map((l) => l.library).sort();

    it('detects npm libraries from package.json dependencies and devDependencies', async () => {
        await fs.writeFile(
            path.join(dir, 'package.json'),
            JSON.stringify({
                dependencies: { react: '^18.0.0', prisma: '^5.0.0' },
                devDependencies: { vitest: '^1.0.0' },
            })
        );

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['prisma', 'react', 'vitest']);
        expect(libs.every((l) => l.confidence === 1.0)).toBe(true);
        expect(libs.find((l) => l.library === 'react')?.indicators).toContain('npm:react');
    });

    it('ignores transitive dependencies not declared in the manifest', async () => {
        await fs.writeFile(
            path.join(dir, 'package.json'),
            JSON.stringify({ dependencies: { express: '^4.0.0' } })
        );

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['express']);
        expect(ids(libs)).not.toContain('react');
    });

    it('detects a library via a marker file with reduced confidence', async () => {
        await fs.writeFile(path.join(dir, 'components.json'), '{}');

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['shadcn']);
        expect(libs[0].confidence).toBe(0.8);
        expect(libs[0].indicators).toContain('file:components.json');
    });

    it('matches scoped npm packages by wildcard prefix', async () => {
        await fs.writeFile(
            path.join(dir, 'package.json'),
            JSON.stringify({
                dependencies: { '@angular/core': '^17.0.0', '@radix-ui/react-dialog': '^1.0.0' },
            })
        );

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['angular', 'radix']);
    });

    it('detects Rust crates from Cargo.toml', async () => {
        await fs.writeFile(
            path.join(dir, 'Cargo.toml'),
            '[package]\nname = "x"\n\n[dependencies]\naxum = "0.7"\ntokio = { version = "1", features = ["full"] }\n'
        );

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['axum', 'tokio']);
    });

    it('detects Python packages from pyproject.toml and requirements.txt', async () => {
        await fs.writeFile(
            path.join(dir, 'pyproject.toml'),
            '[project]\nname = "x"\ndependencies = ["fastapi>=0.110", "pydantic"]\n'
        );
        await fs.writeFile(path.join(dir, 'requirements.txt'), 'SQLAlchemy==2.0.0\n# comment\n');

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['fastapi', 'pydantic', 'sqlalchemy']);
    });

    it('detects Go modules from go.mod including versioned import paths', async () => {
        await fs.writeFile(
            path.join(dir, 'go.mod'),
            'module example.com/x\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgorm.io/gorm v1.25.0\n)\n'
        );

        const libs = await detectLibraries(dir);
        expect(ids(libs)).toEqual(['gin', 'gorm']);
    });

    it('returns an empty list for a project with no recognized manifests', async () => {
        const libs = await detectLibraries(dir);
        expect(libs).toEqual([]);
    });
});

describe('library rule generation', () => {
    it('generateLibraryRules returns sentinel-wrapped template content', async () => {
        const content = await generateLibraryRules('react');
        expect(content).toContain('<!-- REACT:START -->');
        expect(content).toContain('<!-- REACT:END -->');
        expect(content).toContain('React Rules');
    });

    it('every registry entry maps to an existing template file', async () => {
        for (const def of LIBRARY_REGISTRY) {
            const content = await generateLibraryRules(def.id);
            expect(content, `${def.id} template`).toContain(
                `<!-- ${def.id.toUpperCase()}:START -->`
            );
        }
    });
});

describe('path-scoped library rules', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-librules-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it('emits .claude/rules/<lib>.md only for libraries that declare rulePaths', async () => {
        const result = await generateRules(dir, { languages: [] }, ['tailwind', 'zod']);

        const tailwindRule = path.join(dir, '.claude', 'rules', 'tailwind.md');
        const zodRule = path.join(dir, '.claude', 'rules', 'zod.md');

        expect(result.written).toContain(tailwindRule);
        expect(result.written).not.toContain(zodRule);

        const content = await fs.readFile(tailwindRule, 'utf8');
        expect(content).toMatch(/^---\npaths:/);
        expect(content).toContain('Generated by @hivehub/rulebook');
        expect(content).not.toContain('<!-- TAILWIND:START -->');
    });

    it('preserves a user-owned rule file that lacks the generated sentinel', async () => {
        const rulesDir = path.join(dir, '.claude', 'rules');
        await fs.mkdir(rulesDir, { recursive: true });
        const tailwindRule = path.join(rulesDir, 'tailwind.md');
        await fs.writeFile(tailwindRule, '# my own tailwind rules\n');

        const result = await generateRules(dir, { languages: [] }, ['tailwind']);

        expect(result.preserved).toContain(tailwindRule);
        expect(await fs.readFile(tailwindRule, 'utf8')).toBe('# my own tailwind rules\n');
    });
});
