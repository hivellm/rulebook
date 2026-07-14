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
 * v7 `.claude/settings.json` manager.
 *
 * Rulebook owns a deliberately small subset of settings.json:
 *
 * - ONE optional PreToolUse guard (`protect-task-scaffolding`) — path-only,
 *   protects `.rulebook/tasks/` scaffolding from manual creation. No content
 *   inspection, nothing on any other event (P0: no hook may deny or reroute
 *   orchestration; F-002: zero hot-path hooks).
 * - The full-autonomy permission profile (F-011): `defaultMode: acceptEdits`
 *   plus a broad allow list so the model never stalls on permission prompts.
 *   Rulebook only ADDS rules and only sets defaultMode when absent — user
 *   permissions are never removed or tightened.
 * - Optional statusLine / default model, set only when absent.
 * - `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` when multi-agent is enabled
 *   (enables the native feature; nothing enforces how it is used).
 *
 * Every hook wired by v5/v6 is retired and actively removed on sync via
 * LEGACY_SIGNATURES, so upgrading projects get cleaned automatically.
 */

export interface ClaudeSettingsDesire {
    /** Install the path-only PreToolUse guard for task scaffolding. */
    taskScaffoldingGuard?: boolean;
    /** Apply the full-autonomy permission profile (v7 default). */
    fullAutonomyPermissions?: boolean;
    /** Set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 (feature enable, never enforcement). */
    teamsEnv?: boolean;
    /** Add a command statusLine showing project dir + git branch. Set only when absent. */
    statusLine?: boolean;
    /** Set the default model. Skipped when a model is already configured. */
    defaultModel?: string;
}

/**
 * Full-autonomy permission profile (docs/analysis/v7-performance/, draft 6.4).
 * Additive only — merged into whatever the user already allows.
 */
export const FULL_AUTONOMY_PERMISSIONS: readonly string[] = [
    'Bash(*)',
    'Read(*)',
    'Edit(*)',
    'Write(*)',
    'Glob(*)',
    'Grep(*)',
    'Agent(*)',
    'WebFetch(*)',
    'WebSearch',
    'TodoWrite',
    'mcp__rulebook',
];

/**
 * Portable statusLine: "<dir> | <branch> | ctx NN%".
 * Claude Code pipes a JSON payload on stdin; `context_window.used_percentage`
 * (when present) becomes a context meter — the Cline-style pressure signal at
 * zero hook cost (docs/analysis/session-auto-cleanup/ R2). Pure sh/sed; every
 * segment degrades gracefully when its source is absent.
 */
export const STATUS_LINE_COMMAND =
    'input=$(cat 2>/dev/null); ' +
    'pct=$(printf "%s" "$input" | sed -n "s/.*\\"used_percentage\\":[^0-9]*\\([0-9]*\\).*/\\1/p" | head -1); ' +
    'echo "$(basename "$(pwd)")$(git branch --show-current 2>/dev/null | sed "s/^/ | /")${pct:+ | ctx ${pct}%}"';

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
        [k: string]: HookEntry[] | undefined;
    };
    permissions?: { allow?: string[]; defaultMode?: string; [k: string]: unknown };
    statusLine?: { type: string; command: string };
    model?: string;
    [k: string]: unknown;
}

export const GUARD_SIGNATURE = 'protect-task-scaffolding';
export const GUARD_SCRIPT = 'protect-task-scaffolding.sh';

/**
 * Every hook signature rulebook has ever wired. All are removed on sync
 * (except the active guard, which is re-upserted when desired), so projects
 * upgrading from any v5/v6 version get their settings.json cleaned even when
 * they never toggle a flag.
 */
