import path from 'path';
import {
  readFile,
  writeFile,
  writeShellScript,
  fileExists,
  ensureDir,
} from '../../utils/file-system.js';
import { getTemplatesDir } from '../generators/generator.js';

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
  /** Add a safe read-only Bash + rulebook MCP permissions allowlist. */
  permissionsAllowlist?: boolean;
  /** Add a command statusLine showing project dir + git branch. */
  statusLine?: boolean;
  /** Set the default model (cost-aware daily driver). Skipped when undefined. */
  defaultModel?: string;
  /**
   * Enable the SessionStart rulebook update-check hook. Compares the project's
   * installed rulebook version against the latest on npm (cached 24h) and emits
   * an advisory so Claude can offer to run `rulebook update`.
   */
  updateCheck?: boolean;
}

/**
 * Safe, read-only Bash commands plus the rulebook MCP server. These never
 * mutate the working tree, so auto-approving them removes routine permission
 * prompts without weakening safety.
 */
const SAFE_PERMISSIONS: readonly string[] = [
  'Bash(ls:*)',
  'Bash(cat:*)',
  'Bash(grep:*)',
  'Bash(rg:*)',
  'Bash(find:*)',
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git blame:*)',
  'Bash(npm run type-check:*)',
  'Bash(npm test:*)',
  'mcp__rulebook',
];

/** Portable statusLine: "<dir> | <branch>" (branch segment omitted outside a repo). */
const STATUS_LINE_COMMAND =
  'echo "$(basename "$(pwd)")$(git branch --show-current 2>/dev/null | sed "s/^/ | /")"';

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
  permissions?: { allow?: string[]; [k: string]: unknown };
  statusLine?: { type: string; command: string };
  model?: string;
  [k: string]: unknown;
}

const SIGNATURES = {
  teamEnforce: 'enforce-team-for-background-agents',
  compactReinject: 'on-compact-reinject',
  handoffCheck: 'check-context-and-handoff',
  handoffResume: 'resume-from-handoff',
  enforcePreTool: 'enforce-pre-tool',
  terseActivate: 'terse-activate.sh',
  terseModeTracker: 'terse-mode-tracker.sh',
  updateCheck: 'update-check.sh',
} as const;

// Hook signatures retired in past releases. Always removed during sync so
// stale settings.json entries from older rulebook versions get cleaned up
// even when the user upgrades without changing their `desire` flags.
const LEGACY_SIGNATURES = ['enforce-no-deferred', 'enforce-no-shortcuts', 'enforce-mcp-for-tasks'];

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

  // SessionStart rulebook update-check
  if (desire.updateCheck) {
    upsertHook(
      existing.hooks,
      'SessionStart',
      undefined,
      SIGNATURES.updateCheck,
      buildCommandFor(projectRoot, 'update-check.sh')
    );
  } else {
    removeHook(existing.hooks, 'SessionStart', SIGNATURES.updateCheck);
  }

  // rulebook-terse: SessionStart + UserPromptSubmit (v5.4.0)
  if (desire.terseMode) {
    upsertHook(
      existing.hooks,
      'SessionStart',
      undefined,
      SIGNATURES.terseActivate,
      buildCommandFor(projectRoot, 'terse-activate.sh')
    );
    upsertHook(
      existing.hooks,
      'UserPromptSubmit',
      undefined,
      SIGNATURES.terseModeTracker,
      buildCommandFor(projectRoot, 'terse-mode-tracker.sh')
    );
  } else {
    removeHook(existing.hooks, 'SessionStart', SIGNATURES.terseActivate);
    removeHook(existing.hooks, 'UserPromptSubmit', SIGNATURES.terseModeTracker);
  }

  // Quality enforcement: single consolidated PreToolUse hook (v5.6.0).
  // The three legacy scripts (enforce-no-deferred/no-shortcuts/mcp-for-tasks)
  // were merged into enforce-pre-tool.sh for ~3x lower per-tool latency.
  // The matcher restricts spawn to Edit/Write/Bash — Read/Glob/Grep/Agent/
  // MCP/etc never trigger any deny rule, so spawning the hook for them is
  // wasted work (cuts ~60% of invocations on a typical session).
  if (desire.qualityEnforcement) {
    upsertHook(
      existing.hooks,
      'PreToolUse',
      'Edit|Write|Bash',
      SIGNATURES.enforcePreTool,
      buildCommandFor(projectRoot, 'enforce-pre-tool.sh')
    );
  } else {
    removeHook(existing.hooks, 'PreToolUse', SIGNATURES.enforcePreTool);
  }
  // Always strip stale entries from older rulebook versions, regardless of
  // the qualityEnforcement flag. Without this, users upgrading from v5.5.x
  // would still have settings.json pointing at deleted scripts.
  for (const legacy of LEGACY_SIGNATURES) {
    removeHook(existing.hooks, 'PreToolUse', legacy);
  }

  // Safe read-only permissions allowlist (additive, de-duplicated).
  if (desire.permissionsAllowlist) {
    const permissions = existing.permissions ?? {};
    const current = Array.isArray(permissions.allow) ? permissions.allow : [];
    const merged = [...current];
    for (const rule of SAFE_PERMISSIONS) {
      if (!merged.includes(rule)) merged.push(rule);
    }
    permissions.allow = merged;
    existing.permissions = permissions;
  }

  // statusLine — only set when absent, never clobber a user-authored one.
  if (desire.statusLine && !existing.statusLine) {
    existing.statusLine = { type: 'command', command: STATUS_LINE_COMMAND };
  }

  // Default model — only set when absent, respect an explicit user choice.
  if (desire.defaultModel && !existing.model) {
    existing.model = desire.defaultModel;
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

function buildCommandFor(_projectRoot: string, scriptName: string): string {
  // Use $CLAUDE_PROJECT_DIR so the committed settings.json stays portable
  // across machines/clones. Claude Code expands it to the project root at
  // runtime. The script itself is still installed under the real projectRoot
  // by installHookScripts().
  return `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${scriptName}`;
}

type HookEvent = 'PreToolUse' | 'SessionStart' | 'Stop' | 'UserPromptSubmit';

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
  const destDir = path.join(projectRoot, '.claude', 'hooks');
  await ensureDir(destDir);

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
    shellScripts.push('enforce-pre-tool.sh');
  }
  if (desire.terseMode) {
    shellScripts.push('terse-activate.sh');
    shellScripts.push('terse-activate.ps1');
    shellScripts.push('terse-mode-tracker.sh');
    shellScripts.push('terse-mode-tracker.ps1');
  }
  if (desire.updateCheck) {
    shellScripts.push('update-check.sh');
    shellScripts.push('update-check.ps1');
  }

  for (const name of shellScripts) {
    const src = path.join(templatesHookDir, name);
    if (!(await fileExists(src))) continue; // template not present yet
    const dest = path.join(destDir, name);
    if (name.endsWith('.sh')) {
      await writeShellScript(dest, { sourcePath: src });
    } else {
      const content = await readFile(src);
      await writeFile(dest, content);
    }
  }
}
