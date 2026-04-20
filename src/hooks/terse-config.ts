/**
 * Default-mode resolution for rulebook-terse.
 *
 * Resolution order (first match wins):
 *
 *   1. `RULEBOOK_TERSE_MODE` environment variable.
 *   2. Project-local config at `<projectRoot>/.rulebook/rulebook.json`,
 *      field `terse.defaultMode`. Project config dominates user-global
 *      because a project's team standard should not be overridden by
 *      an individual contributor's personal preference.
 *   3. User-global config at `$XDG_CONFIG_HOME/rulebook/config.json`,
 *      `~/.config/rulebook/config.json`, or `%APPDATA%/rulebook/config.json`.
 *   4. The fallback literal `brief`.
 *
 * The active agent-tier can also override — see `resolveTierDefault`.
 *
 * Every read silent-fails on filesystem errors. A missing or corrupt
 * config file never prevents the hook from proceeding; we fall through
 * to the next tier.
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { VALID_MODES, type TerseMode } from './safe-flag-io.js';

const FALLBACK_MODE: TerseMode = 'brief';

/**
 * Tier → default-intensity map. Per
 * `.rulebook/specs/RULEBOOK_TERSE.md` §Tier-aware defaults.
 */
const TIER_DEFAULTS: Record<string, TerseMode> = {
  research: 'terse',
  haiku: 'terse',
  standard: 'brief',
  sonnet: 'brief',
  'team-lead': 'brief',
  core: 'off',
  opus: 'off',
};

function readJsonSilently(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asTerseMode(v: unknown): TerseMode | null {
  if (typeof v !== 'string') return null;
  const lower = v.trim().toLowerCase();
  return (VALID_MODES as readonly string[]).includes(lower)
    ? (lower as TerseMode)
    : null;
}

/**
 * Compute the user-global rulebook config path in OS-appropriate order:
 *   - `$XDG_CONFIG_HOME/rulebook/config.json` if XDG_CONFIG_HOME is set.
 *   - `%APPDATA%/rulebook/config.json` on Windows.
 *   - `~/.config/rulebook/config.json` otherwise.
 */
export function getUserGlobalConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, 'rulebook', 'config.json');
  if (platform() === 'win32') {
    const appData = env.APPDATA ?? join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'rulebook', 'config.json');
  }
  return join(homedir(), '.config', 'rulebook', 'config.json');
}

/**
 * Read the project-local config if present.
 */
export function getProjectConfigPath(projectRoot: string): string {
  return join(projectRoot, '.rulebook', 'rulebook.json');
}

/**
 * Translate an agent-tier name into the default intensity level, or
 * null if the tier is unknown.
 */
export function resolveTierDefault(tier: string | undefined): TerseMode | null {
  if (!tier) return null;
  const key = tier.trim().toLowerCase();
  return TIER_DEFAULTS[key] ?? null;
}

/**
 * Resolve the default intensity mode. Options allow tests to inject
 * env + project root deterministically.
 */
export function getDefaultMode(
  options: {
    env?: NodeJS.ProcessEnv;
    projectRoot?: string;
    tier?: string;
  } = {}
): TerseMode {
  const env = options.env ?? process.env;
  const projectRoot = options.projectRoot ?? process.cwd();

  // 1. Env var override.
  const fromEnv = asTerseMode(env.RULEBOOK_TERSE_MODE);
  if (fromEnv) return fromEnv;

  // 2. Project-local .rulebook/rulebook.json → terse.defaultMode.
  const projectConfig = readJsonSilently(getProjectConfigPath(projectRoot));
  const projectTerse = projectConfig?.['terse'];
  if (projectTerse && typeof projectTerse === 'object') {
    const m = asTerseMode((projectTerse as { defaultMode?: unknown }).defaultMode);
    if (m) return m;
  }

  // 3. User-global config.
  const userConfig = readJsonSilently(getUserGlobalConfigPath(env));
  const userTerse = userConfig?.['terse'];
  if (userTerse && typeof userTerse === 'object') {
    const m = asTerseMode((userTerse as { defaultMode?: unknown }).defaultMode);
    if (m) return m;
  }

  // 4. Agent-tier default (only if explicitly provided).
  if (options.tier) {
    const tierMode = resolveTierDefault(options.tier);
    if (tierMode) return tierMode;
  }

  // 5. Literal fallback.
  return FALLBACK_MODE;
}

/**
 * Path to the mode flag file (project-local).
 */
export function getFlagPath(projectRoot: string = process.cwd()): string {
  return join(projectRoot, '.rulebook', '.terse-mode');
}
