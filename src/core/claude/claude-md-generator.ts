import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile, fileExists, ensureDir } from '../../utils/file-system.js';
import { getTemplatesDir } from '../generators/generator.js';

/**
 * v5.3.0 CLAUDE.md generator.
 *
 * Produces a thin (<150 line) CLAUDE.md composed of `@imports`, aligned with
 * Anthropic's official memory model
 * (https://code.claude.com/docs/en/memory#claude-md-imports).
 *
 * The generated content is wrapped in `<!-- RULEBOOK:START v5.3.0 -->` /
 * `<!-- RULEBOOK:END -->` sentinels so future `rulebook update` runs can
 * regenerate the block in-place while preserving any user content outside
 * the sentinels.
 */

export const CLAUDE_MD_FILE = 'CLAUDE.md';
// Version-tolerant prefix: matches v5.3.0/v6 blocks in existing files AND v7+.
export const CLAUDE_MD_SENTINEL_START = '<!-- RULEBOOK:START v';
export const CLAUDE_MD_SENTINEL_END = '<!-- RULEBOOK:END -->';
export const CLAUDE_MD_TEMPLATE_NAME = 'claude-md.md';

/**
 * Marker substrings on `@import` lines that may be conditionally included
 * depending on file presence in the project root.
 */
const CONDITIONAL_IMPORTS: Array<{ marker: string; targets: string[] }> = [
    { marker: '@AGENTS.override.md', targets: ['AGENTS.override.md'] },
    { marker: '@.rulebook/STATE.md', targets: ['.rulebook/STATE.md'] },
    { marker: '@.rulebook/PLANS.md', targets: ['.rulebook/PLANS.md'] },
];

export interface ClaudeMdGenerationOptions {
    /**
     * If true, every `@import` line in the template is kept regardless of
     * whether the target file exists. Default false: missing imports are
     * commented out so Claude Code does not warn about broken `@imports`.
     */
    keepAllImports?: boolean;
    /**
     * Task backend the project is configured for. Decides which tracking line
     * the generated file carries. Defaults to the file backend.
     */
    taskBackend?: 'files' | 'github';
    /** Issue label used when taskBackend is 'github'. */
    taskLabel?: string;
}

/**
 * Placeholder in `templates/core/claude-md.md`, always substituted — same
 * mechanism as LANGUAGE_REFS in the lean AGENTS.md template. Keeping it a token
 * rather than matching prose means a template reword cannot silently strip the
 * github-mode variant; the generator tests fail instead.
 */
const TASK_TRACKING_PLACEHOLDER = 'TASK_TRACKING_LINE';

function renderTaskTrackingLine(options: ClaudeMdGenerationOptions): string {
    if (options.taskBackend === 'github') {
        const label = options.taskLabel || 'rulebook-task';
        return `Multi-session or multi-phase work: tracked as GitHub issues (label \`${label}\`) via \`gh\` or the \`rulebook\` MCP (\`rulebook_task\`).`;
    }
    return 'Multi-session or multi-phase work: track via the `rulebook` MCP (`rulebook_task`).';
}

export function getClaudeMdPath(projectRoot: string): string {
    return path.join(projectRoot, CLAUDE_MD_FILE);
}

/**
 * Read the v5.3.0 CLAUDE.md template from the package's templates directory.
 */
export async function readClaudeMdTemplate(): Promise<string> {
    const templatePath = path.join(getTemplatesDir(), 'core', CLAUDE_MD_TEMPLATE_NAME);
    if (!(await fileExists(templatePath))) {
        throw new Error(`CLAUDE.md template not found at ${templatePath}`);
    }
    return await readFile(templatePath);
}

/**
 * Render the CLAUDE.md body for a given project. The result is the full
 * file contents to write (including the RULEBOOK sentinels). When merging
 * with an existing CLAUDE.md that already has content outside the sentinels,
 * use {@link mergeIntoExisting} via `merger.ts`.
 */
export async function generateClaudeMd(
    projectRoot: string,
    options: ClaudeMdGenerationOptions = {}
): Promise<string> {
    const template = await readClaudeMdTemplate();
    // When the caller does not state a backend, take it from the project's own
    // config so every call site (merger, update, init) adapts without threading
    // the option through.
    const resolved =
        options.taskBackend === undefined
            ? { ...options, ...(await readTaskConfig(projectRoot)) }
            : options;
    const withTaskLine = template.replace(
        TASK_TRACKING_PLACEHOLDER,
        renderTaskTrackingLine(resolved)
    );
    return resolveImports(withTaskLine, projectRoot, resolved);
}

/** Read `tasks.backend` / `tasks.label` from `.rulebook/rulebook.json`. */
async function readTaskConfig(
    projectRoot: string
): Promise<Pick<ClaudeMdGenerationOptions, 'taskBackend' | 'taskLabel'>> {
    try {
        const raw = await readFile(path.join(projectRoot, '.rulebook', 'rulebook.json'));
        const tasks = JSON.parse(raw).tasks;
        if (tasks?.backend === 'github') {
            return { taskBackend: 'github', taskLabel: tasks.label };
        }
    } catch {
        // No config or unreadable — the file backend is the default.
    }
    return { taskBackend: 'files' };
}

/**
 * Walk the template line-by-line and comment out any `@<file>` import whose
 * target does not exist in the project. We only ever transform lines whose
 * trimmed content matches one of the well-known conditional markers; this
 * keeps the template's other content (including `@AGENTS.md`, which is
 * always required) untouched.
 */
function resolveImports(
    template: string,
    projectRoot: string,
    options: ClaudeMdGenerationOptions
): string {
    if (options.keepAllImports) return template;

    const lines = template.split('\n');
    return lines
        .map((line) => {
            const trimmed = line.trim();
            const match = CONDITIONAL_IMPORTS.find((c) => trimmed === c.marker);
            if (!match) return line;

            const allExist = match.targets.every((rel) => existsSync(path.join(projectRoot, rel)));
            if (allExist) return line;

            return `<!-- ${trimmed} (skipped — target file not present) -->`;
        })
        .join('\n');
}

/**
 * Write the CLAUDE.md file to disk. Creates a backup snapshot in
 * `.rulebook/backup/` before overwriting. Returns the absolute path
 * to the written file and the backup (if created).
 */
export async function writeClaudeMd(
    projectRoot: string,
    content: string
): Promise<{ path: string; backupPath: string | null }> {
    const target = getClaudeMdPath(projectRoot);
    let backupPath: string | null = null;
    if (await fileExists(target)) {
        const backupDir = path.join(projectRoot, '.rulebook', 'backup');
        await ensureDir(backupDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupPath = path.join(backupDir, `CLAUDE.md.backup-${timestamp}`);
        const { promises: fs } = await import('fs');
        await fs.copyFile(target, backupPath);
    }
    await writeFile(target, content);
    return { path: target, backupPath };
}

/**
 * Detect whether a file's content already contains a v5.3.0-style RULEBOOK
 * block. Used by the merger to decide between in-place block replacement
 * and full-file overwrite.
 */
export function hasV2Sentinels(content: string): boolean {
    return content.includes(CLAUDE_MD_SENTINEL_START) && content.includes(CLAUDE_MD_SENTINEL_END);
}
