import path from 'path';
import { existsSync } from 'fs';
import {
    readFile,
    writeFile,
    writeShellScript,
    fileExists,
    ensureDir,
} from '../../utils/file-system.js';
import { getTemplatesDir } from '../generators/generator.js';
import { PROMPT_HOOK_DEFAULTS, promptHookTimeoutSec } from '../typesafe/prompt-hook.js';

/**
 * v7 `.claude/settings.json` manager.
 *
 * Rulebook owns a deliberately small subset of settings.json:
 *
 * - ONE optional PreToolUse guard (`protect-task-scaffolding`) — path-only,
 *   protects `.rulebook/tasks/` scaffolding from manual creation. No content
 *   inspection (P0: no hook may deny or reroute orchestration).
 * - v7.3: a second optional PreToolUse guard (`no-os-scheduling`) on
 *   Bash|Edit|Write. A keyword prefilter keeps it off the hot path; it denies
 *   only commands/paths that create OS schedules (Tier 1 #7).
 * - v7.4: one optional UserPromptSubmit hook (`jev-gate`) that runs the Jev
 *   entry gate on every prompt and injects its routing as context. This
 *   reverses F-002 ("zero hot-path hooks") on purpose: it is fail-open, bounded
 *   by a deadline plus a settings `timeout`, and blocks only a high-confidence
 *   OS-scheduling request. It still never denies or reroutes orchestration.
 * - v7.4: one opt-in PreToolUse hook (`jev-gate.sh tool`) that asks Jev about
 *   risky tool calls after cheap deterministic checks. Fail-open, bounded by a
 *   deadline plus a settings `timeout`; answers deny/ask, never allow.
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
    /**
     * v7.3: install the PreToolUse guard that denies OS-level scheduling
     * (crontab/at, systemd timers, launchd, Task Scheduler) on Bash and
     * scheduler paths on Edit|Write. Scheduling belongs in the application.
     */
    osSchedulingGuard?: boolean;
    /**
     * v7.4: install the UserPromptSubmit hook that runs the Jev entry gate on
     * every prompt (`.claude/hooks/jev-gate.sh prompt`). False/absent removes it.
     */
    jevPromptGate?: boolean;
    /** Deadline the prompt hook runs with (`gate.promptHook.deadlineMs`); sets its `timeout`. Default 5000. */
    jevPromptGateDeadlineMs?: number;
    /**
     * v7.4: install the opt-in PreToolUse tool gate (`.claude/hooks/jev-gate.sh
     * tool`) with this matcher and `timeout` (seconds). Absent removes it.
     */
    jevToolGate?: { matcher: string; timeoutSec: number };
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
    /** Seconds before Claude Code cancels the hook. */
    timeout?: number;
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
/** v7.3: second optional guard — no OS-level scheduling (Tier 1 #7). */
export const OS_SCHEDULING_GUARD_SIGNATURE = 'no-os-scheduling';
export const OS_SCHEDULING_GUARD_SCRIPT = 'no-os-scheduling.sh';
export const OS_SCHEDULING_GUARD_MATCHER = 'Bash|Edit|Write';
/**
 * v7.4: Jev gate hook wrapper. One script, two entries told apart by the
 * argument: `jev-gate.sh prompt` (UserPromptSubmit) and `jev-gate.sh tool`
 * (PreToolUse). Each signature matches only its own entry, so toggling one
 * never strips the other.
 */
export const JEV_GATE_SCRIPT = 'jev-gate.sh';
export const JEV_GATE_SIGNATURE = `${JEV_GATE_SCRIPT} prompt`;
export const JEV_TOOL_GATE_SIGNATURE = `${JEV_GATE_SCRIPT} tool`;

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

/** Hook scripts rulebook ships today (installed into `.claude/hooks/`). */
const CURRENT_HOOK_SCRIPTS = [GUARD_SCRIPT, OS_SCHEDULING_GUARD_SCRIPT, JEV_GATE_SCRIPT];

