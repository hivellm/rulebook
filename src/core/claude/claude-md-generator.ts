import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile, fileExists, ensureDir } from '../../utils/file-system.js';
import { getTemplatesDir } from '../generators/generator.js';
import {
    applyOrchestrationMode,
    ORCHESTRATION_MODES,
    readOrchestrationMode,
    type OrchestrationMode,
} from '../generators/orchestration-mode.js';

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
 * The `CLAUDE.local.md` stub `rulebook init` writes when the file is absent.
 * Claude Code loads it every session, so the context budget counts it.
 */
export const CLAUDE_LOCAL_MD_STUB = [
    '# CLAUDE.local.md',
    '',
    '<!-- Personal per-project overrides. Not committed to version control. -->',
    '<!-- Loaded alongside CLAUDE.md with the same priority. -->',
    '',
    '# Add your personal preferences below. Examples:',
    '# - Preferred test data or sandbox URLs',
    '# - Personal tooling shortcuts',
    '# - Debugging tips specific to your machine',
    '',
].join('\n');

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
    /**
     * Orchestration variant to render. Defaults to `orchestration` in the
     * project's rulebook.json, else 'judgment'.
     */
    orchestration?: OrchestrationMode;
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
    const mode = options.orchestration ?? (await readOrchestrationMode(projectRoot));
    const withTaskLine = applyOrchestrationMode(template, mode).replace(
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

// ── User-edited Orchestration section (v7.5, F-031) ─────────────────────

const ORCHESTRATION_HEADING = '## Orchestration';

/**
 * `## Orchestration` sections that earlier releases wrote into the CLAUDE.md
 * block. Together with the current template in either mode they are the text
 * rulebook owns; any other section text is the user's edit.
 */
const SHIPPED_ORCHESTRATION_SECTIONS = [
    // v7.0.0 – v7.3.x
    `## Orchestration
Subagents, parallel dispatch, and teams are your call — fan out freely when work is
parallel or context-heavy; work directly when it isn't. Rulebook never blocks or
mandates orchestration.`,
    // v7.4.0 pre-release builds
    `## Orchestration
Main session never does the work itself — delegate each task to one subagent, model set
per call: Fable 5.1 architecture, hard bugs, review; Opus 5.5 edits, tests, docs,
refactors (never Fable for simple work); Haiku 4.5 research, summaries. Plan first;
parallelize independent agents; read reports, not files. Subagents check off and archive
their task. Monitor; pause/restart stalled agents; review, then update the CHANGELOG.
Details: \`.rulebook/specs/orchestration.md\`.`,
    `## Orchestration
Gate first: every operator prompt → \`rulebook_gate {prompt}\` (Jev);
act on \`routing\`; unavailable or undecided → these rules. Main session never does the work itself — delegate each task to one subagent, model set
per call: Fable 5.1 architecture, hard bugs, review; Opus 5.5 edits, tests, docs,
refactors (never Fable for simple work); Haiku 4.5 research, summaries. Plan first;
parallelize independent agents; read reports, not files. Subagents archive their task.
Monitor; pause/restart stalled agents; review, then update the CHANGELOG.
Details: \`.rulebook/specs/orchestration.md\`.`,
    // v7.4.0
    `## Orchestration
Gate first: act on Jev \`routing\` from the prompt hook, else from
\`rulebook_gate {prompt}\`; unavailable or undecided → these rules. Main session never does the work itself — delegate each task to one subagent, model set
per call: Fable 5.1 architecture, hard bugs, review; Opus 5.5 edits, tests, docs,
refactors (never Fable for simple work); Haiku 4.5 research, summaries. Plan first;
parallelize independent agents; read reports, not files. Subagents archive their task.
Monitor; pause/restart stalled agents; review, then update CHANGELOG.
See \`.rulebook/specs/orchestration.md\`.`,
];

/**
 * The `## Orchestration` section of a CLAUDE.md block, heading included, up to
 * the next `## ` heading or the block's end sentinel. Null when absent.
 */
export function extractOrchestrationSection(content: string): string | null {
    const lines = content.split('\n');
    const start = lines.findIndex((line) => line.trim() === ORCHESTRATION_HEADING);
    if (start === -1) return null;
    let end = start + 1;
    while (
        end < lines.length &&
        !lines[end].startsWith('## ') &&
        !lines[end].includes(CLAUDE_MD_SENTINEL_END)
    ) {
        end++;
    }
    return lines.slice(start, end).join('\n').trimEnd();
}

/** Swap the `## Orchestration` section of `content` for `section`. */
export function replaceOrchestrationSection(content: string, section: string): string {
    const current = extractOrchestrationSection(content);
    if (current === null) return content;
    return content.replace(current, () => section);
}

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * The user's own Orchestration section in an existing CLAUDE.md block, or
 * null when the block has none or carries text rulebook shipped (any release,
 * either mode). `rulebook update` keeps a returned section instead of
 * regenerating it, so an operator's orchestration choice survives updates.
 */
export async function findUserOrchestrationSection(block: string): Promise<string | null> {
    const section = extractOrchestrationSection(block);
    if (section === null) return null;
    const template = await readClaudeMdTemplate();
    const shipped = [
        ...SHIPPED_ORCHESTRATION_SECTIONS,
        ...ORCHESTRATION_MODES.map(
            (mode) => extractOrchestrationSection(applyOrchestrationMode(template, mode)) ?? ''
        ),
    ].map(squash);
    return shipped.includes(squash(section)) ? null : section;
}
