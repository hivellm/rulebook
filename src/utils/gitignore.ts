import { promises as fs } from 'fs';
import path from 'path';

/**
 * Ensure that a `.gitignore` file at the given project root contains
 * all specified entries. Idempotent: existing entries are not duplicated.
 * Preserves any existing content and comments.
 */
export async function ensureGitignoreEntries(
  projectRoot: string,
  entries: string[]
): Promise<{ path: string; added: string[] }> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  let existing = '';
  try {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // File does not exist — will be created.
  }

  const lines = existing.split('\n');
  const added: string[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    // Check if already present (exact match on a trimmed line)
    if (lines.some((l) => l.trim() === trimmed)) continue;
    lines.push(trimmed);
    added.push(trimmed);
  }

  if (added.length > 0) {
    const final = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
    await fs.writeFile(gitignorePath, final, 'utf-8');
  }

  return { path: gitignorePath, added };
}