/** Signatures of the entries rulebook re-upserts on every sync. */
const CURRENT_SIGNATURES = [
    GUARD_SIGNATURE,
    OS_SCHEDULING_GUARD_SIGNATURE,
    JEV_GATE_SIGNATURE,
    JEV_TOOL_GATE_SIGNATURE,
];

/** `.claude/hooks/<file>` references in a hook command (any quoting/prefix). */
const HOOK_SCRIPT_REF = /\.claude[\\/]+hooks[\\/]+([\w.-]+)/g;

/** True when `command` calls a retired rulebook hook (whole-name match). */
export function isRetiredRulebookHook(command: string): boolean {
    return LEGACY_SIGNATURES.some((name) =>
        new RegExp(`(^|[^\\w-])${name.replace(/[-.]/g, '\\$&')}([^\\w-]|$)`).test(command)
    );
}

/**
 * True when `command` is a rulebook hook: a retired one, or one that runs a
 * script rulebook ships today from `.claude/hooks/`. Anything else is the
 * user's and is never touched.
 */
export function isRulebookHook(command: string): boolean {
    if (isRetiredRulebookHook(command)) return true;
    for (const m of command.matchAll(HOOK_SCRIPT_REF)) {
        if (CURRENT_HOOK_SCRIPTS.includes(m[1])) return true;
    }
    return false;
}

/** True when `command` runs a `.claude/hooks/` script that is not on disk. */
function callsMissingScript(projectRoot: string, command: string): boolean {
    for (const m of command.matchAll(HOOK_SCRIPT_REF)) {
        if (!existsSync(path.join(projectRoot, '.claude', 'hooks', m[1]))) return true;
    }
    return false;
}

export function getClaudeSettingsPath(projectRoot: string): string {
    return path.join(projectRoot, '.claude', 'settings.json');
}

export function getClaudeLocalSettingsPath(projectRoot: string): string {
    return path.join(projectRoot, '.claude', 'settings.local.json');
}

export function getHookScriptPath(projectRoot: string, scriptName: string): string {
    return path.join(projectRoot, '.claude', 'hooks', scriptName);
}

/**
 * Merge the rulebook-owned entries into an existing settings.json, or create
 * the file if absent. Every event is managed: retired rulebook entries and
 * rulebook entries whose script is missing are stripped from settings.json
 * and settings.local.json; non-rulebook entries are never touched. Returns
 * the final path, whether settings.json changed, and each removed rulebook
 * entry (`<file> <event>: <command>`; a re-upserted entry is not a removal).
 */
