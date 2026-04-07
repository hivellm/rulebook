import path from 'path';
import { readFile, writeFile, fileExists, ensureDir } from '../utils/file-system.js';
import type { DetectionResult } from '../types.js';
import { getTemplatesDir } from './generator.js';

/**
 * v5.3.0 F-NEW-2 — `.rulebook/COMPACT_CONTEXT.md` seed manager.
 *
 * This file is re-injected by the SessionStart:compact hook after every
 * conversation compaction. It is user-editable. Rulebook seeds it once
 * during `init` from a stack-specific template and never overwrites it
 * afterward — the user owns the contents.
 *
 * NOTE on redundancy with Claude Code's native behavior:
 * Anthropic's official memory docs state that CLAUDE.md and its `@imports`
 * are automatically re-read from disk after `/compact`. So F-NEW-2 is
 * primarily defense-in-depth: a short, always-fresh cheat sheet that the
 * model sees immediately without waiting for the CLAUDE.md re-read to
 * complete, and that can carry reminders that are too ephemeral to belong
 * in CLAUDE.md itself.
 */

export const COMPACT_CONTEXT_FILE = '.rulebook/COMPACT_CONTEXT.md';

/** Language slugs with a shipped stack-specific seed template. */
const SEED_TEMPLATES: readonly string[] = ['typescript', 'rust', 'python', 'go', 'cpp'];

export function getCompactContextPath(projectRoot: string): string {
  return path.join(projectRoot, COMPACT_CONTEXT_FILE);
}

/**
 * Pick the most relevant seed template for the detected stack. Prefers
 * the first matching language in the detection result; falls back to
 * `_default.md` when no shipped template applies.
 */
export function pickSeedTemplate(detection: Pick<DetectionResult, 'languages'>): string {
  for (const entry of detection.languages) {
    const lang = entry.language.toLowerCase();
    if (SEED_TEMPLATES.includes(lang)) return lang;
    // Alias: C → cpp
    if (lang === 'c') return 'cpp';
  }
  return '_default';
}

/**
 * Seed `.rulebook/COMPACT_CONTEXT.md` from a stack template. No-op when
 * the file already exists (user owns it).
 */
export async function seedCompactContext(
  projectRoot: string,
  detection: Pick<DetectionResult, 'languages'>
): Promise<{ path: string; seeded: boolean }> {
  const target = getCompactContextPath(projectRoot);
  if (await fileExists(target)) {
    return { path: target, seeded: false };
  }

  await ensureDir(path.dirname(target));
  const seed = pickSeedTemplate(detection);
  const templatePath = path.join(getTemplatesDir(), 'compact-context', `${seed}.md`);
  const content = (await fileExists(templatePath))
    ? await readFile(templatePath)
    : await readFile(path.join(getTemplatesDir(), 'compact-context', '_default.md'));

  await writeFile(target, content);
  return { path: target, seeded: true };
}
