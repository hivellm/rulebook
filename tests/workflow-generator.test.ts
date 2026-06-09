import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateWorkflows } from '../src/core/generators/workflow-generator';
import type { ProjectConfig } from '../src/types';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileExists } from '../src/utils/file-system';

describe('workflow-generator', () => {
    let testDir: string;

    const baseConfig: ProjectConfig = {
        languages: ['rust'],
        modules: ['vectorizer'],
        ides: ['cursor'],
        projectType: 'application',
        coverageThreshold: 95,
        strictDocs: true,
        generateWorkflows: true,
    };

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('generateWorkflows', () => {
        it('should generate Rust workflows', async () => {
            const config = { ...baseConfig, languages: ['rust'] };

            const workflows = await generateWorkflows(config, testDir);

            expect(workflows.length).toBeGreaterThan(0);
            expect(workflows.some((w) => w.includes('rust-test.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('rust-lint.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(true);
        });

        it('should generate TypeScript workflows', async () => {
            const config = { ...baseConfig, languages: ['typescript'] };

            const workflows = await generateWorkflows(config, testDir);

            expect(workflows.some((w) => w.includes('typescript-test.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('typescript-lint.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(true);
        });

        it('should generate Python workflows', async () => {
            const config = { ...baseConfig, languages: ['python'] };

            const workflows = await generateWorkflows(config, testDir);

            expect(workflows.some((w) => w.includes('python-test.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('python-lint.yml'))).toBe(true);
        });

        it('should generate workflows for multiple languages', async () => {
            const config = { ...baseConfig, languages: ['rust', 'typescript', 'python'] };

            const workflows = await generateWorkflows(config, testDir);

            expect(workflows.length).toBeGreaterThanOrEqual(7);
        });

        it('should create .github/workflows directory', async () => {
            const config = { ...baseConfig };

            await generateWorkflows(config, testDir);

            const workflowsDir = path.join(testDir, '.github', 'workflows');
            const exists = await fileExists(workflowsDir);
            expect(exists).toBe(true);
        });

        it('should not overwrite existing workflows', async () => {
            const config = { ...baseConfig };
            const workflowsDir = path.join(testDir, '.github', 'workflows');
            await fs.mkdir(workflowsDir, { recursive: true });

            const customContent = '# Custom workflow';
            await fs.writeFile(path.join(workflowsDir, 'rust-test.yml'), customContent);

            await generateWorkflows(config, testDir);

            const content = await fs.readFile(path.join(workflowsDir, 'rust-test.yml'), 'utf-8');
            expect(content).toBe(customContent);
        });

        it('should generate workflows for all supported languages', async () => {
            const languages = ['go', 'java', 'kotlin', 'php', 'ruby', 'swift', 'elixir'];

            for (const lang of languages) {
                const config = { ...baseConfig, languages: [lang] };
                const workflows = await generateWorkflows(config, testDir);
                expect(workflows.length).toBeGreaterThan(0);
            }
        });

        it('should handle C and C++ workflows', async () => {
            const config = { ...baseConfig, languages: ['c', 'cpp'] };
            const workflows = await generateWorkflows(config, testDir);

            // C and C++ share the same workflows
            expect(workflows.length).toBeGreaterThan(0);
        });

        it('should handle csharp workflows', async () => {
            const config = { ...baseConfig, languages: ['csharp'] };
            const workflows = await generateWorkflows(config, testDir);

            // Csharp uses dotnet workflows
            expect(workflows.length).toBeGreaterThan(0);
        });

        it('should generate minimal workflows without lint or codespell', async () => {
            const config = { ...baseConfig, languages: ['typescript'], minimal: true };

            const workflows = await generateWorkflows(config, testDir, { mode: 'minimal' });

            expect(workflows.some((w) => w.includes('typescript-test.yml'))).toBe(true);
            expect(workflows.some((w) => w.includes('typescript-lint.yml'))).toBe(false);
            expect(workflows.some((w) => w.includes('codespell.yml'))).toBe(false);
        });
    });
});
