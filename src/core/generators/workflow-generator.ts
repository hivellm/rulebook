import path from 'path';
import { readFile, writeFile, ensureDir, fileExists } from '../../utils/file-system.js';
import type { ProjectConfig } from '../../types.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTemplatesDir(): string {
    return path.join(__dirname, '..', '..', '..', 'templates');
}

export async function generateWorkflows(
    config: ProjectConfig,
    targetDir: string = process.cwd(),
    options: { mode?: 'full' | 'minimal' } = {}
): Promise<string[]> {
    const generatedFiles: string[] = [];
    const workflowsDir = path.join(targetDir, '.github', 'workflows');
    await ensureDir(workflowsDir);

    const templatesDir = path.join(getTemplatesDir(), 'workflows');
    const mode = options.mode ?? 'full';

    // Generate language-specific workflows
    for (const language of config.languages) {
        if (language === 'rust') {
            // Copy Rust workflows
            const rustTest = await copyWorkflow(templatesDir, 'rust-test.yml', workflowsDir);
            generatedFiles.push(rustTest);
            if (mode === 'full') {
                const rustLint = await copyWorkflow(templatesDir, 'rust-lint.yml', workflowsDir);
                generatedFiles.push(rustLint);
            }
        } else if (language === 'typescript') {
            // Copy TypeScript workflows
            const tsTest = await copyWorkflow(templatesDir, 'typescript-test.yml', workflowsDir);
            generatedFiles.push(tsTest);
            if (mode === 'full') {
                const tsLint = await copyWorkflow(
                    templatesDir,
                    'typescript-lint.yml',
                    workflowsDir
                );
                generatedFiles.push(tsLint);
            }
        } else if (language === 'python') {
            // Copy Python workflows
            const pyTest = await copyWorkflow(templatesDir, 'python-test.yml', workflowsDir);
            generatedFiles.push(pyTest);
            if (mode === 'full') {
                const pyLint = await copyWorkflow(templatesDir, 'python-lint.yml', workflowsDir);
                generatedFiles.push(pyLint);
            }
        } else if (language === 'go') {
            // Copy Go workflows
            const goTest = await copyWorkflow(templatesDir, 'go-test.yml', workflowsDir);
            generatedFiles.push(goTest);
            if (mode === 'full') {
                const goLint = await copyWorkflow(templatesDir, 'go-lint.yml', workflowsDir);
                generatedFiles.push(goLint);
            }
        } else if (language === 'java') {
            // Copy Java workflows
            const javaTest = await copyWorkflow(templatesDir, 'java-test.yml', workflowsDir);
            generatedFiles.push(javaTest);
            if (mode === 'full') {
                const javaLint = await copyWorkflow(templatesDir, 'java-lint.yml', workflowsDir);
                generatedFiles.push(javaLint);
            }
        }
    }

    if (mode === 'full') {
        // Always add codespell in full mode
        const codespell = await copyWorkflow(templatesDir, 'codespell.yml', workflowsDir);
        generatedFiles.push(codespell);
    }

    return generatedFiles;
}

async function copyWorkflow(
    templatesDir: string,
    workflowFile: string,
    targetDir: string
): Promise<string> {
    const sourcePath = path.join(templatesDir, workflowFile);
    const targetPath = path.join(targetDir, workflowFile);

    // Check if workflow already exists
    if (await fileExists(targetPath)) {
        // Skip if exists, don't overwrite
        return targetPath;
    }

    const content = await readFile(sourcePath);
    await writeFile(targetPath, content);

    return targetPath;
}
