/**
 * Types for `rulebook doctor --perf` (docs/analysis/multi-session-performance/
 * 07-recommendations.md C8). The report is read-only: it never edits settings,
 * never kills processes and never deletes files — every finding carries a
 * suggested action for the operator instead.
 */

export type PerfStatus = 'ok' | 'warn' | 'info';

/** One ✔/⚠ line of the human report. `action` is set on every warning. */
export interface PerfCheck {
    id: string;
    status: PerfStatus;
    message: string;
    action?: string;
}

/** Where a hook entry was read from. */
export type HookSource = 'user' | 'project' | 'local' | 'plugin' | 'codex-user' | 'codex-project';

/** Who owns a hook entry: rulebook by command signature, else by source. */
export type HookOwner = 'rulebook' | 'user' | 'project' | 'plugin' | 'codex';

/** Timing of one hook command, measured from Claude Code transcripts. */
export interface HookTiming {
    /** Runs with a recorded duration. */
    runs: number;
    p50Ms: number;
    p90Ms: number;
    maxMs: number;
    /** Sum of all durations in the window. */
    totalMs: number;
    /** Runs cancelled by their timeout (`hook_cancelled` + `timedOut`). */
    timeouts: number;
    /** Runs that exited with a non-blocking error. */
    errors: number;
    /** Runs whose stdout was recorded. */
    outputRuns: number;
    /** Of those, runs that printed nothing or `{}` and exited 0. */
    silentRuns: number;
    /** True when every recorded output (at least MIN_SILENT_RUNS) was empty or `{}`. */
    alwaysSilent: boolean;
}

export interface HookEntryInfo {
    source: HookSource;
    /** File the entry was read from. */
    sourcePath: string;
    /** Plugin id (`name@marketplace`) for plugin hooks. */
    plugin?: string;
    event: string;
    /** Tool matcher; '' when absent (matches everything). */
    matcher: string;
    command: string;
    /** Hook type (`command`, `prompt`, …). */
    type: string;
    owner: HookOwner;
    /** Rulebook hook name when owner is rulebook (e.g. `jev-gate.sh prompt`). */
    rulebookHook?: string;
    /** A hook rulebook wired in v5/v6 and has since retired. */
    retired: boolean;
    async: boolean;
    blocking: boolean;
    /** Configured timeout in seconds; null = the client default. */
    timeoutSec: number | null;
    groupIndex: number;
    hookIndex: number;
    /** Script the command runs, when one can be told apart. */
    script?: { path: string; exists: boolean };
    timing: HookTiming | null;
}

export interface UnconfiguredHookTiming {
    event: string;
    command: string;
    timing: HookTiming;
}

export interface CriticalPathEntry {
    event: string;
    /** Configured hooks with timing on this event (they run in parallel). */
    hooks: number;
    slowestCommand: string;
    p50Ms: number;
    p90Ms: number;
}

export interface HooksSection {
    entries: HookEntryInfo[];
    /** Commands seen in transcripts that no current config declares. */
    unconfigured: UnconfiguredHookTiming[];
    transcripts: { dirs: string[]; files: number; records: number; days: number };
    criticalPath: CriticalPathEntry[];
    checks: PerfCheck[];
}

export type CliStep = 'project-bin' | 'repo-dist' | 'path';

export interface GlobalCliLink {
    /** The `rulebook` shim found on PATH. */
    shim: string;
    /** Package directory the shim runs (`…/node_modules/@hivehub/rulebook`). */
    packageDir: string | null;
    /** True when the package dir is a symlink or junction (npm link). */
    isLink: boolean;
    linkTarget: string | null;
    targetExists: boolean;
    /** `<packageDir>/dist/index.js` exists. */
    distExists: boolean;
}

export interface CliSection {
    jevGateInstalled: boolean;
    candidates: Array<{ step: CliStep; path: string | null; usable: boolean }>;
    resolved: { step: CliStep; path: string } | null;
    globalLink: GlobalCliLink | null;
    checks: PerfCheck[];
}

export type McpLaunchForm =
    'node-direct' | 'global-bin' | 'npx-pinned' | 'npx-latest' | 'legacy-mcp-server' | 'other';

export interface McpLaunchEntry {
    client: 'claude' | 'codex';
    scope: 'project' | 'local' | 'user';
    file: string;
    name: string;
    command: string;
    args: string[];
    form: McpLaunchForm;
    /** Pinned version for `npx-pinned`. */
    version?: string;
    /** Measured cost of this form (03-mcp-lifecycle.md F-013). */
    guidance: string;
}

export interface McpProcessInfo {
    pid: number;
    ppid: number;
    name: string;
    commandLine: string;
    /** Resident / working set in bytes (0 when unknown). */
    memoryBytes: number;
}

export interface McpHostGroup {
    hostPid: number;
    /** Host process label; `(gone)` when the parent no longer exists. */
    host: string;
    chains: number;
    processes: number;
    memoryBytes: number;
    /** Server pids (leaf of each chain). */
    serverPids: number[];
}

export interface PidFileInfo {
    file: string;
    pid: number | null;
    alive: boolean;
}

export interface McpSection {
    launches: McpLaunchEntry[];
    processes: {
        available: boolean;
        error?: string;
        servers: number;
        processes: number;
        memoryBytes: number;
        hosts: McpHostGroup[];
    };
    pidFiles: PidFileInfo[];
    checks: PerfCheck[];
}

export interface LeftoverFile {
    kind: 'rules' | 'agents' | 'skills' | 'hooks' | 'commands';
    path: string;
}

export interface LeftoversSection {
    files: LeftoverFile[];
    retiredHooks: Array<{ sourcePath: string; event: string; command: string }>;
    missingScripts: Array<{ sourcePath: string; event: string; command: string; script: string }>;
    checks: PerfCheck[];
}

export interface CodexSection {
    installed: boolean;
    agentsMd: { exists: boolean; bytes: number };
    agentsOverride: { exists: boolean; bytes: number };
    projectTrusted: boolean | null;
    projectHooks: { total: number; trusted: number };
    provider: { id: string; isNineRouter: boolean; tokenSaverOff: boolean } | null;
    checks: PerfCheck[];
}

export interface PerfReport {
    projectRoot: string;
    generatedAt: string;
    days: number;
    hooks: HooksSection;
    cli: CliSection;
    mcp: McpSection;
    leftovers: LeftoversSection;
    codex: CodexSection;
    summary: { ok: number; warn: number; info: number };
}

/** Lists live processes; injectable so tests never read the real machine. */
export type ProcessLister = () => Promise<McpProcessInfo[]>;

export interface PerfDoctorOptions {
    projectRoot: string;
    /** Home directory holding `.claude/` and `.claude.json`. Default: os.homedir(). */
    homeDir?: string;
    /** Codex home. Default: $CODEX_HOME or `<homeDir>/.codex`. */
    codexHome?: string;
    /** Transcript window in days. Default 3. */
    days?: number;
    /** Clock, for the transcript window. Default Date.now(). */
    now?: number;
    /** PATH used for CLI resolution. Default process.env.PATH. */
    pathEnv?: string;
    platform?: NodeJS.Platform;
    /** Process lister; `null` skips the live-process scan. Default: the OS lister. */
    listProcesses?: ProcessLister | null;
    /** Rulebook templates dir (current shipped assets). Default: the package's. */
    templatesDir?: string;
}
