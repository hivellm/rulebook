/**
 * Claude Code SessionStart hook for rulebook-terse.
 *
 * Runs once per session. Responsibilities:
 *
 *   1. Resolve the active intensity mode (env → project config →
 *      user-global config → tier default → `brief`).
 *   2. Write the mode to `<project>/.rulebook/.terse-mode` using
 *      `safeWriteFlag`.
 *   3. Read the invocable `rulebook-terse` SKILL.md, filter the
 *      intensity table + examples down to only the active level's
 *      rows, and emit the filtered body to stdout.
 *
 * Claude Code treats SessionStart stdout as hidden `additionalContext`
 * — the user never sees the injection in their transcript, but the
 * model's system context now carries the compression rules.
 *
 * Silent-fails on every filesystem error. A broken hook must NEVER
 * prevent session start.
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeWriteFlag, type TerseMode } from './safe-flag-io.js';
import {
  getDefaultMode,
  getFlagPath,
} from './terse-config.js';

/**
 * Minimal fallback ruleset emitted when SKILL.md cannot be found on
 * disk — e.g. a standalone installer that did not copy the templates
 * directory. Matches the Caveman precedent (see analysis report 06).
 */
const FALLBACK_RULES = `Respond tersely. All technical substance stays. Only fluff dies.

## Persistence
ACTIVE EVERY RESPONSE once set. Off only via "/rulebook-terse off", "normal mode", or session end.

## Rules
Drop filler (just, really, basically), pleasantries, hedging. Keep technical terms exact. Code blocks byte-for-byte unchanged.

## Auto-Clarity
Full prose for: security warnings, destructive-op confirmations, quality-gate failures, multi-step sequences, user confusion.

## Boundaries
Code/tests/commits/specs: unchanged.`;

/**
 * Strip YAML frontmatter from a SKILL.md body. Returns the body as-is
 * if no frontmatter is present.
 */
export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return match ? match[1] : content;
}

/**
 * Filter the intensity table + worked-example rows to keep only the
 * active level's row. The SKILL.md has six intensity-level rows but
 * the model only needs the one it will use this session; keeping all
 * six wastes context and invites cross-level confusion.
 *
 * Rows start with `| **<level>** |` for the table and `- **<level>**:`
 * for the examples. The table header + separator rows pass through
 * unchanged because they don't match the level-row pattern.
 */
export function filterSkillForLevel(body: string, level: TerseMode): string {
  const out: string[] = [];
  const tableRow = /^\|\s*\*\*(\S+?)\*\*\s*\|/;
  const exampleLine = /^-\s*\*\*(\S+?)\*\*\s*:/;

  for (const line of body.split('\n')) {
    const tMatch = line.match(tableRow);
    if (tMatch) {
      if (tMatch[1] === level) out.push(line);
      continue;
    }
    const eMatch = line.match(exampleLine);
    if (eMatch) {
      if (eMatch[1] === level) out.push(line);
      continue;
    }
    out.push(line);
  }

  return out.join('\n');
}

/**
 * Build the full SessionStart stdout payload.
 */
export function buildSessionStartOutput(args: {
  mode: TerseMode;
  skillBody: string | null;
}): string {
  const header = `RULEBOOK-TERSE MODE ACTIVE — level: ${args.mode}`;
  if (args.skillBody === null) {
    return `${header}\n\n${FALLBACK_RULES}`;
  }
  const filtered = filterSkillForLevel(args.skillBody, args.mode);
  return `${header}\n\n${filtered}`.trimEnd() + '\n';
}

/**
 * Read the installed `rulebook-terse` SKILL.md. Returns the raw content
 * on success, or null if no candidate path resolves.
 */
export function loadSkillBody(projectRoot: string): string | null {
  const candidates = [
    join(projectRoot, '.claude', 'skills', 'rulebook-terse', 'SKILL.md'),
    join(projectRoot, 'templates', 'skills', 'core', 'rulebook-terse', 'SKILL.md'),
  ];
  for (const path of candidates) {
    try {
      if (existsSync(path)) {
        return stripFrontmatter(readFileSync(path, 'utf8'));
      }
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/**
 * CLI entry for the SessionStart hook. Always exits 0 — any failure
 * silently falls back to a no-op so session start is never blocked.
 */
export function main(
  options: {
    projectRoot?: string;
    env?: NodeJS.ProcessEnv;
    stdout?: NodeJS.WriteStream;
  } = {}
): void {
  try {
    const projectRoot = options.projectRoot ?? process.cwd();
    const env = options.env ?? process.env;
    const stdout = options.stdout ?? process.stdout;

    const mode = getDefaultMode({ env, projectRoot, tier: env.RULEBOOK_AGENT_TIER });
    const flagPath = getFlagPath(projectRoot);

    if (mode === 'off') {
      try {
        unlinkSync(flagPath);
      } catch {
        /* flag already absent — fine */
      }
      return;
    }

    safeWriteFlag(flagPath, mode);

    const skillBody = loadSkillBody(projectRoot);
    const output = buildSessionStartOutput({ mode, skillBody });
    stdout.write(output);
  } catch {
    /* silent fail — never block session start */
  }
}

// CLI guard — only auto-run when invoked as the entry script.
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}
