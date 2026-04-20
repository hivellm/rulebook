/**
 * Discover candidate markdown memory files in a project.
 *
 * Caveman-compress is advertised as a tool for the files the model
 * READS on every session, so this helper surfaces the same class of
 * files: project-root memory markdown (`CLAUDE.md`, `AGENTS.md`,
 * `AGENTS.override.md`) plus long-lived `.rulebook/` notes and
 * knowledge/learning entries.
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface Candidate {
  relPath: string;
  absPath: string;
  bytes: number;
  hasBackup: boolean;
  backupBytes?: number;
  backupRatio?: number;
}

const ROOT_FILE_GLOB = ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'AGENTS.override.md'];

const RULEBOOK_SUBPATHS: readonly string[] = [
  '.rulebook/PLANS.md',
  '.rulebook/STATE.md',
  '.rulebook/knowledge',
  '.rulebook/learnings',
];

async function safeStat(path: string): Promise<{ exists: boolean; size: number }> {
  try {
    const s = await stat(path);
    return { exists: true, size: s.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

function backupPathFor(filePath: string): string {
  return filePath.replace(/\.md$/i, '.original.md');
}

async function walkMarkdown(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walkMarkdown(full, out);
    } else if (e.name.endsWith('.md') && !e.name.endsWith('.original.md')) {
      out.push(full);
    }
  }
}

export async function listCompressCandidates(projectRoot: string): Promise<Candidate[]> {
  const found: string[] = [];

  for (const name of ROOT_FILE_GLOB) {
    const p = join(projectRoot, name);
    if ((await safeStat(p)).exists) found.push(p);
  }

  for (const sub of RULEBOOK_SUBPATHS) {
    const p = join(projectRoot, sub);
    const s = await safeStat(p);
    if (!s.exists) continue;
    try {
      const statRes = await stat(p);
      if (statRes.isDirectory()) {
        await walkMarkdown(p, found);
      } else {
        found.push(p);
      }
    } catch {
      /* ignore */
    }
  }

  const candidates: Candidate[] = [];
  for (const abs of found) {
    const fileStat = await safeStat(abs);
    const backupPath = backupPathFor(abs);
    const backupStat = await safeStat(backupPath);
    const relPath = abs.startsWith(projectRoot)
      ? abs.slice(projectRoot.length).replace(/^[\\/]/, '')
      : abs;

    const candidate: Candidate = {
      relPath,
      absPath: abs,
      bytes: fileStat.size,
      hasBackup: backupStat.exists,
    };

    if (backupStat.exists && backupStat.size > 0) {
      candidate.backupBytes = backupStat.size;
      candidate.backupRatio = fileStat.size / backupStat.size;
    }

    candidates.push(candidate);
  }

  // Sort by largest first so the caller sees the biggest win targets.
  candidates.sort((a, b) => b.bytes - a.bytes);
  return candidates;
}