export async function applyClaudeSettings(
    projectRoot: string,
    desire: ClaudeSettingsDesire
): Promise<{ path: string; changed: boolean; removedHooks: string[] }> {
    const settingsPath = getClaudeSettingsPath(projectRoot);
    await ensureDir(path.dirname(settingsPath));

    if (desire.taskScaffoldingGuard) {
        await installGuardScript(projectRoot, GUARD_SCRIPT);
    }
    if (desire.osSchedulingGuard) {
        await installGuardScript(projectRoot, OS_SCHEDULING_GUARD_SCRIPT);
    }
    if (desire.jevPromptGate || desire.jevToolGate) {
        await installGuardScript(projectRoot, JEV_GATE_SCRIPT);
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
    const ownedBefore = rulebookHookCommands(existing.hooks);

    // Strip every retired rulebook hook and every current one (re-upserted
    // below when desired) from every event.
    stripHooks(
        existing.hooks,
        (command) =>
            isRetiredRulebookHook(command) || CURRENT_SIGNATURES.some((s) => command.includes(s))
    );

    // Optional guard 1 (PreToolUse Edit|Write, path-only): task scaffolding.
    if (desire.taskScaffoldingGuard) {
        upsertHook(
            existing.hooks,
            'PreToolUse',
            'Edit|Write',
            GUARD_SIGNATURE,
            `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${GUARD_SCRIPT}`
        );
    }

    // Optional guard 2 (PreToolUse Bash|Edit|Write): no OS-level scheduling.
    // Keyword prefilter, then a handful of anchored patterns — cheap, and the
    // only way to stop `crontab -e` before it runs.
    if (desire.osSchedulingGuard) {
        upsertHook(
            existing.hooks,
            'PreToolUse',
            OS_SCHEDULING_GUARD_MATCHER,
            OS_SCHEDULING_GUARD_SIGNATURE,
            `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${OS_SCHEDULING_GUARD_SCRIPT}`
        );
    }

    // Optional UserPromptSubmit hook: the Jev entry gate on every prompt.
    // Its `timeout` outlives the hook's own deadline, so Claude Code never
    // cancels a call the hook would have finished (fail-open either way).
    if (desire.jevPromptGate) {
        upsertHook(
            existing.hooks,
            'UserPromptSubmit',
            undefined,
            JEV_GATE_SIGNATURE,
            `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${JEV_GATE_SCRIPT} prompt`,
            promptHookTimeoutSec(desire.jevPromptGateDeadlineMs ?? PROMPT_HOOK_DEFAULTS.deadlineMs)
        );
    }

    // Opt-in PreToolUse tool gate, after the guard entries: Claude Code runs
    // matching hooks in parallel, so the wrapper runs the OS-scheduling guard
    // itself before asking Jev.
    if (desire.jevToolGate) {
        upsertHook(
            existing.hooks,
            'PreToolUse',
            desire.jevToolGate.matcher,
            JEV_TOOL_GATE_SIGNATURE,
            `bash $CLAUDE_PROJECT_DIR/.claude/hooks/${JEV_GATE_SCRIPT} tool`,
            desire.jevToolGate.timeoutSec
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

    // A rulebook entry whose script is gone fails on every run: drop it.
    stripHooks(
        existing.hooks,
        (command) => isRulebookHook(command) && callsMissingScript(projectRoot, command)
    );
    const ownedAfter = new Set(rulebookHookCommands(existing.hooks));
    const removedHooks = ownedBefore
        .filter((entry) => !ownedAfter.has(entry))
        .map((entry) => `settings.json ${entry}`);

    // Collapse empty containers so we don't leave noise behind.
    pruneEmptyHooks(existing.hooks);
    if (existing.hooks && Object.keys(existing.hooks).length === 0) delete existing.hooks;
    if (existing.env && Object.keys(existing.env).length === 0) delete existing.env;

    const after = JSON.stringify(existing, null, 2) + '\n';
    const changed = beforeOnDisk === null || after !== beforeOnDisk;
    if (changed) {
        await writeFile(settingsPath, after);
    }

    // settings.local.json: rulebook never writes entries here, but retired or
    // broken rulebook entries copied into it would run on every event too.
    const local = await stripLocalRulebookHooks(projectRoot);
    removedHooks.push(...local.map((entry) => `settings.local.json ${entry}`));

    return { path: settingsPath, changed, removedHooks };
}

/**
 * Strip retired rulebook hook entries, and rulebook entries whose script is
 * missing, from `.claude/settings.local.json` (every event). Current, working
 * entries and every non-rulebook entry are left alone. The file is rewritten
 * only when something was removed. Returns `<event>: <command>` per removal.
 */
export async function stripLocalRulebookHooks(projectRoot: string): Promise<string[]> {
    const localPath = getClaudeLocalSettingsPath(projectRoot);
    if (!(await fileExists(localPath))) return [];
    let settings: SettingsShape;
    try {
        settings = JSON.parse(await readFile(localPath)) as SettingsShape;
    } catch {
        return []; // not ours to repair
    }
    if (!settings.hooks || typeof settings.hooks !== 'object') return [];
    const removed = stripHooks(
        settings.hooks,
        (command) =>
            isRetiredRulebookHook(command) ||
            (isRulebookHook(command) && callsMissingScript(projectRoot, command))
    );
    if (removed.length === 0) return [];
    pruneEmptyHooks(settings.hooks);
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
    await writeFile(localPath, JSON.stringify(settings, null, 2) + '\n');
    return removed;
}

/** `<event>: <command>` for every rulebook hook command, in order. */
function rulebookHookCommands(hooks: NonNullable<SettingsShape['hooks']>): string[] {
    const out: string[] = [];
    for (const [event, list] of Object.entries(hooks)) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
            for (const h of entry?.hooks ?? []) {
                if (typeof h?.command === 'string' && isRulebookHook(h.command)) {
                    out.push(`${event}: ${h.command}`);
                }
            }
        }
    }
    return out;
}

/**
 * Remove every command hook matching `predicate` from every event (entries
 * left empty are dropped). Returns `<event>: <command>` per removal.
 */
function stripHooks(
    hooks: NonNullable<SettingsShape['hooks']>,
    predicate: (command: string) => boolean
): string[] {
    const removed: string[] = [];
    for (const [event, list] of Object.entries(hooks)) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
            if (!entry || !Array.isArray(entry.hooks)) continue;
            entry.hooks = entry.hooks.filter((h) => {
                const drop =
                    h?.type === 'command' && typeof h.command === 'string' && predicate(h.command);
                if (drop) removed.push(`${event}: ${h.command}`);
                return !drop;
            });
        }
        hooks[event] = list.filter(
            (entry) => !entry || !Array.isArray(entry.hooks) || entry.hooks.length > 0
        );
    }
    return removed;
}

