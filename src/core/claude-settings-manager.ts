import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, fileExists, ensureDir } from '../utils/file-system.js';
import { getTemplatesDir } from './generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the directory that contains compiled hook `.js` files.
 * Same navigation pattern as `getTemplatesDir()` so behavior is
 * consistent whether we're running from `dist/core/` (production) or
 * `src/core/` (dev under tsx). Both resolve to `<pkgRoot>/dist/hooks`,
 * which `npm run build` populates from `src/hooks/*.ts`.
 */
function getCompiledHooksDir(): string {
  return path.join(__dirname, '..', '..', 'dist', 'hooks');
}

/**
 * v5.3.0 `.claude/settings.json` manager.
 *
 * Rulebook owns a specific subset of settings.json keys:
 *
 * - `hooks.PreToolUse[]` entries where `matcher === "Agent"` and the
 *   command name contains `enforce-team-for-background-agents`.
 * - `hooks.SessionStart[]` entries where the matcher is `"compact"` and
 *   the command name contains `on-compact-reinject` OR `resume-from-handoff`.
 * - `hooks.Stop[]` entries where the command name contains
 *   `check-context-and-handoff`.
 * - `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` when multi-agent is enabled.
 *
 * Everything else is left alone. This lets projects mix rulebook-managed
 * settings with their own hand-written ones.
 */

export interface ClaudeSettingsDesire {
  /** Enable the PreToolUse team-enforcement hook (F-NEW-1). */
  teamEnforcement?: boolean;
  /** Enable the SessionStart:compact re-injection hook (F-NEW-2). */
  compactContextReinject?: boolean;
  /** Enable the Stop + SessionStart session handoff pair (F-NEW-5). */
  sessionHandoff?: boolean;
  /** Enable PreToolUse enforcement hooks (no-deferred, no-shortcuts, mcp-for-tasks). */
  qualityEnforcement?: boolean;
  /**
   * Enable rulebook-terse hooks (v5.4.0). Installs SessionStart hook
   * `terse-activate.js` and UserPromptSubmit hook `terse-mode-tracker.js`,
   * both invoked as `node <path>`. Requires `npm run build` to have
   * produced `dist/hooks/*.js`.
   */
  terseMode?: boolean;
}

interface HookCommand {
  type: 'command';
  command: string;
}
interface HookEntry {
  matcher?: string;
  hooks: HookCommand[];
}
interface SettingsShape {
  env?: Record<string, string>;
  hooks?: {
    PreToolUse?: HookEntry[];
    SessionStart?: HookEntry[];
    Stop?: HookEntry[];
    [k: string]: HookEntry[] | undefined;
  };
  [k: string]: unknown;
}

const SIGNATURES = {
  teamEnforce: 'enforce-team-for-background-agents',
  compactReinject: 'on-compact-reinject',
  handoffCheck: 'check-context-and-handoff',
  handoffResume: 'resume-from-handoff',
  noDeferred: 'enforce-no-deferred',
  noShortcuts: 'enforce-no-shortcuts',
  mcpForTasks: 'enforce-mcp-for-tasks',
  terseActivate: 'terse-activate.js',
  terseModeTracker: 'terse-mode-tracker.js',
} as const;

export function getClaudeSettingsPath(projectRoot: string): string {
  return path.join(projectRoot, '.claude', 'settings.json');
}

export function getHookScriptPath(projectRoot: string, scriptName: string): string {
  return path.join(projectRoot, '.claude', 'hooks', scriptName);
}

/**
 * Merge the rulebook-owned hook/env entries into an existing settings.json,
 * or create the file if absent. Returns the final serialized settings.
 */