export const LEGACY_SIGNATURES = [
    // v5.x split enforcement hooks
    'enforce-no-deferred',
    'enforce-no-shortcuts',
    'enforce-mcp-for-tasks',
    // v5.9–v6 consolidated content-regex guard (replaced by the path-only guard)
    'enforce-pre-tool',
    // retired orchestration enforcement (P0)
    'enforce-team-for-background-agents',
    // retired handoff/compact subsystem
    'check-context-and-handoff',
    'resume-from-handoff',
    'on-compact-reinject',
    // retired terse subsystem
    'terse-activate',
    'terse-mode-tracker',
    // update check moved into the CLI
    'update-check',
];

/** Events rulebook may have written to in any past version. */
const MANAGED_EVENTS = ['PreToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit'] as const;

export function getClaudeSettingsPath(projectRoot: string): string {
    return path.join(projectRoot, '.claude', 'settings.json');
}

export function getHookScriptPath(projectRoot: string, scriptName: string): string {
    return path.join(projectRoot, '.claude', 'hooks', scriptName);
}

/**
 * Merge the rulebook-owned entries into an existing settings.json, or create
 * the file if absent. Returns the final path and whether anything changed.
 */
export async function applyClaudeSettings(
    projectRoot: string,
    desire: ClaudeSettingsDesire
): Promise<{ path: string; changed: boolean }> {
    const settingsPath = getClaudeSettingsPath(projectRoot);
    await ensureDir(path.dirname(settingsPath));

    if (desire.taskScaffoldingGuard) {
        await installGuardScript(projectRoot);
    }

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

    // Strip every retired rulebook hook from every managed event.
    for (const event of MANAGED_EVENTS) {
        for (const legacy of LEGACY_SIGNATURES) {
            removeHook(existing.hooks, event, legacy);
        }
        removeHook(existing.hooks, event, GUARD_SIGNATURE);
    }

    // The single optional guard (PreToolUse Edit|Write, path-only).
    if (desire.taskScaffoldingGuard) {
        upsertHook(
            existing.hooks,
            'PreToolUse',
            'Edit|Write',
            GUARD_SIGNATURE,
            `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${GUARD_SCRIPT}`
        );
    }

    // Teams feature enable (never enforcement).
    if (desire.teamsEnv) {
        existing.env['CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'] = '1';
    }

    // Full-autonomy permissions — additive, never tightening.
    if (desire.fullAutonomyPermissions) {
        const permissions = existing.permissions ?? {};
        const current = Array.isArray(permissions.allow) ? permissions.allow : [];
        const merged = [...current];
        for (const rule of FULL_AUTONOMY_PERMISSIONS) {
            if (!merged.includes(rule)) merged.push(rule);
        }
        permissions.allow = merged;
        if (!permissions.defaultMode) {
            permissions.defaultMode = 'acceptEdits';
        }
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

    // Collapse empty containers so we don't leave noise behind.
    pruneEmptyHooks(existing.hooks);
    if (existing.hooks && Object.keys(existing.hooks).length === 0) delete existing.hooks;
    if (existing.env && Object.keys(existing.env).length === 0) delete existing.env;

    const after = JSON.stringify(existing, null, 2) + '\n';
    const changed = beforeOnDisk === null || after !== beforeOnDisk;
    if (changed) {
        await writeFile(settingsPath, after);
    }
    return { path: settingsPath, changed };
}

function upsertHook(
    hooks: NonNullable<SettingsShape['hooks']>,
    event: string,
    matcher: string | undefined,
    signature: string,
    command: string
): void {
    const list = (hooks[event] ?? []) as HookEntry[];
    hooks[event] = list;

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
    event: string,
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

/** Copy the guard script from templates into `.claude/hooks/`. Rulebook-owned. */
async function installGuardScript(projectRoot: string): Promise<void> {
    const src = path.join(getTemplatesDir(), 'hooks', GUARD_SCRIPT);
    if (!(await fileExists(src))) return; // template not present — nothing to install
    const destDir = path.join(projectRoot, '.claude', 'hooks');
    await ensureDir(destDir);
    await writeShellScript(path.join(destDir, GUARD_SCRIPT), { sourcePath: src });
}
