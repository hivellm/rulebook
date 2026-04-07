import path from 'path';
import { readFile, writeFile, fileExists, ensureDir } from '../utils/file-system.js';
import { getTemplatesDir } from './generator.js';

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

function upsertHook(
  hooks: NonNullable<SettingsShape['hooks']>,
  event: 'PreToolUse' | 'SessionStart' | 'Stop',
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
  event: 'PreToolUse' | 'SessionStart' | 'Stop',
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
  const sourceDir = path.join(getTemplatesDir(), 'hooks');
  const destDir = path.join(projectRoot, '.claude', 'hooks');
  await ensureDir(destDir);

  const scripts: string[] = [];
  if (desire.teamEnforcement) {
    scripts.push('enforce-team-for-background-agents.sh');
    scripts.push('enforce-team-for-background-agents.ps1');
  }
  if (desire.compactContextReinject) {
    scripts.push('on-compact-reinject.sh');
  }
  if (desire.sessionHandoff) {
    scripts.push('check-context-and-handoff.sh');
    scripts.push('resume-from-handoff.sh');
  }
  if (desire.qualityEnforcement) {
    scripts.push('enforce-no-deferred.sh');
    scripts.push('enforce-no-shortcuts.sh');
    scripts.push('enforce-mcp-for-tasks.sh');
  }

  for (const name of scripts) {
    const src = path.join(sourceDir, name);
    if (!(await fileExists(src))) continue; // template not present yet (other feature task)
    const content = await readFile(src);
    await writeFile(path.join(destDir, name), content);
  }
}