export async function applyClaudeSettings(
  projectRoot: string,
  desire: ClaudeSettingsDesire
): Promise<{ path: string; changed: boolean }> {
  const settingsPath = getClaudeSettingsPath(projectRoot);
  await ensureDir(path.dirname(settingsPath));

  // Copy the hook scripts from templates/ into .claude/hooks/ so the
  // settings.json entries refer to paths that exist locally.
  await installHookScripts(projectRoot, desire);

  let existing: SettingsShape = {};
  let beforeOnDisk: string | null = null;
  if (await fileExists(settingsPath)) {
    try {
      beforeOnDisk = await readFile(settingsPath);
      existing = JSON.parse(beforeOnDisk) as SettingsShape;
    } catch {
      // Corrupt settings.json — do not clobber, bail.
      throw new Error(`Existing ${settingsPath} is not valid JSON`);
    }
  }

  existing.hooks = existing.hooks ?? {};
  existing.env = existing.env ?? {};

  // Team enforcement
  if (desire.teamEnforcement) {
    existing.env['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'] = '1';
    upsertHook(
      existing.hooks,
      'PreToolUse',
      'Agent',
      SIGNATURES.teamEnforce,
      buildCommandFor(projectRoot, 'enforce-team-for-background-agents.sh')
    );
  } else {
    removeHook(existing.hooks, 'PreToolUse', SIGNATURES.teamEnforce);
  }

  // COMPACT_CONTEXT reinject
  if (desire.compactContextReinject) {
    upsertHook(
      existing.hooks,
      'SessionStart',
      'compact',
      SIGNATURES.compactReinject,
      buildCommandFor(projectRoot, 'on-compact-reinject.sh')
    );
  } else {
    removeHook(existing.hooks, 'SessionStart', SIGNATURES.compactReinject);
  }

  // Session handoff pair
  if (desire.sessionHandoff) {
    upsertHook(
      existing.hooks,
      'Stop',
      undefined,
      SIGNATURES.handoffCheck,
      buildCommandFor(projectRoot, 'check-context-and-handoff.sh')
    );
    upsertHook(
      existing.hooks,
      'SessionStart',
      undefined,
      SIGNATURES.handoffResume,
      buildCommandFor(projectRoot, 'resume-from-handoff.sh')
    );
  } else {
    removeHook(existing.hooks, 'Stop', SIGNATURES.handoffCheck);
    removeHook(existing.hooks, 'SessionStart', SIGNATURES.handoffResume);
  }

  // rulebook-terse: SessionStart + UserPromptSubmit (v5.4.0)
  if (desire.terseMode) {
    upsertHook(
      existing.hooks,
      'SessionStart',
      undefined,
      SIGNATURES.terseActivate,
      buildNodeCommandFor(projectRoot, 'terse-activate.js')
    );
    upsertHook(
      existing.hooks,
      'UserPromptSubmit',
      undefined,
      SIGNATURES.terseModeTracker,
      buildNodeCommandFor(projectRoot, 'terse-mode-tracker.js')
    );
  } else {
    removeHook(existing.hooks, 'SessionStart', SIGNATURES.terseActivate);
    removeHook(existing.hooks, 'UserPromptSubmit', SIGNATURES.terseModeTracker);
  }

  // Quality enforcement hooks (no-deferred, no-shortcuts, mcp-for-tasks)
  if (desire.qualityEnforcement) {
    for (const [sig, script] of [
      [SIGNATURES.noDeferred, 'enforce-no-deferred.sh'],
      [SIGNATURES.noShortcuts, 'enforce-no-shortcuts.sh'],
      [SIGNATURES.mcpForTasks, 'enforce-mcp-for-tasks.sh'],
    ] as const) {
      upsertHook(
        existing.hooks,
        'PreToolUse',
        undefined,
        sig,
        buildCommandFor(projectRoot, script)
      );
    }
  } else {
    removeHook(existing.hooks, 'PreToolUse', SIGNATURES.noDeferred);
    removeHook(existing.hooks, 'PreToolUse', SIGNATURES.noShortcuts);
    removeHook(existing.hooks, 'PreToolUse', SIGNATURES.mcpForTasks);
  }

  // Collapse empty arrays/objects so we don't leave noise behind.
  pruneEmptyHooks(existing.hooks);
  if (existing.env && Object.keys(existing.env).length === 0) delete existing.env;

  const after = JSON.stringify(existing, null, 2) + '\n';
  const changed = beforeOnDisk === null || after !== beforeOnDisk;
  if (changed) {
    await writeFile(settingsPath, after);
  }
  return { path: settingsPath, changed };
}

function buildCommandFor(projectRoot: string, scriptName: string): string {
  const scriptPath = getHookScriptPath(projectRoot, scriptName);
  return `bash ${scriptPath.replace(/\\/g, '/')}`;
}