function upsertHook(
    hooks: NonNullable<SettingsShape['hooks']>,
    event: string,
    matcher: string | undefined,
    signature: string,
    command: string,
    timeout?: number
): void {
    const list = (hooks[event] ?? []) as HookEntry[];
    hooks[event] = list;

    for (const entry of list) {
        for (const h of entry.hooks) {
            if (h.type === 'command' && h.command.includes(signature)) {
                h.command = command;
                if (timeout !== undefined) h.timeout = timeout;
                if (matcher !== undefined) entry.matcher = matcher;
                return;
            }
        }
    }

    list.push({
        ...(matcher !== undefined ? { matcher } : {}),
        hooks: [{ type: 'command', command, ...(timeout !== undefined ? { timeout } : {}) }],
    });
}

/**
 * Remove only the Jev gate entries (prompt hook and tool gate) from an
 * existing settings.json, leaving everything else as it is. Used when
 * TypeSafe is turned off after settings were applied. Returns whether the
 * file changed.
 */
export async function removeJevPromptGate(projectRoot: string): Promise<boolean> {
    const settingsPath = getClaudeSettingsPath(projectRoot);
    if (!(await fileExists(settingsPath))) return false;
    const before = await readFile(settingsPath);
    let settings: SettingsShape;
    try {
        settings = JSON.parse(before) as SettingsShape;
    } catch {
        throw new Error(`Existing ${settingsPath} is not valid JSON`);
    }
    if (!settings.hooks) return false;
    const removed = stripHooks(
        settings.hooks,
        (command) =>
            command.includes(JEV_GATE_SIGNATURE) || command.includes(JEV_TOOL_GATE_SIGNATURE)
    );
    if (removed.length === 0) return false; // no entry: leave the file alone
    pruneEmptyHooks(settings.hooks);
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    return true;
}

function pruneEmptyHooks(hooks: NonNullable<SettingsShape['hooks']>): void {
    for (const key of Object.keys(hooks)) {
        const list = hooks[key];
        if (!list || list.length === 0) delete hooks[key];
    }
}

/** Copy a guard script from templates into `.claude/hooks/`. Rulebook-owned. */
async function installGuardScript(projectRoot: string, scriptName: string): Promise<void> {
    const src = path.join(getTemplatesDir(), 'hooks', scriptName);
    if (!(await fileExists(src))) return; // template not present — nothing to install
    const destDir = path.join(projectRoot, '.claude', 'hooks');
    await ensureDir(destDir);
    await writeShellScript(path.join(destDir, scriptName), { sourcePath: src });
}
