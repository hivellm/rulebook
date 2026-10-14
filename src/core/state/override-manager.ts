import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileExists } from '../../utils/file-system.js';

const OVERRIDE_FILE = 'AGENTS.override.md';

/**
 * Get path to AGENTS.override.md in the project root.
 */
export function getOverridePath(projectRoot: string): string {
    return path.join(projectRoot, OVERRIDE_FILE);
}

/**
 * Check if AGENTS.override.md exists.
 */
export function overrideExists(projectRoot: string): boolean {
    return existsSync(getOverridePath(projectRoot));
}

// ── Rulebook rules block for Codex (v7.5, F-034) ────────────────────────
//
// Codex loads AGENTS.override.md INSTEAD of AGENTS.md when both sit in the same
// folder, so a project with an override never shows Codex the generated rules.
// Rulebook therefore keeps a small, marked block at the top of the override and
// regenerates it on init/update; everything outside the markers is the user's
// and is never touched.

export const CODEX_BLOCK_START = '<!-- RULEBOOK-CODEX:START';
export const CODEX_BLOCK_END = '<!-- RULEBOOK-CODEX:END -->';
export const CODEX_BLOCK_TEMPLATE = 'agents-override-codex.md';
// The block, its line ending, and the one blank separator line sync adds.
const CODEX_BLOCK_RE =
    /<!-- RULEBOOK-CODEX:START[\s\S]*?<!-- RULEBOOK-CODEX:END -->[^\S\r\n]*(?:\r?\n)?(?:\r?\n)?/;

/** The override's content without rulebook's Codex block. */
export function stripCodexBlock(content: string): string {
    return content.replace(CODEX_BLOCK_RE, '');
}

/** The Codex block for the project's orchestration mode, markers included. */
export async function renderCodexBlock(projectRoot: string): Promise<string> {
    const { getTemplatesDir } = await import('../generators/generator.js');
    const { applyOrchestrationMode, readOrchestrationMode } =
        await import('../generators/orchestration-mode.js');
    const template = await readFile(
        path.join(getTemplatesDir(), 'core', CODEX_BLOCK_TEMPLATE),
        'utf-8'
    );
    const mode = await readOrchestrationMode(projectRoot);
    return applyOrchestrationMode(template, mode).trim() + '\n';
}

export type CodexBlockSync = 'no-override' | 'added' | 'updated' | 'unchanged';

/**
 * Put rulebook's Codex block at the top of AGENTS.override.md (or refresh it in
 * place), leaving the user's content below it byte-for-byte. Without an
 * override Codex reads AGENTS.md itself, so nothing is written.
 */
export async function syncCodexBlock(projectRoot: string): Promise<CodexBlockSync> {
    const overridePath = getOverridePath(projectRoot);
    if (!existsSync(overridePath)) return 'no-override';

    const current = await readFile(overridePath, 'utf-8');
    const hadBlock = current.includes(CODEX_BLOCK_START);
    const userContent = stripCodexBlock(current);
    // Match the file's line endings so a CRLF override stays CRLF.
    const eol = current.includes('\r\n') ? '\r\n' : '\n';
    const block = (await renderCodexBlock(projectRoot)).replace(/\n/g, eol);
    const next = `${block}${eol}${userContent}`;
    if (next === current) return 'unchanged';

    await writeFile(overridePath, next);
    return hadBlock ? 'updated' : 'added';
}

/**
 * Read override content, stripping OVERRIDE:START/END markers.
 * Returns empty string if file does not exist or has no custom content.
 * Rulebook's Codex block is never part of the result.
 */
export async function readOverrideContent(projectRoot: string): Promise<string> {
    const overridePath = getOverridePath(projectRoot);
    if (!existsSync(overridePath)) return '';

    const raw = stripCodexBlock(await readFile(overridePath, 'utf-8'));

    // Strip marker comments — return only actual content between them
    const match = raw.match(/<!-- OVERRIDE:START -->([\s\S]*?)<!-- OVERRIDE:END -->/);
    if (!match) return raw.trim();

    const content = match[1].trim();

    // If it still contains only the template placeholder text, treat as empty
    if (
        content.includes('This file contains project-specific directives') &&
        !content.split('\n').some((line) => line.startsWith('- ') && !line.includes('**Example'))
    ) {
        return '';
    }

    return content;
}

/**
 * Create AGENTS.override.md from template if it does not already exist.
 * Returns true if file was created, false if it already existed.
 */
export async function initOverride(projectRoot: string): Promise<boolean> {
    const overridePath = getOverridePath(projectRoot);
    if (existsSync(overridePath)) return false;

    const { getTemplatesDir } = await import('../generators/generator.js');
    const templatePath = path.join(getTemplatesDir(), 'core', 'agents-override.md');

    let templateContent = '';
    if (await fileExists(templatePath)) {
        templateContent = await readFile(templatePath, 'utf-8');
    } else {
        templateContent = [
            '<!-- OVERRIDE:START -->',
            '# Project-Specific Overrides',
            '',
            'Add your custom rules and team conventions here.',
            'This file is never overwritten by `rulebook init` or `rulebook update`.',
            '<!-- OVERRIDE:END -->',
            '',
        ].join('\n');
    }

    await writeFile(overridePath, templateContent);
    return true;
}

/**
 * Clear AGENTS.override.md back to the empty template. Rulebook's Codex block,
 * when present, is kept so Codex still sees the rules.
 */
export async function clearOverride(projectRoot: string): Promise<void> {
    const overridePath = getOverridePath(projectRoot);
    const hadCodexBlock =
        existsSync(overridePath) &&
        (await readFile(overridePath, 'utf-8')).includes(CODEX_BLOCK_START);
    const emptyContent = [
        '<!-- OVERRIDE:START -->',
        '# Project-Specific Overrides',
        '',
        'Add your custom rules and team conventions here.',
        'This file is never overwritten by `rulebook init` or `rulebook update`.',
        '<!-- OVERRIDE:END -->',
        '',
    ].join('\n');
    await writeFile(overridePath, emptyContent);
    if (hadCodexBlock) await syncCodexBlock(projectRoot);
}