function buildNodeCommandFor(projectRoot: string, scriptName: string): string {
  const scriptPath = getHookScriptPath(projectRoot, scriptName);
  return `node "${scriptPath.replace(/\\/g, '/')}"`;
}

type HookEvent =
  | 'PreToolUse'
  | 'SessionStart'
  | 'Stop'
  | 'UserPromptSubmit';

function upsertHook(
  hooks: NonNullable<SettingsShape['hooks']>,
  event: HookEvent,
  matcher: string | undefined,
  signature: string,
  command: string
): void {
  const list = (hooks[event] ?? []) as HookEntry[];
  hooks[event] = list;

  // Find an existing entry matching our signature; replace its command.
  for (const entry of list) {
    for (const h of entry.hooks) {
      if (h.type === 'command' && h.command.includes(signature)) {
        h.command = command;
        if (matcher !== undefined) entry.matcher = matcher;
        return;
      }
    }
  }

  list.push({
    ...(matcher !== undefined ? { matcher } : {}),
    hooks: [{ type: 'command', command }],
  });
}

function removeHook(
  hooks: NonNullable<SettingsShape['hooks']>,
  event: HookEvent,
  signature: string
): void {
  const list = hooks[event] as HookEntry[] | undefined;
  if (!list) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const entry = list[i];
    entry.hooks = entry.hooks.filter(
      (h) => !(h.type === 'command' && h.command.includes(signature))
    );
    if (entry.hooks.length === 0) list.splice(i, 1);
  }
}

function pruneEmptyHooks(hooks: NonNullable<SettingsShape['hooks']>): void {
  for (const key of Object.keys(hooks)) {
    const list = hooks[key];
    if (!list || list.length === 0) delete hooks[key];
  }
}

/**
 * Copy the hook scripts required by the desired settings from the package
 * `templates/hooks/` directory into the project's `.claude/hooks/` directory.
 * Existing files are overwritten — the hooks are rulebook-owned.
 */
async function installHookScripts(
  projectRoot: string,
  desire: ClaudeSettingsDesire
): Promise<void> {
  const templatesHookDir = path.join(getTemplatesDir(), 'hooks');
  const compiledHookDir = getCompiledHooksDir();
  const destDir = path.join(projectRoot, '.claude', 'hooks');
  await ensureDir(destDir);

  // Shell scripts sourced from `templates/hooks/`.
  const shellScripts: string[] = [];
  if (desire.teamEnforcement) {
    shellScripts.push('enforce-team-for-background-agents.sh');
    shellScripts.push('enforce-team-for-background-agents.ps1');
  }
  if (desire.compactContextReinject) {
    shellScripts.push('on-compact-reinject.sh');
  }
  if (desire.sessionHandoff) {
    shellScripts.push('check-context-and-handoff.sh');
    shellScripts.push('resume-from-handoff.sh');
  }
  if (desire.qualityEnforcement) {
    shellScripts.push('enforce-no-deferred.sh');
    shellScripts.push('enforce-no-shortcuts.sh');
    shellScripts.push('enforce-mcp-for-tasks.sh');
  }

  for (const name of shellScripts) {
    const src = path.join(templatesHookDir, name);
    if (!(await fileExists(src))) continue; // template not present yet (other feature task)
    const content = await readFile(src);
    await writeFile(path.join(destDir, name), content);
  }

  // Compiled JS hooks sourced from `dist/hooks/`. Run `npm run build`
  // first; if the dist output is absent (pure source checkout), skip
  // silently — consistent with the shell-hook best-effort contract.
  if (desire.terseMode) {
    const jsHooks = [
      'terse-activate.js',
      'terse-mode-tracker.js',
      // Dependencies the hooks import at runtime — copy them alongside
      // so relative imports resolve in `.claude/hooks/` without needing
      // the installed rulebook package on the user's project path.
      'safe-flag-io.js',
      'terse-config.js',
    ];
    for (const name of jsHooks) {
      const src = path.join(compiledHookDir, name);
      if (!(await fileExists(src))) continue;
      const content = await readFile(src);
      await writeFile(path.join(destDir, name), content);
    }
  }
}
